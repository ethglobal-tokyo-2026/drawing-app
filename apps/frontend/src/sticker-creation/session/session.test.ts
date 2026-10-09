import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/apiClient";
import {
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

const start = { type: "start", kyotoSeika: false } as const;
const kyotoSeikaStart = { type: "start", kyotoSeika: true } as const;
const begin = { type: "begin", hasPair: true } as const;
const ink = { type: "ink" } as const;
const tap = (hasInk = true) => ({ type: "seal-tap", hasInk }) as const;
const seal = { type: "seal" } as const;
const notYet = { type: "not-yet" } as const;
const timeUp = { type: "time-up" } as const;
const failed = ({ mayHaveSealed = false, timeUp = false, refused = false } = {}) =>
  ({ type: "seal-failed", mayHaveSealed, timeUp, refused }) as const;
/** The seal key opened the seal sheet, and its Seal started a seal. */
const sealing = [start, ink, tap(), seal] as const;
/** The clock ran out, and the time's-up sheet's Seal started a seal. */
const sealedAtTimeUp = [start, ink, timeUp, seal] as const;
const restored = ({ drawn = false, sealSent = false, dealt = false, timeUp = false } = {}) =>
  ({ type: "restored", drawn, sealSent, dealt, timeUp }) as const;

describe("transition", () => {
  it("spends a ticket only at Start, and starts the clock only at the first stroke", () => {
    expect(run(ink)).toEqual({ phase: "blank", effects: [] });
    expect(run(start)).toEqual({ phase: "primed", effects: ["keep-session"] });
    expect(run(start, start)).toEqual({ phase: "primed", effects: [] });
    expect(run(start, ink)).toEqual({ phase: "drawing", effects: ["start-clock"] });
    expect(run(start, ink, ink)).toEqual({ phase: "drawing", effects: [] });
  });

  it("deals the pair of a ticket spent in Kyoto Seika Practice Mode and waits, sheet locked, for Begin, which starts the clock at once", () => {
    expect(run(kyotoSeikaStart)).toEqual({ phase: "dealt", effects: ["keep-session"] });
    expect(run(kyotoSeikaStart, ink)).toEqual({ phase: "dealt", effects: [] });
    expect(run(kyotoSeikaStart, begin)).toEqual({
      phase: "drawing",
      effects: ["start-clock", "lock-subjects"],
    });
    expect(run(start, begin)).toEqual({ phase: "primed", effects: [] });
    expect(run(kyotoSeikaStart, begin, ink)).toEqual({ phase: "drawing", effects: [] });
    expect(run(kyotoSeikaStart, tap())).toEqual({ phase: "dealt", effects: [] });
  });

  it("won't begin before the pair is dealt, since the sheet couldn't seal without it", () => {
    expect(run(kyotoSeikaStart, { ...begin, hasPair: false })).toEqual({
      phase: "dealt",
      effects: [],
    });
  });

  it("brings a sheet in Kyoto Seika Practice Mode back dealt until Begin, and drawing after it", () => {
    expect(run(restored({ dealt: true })).phase).toBe("dealt");
    expect(run(restored({ drawn: true })).phase).toBe("drawing");
    expect(run(restored({ sealSent: true, dealt: true })).phase).toBe("retry");
  });

  it("picks a session kept across a reload back up without spending another ticket", () => {
    expect(run(restored({ drawn: true }))).toEqual({ phase: "drawing", effects: [] });
    expect(run(restored(), start).phase).toBe("primed");
    expect(run(restored(), ink)).toEqual({
      phase: "drawing",
      effects: ["start-clock"],
    });
  });

  it("opens the seal sheet at one tap, and seals only at its Seal", () => {
    expect(run(start, ink, tap())).toEqual({ phase: "seal-sheet", effects: [] });
    expect(run(...sealing)).toEqual({ phase: "sealing", effects: ["seal"] });
    // The sheet's Seal is the only way from drawing to a seal.
    expect(run(start, ink, seal).phase).toBe("drawing");
  });

  it("closes the seal sheet back to drawing at Not yet", () => {
    expect(run(start, ink, tap(), notYet)).toEqual({ phase: "drawing", effects: [] });
    expect(run(start, ink, tap(), notYet, tap()).phase).toBe("seal-sheet");
  });

  it("can't open the seal sheet on an empty canvas", () => {
    expect(run(start, tap()).phase).toBe("primed");
    expect(run(start, ink, tap(false)).phase).toBe("drawing");
  });

  it("puts the pencils down at 0:00: the time's-up sheet rises, and nothing seals until its Seal", () => {
    expect(run(start, ink, timeUp)).toEqual({ phase: "time-up", effects: [] });
    // A seal sheet already open, as Kyoto Seika Practice Mode's clock runs on under it, turns time's up.
    expect(run(start, ink, tap(), timeUp)).toEqual({ phase: "time-up", effects: [] });
    // Nothing leads back to drawing.
    expect(run(start, ink, timeUp, notYet).phase).toBe("time-up");
    expect(run(start, ink, timeUp, tap()).phase).toBe("time-up");
    expect(run(...sealedAtTimeUp)).toEqual({ phase: "sealing", effects: ["seal"] });
  });

  it("brings a drawing kept at 0:00 back pencils down, unless its seal had gone out", () => {
    expect(run(restored({ drawn: true, timeUp: true })).phase).toBe("time-up");
    expect(run(restored({ drawn: true, timeUp: true, sealSent: true })).phase).toBe("retry");
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
    for (const held of [
      [...sealing, failed({ mayHaveSealed: true })],
      [...sealedAtTimeUp, failed({ timeUp: true })],
    ]) {
      expect(run(...held).phase).toBe("retry");
      expect(run(...held, ink).phase).toBe("retry");
      // The key's tap tries again at once, since the sheet and its mark can't change.
      expect(run(...held, tap())).toEqual({ phase: "sealing", effects: ["seal"] });
      expect(run(...held, tap(), { type: "sealed" }).phase).toBe("sealed");
    }
    // A reload while the seal was on its way brings the sheet back locked too.
    expect(run(restored({ drawn: true, sealSent: true })).phase).toBe("retry");
    // A retry the server refuses proves it holds no seal, so before 0:00 the sheet draws on.
    expect(run(...sealing, failed({ mayHaveSealed: true }), tap(), failed()).phase).toBe("drawing");
    expect(
      run(...sealedAtTimeUp, failed({ timeUp: true }), tap(), failed({ timeUp: true })).phase,
    ).toBe("retry");
  });

  it("starts a fresh sheet when the server refuses a seal at 0:00, since it refuses it again", () => {
    const refusedAtTimeUp = failed({ timeUp: true, refused: true });
    expect(run(...sealedAtTimeUp, refusedAtTimeUp)).toEqual({
      phase: "blank",
      effects: ["reset-sheet"],
    });
    // A retry at 0:00 refused too.
    expect(run(...sealedAtTimeUp, failed({ timeUp: true }), tap(), refusedAtTimeUp).phase).toBe(
      "blank",
    );
  });

  it("starts a fresh sheet on reset", () => {
    expect(run(...sealing, { type: "sealed" }, { type: "reset" })).toEqual({
      phase: "blank",
      effects: ["reset-sheet"],
    });
  });
});

describe("sealFailure", () => {
  const answered = (status: number, error: string) => sealFailure(new ApiError(status, { error }));

  it("lets the sheet change only once the server has refused the seal itself", () => {
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
    // The wait for the Sui address stops it before it leaves the phone.
    expect(answered(0, "line_token_expired")).toBe("unsent");
    expect(answered(0, "sui_wallet_not_ready")).toBe("unsent");
  });
});

describe("describeSealFailure", () => {
  const problem = (status: number, error: string) =>
    describeSealFailure(new ApiError(status, { error }), true).kind;

  it("sorts a failed seal by what the chip can tell the artist", () => {
    expect(problem(0, "network")).toBe("noAnswer");
    expect(problem(500, "internal_error")).toBe("serverProblem");
    expect(problem(503, "mint_failed")).toBe("notOnChain");
    expect(problem(0, "sui_wallet_not_ready")).toBe("suiAddress");
    expect(problem(0, "line_token_expired")).toBe("signInExpired");
    // A refusal is worded by its own message.
    expect(problem(404, "ticket_not_found")).toBe("refused");
  });

  it("blames the device only for a failure before the request left it", () => {
    expect(describeSealFailure(new Error("the cut failed"), false).kind).toBe("onThisDevice");
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
