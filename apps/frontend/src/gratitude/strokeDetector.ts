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
  /** A pass when the thumb has just doubled back after a long enough run. */
  fingerMove: (x: number, y: number, t: number) => StrokePass | null;
  fingerUp: () => void;
  readonly fastStreak: number;
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
  /** The run's furthest point so far, its distance along the run, and its direction. */
  let far: { x: number; y: number; t: number; d: number; ux: number; uy: number } | null = null;

  return {
    get fastStreak() {
      return streak;
    },
    fingerDown(x, y, t) {
      down = true;
      from = { x, y, t };
      far = null;
    },
    fingerMove(x, y, t) {
      if (!down || !from) return null;
      if (t - lastPassAt > rules.pauseMs) streak = 0;
      const sx = x - from.x;
      const sy = y - from.y;
      if (!far) {
        const d = Math.hypot(sx, sy);
        if (d > 10) far = { x, y, t, d, ux: sx / d, uy: sy / d };
        return null;
      }
      const along = sx * far.ux + sy * far.uy;
      if (along >= far.d) {
        // Still going, and the run follows the thumb round a curve.
        const d = Math.hypot(sx, sy);
        far = { x, y, t, d, ux: d ? sx / d : far.ux, uy: d ? sy / d : far.uy };
        return null;
      }
      if (far.d - along <= rules.turnPx) return null;
      const length = far.d;
      const speed = length / Math.max(1, far.t - from.t);
      const pass = { dx: far.x - from.x, dy: far.y - from.y, end: { x: far.x, y: far.y } };
      // The next run starts where this one turned.
      from = { x: far.x, y: far.y, t: far.t };
      const nx = x - from.x;
      const ny = y - from.y;
      const nd = Math.hypot(nx, ny) || 1;
      far = { x, y, t, d: Math.hypot(nx, ny), ux: nx / nd, uy: ny / nd };
      if (length < rules.minRunPx) return null;
      const fast = speed >= rules.fastPxPerMs;
      streak = fast ? streak + 1 : 0;
      if (fast) lastPassAt = t;
      return { length, speed, fast, ...pass, fastStreak: streak };
    },
    fingerUp() {
      down = false;
      from = null;
      far = null;
    },
  };
}
