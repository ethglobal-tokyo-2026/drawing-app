// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPerformanceRecording,
  createPerformanceLog,
  describeDevice,
  describeLongFrame,
  isPerformanceRecorderOn,
  notePerformance,
  readPerformanceRecorderSetting,
  readPerformanceRecording,
  setPerformanceRecorder,
  SLOW_FRAMES_KEPT,
  startPerformanceRecorder,
  startPerformanceRecorderAtBoot,
  stopPerformanceRecorder,
  timeOurWork,
  type LongAnimationFrame,
  type PerformanceLog,
} from "./performanceRecorder";

const FRAME = 16.7;
const steady = (n: number, ms = FRAME) => Array.from({ length: n }, () => ms);

/** Frames for a log on a clock from 0: `run` plays intervals and returns when the last frame began. */
function framesFor(log: PerformanceLog) {
  let t = 0;
  log.frame(t);
  return (intervals: readonly number[]) => {
    for (const ms of intervals) {
      t += ms;
      log.frame(t);
    }
    return t;
  };
}

type Deliver = (entries: PerformanceEntry[]) => void;

/** PerformanceObserver for `types`, whose `observe` runs `observing` with what delivers it entries. */
function stubObservers(types: string[], observing: (deliver: Deliver) => void = () => {}) {
  vi.stubGlobal(
    "PerformanceObserver",
    class {
      static supportedEntryTypes = types;
      readonly deliver: Deliver;
      constructor(callback: PerformanceObserverCallback) {
        this.deliver = (entries) =>
          callback(
            { getEntries: () => entries, getEntriesByName: () => [], getEntriesByType: () => [] },
            this,
          );
      }
      observe() {
        observing(this.deliver);
      }
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
}

describe("the performance log", () => {
  it("counts a frame over one and a half typical frames as slow", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run([...steady(30), FRAME * 1.4, FRAME * 1.6, ...steady(80)]);
    const [slow, ...others] = log.slowFrames();
    expect(log.summary()).toMatchObject({ frames: 112, slow: 1 });
    expect(slow.end - slow.start).toBeCloseTo(FRAME * 1.6);
    expect(slow.typicalMs).toBeCloseTo(FRAME);
    expect(others).toEqual([]);
  });

  it("takes 30 fps as the typical frame when that's the pace", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run([...steady(30, 33.4), 45, 55, ...steady(60, 33.4)]);
    const summary = log.summary();
    expect(summary.slow).toBe(1);
    expect(summary.typicalMs).toBeCloseTo(33.4);
  });

  it("counts every frame of a run of long ones, as at the app's start", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run([120, 150, 90, 200, 110, ...steady(60)]);
    expect(log.summary().slow).toBe(5);
  });

  it("counts a frame over 50ms at a slower pace than 30 fps, and gives that pace as typical", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run([...steady(60, 45), 60, ...steady(60, 45)]);
    expect(log.summary()).toMatchObject({ slow: 1, typicalMs: 45 });
  });

  it("keeps a stall's own events when the stall is longer than the timeline", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    const start = run(steady(60));
    log.note({ at: start - 100, ms: 0, kind: "mark", detail: "before" });
    log.note({ at: start + 10, ms: 0, kind: "mark", detail: "during" });
    run([6000, ...steady(90)]);
    const [stall] = log.slowFrames();
    expect(stall.events.map((e) => e.detail)).toEqual(["before", "during"]);
  });

  it("skips the interval across a hidden page", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run(steady(30));
    log.pageHidden();
    run([5000, ...steady(10)]);
    const summary = log.summary();
    expect(summary).toMatchObject({ frames: 40, slow: 0 });
    expect(summary.recordedMs).toBeCloseTo(FRAME * 40);
  });

  it("keeps what happened from 250ms before a slow frame to its end, even when it's noted late", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    const start = run(steady(60));
    const mark = (offset: number, detail: string, ms = 0) =>
      log.note({ at: start + offset, ms, kind: "mark", detail });
    mark(-6000, "long gone");
    mark(-400, "spans into it", 200);
    mark(-300, "too early");
    mark(-200, "before");
    mark(10, "during");
    run([100]);
    // An observer's entry arrives after the frame it describes.
    mark(50, "noted late");
    mark(120, "after");
    run(steady(90));
    const [slow] = log.slowFrames();
    expect(slow.events.map((e) => e.detail)).toEqual([
      "spans into it",
      "before",
      "during",
      "noted late",
    ]);
  });

  it("keeps our work with the slow frame it was done in", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run(steady(30));
    log.addOurWork("gratitude", 4);
    log.addOurWork("light", 1);
    log.addOurWork("gratitude", 2);
    run([80]);
    log.addOurWork("gratitude", 9);
    run([FRAME, 80]);
    expect(log.slowFrames().map((f) => f.ours)).toEqual([
      { gratitude: { ms: 6, calls: 2 }, light: { ms: 1, calls: 1 } },
      {},
    ]);
  });

  it("keeps the latest slow frames, counts each screen's, and clears", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    log.setScreen("Sticker Board", 0);
    run(steady(30));
    const extra = 5;
    const starts: number[] = [];
    for (let i = 0; i < SLOW_FRAMES_KEPT + extra; i++)
      starts.push(run([80, ...steady(10)]) - 80 - FRAME * 10);
    log.setScreen("Send gratitude", starts.length);
    run([120, ...steady(10)]);

    const kept = log.slowFrames();
    expect(kept).toHaveLength(SLOW_FRAMES_KEPT);
    expect(kept[0].start).toBeCloseTo(starts[extra + 1]);
    const summary = log.summary();
    expect(summary.slow).toBe(SLOW_FRAMES_KEPT + extra + 1);
    expect(summary.worst).toMatchObject({ ms: 120, screen: "Send gratitude" });
    expect(Object.fromEntries(summary.byScreen)).toEqual({
      "Sticker Board": {
        frames: 30 + (SLOW_FRAMES_KEPT + extra) * 11,
        slow: SLOW_FRAMES_KEPT + extra,
      },
      "Send gratitude": { frames: 11, slow: 1 },
    });

    log.clear(5000);
    expect(log.summary()).toMatchObject({ startedAt: 5000, frames: 0, slow: 0, worst: null });
    expect(log.slowFrames()).toEqual([]);
  });

  it("sums up a watched stretch apart: only the frames that begin in it", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    const from = run(steady(30));
    log.watch("the 5s after the board was complete", from, 500);
    run([...steady(10), 60, ...steady(20)]);

    const [watched] = log.summary().windows;
    // Its 500ms take in 10 frames, the 60ms one and 17 more; the last 3 begin after it.
    expect(watched).toMatchObject({
      label: "the 5s after the board was complete",
      frames: 28,
      slow: 1,
      worst: { ms: 60 },
    });
    expect(watched.worst?.at).toBeCloseTo(from + FRAME * 10);
    expect(watched.intervals).toHaveLength(28);
    log.clear(5000);
    expect(log.summary().windows).toEqual([]);
  });
});

describe("a long animation frame's split", () => {
  it("parts script from rAF callbacks from style, layout and paint", () => {
    const frame: LongAnimationFrame = {
      entryType: "long-animation-frame",
      name: "long-animation-frame",
      startTime: 1000,
      duration: 140,
      renderStart: 1040,
      styleAndLayoutStart: 1052,
      scripts: [
        { duration: 30, forcedStyleAndLayoutDuration: 8, invoker: "FrameRequestCallback" },
        { duration: 6, forcedStyleAndLayoutDuration: 0, invoker: "BUTTON.onclick" },
      ],
      toJSON: () => ({}),
    };
    expect(describeLongFrame(frame)).toBe(
      "140ms: script 36ms (forced style and layout 8ms), rAF callbacks 12ms, style, layout and paint 88ms, longest script FrameRequestCallback 30ms",
    );
  });
});

describe("the recorder on the page", () => {
  let queued: FrameRequestCallback | null = null;
  let clock = 0;
  /** The browser starts a frame at `t`. */
  const frameAt = (t: number) => {
    clock = t;
    const run = queued;
    queued = null;
    run?.(t);
  };

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queued = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      queued = null;
    });
    vi.spyOn(performance, "now").mockImplementation(() => clock);
  });

  afterEach(() => {
    stopPerformanceRecorder();
    clearPerformanceRecording();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("costs a flag check while off: no loop, no listeners, and marks and timings pass through", () => {
    const listens = vi.spyOn(window, "addEventListener");
    notePerformance("gratitude", "tier-up");
    expect(timeOurWork("gratitude", () => 7)).toBe(7);
    expect(queued).toBeNull();
    expect(listens).not.toHaveBeenCalled();
    expect(readPerformanceRecording()).toBeNull();
  });

  it("records a slow frame with the marks and our work in it, then stops all it started", () => {
    document.title = "Send gratitude";
    const listens = vi.spyOn(window, "addEventListener");
    const unlistens = vi.spyOn(window, "removeEventListener");
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    clock = 330;
    notePerformance("gratitude", "tier-up オーバーヒート");
    timeOurWork("gratitude", () => {
      clock = 336;
    });
    frameAt(400);
    stopPerformanceRecorder();

    const recording = readPerformanceRecording();
    expect(recording?.summary).toMatchObject({ slow: 1 });
    const [slow] = recording?.slowFrames ?? [];
    expect(slow).toMatchObject({
      screen: "Send gratitude",
      ours: { gratitude: { ms: 6, calls: 1 } },
    });
    expect(slow.events.map((e) => e.detail)).toContain("tier-up オーバーヒート");
    expect(queued).toBeNull();
    const types = (calls: unknown[][]) =>
      calls.map(([type]) => String(type)).sort((a, b) => a.localeCompare(b));
    expect(types(unlistens.mock.calls)).toEqual(types(listens.mock.calls));
  });

  it("sums up each kind of pointer: contacts, hovering, pressure, contact size and samples a move", () => {
    startPerformanceRecorder();
    const sample = new PointerEvent("pointermove");
    const pen = (type: string, init: PointerEventInit) =>
      window.dispatchEvent(new PointerEvent(type, { pointerType: "pen", ...init }));
    const contact = { buttons: 1, width: 0.5, height: 0.5 };
    pen("pointermove", { buttons: 0 });
    pen("pointerdown", { ...contact, pressure: 0.1 });
    pen("pointermove", {
      ...contact,
      pressure: 0.9,
      coalescedEvents: [sample, sample, sample],
      predictedEvents: [sample],
    });
    pen("pointermove", { ...contact, pressure: 0.4, coalescedEvents: [sample] });
    window.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", buttons: 1, width: 30, height: 34 }),
    );

    const pointers = readPerformanceRecording()?.summary.pointers;
    expect(pointers?.get("pen")).toEqual({
      downs: 1,
      moves: 2,
      hovers: 1,
      pressure: { min: 0.1, max: 0.9 },
      width: { min: 0.5, max: 0.5 },
      height: { min: 0.5, max: 0.5 },
      coalesced: { total: 4, most: 3 },
      predicted: { total: 1, most: 1 },
    });
    expect(pointers?.get("touch")).toMatchObject({
      downs: 1,
      width: { min: 30, max: 30 },
      height: { min: 34, max: 34 },
    });
    clearPerformanceRecording();
    expect(readPerformanceRecording()?.summary.pointers.size).toBe(0);
  });

  it("notes a font event that names no faces, as WebKit's don't", () => {
    const fonts = new EventTarget();
    Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
    try {
      startPerformanceRecorder();
      for (let t = 0; t <= 320; t += 16) frameAt(t);
      clock = 330;
      fonts.dispatchEvent(new Event("loadingdone"));
      frameAt(400);

      const [slow] = readPerformanceRecording()?.slowFrames ?? [];
      expect(slow.events.filter((e) => e.kind === "font").map((e) => e.detail)).toEqual([
        "loadingdone",
      ]);
    } finally {
      Reflect.deleteProperty(document, "fonts");
    }
  });

  it("notes the network by host and path without URL.parse, and skips a name that isn't a URL", () => {
    // iOS before 18 has no URL.parse, and LINE's browser on an iPhone is the phone's Safari.
    vi.spyOn(URL, "parse").mockImplementation(() => {
      throw new TypeError("URL.parse is not a function");
    });
    let deliver: Deliver = () => {};
    stubObservers(["resource"], (observed) => {
      deliver = observed;
    });
    const fetched = (name: string) => ({
      entryType: "resource",
      name,
      startTime: 210,
      duration: 120,
      responseEnd: 330,
      toJSON: () => ({}),
    });
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    deliver([fetched("https://api.example.com/v1/me?code=private"), fetched("not a url")]);
    frameAt(400);

    const [slow] = readPerformanceRecording()?.slowFrames ?? [];
    expect(slow.events.filter((e) => e.kind === "network").map((e) => e.detail)).toEqual([
      "api.example.com/v1/me in 120ms",
    ]);
  });

  it("notes one slow input per tap or key press, and leaves out hover and mouse events", () => {
    // Hover and mouse compatibility events fire once per element under the finger: 16 seconds of
    // taps once made a report of 205,000 characters.
    let deliver: Deliver = () => {};
    stubObservers(["event"], (observed) => {
      deliver = observed;
    });
    const input = (name: string, interactionId: number) => ({
      entryType: "event",
      name,
      interactionId,
      startTime: 300,
      processingStart: 305,
      processingEnd: 306,
      duration: 96,
      target: null,
      toJSON: () => ({}),
    });
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    deliver([
      ...["pointerover", "pointerenter", "pointerleave", "mouseover", "mousedown"].map((name) =>
        input(name, 0),
      ),
      input("pointerdown", 7),
      input("pointerup", 7),
      input("click", 7),
      input("keydown", 9),
    ]);
    frameAt(400);

    const [slow] = readPerformanceRecording()?.slowFrames ?? [];
    expect(
      slow.events.filter((e) => e.kind === "slow input").map((e) => e.detail.split(" ")[0]),
    ).toEqual(["pointerdown", "keydown"]);
  });

  it("counts no frame across the time it was off, and lists no event twice after it starts again", () => {
    const fetch = {
      entryType: "resource",
      name: "https://api.example.com/v1/me",
      startTime: 300,
      duration: 30,
      responseEnd: 330,
      toJSON: () => ({}),
    };
    // Like a real observer's `buffered: true`, each start hands over what the page already had.
    let deliver: Deliver = () => {};
    stubObservers(["resource"], (observed) => {
      deliver = observed;
    });
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    deliver([fetch]);
    frameAt(400);
    stopPerformanceRecorder();

    clock = 60_400;
    startPerformanceRecorder();
    deliver([fetch]);
    for (let t = 60_400; t <= 62_000; t += 16) frameAt(t);

    const recording = readPerformanceRecording();
    expect(recording?.summary).toMatchObject({ slow: 1, worst: { ms: 80 } });
    const [slow, ...others] = recording?.slowFrames ?? [];
    expect(slow.events.filter((e) => e.kind === "network")).toHaveLength(1);
    expect(others).toEqual([]);
  });

  it("skips the time the page was hidden, even when a frame comes after it went hidden", () => {
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    frameAt(336);
    visibility = "visible";
    clock = 60_336;
    document.dispatchEvent(new Event("visibilitychange"));
    for (let t = 60_352; t <= 61_000; t += 16) frameAt(t);
    expect(readPerformanceRecording()?.summary).toMatchObject({ slow: 0, worst: { ms: 16 } });
  });

  it("notes a keydown with no key, as Android's autofill sends", () => {
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    clock = 330;
    window.dispatchEvent(new Event("keydown"));
    frameAt(400);
    const [slow] = readPerformanceRecording()?.slowFrames ?? [];
    expect(slow.events.map((e) => `${e.kind}: ${e.detail}`)).toContain(
      "key: Unidentified on the page",
    );
  });

  it("says what the device says, and when the clock moves in whole ms, as WebKit's does", () => {
    let t = 0;
    const now = vi.spyOn(performance, "now").mockImplementation(() => Math.floor((t += 0.3)));
    const device = describeDevice();
    expect(device).toMatch(/^User agent: .+\nPlatform: /);
    expect(device).toContain("\nLarge screen: ");
    expect(device).toMatch(/\nClock: 1ms steps$/);
    now.mockImplementation(() => (t += 0.005));
    expect(describeDevice()).not.toContain("Clock");
  });

  it("starts and stops at once from the switch, and keeps the setting for the next start", () => {
    setPerformanceRecorder(true);
    expect(queued).not.toBeNull();
    expect(readPerformanceRecorderSetting()).toBe(true);
    setPerformanceRecorder(false);
    expect(queued).toBeNull();
    expect(readPerformanceRecorderSetting()).toBe(false);
  });

  it("stops all it started when it can't start, and stays off", () => {
    stubObservers(["resource"], () => {
      throw new TypeError("observe failed");
    });
    const listens = vi.spyOn(window, "addEventListener");
    const unlistens = vi.spyOn(window, "removeEventListener");
    const onDocument = vi.spyOn(document, "addEventListener");
    const offDocument = vi.spyOn(document, "removeEventListener");
    expect(() => startPerformanceRecorder()).toThrow("observe failed");

    expect(isPerformanceRecorderOn()).toBe(false);
    expect(queued).toBeNull();
    const types = (calls: unknown[][]) =>
      calls.map(([type]) => String(type)).sort((a, b) => a.localeCompare(b));
    expect(listens).toHaveBeenCalled();
    expect(types(unlistens.mock.calls)).toEqual(types(listens.mock.calls));
    expect(types(offDocument.mock.calls)).toEqual(types(onDocument.mock.calls));
    expect(readPerformanceRecording()).toBeNull();
  });

  it("lets the app render when it can't start at boot, and turns its setting off", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    stubObservers(["resource"], () => {
      throw new TypeError("observe failed");
    });
    localStorage.setItem("draw.performanceRecorder", "on");

    expect(() => startPerformanceRecorderAtBoot()).not.toThrow();
    expect(isPerformanceRecorderOn()).toBe(false);
    expect(readPerformanceRecorderSetting()).toBe(false);
    expect(logged).toHaveBeenCalledWith(expect.any(String), expect.any(TypeError));
  });
});
