/**
 * The performance recorder, for phones where LINE's browser has no developer tools: every frame's
 * interval, judged against the typical frame, and what happened around each slow one. Off, it costs
 * nothing: no loop, no observers and no listeners, and `notePerformance` and `timeOurWork` return
 * at their first check.
 */

/** Something that happened, on the performance.now() clock. */
interface TimelineEvent {
  at: number;
  /** How long it lasted in ms; 0 for a moment. */
  ms: number;
  kind: string;
  detail: string;
}

/** A frame over `SLOW_FACTOR` typical frames, and what happened around it. */
export interface SlowFrame {
  /** Its interval: when the frame before it began, and when it began. */
  start: number;
  end: number;
  /** The typical frame it was judged against, in ms. */
  typicalMs: number;
  screen: string;
  /** Our own script time in it, in ms by label. */
  ours: Record<string, number>;
  /** What happened from `BEFORE_SLOW_MS` before it to its end, oldest first. */
  events: TimelineEvent[];
}

interface ScreenFrames {
  frames: number;
  slow: number;
}

export interface PerformanceSummary {
  /** When the recording began, on the performance.now() clock. */
  startedAt: number;
  /** The frames' time: the time on screen, without the time the page was hidden. */
  recordedMs: number;
  frames: number;
  slow: number;
  worst: { ms: number; at: number; screen: string } | null;
  /** The median of the latest intervals; 0 before the first. */
  typicalMs: number;
  byScreen: ReadonlyMap<string, ScreenFrames>;
}

export interface PerformanceLog {
  /** A frame began at `now`: the interval since the one before is judged. */
  frame: (now: number) => void;
  /** The page went hidden, so the interval across it is no frame. */
  pageHidden: () => void;
  note: (event: TimelineEvent) => void;
  /** Our own script time, counted in the frame in progress. */
  addOurWork: (label: string, ms: number) => void;
  setScreen: (screen: string, at: number) => void;
  summary: () => PerformanceSummary;
  /** The kept slow frames, oldest first; those still waiting on late events settle now. */
  slowFrames: () => readonly SlowFrame[];
  clear: (now: number) => void;
}

/** A frame is slow over this many typical frames. */
const SLOW_FACTOR = 1.5;
/** The typical frame is the median of this many latest intervals. */
const TYPICAL_OF = 120;
/** Before any interval, the typical frame is the slowest pace a phone keeps: 30 fps. */
const FIRST_TYPICAL_MS = 1000 / 30;
/** The timeline keeps this much. */
const TIMELINE_MS = 5000;
/** A slow frame keeps what happened from this long before it. */
const BEFORE_SLOW_MS = 250;
/** Observers report a frame after it ends, so a slow frame waits this long before taking its events. */
const SETTLE_MS = 1000;
export const SLOW_FRAMES_KEPT = 60;

/** The recording, on the clock its caller passes in. */
export function createPerformanceLog(now: number): PerformanceLog {
  let startedAt = now;
  let screen = "";
  let timeline: TimelineEvent[] = [];
  let intervals: number[] = [];
  const sorting = new Float64Array(TYPICAL_OF);
  let last: number | null = null;
  let hidden = false;
  let ours: Record<string, number> | null = null;
  let pending: SlowFrame[] = [];
  let kept: SlowFrame[] = [];
  let frames = 0;
  let slow = 0;
  let recordedMs = 0;
  let worst: PerformanceSummary["worst"] = null;
  const byScreen = new Map<string, ScreenFrames>();

  const typicalMs = () => {
    const n = intervals.length;
    if (n === 0) return FIRST_TYPICAL_MS;
    sorting.set(intervals);
    const latest = sorting.subarray(0, n).sort();
    const mid = n >> 1;
    return n % 2 === 1 ? latest[mid] : (latest[mid - 1] + latest[mid]) / 2;
  };

  const countsOnScreen = () => {
    let counts = byScreen.get(screen);
    if (!counts) {
      counts = { frames: 0, slow: 0 };
      byScreen.set(screen, counts);
    }
    return counts;
  };

  const note = (event: TimelineEvent) => {
    let i = timeline.length;
    while (i > 0 && timeline[i - 1].at > event.at) i--;
    timeline.splice(i, 0, event);
  };

  const keep = (frame: SlowFrame) => {
    const from = frame.start - BEFORE_SLOW_MS;
    frame.events = timeline.filter((e) => e.at + e.ms >= from && e.at <= frame.end);
    kept.push(frame);
    if (kept.length > SLOW_FRAMES_KEPT) kept.shift();
  };

  /** Slow frames that ended `SETTLE_MS` before `now` (all of them, with no `now`) take their events. */
  const settle = (now = Infinity) => {
    let due = 0;
    while (due < pending.length && now - pending[due].end >= SETTLE_MS) due++;
    for (const frame of pending.splice(0, due)) keep(frame);
  };

  return {
    frame: (now) => {
      const spent = ours;
      ours = null;
      const before = last;
      last = now;
      if (before === null || hidden) {
        hidden = false;
        return;
      }
      const ms = now - before;
      const typical = typicalMs();
      intervals.push(ms);
      if (intervals.length > TYPICAL_OF) intervals.shift();
      frames++;
      recordedMs += ms;
      const counts = countsOnScreen();
      counts.frames++;
      if (!worst || ms > worst.ms) worst = { ms, at: before, screen };
      if (ms > SLOW_FACTOR * typical) {
        slow++;
        counts.slow++;
        pending.push({
          start: before,
          end: now,
          typicalMs: typical,
          screen,
          ours: spent ?? {},
          events: [],
        });
      }
      settle(now);
      // What no slow frame can still take goes.
      while (timeline.length > 0 && timeline[0].at + timeline[0].ms < now - TIMELINE_MS) {
        timeline.shift();
      }
    },
    pageHidden: () => {
      hidden = true;
    },
    note,
    addOurWork: (label, ms) => {
      ours ??= {};
      ours[label] = (ours[label] ?? 0) + ms;
    },
    setScreen: (next, at) => {
      screen = next;
      note({ at, ms: 0, kind: "screen", detail: next });
    },
    summary: () => ({
      startedAt,
      recordedMs,
      frames,
      slow,
      worst,
      typicalMs: intervals.length > 0 ? typicalMs() : 0,
      byScreen: new Map(
        [...byScreen].map(([name, counts]): [string, ScreenFrames] => [name, { ...counts }]),
      ),
    }),
    slowFrames: () => {
      settle();
      return [...kept];
    },
    clear: (now) => {
      startedAt = now;
      timeline = [];
      intervals = [];
      last = null;
      hidden = false;
      ours = null;
      pending = [];
      kept = [];
      frames = 0;
      slow = 0;
      recordedMs = 0;
      worst = null;
      byScreen.clear();
    },
  };
}

// ---------------------------------------------------------------- on the page

const SETTING = "draw.performanceRecorder";
/** Input slower than this to its next paint is noted. */
const SLOW_INPUT_MS = 48;

/** What's been recorded, running or stopped, until Clear. */
let log: PerformanceLog | null = null;
/** Stops the running recorder's loop, observers and listeners; null while it's off. */
let stopRecording: (() => void) | null = null;

/** An app mark on the timeline, such as a tier-up. */
export function notePerformance(kind: string, detail: string): void {
  if (!stopRecording) return;
  log?.note({ at: performance.now(), ms: 0, kind, detail });
}

/** Runs `work`; while recording, its time counts as ours, under `label`, in the frame in progress. */
export function timeOurWork<T>(label: string, work: () => T): T {
  if (!stopRecording) return work();
  const began = performance.now();
  try {
    return work();
  } finally {
    log?.addOurWork(label, performance.now() - began);
  }
}

export const isPerformanceRecorderOn = () => stopRecording !== null;

export function readPerformanceRecorderSetting(): boolean {
  try {
    return localStorage.getItem(SETTING) === "on";
  } catch (error) {
    console.error("The performance recorder's setting couldn't be read", error);
    return false;
  }
}

/** Starts or stops recording at once, and keeps the setting for the app's next start; throws when it can't. */
export function setPerformanceRecorder(on: boolean): void {
  if (on) startPerformanceRecorder();
  else stopPerformanceRecorder();
  if (on) localStorage.setItem(SETTING, "on");
  else localStorage.removeItem(SETTING);
}

export function startPerformanceRecorder(): void {
  if (stopRecording) return;
  log ??= createPerformanceLog(performance.now());
  stopRecording = listen(log);
}

export function stopPerformanceRecorder(): void {
  stopRecording?.();
  stopRecording = null;
}

/** Empties the recording; a running recorder records on from now. */
export function clearPerformanceRecording(): void {
  if (stopRecording) log?.clear(performance.now());
  else log = null;
}

/** For the slip's line: it leaves slow frames still waiting on late events waiting. */
export const readPerformanceSummary = (): PerformanceSummary | null => log?.summary() ?? null;

/** What the report needs, or null before anything was recorded. */
export function readPerformanceRecording(): {
  summary: PerformanceSummary;
  slowFrames: readonly SlowFrame[];
} | null {
  return log && { summary: log.summary(), slowFrames: log.slowFrames() };
}

/** The phone and browser, for the report. */
export function describeDevice(): string {
  const { width, height } = window.screen;
  return `${navigator.userAgent}\nScreen ${width}×${height} at ${devicePixelRatio}x, window ${innerWidth}×${innerHeight}`;
}

/** Chromium's long animation frame entry, which TypeScript's DOM types don't have yet. */
export interface LongAnimationFrame extends PerformanceEntry {
  readonly renderStart: number;
  readonly styleAndLayoutStart: number;
  readonly scripts: readonly LongFrameScript[];
}
interface LongFrameScript {
  readonly duration: number;
  readonly forcedStyleAndLayoutDuration: number;
  readonly invoker: string;
}

const isResource = (entry: PerformanceEntry): entry is PerformanceResourceTiming =>
  entry.entryType === "resource";
const isLongAnimationFrame = (entry: PerformanceEntry): entry is LongAnimationFrame =>
  entry.entryType === "long-animation-frame";
const isSlowInput = (entry: PerformanceEntry): entry is PerformanceEventTiming =>
  entry.entryType === "event";

const ms = (value: number) => `${Math.round(value)}ms`;

/** A fetch's host and path. Not `URL.parse`: iOS has it only from 18, and LINE's browser there is the phone's Safari. */
function hostAndPath(name: string): string {
  try {
    const url = new URL(name);
    return `${url.host}${url.pathname}`;
  } catch {
    return name;
  }
}

/** What a tap or a key landed on: a control's name, or the element's tag and first class. */
function describeTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "the page";
  const control = target.closest("button, a, label, [role='button']");
  const el = control ?? target;
  const name =
    el.getAttribute("aria-label") ?? (control?.textContent ?? "").replace(/\s+/g, " ").trim();
  const tag = el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : "");
  return name ? `${tag} "${name}"` : tag;
}

/** Where a long frame's time went: script, rAF callbacks, and style, layout and paint. */
export function describeLongFrame(frame: LongAnimationFrame): string {
  const end = frame.startTime + frame.duration;
  let script = 0;
  let forced = 0;
  let longest: LongFrameScript | null = null;
  for (const s of frame.scripts) {
    script += s.duration;
    forced += s.forcedStyleAndLayoutDuration;
    if (!longest || s.duration > longest.duration) longest = s;
  }
  const layoutFrom = frame.styleAndLayoutStart || end;
  const parts = [
    `script ${ms(script)}${forced > 0 ? ` (forced style and layout ${ms(forced)})` : ""}`,
    `rAF callbacks ${ms(frame.renderStart ? layoutFrom - frame.renderStart : 0)}`,
    `style, layout and paint ${ms(frame.styleAndLayoutStart ? end - frame.styleAndLayoutStart : 0)}`,
  ];
  if (longest) parts.push(`longest script ${longest.invoker} ${ms(longest.duration)}`);
  return `${ms(frame.duration)}: ${parts.join(", ")}`;
}

/** Where slow input's time went: waiting, its handlers, and on to the next paint. */
function describeSlowInput(input: PerformanceEventTiming): string {
  const waited = input.processingStart - input.startTime;
  const handled = input.processingEnd - input.processingStart;
  const painted = input.startTime + input.duration - input.processingEnd;
  return `${input.name} ${ms(input.duration)}: waited ${ms(waited)}, handlers ${ms(handled)}, then ${ms(painted)} to paint, on ${describeTarget(input.target)}`;
}

/** Everything the recorder hears on the page; returns what stops it all. */
function listen(log: PerformanceLog): () => void {
  const stops: (() => void)[] = [];
  const note = (kind: string, detail: string, at = performance.now(), duration = 0) =>
    log.note({ at, ms: duration, kind, detail });

  let raf = 0;
  let title: string | null = null;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (document.title !== title) {
      title = document.title;
      log.setScreen(title, now);
    }
    log.frame(now);
  };
  raf = requestAnimationFrame(tick);
  stops.push(() => cancelAnimationFrame(raf));

  const hear = <K extends keyof WindowEventMap>(type: K, heard: (e: WindowEventMap[K]) => void) => {
    window.addEventListener(type, heard, { capture: true, passive: true });
    stops.push(() => window.removeEventListener(type, heard, { capture: true }));
  };
  const onTap = (e: PointerEvent) => note("tap", `${e.type} ${describeTarget(e.target)}`);
  hear("pointerdown", onTap);
  hear("pointerup", onTap);
  // Only named keys: what someone types stays theirs.
  hear("keydown", (e) =>
    note("key", `${e.key.length === 1 ? "a character" : e.key} on ${describeTarget(e.target)}`),
  );
  hear("resize", () => note("resize", `${innerWidth}×${innerHeight}`));

  const onVisibility = () => {
    if (document.visibilityState === "hidden") log.pageHidden();
    note("visibility", document.visibilityState);
  };
  document.addEventListener("visibilitychange", onVisibility);
  stops.push(() => document.removeEventListener("visibilitychange", onVisibility));

  // Every browser the app runs in has document.fonts; happy-dom doesn't.
  const fonts: FontFaceSet | undefined = document.fonts;
  if (fonts) {
    const onFonts = (e: FontFaceSetLoadEvent) =>
      note("font", `${e.type} ${[...new Set(e.fontfaces.map((face) => face.family))].join(", ")}`);
    for (const type of ["loading", "loadingdone", "loadingerror"] as const) {
      fonts.addEventListener(type, onFonts);
      stops.push(() => fonts.removeEventListener(type, onFonts));
    }
  }

  const observe = (
    type: string,
    options: PerformanceObserverInit & { durationThreshold?: number },
    take: (entry: PerformanceEntry) => void,
  ) => {
    if (typeof PerformanceObserver !== "function") return;
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) take(entry);
    });
    const init = { ...options, type };
    observer.observe(init);
    stops.push(() => observer.disconnect());
  };
  observe("resource", { buffered: true }, (entry) => {
    if (!isResource(entry)) return;
    note("network", `${hostAndPath(entry.name)} in ${ms(entry.duration)}`, entry.responseEnd);
  });
  observe("long-animation-frame", { buffered: true }, (entry) => {
    if (isLongAnimationFrame(entry)) {
      note("long frame", describeLongFrame(entry), entry.startTime, entry.duration);
    }
  });
  observe("event", { buffered: true, durationThreshold: SLOW_INPUT_MS }, (entry) => {
    if (isSlowInput(entry) && entry.duration >= SLOW_INPUT_MS) {
      note("slow input", describeSlowInput(entry), entry.startTime, entry.duration);
    }
  });

  return () => {
    for (const stop of stops.splice(0)) stop();
  };
}
