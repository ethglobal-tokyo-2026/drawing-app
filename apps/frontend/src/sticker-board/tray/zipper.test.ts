// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createZipper, releaseOpens, type Zipper } from "./zipper";

let host: HTMLDivElement;
let zip: Zipper;

/** The tray's options. */
const OPTIONS = { chainAt: 190, insets: [6, 6], maxGap: 172 } as const;
/** Long enough for any run to end and the pull to stop swinging. */
const SETTLE_MS = 10_000;

/** Resolves with what `run` resolved, and the slider's progress at that moment. */
const whenDone = (run: Promise<boolean>) => run.then((open) => ({ open, progress: zip.progress }));

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
  Object.defineProperties(host, { clientWidth: { value: 205 }, clientHeight: { value: 677 } });
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
    const opening = whenDone(zip.open());
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    const opened = await opening;
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

  it("opens with ArrowDown, closes with Escape, and toggles on Enter or Space", () => {
    const press = (key: string) =>
      zip.slider.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    press("ArrowDown");
    expect(zip.isOpen).toBe(true);
    press("Escape");
    expect(zip.isOpen).toBe(false);
    // A button's Enter and Space arrive as a click with no pointer behind it.
    zip.slider.click();
    expect(zip.isOpen).toBe(true);
    // A pointer's click follows a release, which has already decided.
    zip.slider.dispatchEvent(new MouseEvent("click", { detail: 1 }));
    expect(zip.isOpen).toBe(true);
  });

  it("swings its pull when the phone jolts, but not under reduced motion", async () => {
    const jolt = () =>
      window.dispatchEvent(
        Object.assign(new Event("devicemotion"), { acceleration: { x: 6, y: 1, z: 0 } }),
      );
    const swing = () => {
      const pull = zip.el.querySelector<HTMLElement>(".zip__flop")?.style.transform ?? "";
      return parseFloat(/rotate\((-?[\d.]+)deg\)/.exec(pull)?.[1] ?? "NaN");
    };
    jolt();
    await vi.advanceTimersByTimeAsync(100);
    expect(Math.abs(swing())).toBeGreaterThan(1);
    expect(zip.isOpen).toBe(false);

    zip.destroy();
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    zip = createZipper(host, OPTIONS);
    jolt();
    await vi.advanceTimersByTimeAsync(100);
    expect(swing()).toBe(0);
  });

  it("stops everything when destroyed and ignores later calls", async () => {
    void zip.open();
    zip.shake();
    await vi.advanceTimersByTimeAsync(50);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    zip.destroy();
    expect(host.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    const progress = zip.progress;
    expect(await zip.close()).toBe(true);
    zip.hint();
    zip.shake();
    zip.nudge(8, 8);
    zip.relax(0.2);
    zip.set({ progress: 0.5 });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(vi.getTimerCount()).toBe(0);
    expect(zip.progress).toBe(progress);
    expect(zip.isOpen).toBe(true);
  });
});

describe("a release", () => {
  const rule = { threshold: 0.25, flick: 1.6 };
  const opens = (progress: number, velocity: number, wasOpen: boolean) =>
    releaseOpens(progress, velocity, wasOpen, rule);

  it("from shut, runs open past the threshold or on a flick down, and springs back otherwise", () => {
    expect(opens(0.3, 0, false)).toBe(true);
    expect(opens(0.2, 0, false)).toBe(false);
    expect(opens(0.05, 2, false)).toBe(true);
    // Pulled well past the threshold, then flung back up.
    expect(opens(0.6, -2, false)).toBe(false);
  });

  it("from open, runs shut past the threshold or on a flick up, and springs back otherwise", () => {
    expect(opens(0.7, 0, true)).toBe(false);
    expect(opens(0.8, 0, true)).toBe(true);
    expect(opens(0.95, -2, true)).toBe(false);
    // Pushed well past the threshold, then flung back down.
    expect(opens(0.4, 2, true)).toBe(true);
  });
});
