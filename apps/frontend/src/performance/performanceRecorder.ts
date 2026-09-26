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
