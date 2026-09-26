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

const ink = { type: "ink" } as const;
const tap = (now: number, hasInk = true) => ({ type: "seal-tap", now, hasInk }) as const;

describe("transition", () => {
  it("spends a ticket and starts the clock at the first stroke, and only then", () => {
    expect(run(ink)).toEqual({ phase: "drawing", effects: ["spend-ticket", "start-clock"] });
    expect(run(ink, ink)).toEqual({ phase: "drawing", effects: [] });
  });

  it("picks a drawing kept across a reload back up without spending another ticket", () => {
    expect(run({ type: "restored" })).toEqual({ phase: "drawing", effects: [] });
    expect(run({ type: "restored" }, ink).effects).toEqual([]);
  });

  it("arms at the first tap and seals at a second within the window", () => {
    expect(run(ink, tap(1000))).toEqual({ phase: "armed", effects: [] });
    expect(run(ink, tap(1000), tap(1000 + ARM_WINDOW_MS - 1))).toEqual({
      phase: "sealing",
      effects: ["seal"],
    });
  });

  it("disarms when the window lapses, and a late second tap only arms again", () => {
    expect(run(ink, tap(1000), { type: "arm-expired", now: 1000 + ARM_WINDOW_MS }).phase).toBe(
      "drawing",
    );
    expect(run(ink, tap(1000), tap(1000 + ARM_WINDOW_MS))).toEqual({
      phase: "armed",
      effects: [],
    });
    // The first arming's expiry doesn't cut the second one short.
    expect(
      run(ink, tap(1000), tap(4000), { type: "arm-expired", now: 1000 + ARM_WINDOW_MS }).phase,
    ).toBe("armed");
  });

  it("disarms on any touch of the canvas", () => {
    expect(run(ink, tap(1000), { type: "canvas-touch" }).phase).toBe("drawing");
  });

  it("can't seal an empty canvas", () => {
    expect(run(tap(1000)).phase).toBe("blank");
    expect(run(ink, tap(1000, false)).phase).toBe("drawing");
  });

  it("seals by itself when time is up, armed or not", () => {
    expect(run(ink, { type: "time-up" })).toEqual({ phase: "sealing", effects: ["seal"] });
    expect(run(ink, tap(1000), { type: "time-up" })).toEqual({
      phase: "sealing",
      effects: ["seal"],
    });
  });

  it("goes back to drawing with the clock running again when a seal fails", () => {
    const sealing = [ink, tap(1000), tap(1500)] as const;
    expect(run(...sealing, { type: "seal-failed" })).toEqual({
      phase: "drawing",
      effects: ["resume-clock"],
    });
    expect(run(...sealing, { type: "sealed" }).phase).toBe("sealed");
  });

  it("starts a fresh sheet on reset", () => {
    expect(run(ink, tap(1000), tap(1500), { type: "sealed" }, { type: "reset" })).toEqual({
      phase: "blank",
      effects: ["reset-sheet"],
    });
  });
});

describe("heldBy", () => {
  const holds = (...list: Hold[]) => new Set(list);

  it("holds for the person's pause or a hidden screen even before the first stroke", () => {
    expect(heldBy(holds("paused"), false)).toBe("paused");
    expect(heldBy(holds("hidden"), false)).toBe("hidden");
    expect(heldBy(holds("away"), false)).toBe("away");
  });

  it("holds for a tool in hand only once the clock runs", () => {
    for (const tool of ["color", "smoothing", "size"] as const) {
      expect(heldBy(holds(tool), false)).toBeNull();
      expect(heldBy(holds(tool), true)).toBe(tool);
    }
  });

  it("names the person's own pause over any other hold", () => {
    expect(heldBy(holds("size", "hidden", "paused"), true)).toBe("paused");
    expect(heldBy(holds(), true)).toBeNull();
  });
});
