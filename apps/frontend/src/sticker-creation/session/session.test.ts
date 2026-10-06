import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/apiClient";
import {
  ARM_WINDOW_MS,
  describeSealFailure,
  FRESH_SESSION,
  heldBy,
  sealFailure,
  transition,
  type Hold,
  type Session,
  type SessionEvent,
} from "./session";

/** Runs events from a fresh session; returns the session and the effects of the last event. */
function run(...events: SessionEvent[]) {
  let session: Session = FRESH_SESSION;
  let effects: string[] = [];
  for (const event of events) ({ session, effects } = transition(session, event));
  return { phase: session.phase, effects };
}

const start = { type: "start" } as const;
const ink = { type: "ink" } as const;
const tap = (now: number, hasInk = true) => ({ type: "seal-tap", now, hasInk }) as const;
const failed = ({ mayHaveSealed = false, timeUp = false, refused = false } = {}) =>
  ({ type: "seal-failed", mayHaveSealed, timeUp, refused }) as const;
/** The seal key's second tap started a seal. */
const sealing = [start, ink, tap(1000), tap(1500)] as const;
const restored = (drawn: boolean, sealSent = false) =>
  ({ type: "restored", drawn, sealSent }) as const;

describe("transition", () => {
  it("spends a ticket only at Start, and starts the clock only at the first stroke", () => {
    expect(run(ink)).toEqual({ phase: "blank", effects: [] });
    expect(run(start)).toEqual({ phase: "primed", effects: ["keep-session"] });
    expect(run(start, start)).toEqual({ phase: "primed", effects: [] });
    expect(run(start, ink)).toEqual({ phase: "drawing", effects: ["start-clock"] });
    expect(run(start, ink, ink)).toEqual({ phase: "drawing", effects: [] });
  });

  it("picks a session kept across a reload back up without spending another ticket", () => {
    expect(run(restored(true))).toEqual({ phase: "drawing", effects: [] });
    expect(run(restored(false), start).phase).toBe("primed");
    expect(run(restored(false), ink)).toEqual({
      phase: "drawing",
      effects: ["start-clock"],
    });
  });

  it("arms at the first tap and seals at a second within the window", () => {
    expect(run(start, ink, tap(1000))).toEqual({ phase: "armed", effects: [] });
    expect(run(start, ink, tap(1000), tap(1000 + ARM_WINDOW_MS - 1))).toEqual({
      phase: "sealing",
      effects: ["seal"],
    });
  });

  it("disarms when the window lapses, and a late second tap only arms again", () => {
    expect(
      run(start, ink, tap(1000), { type: "arm-expired", now: 1000 + ARM_WINDOW_MS }).phase,
    ).toBe("drawing");
    expect(run(start, ink, tap(1000), tap(1000 + ARM_WINDOW_MS))).toEqual({
      phase: "armed",
      effects: [],
    });
    // The first arming's expiry doesn't cut the second one short.
    expect(
      run(start, ink, tap(1000), tap(4000), { type: "arm-expired", now: 1000 + ARM_WINDOW_MS })
        .phase,
    ).toBe("armed");
  });

  it("disarms on any touch of the canvas", () => {
    expect(run(start, ink, tap(1000), { type: "canvas-touch" }).phase).toBe("drawing");
  });

  it("disarms on a clear, and otherwise leaves the session as it was", () => {
    const clear = { type: "clear" } as const;
    expect(run(start, ink, tap(1000), clear)).toEqual({ phase: "drawing", effects: [] });
    const before: SessionEvent[][] = [
      [],
      [start],
      [start, ink],
      [...sealing],
      [...sealing, failed({ mayHaveSealed: true })],
    ];
    for (const events of before)
      expect(run(...events, clear)).toEqual({ phase: run(...events).phase, effects: [] });
  });

  it("can't seal an empty canvas", () => {
    expect(run(start, tap(1000)).phase).toBe("primed");
    expect(run(start, ink, tap(1000, false)).phase).toBe("drawing");
  });

  it("seals by itself when time is up, armed or not", () => {
    expect(run(start, ink, { type: "time-up" })).toEqual({ phase: "sealing", effects: ["seal"] });
    expect(run(start, ink, tap(1000), { type: "time-up" })).toEqual({
      phase: "sealing",
      effects: ["seal"],
    });
  });

  it("goes back to drawing with the clock running again when the server refused the seal", () => {
    expect(run(...sealing, failed({ refused: true }))).toEqual({
      phase: "drawing",
      effects: ["resume-clock"],
    });
    expect(run(...sealing, failed())).toEqual({ phase: "drawing", effects: ["resume-clock"] });
    expect(run(...sealing, { type: "sealed" }).phase).toBe("sealed");
  });

  it("keeps the sheet locked after a seal the server may hold, or one at 0:00, until one lands", () => {
    const timeUp = [start, ink, { type: "time-up" }] as const;
    for (const held of [
      [...sealing, failed({ mayHaveSealed: true })],
      [...timeUp, failed({ timeUp: true })],
    ]) {
      expect(run(...held).phase).toBe("retry");
      expect(run(...held, ink, { type: "canvas-touch" }).phase).toBe("retry");
      // The key's first tap tries again, since the sheet can't change.
      expect(run(...held, tap(9000))).toEqual({ phase: "sealing", effects: ["seal"] });
      expect(run(...held, tap(9000), { type: "sealed" }).phase).toBe("sealed");
    }
    // A reload while the seal was on its way brings the sheet back locked too.
    expect(run(restored(true, true)).phase).toBe("retry");
    // A retry the server refuses proves it holds no seal, so before 0:00 the sheet draws on.
    expect(run(...sealing, failed({ mayHaveSealed: true }), tap(9000), failed()).phase).toBe(
      "drawing",
    );
    expect(
      run(...timeUp, failed({ timeUp: true }), tap(9000), failed({ timeUp: true })).phase,
    ).toBe("retry");
  });

  it("starts a fresh sheet when the server refuses a seal at 0:00, since it refuses it again", () => {
    const timeUp = [start, ink, { type: "time-up" }] as const;
    const refusedAtTimeUp = failed({ timeUp: true, refused: true });
    expect(run(...timeUp, refusedAtTimeUp)).toEqual({ phase: "blank", effects: ["reset-sheet"] });
    // A retry at 0:00 refused too.
    expect(run(...timeUp, failed({ timeUp: true }), tap(9000), refusedAtTimeUp).phase).toBe(
      "blank",
    );
  });

  it("starts a fresh sheet on reset", () => {
    expect(run(start, ink, tap(1000), tap(1500), { type: "sealed" }, { type: "reset" })).toEqual({
      phase: "blank",
      effects: ["reset-sheet"],
    });
  });
});

describe("sealFailure", () => {
  const answered = (status: number, error: string) => sealFailure(new ApiError(status, { error }));

  it("lets the sheet change only once the server has refused the seal itself", () => {
    expect(answered(403, "adults_only")).toBe("refused");
    expect(answered(400, "invalid_request")).toBe("refused");
    expect(answered(404, "ticket_not_found")).toBe("refused");
    // Turned away before the ticket was looked at: an earlier try may still have sealed.
    expect(answered(401, "signed_out")).toBe("unknown");
    // Asked by a session that's someone else's, which says nothing of this person's seal.
    expect(answered(403, "ticket_not_yours")).toBe("unknown");
    // Saved, or maybe saved: sent again, the same request gets the sticker from the ticket use.
    expect(answered(503, "mint_failed")).toBe("unknown");
    expect(answered(0, "network")).toBe("unknown");
    expect(answered(409, "ticket_already_used")).toBe("unknown");
    expect(sealFailure(new SyntaxError("the answer isn't JSON"))).toBe("unknown");
    // The wait for the board address stops it before it leaves the phone.
    expect(answered(0, "line_token_expired")).toBe("unsent");
  });
});

describe("describeSealFailure", () => {
  const problem = (status: number, error: string) =>
    describeSealFailure(new ApiError(status, { error }), true).kind;

  it("sorts a failed seal by what the chip can tell the artist", () => {
    expect(problem(0, "network")).toBe("noAnswer");
    expect(problem(500, "internal_error")).toBe("serverProblem");
    expect(problem(503, "mint_failed")).toBe("notOnChain");
    expect(problem(0, "smart_account_not_ready")).toBe("boardAddress");
    expect(problem(0, "line_token_expired")).toBe("signInExpired");
    // A refusal is worded by its own message.
    expect(problem(403, "adults_only")).toBe("refused");
  });

  it("blames the phone only for a failure before the request left it", () => {
    expect(describeSealFailure(new Error("the cut failed"), false).kind).toBe("onThisPhone");
    expect(describeSealFailure(new SyntaxError("the answer isn't JSON"), true).kind).toBe(
      "noAnswer",
    );
  });
});

describe("heldBy", () => {
  it("names the person's own pause over any other hold", () => {
    const holds = (...list: Hold[]) => new Set(list);
    expect(heldBy(holds("size", "hidden", "paused"))).toBe("paused");
    expect(heldBy(holds())).toBeNull();
  });
});
