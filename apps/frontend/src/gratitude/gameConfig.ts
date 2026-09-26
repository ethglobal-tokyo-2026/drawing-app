/** The mini-game's rules as numbers. A finished combo records `version`, so a replay runs with the
 * numbers it was played with; change the version whenever a rule number changes. */
export interface GameConfig {
  version: string;
  /** Gratitude a hit earns at ×1. */
  gratitudePerHit: number;
  /** A touch on the heart this soon after the first tap catches it; otherwise the first tap sends. */
  catchWindowMs: number;
  /** A combo ends this long after its first hit, whatever the bar says. */
  maxDurationMs: number;
  /** The bar drains `drainStart` bars a second at the catch, doubling every `drainDoublingS`. */
  drainStart: number;
  drainDoublingS: number;
  /** Hit n, from the third, adds gainFloor + gainAboveFloor × gainDecay^(n − 3) of the bar. */
  gainFloor: number;
  gainAboveFloor: number;
  gainDecay: number;
  /** Hits a second that count for each method, beyond a burst of `burst`. */
  tapsPerSecond: number;
  passesPerSecond: number;
  reversalsPerSecond: number;
  burst: number;
  /** A stroke pass or a shake reversal counts as this many hits, except as a combo's first hit. */
  methodWeight: number;
  /** The multiplier's target is 1 + perHit × (hits in the last window − freeHits), up to max. */
  multiplier: {
    windowMs: number;
    freeHits: number;
    perHit: number;
    max: number;
    /** A hit closes this share of the gap to a higher target at once. */
    hitNudge: number;
    /** Between hits it eases toward the target at these rates, a second. */
    rise: number;
    fall: number;
  };
  /** The gratitude totals 照れ, ドキドキ, オーバーヒート and 昇天 start at; ありがと comes with the first hit. */
  tierStarts: readonly [number, number, number, number];
  /** A tier-up freezes the combo clock this long. */
  tierUpFreezeMs: number;
}

export const GAME_CONFIG = {
  version: "2026-09-26",
  gratitudePerHit: 10,
  catchWindowMs: 920,
  maxDurationMs: 8000,
  drainStart: 0.36,
  drainDoublingS: 1.6,
  gainFloor: 0.2,
  gainAboveFloor: 0.1,
  gainDecay: 0.93,
  tapsPerSecond: 16,
  passesPerSecond: 10,
  reversalsPerSecond: 14,
  burst: 4,
  methodWeight: 1.5,
  multiplier: {
    windowMs: 1000,
    freeHits: 2,
    perHit: 0.55,
    max: 8,
    hitNudge: 0.35,
    rise: 6,
    fall: 2.5,
  },
  tierStarts: [100, 320, 1100, 3000],
  tierUpFreezeMs: 60,
} as const satisfies GameConfig;

/** How the game looks and answers a touch: the prototype's numbers. A combo doesn't record these. */
export const FEEL_CONFIG = {
  /** The one dial every effect scales by: day to day, and for the presentation. */
  intensity: { everyday: 0.7, full: 1 },
  /** 昇天's climax holds everything this long before the soul rises. */
  climaxFreezeMs: 140,
  /** Shares of the heart's half-width and half-height: how far past the middle of each side of its
   * resting box a touch still counts, on the ellipse through the box's edges grown by this much. */
  heartReach: 0.07,
  /** A first tap lifts before it travels `tapSlopPx` or is held `tapHoldMs`. */
  tapSlopPx: 12,
  tapHoldMs: 800,
  /** The sent heart winds up toward the giver over the catch window, then holds through its grace. */
  windUpMs: 800,
  /** A thumb stroking back and forth, anywhere on the screen: PJ's PHYS and StrokeDetector. */
  stroke: {
    minRunPx: 40,
    fastPxPerMs: 0.38,
    turnPx: 12,
    pauseMs: 900,
    unlockPasses: 5,
    /** A drag on the heart this long is a try at stroking it; after three, the tip says how. */
    tryTravelPx: 40,
    triesForTip: 3,
  },
  /** Shaking the phone in a rhythm: PJ's PHYS and ShakeDetector. */
  shake: {
    deadZone: 6,
    minPeak: 11,
    minGapMs: 60,
    maxGapMs: 480,
    resetMs: 650,
    keepShakingAt: 4,
    cornerAt: 11,
    unlockAt: 16,
  },
  /** Mini hearts: sprayed by taps from ドキドキ up, sweated off the heart, and 昇天's rain. */
  miniHearts: {
    fromTier: 2,
    sizes: [14, 22],
    tones: ["#FF4F9A", "#FF7DB5", "#FF2F7E", "#FFA6CB"],
    /** px/s: a tap's spray. */
    speed: [380, 720],
    /** Degrees either side of a spray's direction. */
    sprayDeg: 36,
    /** px/s²: light, so they hang and bounce. */
    gravity: 1000,
    floorBounce: 0.72,
    wallBounce: 0.8,
    miniBounce: 1,
    /** Two in flight touch only once their hearts overlap by this share. */
    touch: 0.5,
    /** px/s: two in flight closing slower than this pass by instead of knocking. */
    knock: 260,
    floorGrip: 0.95,
    /** px/s: a landing slower than this rests. */
    settle: 190,
    /** deg/s at most. */
    spin: 540,
    /** s at rest before fading, and s to fade. */
    linger: [2, 4],
    fade: [0.5, 0.9],
    /** px: the heap never climbs past this. */
    pileMax: 110,
    /** Hearts at once; past it the oldest fades out fast. */
    live: 90,
    /** 1/s: rolling friction. */
    roll: 6,
    /** px/s: held up and slower than this for a moment, it settles. */
    sleep: 45,
    /** px/s: a hit this hard knocks a settled one loose. */
    wake: 520,
    /** px: how far a tap's shove reaches, and its push right under the finger in px/s. */
    reach: 150,
    kick: 950,
    /** Drops a second by tier: a drip at ドキドキ, a sweat at オーバーヒート, heavier at 昇天. */
    sweatPerSecond: [0, 0, 0.35, 2.2, 4.5],
    sweatSizes: [12, 18],
    /** s a drop beads on the heart's edge before it lets go. */
    bead: [0.35, 0.6],
    rainGravity: 1500,
    rainMax: 24,
  },
} as const;
