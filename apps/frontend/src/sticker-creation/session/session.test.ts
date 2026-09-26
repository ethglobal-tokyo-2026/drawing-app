import { describe, expect, it } from "vitest";
import {
  ARM_WINDOW_MS,
  FRESH_SESSION,
  heldBy,
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

describe("transition", () => {
  it("spends a ticket only at Start, and starts the clock only at the first stroke", () => {
    expect(run(ink)).toEqual({ phase: "blank", effects: [] });
    expect(run(start)).toEqual({ phase: "primed", effects: ["keep-session"] });
    expect(run(start, start)).toEqual({ phase: "primed", effects: [] });
    expect(run(start, ink)).toEqual({ phase: "drawing", effects: ["start-clock"] });
    expect(run(start, ink, ink)).toEqual({ phase: "drawing", effects: [] });
  });

  it("picks a session kept across a reload back up without spending another ticket", () => {
    expect(run({ type: "restored", drawn: true })).toEqual({ phase: "drawing", effects: [] });
    expect(run({ type: "restored", drawn: false }, start).phase).toBe("primed");
    expect(run({ type: "restored", drawn: false }, ink)).toEqual({
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

  it("goes back to drawing with the clock running again when a seal fails", () => {
    const sealing = [start, ink, tap(1000), tap(1500)] as const;
    expect(run(...sealing, { type: "seal-failed" })).toEqual({
      phase: "drawing",
      effects: ["resume-clock"],
    });
    expect(run(...sealing, { type: "sealed" }).phase).toBe("sealed");
  });

  it("starts a fresh sheet on reset", () => {
    expect(run(start, ink, tap(1000), tap(1500), { type: "sealed" }, { type: "reset" })).toEqual({
      phase: "blank",
      effects: ["reset-sheet"],
    });
  });
});

describe("heldBy", () => {
  it("names the person's own pause over any other hold", () => {
    const holds = (...list: Hold[]) => new Set(list);
    expect(heldBy(holds("size", "hidden", "paused"))).toBe("paused");
    expect(heldBy(holds())).toBeNull();
  });
});
