/**
 * The performance recorder, for phones where LINE's browser has no developer tools: every frame's
 * interval, judged against the typical frame, and what happened around each slow one, and each kind
 * of pointer seen, for checking a Pencil. Off, it costs
 * a flag check: no loop, no observers and no listeners, and `notePerformance` and `timeOurWork`
 * return at their first check.
 */

/** Something that happened, on the performance.now() clock. */
interface TimelineEvent {
  at: number;
  /** How long it lasted in ms; 0 for a moment. */
  ms: number;
  kind: string;
  detail: string;
}

/**
 * Our work under one label in a frame: its time, and how many `timeOurWork` calls it took. The
 * calls tell work apart from none where the clock moves in whole ms, as WebKit's does.
 */
interface OurWork {
  ms: number;
  calls: number;
}

/** A frame over `SLOW_FACTOR` typical frames, and what happened around it. */
export interface SlowFrame {
  /** Its interval: when the frame before it began, and when it began. */
  start: number;
  end: number;
  /** The typical frame it was judged against, in ms, but never over 30 fps's. */
  typicalMs: number;
  screen: string;
  /** Our own script time in it, by label. */
  ours: Record<string, OurWork>;
  /** What happened from `BEFORE_SLOW_MS` before it to its end, oldest first. */
  events: TimelineEvent[];
}

interface ScreenFrames {
  frames: number;
  slow: number;
}

/** The frames that began in a stretch of time, such as the 5s after the board was complete. */
export interface FrameWindow {
  label: string;
  /** When it starts, on the performance.now() clock, and how long it lasts. */
  from: number;
  ms: number;
  frames: number;
  slow: number;
  /** The longest frame, and when it began. */
  worst: { ms: number; at: number } | null;
  /** Each frame's interval, in order. */
  intervals: readonly number[];
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
  /** The stretches watched, oldest first. */
  windows: readonly FrameWindow[];
  /** Each kind of pointer seen, by its pointerType. */
  pointers: ReadonlyMap<string, PointerKindSummary>;
}

/** Lowest and highest of what was seen. */
export interface Span {
  min: number;
  max: number;
}

/** Samples moves carried: all of them, and the most in one move. */
export interface SampleCount {
  total: number;
  most: number;
}

/**
 * One kind of pointer while recording, for checking a Pencil on a real iPad: its contacts and its
 * hovering, how hard and how big its contact was, and the samples each move carried.
 */
export interface PointerKindSummary {
  /** Contacts begun, and moves in contact. */
  downs: number;
  moves: number;
  /** Moves with nothing pressed: a Pencil hovering, or a mouse. */
  hovers: number;
  /** In contact: the pressure, and the contact's width and height in CSS px; null before any contact. */
  pressure: Span | null;
  width: Span | null;
  height: Span | null;
  /** Each move in contact's coalesced and predicted samples; null where the browser has no such list. */
  coalesced: SampleCount | null;
  predicted: SampleCount | null;
}

/** A pointerdown or pointermove, as the recorder keeps it. */
interface PointerSample {
  kind: "down" | "move";
  pointerType: string;
  /** A button or the contact is down. */
  pressed: boolean;
  pressure: number;
  width: number;
  height: number;
  /** Its coalesced and predicted samples; null where the browser has no such list. */
  coalesced: number | null;
  predicted: number | null;
}

export interface PerformanceLog {
  /** A frame began at `now`: the interval since the one before is judged. */
  frame: (now: number) => void;
  /** The page went hidden or came back, so the interval to the next frame is no frame. */
  pageHidden: () => void;
  /**
   * Recording stops. The slow frames still waiting take the events they have, since no more are
   * coming, and the time until it starts again is no frame.
   */
  pause: () => void;
  note: (event: TimelineEvent) => void;
  /** A pointer pressed or moved. */
  notePointer: (sample: PointerSample) => void;
  /** Our own script time, counted in the frame in progress. */
  addOurWork: (label: string, ms: number) => void;
  /** Sums up, apart, the frames that begin in the `ms` from `from`. */
  watch: (label: string, from: number, ms: number) => void;
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
/**
 * The slowest pace a phone keeps, 30 fps: the typical frame before any interval, and the most a frame
 * is judged against, so a run of long frames, as at the app's start, can't raise the bar for itself.
 */
const FIRST_TYPICAL_MS = 1000 / 30;
/** The timeline keeps this much. */
const TIMELINE_MS = 5000;
/** A slow frame keeps what happened from this long before it. */
const BEFORE_SLOW_MS = 250;
/** Observers report a frame after it ends, so a slow frame waits this long before taking its events. */
const SETTLE_MS = 1000;
export const SLOW_FRAMES_KEPT = 60;

const widen = (span: Span | null, value: number): Span =>
  span
    ? { min: Math.min(span.min, value), max: Math.max(span.max, value) }
    : { min: value, max: value };

const tally = (count: SampleCount | null, samples: number | null): SampleCount | null =>
  samples === null
    ? count
    : { total: (count?.total ?? 0) + samples, most: Math.max(count?.most ?? 0, samples) };

const NO_POINTER: PointerKindSummary = {
  downs: 0,
  moves: 0,
  hovers: 0,
  pressure: null,
  width: null,
  height: null,
  coalesced: null,
  predicted: null,
};

/** The recording, on the clock its caller passes in. */
export function createPerformanceLog(now: number): PerformanceLog {
  let startedAt = now;
  let screen = "";
  let timeline: TimelineEvent[] = [];
  let intervals: number[] = [];
  const sorting = new Float64Array(TYPICAL_OF);
  let last: number | null = null;
  let hidden = false;
  let ours: Record<string, OurWork> | null = null;
  let pending: SlowFrame[] = [];
  let kept: SlowFrame[] = [];
  let frames = 0;
  let slow = 0;
  let recordedMs = 0;
  let worst: PerformanceSummary["worst"] = null;
  const byScreen = new Map<string, ScreenFrames>();
  let windows: (FrameWindow & { intervals: number[] })[] = [];
  const pointers = new Map<string, PointerKindSummary>();

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
      const typical = Math.min(typicalMs(), FIRST_TYPICAL_MS);
      intervals.push(ms);
      if (intervals.length > TYPICAL_OF) intervals.shift();
      frames++;
      recordedMs += ms;
      const counts = countsOnScreen();
      counts.frames++;
      if (!worst || ms > worst.ms) worst = { ms, at: before, screen };
      const isSlow = ms > SLOW_FACTOR * typical;
      for (const w of windows) {
        if (before < w.from || before >= w.from + w.ms) continue;
        w.frames++;
        w.intervals.push(ms);
        if (isSlow) w.slow++;
        if (!w.worst || ms > w.worst.ms) w.worst = { ms, at: before };
      }
      if (isSlow) {
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
      // What no slow frame can still take goes; a stall longer than the timeline keeps its own.
      const from = Math.min(now - TIMELINE_MS, (pending[0]?.start ?? Infinity) - BEFORE_SLOW_MS);
      while (timeline.length > 0 && timeline[0].at + timeline[0].ms < from) timeline.shift();
    },
    pageHidden: () => {
      hidden = true;
    },
    pause: () => {
      settle();
      last = null;
      hidden = false;
      ours = null;
    },
    note,
    notePointer: (sample) => {
      const was = pointers.get(sample.pointerType) ?? NO_POINTER;
      if (!sample.pressed) {
        // A move with nothing pressed hovers; a press with nothing pressed isn't one.
        if (sample.kind === "move")
          pointers.set(sample.pointerType, { ...was, hovers: was.hovers + 1 });
        return;
      }
      const down = sample.kind === "down";
      pointers.set(sample.pointerType, {
        ...was,
        downs: was.downs + (down ? 1 : 0),
        moves: was.moves + (down ? 0 : 1),
        pressure: widen(was.pressure, sample.pressure),
        width: widen(was.width, sample.width),
        height: widen(was.height, sample.height),
        coalesced: down ? was.coalesced : tally(was.coalesced, sample.coalesced),
        predicted: down ? was.predicted : tally(was.predicted, sample.predicted),
      });
    },
    addOurWork: (label, ms) => {
      ours ??= {};
      const work = (ours[label] ??= { ms: 0, calls: 0 });
      work.ms += ms;
      work.calls++;
    },
    watch: (label, from, ms) => {
      windows.push({ label, from, ms, frames: 0, slow: 0, worst: null, intervals: [] });
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
      windows: windows.map((w) => ({ ...w, intervals: [...w.intervals] })),
      // Each record is replaced, never changed in place, so a shallow copy holds still.
      pointers: new Map(pointers),
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
      windows = [];
      pointers.clear();
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

/**
 * While recording, the frames that begin in the `ms` from `from` are summed up apart, under `label`,
 * such as the 5s after the board was complete.
 */
export function watchFrames(label: string, from: number, ms: number): void {
  if (!stopRecording) return;
  log?.watch(label, from, ms);
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

/** Throws, with nothing left running, when it can't start. */
export function startPerformanceRecorder(): void {
  if (stopRecording) return;
  const recording = log ?? createPerformanceLog(performance.now());
  stopRecording = listen(recording);
  log = recording;
}

/**
 * At the app's start: records from boot while the setting is on. It never throws, so the app renders
 * whatever happens; a recorder that can't start logs why and turns its setting off.
 */
export function startPerformanceRecorderAtBoot(): void {
  if (!readPerformanceRecorderSetting()) return;
  try {
    startPerformanceRecorder();
  } catch (error) {
    console.error("The performance recorder couldn't start, so its setting is now off", error);
    try {
      localStorage.removeItem(SETTING);
    } catch (removing) {
      console.error("The performance recorder's setting couldn't be removed", removing);
    }
  }
}

export function stopPerformanceRecorder(): void {
  if (!stopRecording) return;
  stopRecording();
  stopRecording = null;
  // Else a start without Clear would count the time off as a frame, and the new observers' buffered
  // entries would reach the slow frames still waiting a second time.
  log?.pause();
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

/** The phone and browser, for the report, and the clock's step where it's a whole ms or more. */
export function describeDevice(): string {
  const { width, height } = window.screen;
  const step = clockStepMs();
  const clock = step >= 1 ? `, clock in ${Math.round(step)}ms steps` : "";
  return `${navigator.userAgent}\nScreen ${width}×${height} at ${devicePixelRatio}x, window ${innerWidth}×${innerHeight}${clock}`;
}

/**
 * How far performance.now() moves at a time, in ms, read to its next tick and then over one whole
 * step: at most 2ms of reads where it moves in whole ms. 0 for a clock that doesn't move.
 */
function clockStepMs(): number {
  const tickAfter = (from: number) => {
    for (let reads = 0; reads < 100_000; reads++) {
      const now = performance.now();
      if (now !== from) return now;
    }
    return from;
  };
  const tick = tickAfter(performance.now());
  return tickAfter(tick) - tick;
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
/**
 * The events of a tap or a key press. Hover and mouse compatibility events are left out: they fire
 * once per element under the finger, and would bury the report.
 */
const INPUT_EVENTS = new Set(["pointerdown", "pointerup", "click", "keydown", "keyup"]);
/** Taps and key presses already noted, by the browser's interaction ID; forgotten past this many. */
const INPUTS_KEPT = 256;

const ms = (value: number) => `${Math.round(value)}ms`;

/**
 * A fetch's host and path, without its query, or null for a name that isn't a URL. Not `URL.parse`:
 * iOS has it only from 18, and LINE's browser there is the phone's Safari.
 */
function hostAndPath(name: string): string | null {
  try {
    const url = new URL(name);
    return `${url.host}${url.pathname}`;
  } catch {
    return null;
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

/** The parts of a PointerEvent the recorder reads; before iOS 18.2 there are no sample lists. */
interface PointerReading {
  type: string;
  pointerType: string;
  buttons: number;
  pressure: number;
  width: number;
  height: number;
  getCoalescedEvents?: () => readonly unknown[];
  getPredictedEvents?: () => readonly unknown[];
}

const readPointer = (e: PointerReading): PointerSample => ({
  kind: e.type === "pointerdown" ? "down" : "move",
  pointerType: e.pointerType,
  pressed: e.buttons !== 0,
  pressure: e.pressure,
  width: e.width,
  height: e.height,
  coalesced: e.getCoalescedEvents?.().length ?? null,
  predicted: e.getPredictedEvents?.().length ?? null,
});

/**
 * Everything the recorder hears on the page; returns what stops it all. When any of it can't start,
 * what did start stops before the error goes on.
 */
function listen(log: PerformanceLog): () => void {
  const stops: (() => void)[] = [];
  const stopAll = () => {
    for (const stop of stops.splice(0)) stop();
  };
  try {
    startListening(log, stops);
  } catch (error) {
    stopAll();
    throw error;
  }
  return stopAll;
}

/** Starts the loop, the listeners and the observers, adding what stops each to `stops` as it starts. */
function startListening(log: PerformanceLog, stops: (() => void)[]): void {
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
  hear("pointerdown", (e) => {
    onTap(e);
    log.notePointer(readPointer(e));
  });
  hear("pointerup", onTap);
  // Every move, for the pointers' summary: even a Pencil's rate of events is no load for this.
  hear("pointermove", (e) => log.notePointer(readPointer(e)));
  // Only named keys: what someone types stays theirs. Android's autofill sends a keydown with no key.
  hear("keydown", (e) => {
    const key = typeof e.key === "string" ? e.key : "Unidentified";
    note("key", `${key.length === 1 ? "a character" : key} on ${describeTarget(e.target)}`);
  });
  hear("resize", () => note("resize", `${innerWidth}×${innerHeight}`));

  // Coming back too: a frame can come after the page goes hidden, and take the skip with it.
  const onVisibility = () => {
    log.pageHidden();
    note("visibility", document.visibilityState);
  };
  document.addEventListener("visibilitychange", onVisibility);
  stops.push(() => document.removeEventListener("visibilitychange", onVisibility));

  // Every browser the app runs in has document.fonts; happy-dom doesn't.
  const fonts: FontFaceSet | undefined = document.fonts;
  if (fonts) {
    const onFonts = (e: FontFaceSetLoadEvent) => {
      // WebKit's events carry no fontfaces, so there they say only what happened.
      const faces: readonly FontFace[] | undefined = e.fontfaces;
      const families = faces ? [...new Set(faces.map((face) => face.family))].join(", ") : "";
      note("font", families ? `${e.type} ${families}` : e.type);
    };
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
    stops.push(() => {
      // What the browser has queued but not yet delivered still counts.
      for (const entry of observer.takeRecords()) take(entry);
      observer.disconnect();
    });
  };
  observe("resource", { buffered: true }, (entry) => {
    if (!isResource(entry)) return;
    const where = hostAndPath(entry.name);
    if (where !== null) note("network", `${where} in ${ms(entry.duration)}`, entry.responseEnd);
  });
  observe("long-animation-frame", { buffered: true }, (entry) => {
    if (isLongAnimationFrame(entry)) {
      note("long frame", describeLongFrame(entry), entry.startTime, entry.duration);
    }
  });
  // One line per tap or key press: its events share one interaction ID, where the browser gives one.
  const inputsNoted = new Set<number>();
  observe("event", { buffered: true, durationThreshold: SLOW_INPUT_MS }, (entry) => {
    if (!isSlowInput(entry) || entry.duration < SLOW_INPUT_MS || !INPUT_EVENTS.has(entry.name)) {
      return;
    }
    const interaction = entry.interactionId ?? 0;
    if (interaction > 0) {
      if (inputsNoted.has(interaction)) return;
      if (inputsNoted.size >= INPUTS_KEPT) inputsNoted.clear();
      inputsNoted.add(interaction);
    }
    note("slow input", describeSlowInput(entry), entry.startTime, entry.duration);
  });
}
