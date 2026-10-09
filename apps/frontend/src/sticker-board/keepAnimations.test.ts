// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { readClocks, restoreClocks, type Clocked } from "./keepAnimations";

/** A CSS animation on `target`, pending until its clock says otherwise. */
const animation = (
  target: Element,
  name: string,
  clock: Partial<Clocked["clock"]> = {},
  pseudo: string | null = null,
): Clocked => ({
  target,
  pseudo,
  name,
  clock: { startTime: null, currentTime: 0, playState: "running", ...clock },
});

/** What removing its element does to an animation: it ends, and its clock with it. */
const end = (a: Clocked) => {
  Object.assign(a.clock, { startTime: null, currentTime: null, playState: "idle" });
};

describe("keeping animations through a reorder", () => {
  it("sets a re-inserted element's new animations back on their old clocks", () => {
    const sticker = document.createElement("i");
    const sway = animation(sticker, "sway", { startTime: 1000, currentTime: 4000 });
    const flow = animation(sticker, "flow", { currentTime: 2300, playState: "paused" }, "::before");
    const glow = animation(sticker, "glow", { startTime: 500, currentTime: 9000 });
    const clocks = readClocks([sway, flow, glow]);
    [sway, flow, glow].forEach(end);

    const swayAgain = animation(sticker, "sway");
    const flowAgain = animation(sticker, "flow", { playState: "paused" }, "::before");
    // Paused by its CSS as it came back: a start would set it running, so it holds the old time.
    const glowAgain = animation(sticker, "glow", { playState: "paused" });
    restoreClocks(clocks, [swayAgain, flowAgain, glowAgain]);

    expect(swayAgain.clock.startTime).toBe(1000);
    expect(flowAgain.clock).toMatchObject({ startTime: null, currentTime: 2300 });
    expect(glowAgain.clock).toMatchObject({ startTime: null, currentTime: 9000 });
  });

  it("leaves an animation that kept running, and any it didn't read", () => {
    const sticker = document.createElement("i");
    const kept = animation(sticker, "sway", { startTime: 1000 });
    const clocks = readClocks([kept]);
    // Resumed on a later clock after the read, as a board back from its stat board resumes.
    kept.clock.startTime = 7000;

    const elsewhere = animation(document.createElement("i"), "sway");
    const otherPseudo = animation(sticker, "sway", {}, "::after");
    const otherName = animation(sticker, "flow");
    restoreClocks(clocks, [kept, elsewhere, otherPseudo, otherName]);

    expect(kept.clock.startTime).toBe(7000);
    for (const fresh of [elsewhere, otherPseudo, otherName]) {
      expect(fresh.clock).toMatchObject({ startTime: null, currentTime: 0 });
    }
  });
});
