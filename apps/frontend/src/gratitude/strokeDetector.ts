/** A run along the thumb's path, ended by the thumb doubling back. */
export interface StrokePass {
  /** px along the run. */
  length: number;
  /** px/ms over the run. */
  speed: number;
  fast: boolean;
  /** The run, end to end, and where the thumb turned. */
  dx: number;
  dy: number;
  end: { x: number; y: number };
  /** Fast passes in a row, this one included. */
  fastStreak: number;
}

export interface StrokeRules {
  /** A run shorter than this isn't a pass. */
  minRunPx: number;
  /** A pass at least this fast counts toward the streak. */
  fastPxPerMs: number;
  /** Doubling back this far ends a run. */
  turnPx: number;
  /** A pause this long breaks the streak. */
  pauseMs: number;
}

export interface StrokeDetector {
  fingerDown: (x: number, y: number, t: number) => void;
  /**
   * A pass when the thumb has just doubled back after a long enough run. A replay that recorded its
   * fast passes forces them: `true` ends a fast pass at this move, turned back or not; `false` lets
   * only a slow one end here. Null decides from the thumb alone.
   */
  fingerMove: (x: number, y: number, t: number, forced?: boolean | null) => StrokePass | null;
  fingerUp: () => void;
  /** Starts the streak of fast passes over, as a pause does. */
  breakStreak: () => void;
  readonly fastStreak: number;
}

/** A point along a run, its distance from the run's start, and the run's direction. */
interface Reach {
  x: number;
  y: number;
  t: number;
  d: number;
  ux: number;
  uy: number;
}

/**
 * Passes of a thumb stroking back and forth, anywhere on the screen. A run is measured along its own
 * direction, so up and down, sideways and diagonal strokes count alike. A slow pass or a pause
 * breaks the streak of fast ones.
 */
export function createStrokeDetector(rules: StrokeRules): StrokeDetector {
  let down = false;
  let streak = 0;
  let lastPassAt = -Infinity;
  /** Where the current run began, and when. */
  let from: { x: number; y: number; t: number } | null = null;
  /** The run's furthest point so far. */
  let far: Reach | null = null;

  /** Ends the run at `turn`, the thumb now at (x, y): a pass if it ran far enough, or was forced. */
  function endRun(
    start: { x: number; y: number; t: number },
    turn: Reach,
    x: number,
    y: number,
    t: number,
    forced: boolean | null,
  ): StrokePass | null {
    const length = turn.d;
    const speed = length / Math.max(1, turn.t - start.t);
    const pass = { dx: turn.x - start.x, dy: turn.y - start.y, end: { x: turn.x, y: turn.y } };
    // The next run starts where this one turned.
    from = { x: turn.x, y: turn.y, t: turn.t };
    const nx = x - from.x;
    const ny = y - from.y;
    const nd = Math.hypot(nx, ny) || 1;
    far = { x, y, t, d: Math.hypot(nx, ny), ux: nx / nd, uy: ny / nd };
    if (length < rules.minRunPx && forced !== true) return null;
    const fast = forced ?? speed >= rules.fastPxPerMs;
    streak = fast ? streak + 1 : 0;
    if (fast) lastPassAt = t;
    return { length, speed, fast, ...pass, fastStreak: streak };
  }

  return {
    get fastStreak() {
      return streak;
    },
    fingerDown(x, y, t) {
      down = true;
      from = { x, y, t };
      far = null;
    },
    fingerMove(x, y, t, forced = null) {
      if (!down || !from) return null;
      if (t - lastPassAt > rules.pauseMs) streak = 0;
      const sx = x - from.x;
      const sy = y - from.y;
      const d = Math.hypot(sx, sy);
      if (!far) {
        if (d > 10) far = { x, y, t, d, ux: sx / d, uy: sy / d };
      } else if (sx * far.ux + sy * far.uy >= far.d) {
        // Still going, and the run follows the thumb round a curve.
        far = { x, y, t, d, ux: d ? sx / d : far.ux, uy: d ? sy / d : far.uy };
      } else if (far.d - (sx * far.ux + sy * far.uy) > rules.turnPx) {
        return endRun(from, far, x, y, t, forced);
      }
      if (forced !== true) return null;
      return endRun(from, far ?? { x, y, t, d, ux: 0, uy: 0 }, x, y, t, true);
    },
    fingerUp() {
      down = false;
      from = null;
      far = null;
    },
    breakStreak() {
      streak = 0;
    },
  };
}
