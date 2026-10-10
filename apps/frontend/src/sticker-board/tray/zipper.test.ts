// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COL, GMAX, TRACK_INSETS, chainAtFor } from "./trayModel";
import { createZipper, RELEASE, releaseOpens, type Zipper } from "./zipper";

let host: HTMLDivElement;
let zip: Zipper;

/** The tray's options. */
const OPTIONS = { chainAt: chainAtFor(1), insets: TRACK_INSETS, maxGap: GMAX };
/** Long enough for any run to end and the pull to stop swinging. */
const SETTLE_MS = 10_000;

/** Resolves with what `run` resolved, and the slider's progress at that moment. */
const whenDone = (run: Promise<boolean>) => run.then((open) => ({ open, progress: zip.progress }));
/** Opens the Zipper and lets everything settle. */
async function openSettled() {
  const run = whenDone(zip.open());
  await vi.advanceTimersByTimeAsync(SETTLE_MS);
  return run;
}
/** The pull's turn about its hinge, out of the tape's plane, in degrees: 0 lays it hanging down. */
const pullTurn = () => {
  const transform = zip.el.querySelector<HTMLElement>(".zip__flop")?.style.transform ?? "";
  return parseFloat(/rotateX\((-?[\d.]+)deg\)/.exec(transform)?.[1] ?? "NaN");
};
/** Whether the pull's free end is below its hinge. */
const hangsDown = () => Math.cos((pullTurn() * Math.PI) / 180) > 0;
/** The pull's highest turn out of the tape over the next `ms`, a frame at a time. */
async function highestTurn(ms: number) {
  let most = pullTurn();
  for (let t = 0; t < ms; t += 16) {
    await vi.advanceTimersByTimeAsync(16);
    most = Math.max(most, pullTurn());
  }
  return most;
}
const pointer = (type: string, clientY: number, on: Element = zip.slider, pointerId = 1) =>
  on.dispatchEvent(new PointerEvent(type, { pointerId, clientY, bubbles: true }));
/** A pointer event stamped with when it happened, which can be before it's handled. */
const stamped = (type: string, clientY: number, timeStamp: number) => {
  const e = new PointerEvent(type, { pointerId: 1, clientY, bubbles: true });
  Object.defineProperty(e, "timeStamp", { value: timeStamp });
  return e;
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "setTimeout",
      "clearTimeout",
    ],
  });
  // The tray's column. happy-dom lays nothing out, so the host is given its size.
  host = document.createElement("div");
  Object.defineProperties(host, { clientWidth: { value: COL }, clientHeight: { value: 677 } });
  document.body.append(host);
  zip = createZipper(host, OPTIONS);
});

afterEach(() => {
  zip.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the Zipper", () => {
  it("runs open to the far stop, then shut back to rest, and sleeps once still", async () => {
    const opened = await openSettled();
    expect(opened.open).toBe(true);
    expect(opened.progress).toBeCloseTo(1, 1);
    expect(zip.isOpen).toBe(true);
    expect(zip.slider.getAttribute("aria-expanded")).toBe("true");
    expect(vi.getTimerCount()).toBe(0);

    // Asked again while already open, it still answers.
    const again = whenDone(zip.open());
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect((await again).open).toBe(true);

    const closing = whenDone(zip.close());
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    const closed = await closing;
    expect(closed.open).toBe(false);
    expect(closed.progress).toBeCloseTo(0, 1);
    expect(zip.isOpen).toBe(false);
    expect(zip.slider.getAttribute("aria-expanded")).toBe("false");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("opens with ArrowDown, closes with ArrowUp, and toggles on Enter or Space", () => {
    const press = (key: string) =>
      zip.slider.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    press("ArrowDown");
    expect(zip.isOpen).toBe(true);
    press("ArrowUp");
    expect(zip.isOpen).toBe(false);
    // A button's Enter and Space arrive as a click with no pointer behind it.
    zip.slider.click();
    expect(zip.isOpen).toBe(true);
    // A pointer's click follows a release, which has already decided.
    zip.slider.dispatchEvent(new MouseEvent("click", { detail: 1 }));
    expect(zip.isOpen).toBe(true);
  });

  it("lets a touch the system takes go without a tap or a release", async () => {
    // Still and short, it would have been a tap.
    pointer("pointerdown", 20);
    pointer("pointercancel", 20);
    expect(zip.isOpen).toBe(false);

    // Pulled well past the threshold when the slider loses the pointer: a lift after that is no one's.
    pointer("pointerdown", 20);
    pointer("pointermove", 400);
    pointer("lostpointercapture", 400);
    pointer("pointerup", 400);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(zip.isOpen).toBe(false);
    expect(zip.progress).toBeCloseTo(0, 1);

    // Capture handed to the slider from the part touched isn't lost: the drag goes on.
    pointer("pointerdown", 20);
    pointer("lostpointercapture", 20, zip.el.querySelector(".zip__pull") ?? zip.slider);
    pointer("pointermove", 400);
    pointer("pointerup", 400);
    expect(zip.isOpen).toBe(true);
  });

  it("ignores a second finger on the pull while one holds it", async () => {
    pointer("pointerdown", 20);
    await vi.advanceTimersByTimeAsync(100);
    pointer("pointermove", 120);
    // A second finger taps the pull.
    pointer("pointerdown", 100, zip.slider, 2);
    await vi.advanceTimersByTimeAsync(80);
    pointer("pointerup", 100, zip.slider, 2);
    expect(zip.isOpen).toBe(false);

    // The first finger still holds it: pushed slowly back up and let go, it springs back shut.
    await vi.advanceTimersByTimeAsync(300);
    pointer("pointermove", 20);
    await vi.advanceTimersByTimeAsync(300);
    pointer("pointerup", 20);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(zip.isOpen).toBe(false);
    expect(zip.progress).toBeCloseTo(0, 1);
  });

  it("reads a release's speed from when each move was made, not when it was handled", async () => {
    // A slow pull, short of the threshold.
    pointer("pointerdown", 20);
    for (let y = 40; y <= 80; y += 20) {
      await vi.advanceTimersByTimeAsync(100);
      pointer("pointermove", y);
    }
    // Two small moves a frame apart and the release arrive together after a stall.
    const at = performance.now();
    const late = [
      stamped("pointermove", 83, at + 16),
      stamped("pointermove", 86, at + 32),
      stamped("pointerup", 86, at + 32),
    ];
    await vi.advanceTimersByTimeAsync(200);
    for (const e of late) zip.slider.dispatchEvent(e);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(zip.isOpen).toBe(false);
  });

  it.each([
    ["at once, runs open as flicked", 0, true],
    ["after a pause, springs back shut", 1000, false],
  ])("lets a quick tug short of the threshold go %s", async (_, pauseMs, opens) => {
    // Pulled down 20px a frame.
    pointer("pointerdown", 20);
    for (let y = 40; y <= 120; y += 20) {
      await vi.advanceTimersByTimeAsync(16);
      pointer("pointermove", y);
    }
    await vi.advanceTimersByTimeAsync(pauseMs);
    pointer("pointerup", 120);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(zip.isOpen).toBe(opens);
  });

  it("swings its pull out of the tape when the phone jolts and lets it fall back, not under reduced motion", async () => {
    const jolt = () =>
      window.dispatchEvent(
        Object.assign(new Event("devicemotion"), { acceleration: { x: 6, y: 1, z: 2 } }),
      );
    const rest = pullTurn();
    const sliderAt = zip.slider.style.transform;
    let frames = 0;
    zip.on("frame", () => frames++);
    jolt();
    expect(await highestTurn(400)).toBeGreaterThan(rest);
    // It falls back hanging down; the slider and the chain never moved.
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(pullTurn()).toBeCloseTo(rest, 1);
    expect(zip.slider.style.transform).toBe(sliderAt);
    expect(frames).toBe(0);
    expect(zip.isOpen).toBe(false);

    zip.destroy();
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    zip = createZipper(host, OPTIONS);
    jolt();
    expect(await highestTurn(400)).toBe(pullTurn());
  });

  it("turns its pull the way a hand pulls it, and lets it fall back hanging down, shut and open", async () => {
    const shut = pullTurn();
    expect(hangsDown()).toBe(true);
    await openSettled();
    const rest = pullTurn();
    expect(rest).toBeCloseTo(shut, 1);
    // Pushed up slowly, not flicked shut.
    pointer("pointerdown", 400);
    await vi.advanceTimersByTimeAsync(100);
    pointer("pointermove", 360);
    await vi.advanceTimersByTimeAsync(300);
    expect(hangsDown()).toBe(false);
    pointer("pointerup", 360);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(zip.isOpen).toBe(true);
    expect(pullTurn()).toBeCloseTo(rest, 1);
  });

  it("stops everything when destroyed and ignores later calls", async () => {
    void zip.open();
    await vi.advanceTimersByTimeAsync(50);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    zip.destroy();
    expect(host.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    const progress = zip.progress;
    expect(await zip.close()).toBe(true);
    zip.hint();
    zip.relax(0.2);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(vi.getTimerCount()).toBe(0);
    expect(zip.progress).toBe(progress);
    expect(zip.isOpen).toBe(true);
  });
});

describe("a release", () => {
  const past = RELEASE.threshold + 0.05;
  const short = RELEASE.threshold - 0.05;
  const flung = RELEASE.flick + 0.4;

  it("from shut, runs open past the threshold or on a flick down, and springs back otherwise", () => {
    expect(releaseOpens(past, 0, false)).toBe(true);
    expect(releaseOpens(short, 0, false)).toBe(false);
    expect(releaseOpens(0.05, flung, false)).toBe(true);
    // Pulled well past the threshold, then flung back up.
    expect(releaseOpens(0.6, -flung, false)).toBe(false);
  });

  it("from open, runs shut past the threshold or on a flick up, and springs back otherwise", () => {
    expect(releaseOpens(1 - past, 0, true)).toBe(false);
    expect(releaseOpens(1 - short, 0, true)).toBe(true);
    expect(releaseOpens(0.95, -flung, true)).toBe(false);
    // Pushed well past the threshold, then flung back down.
    expect(releaseOpens(0.4, flung, true)).toBe(true);
  });
});
