import { GAME_CONFIG, type GameConfig } from "./gameConfig";

export type Method = "tap" | "stroke" | "shake";
/** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
export type Tier = 0 | 1 | 2 | 3 | 4;
export type ComboPhase = "ready" | "running" | "ended";
/**
 * Why a combo ended: `empty`, the bar ran out; `cap`, the safety stop; `hidden` and `closed`, the
 * caller's `endCombo` as the page went hidden or the X.
 */
export type EndReason = "empty" | "cap" | "hidden" | "closed";

/** A finished combo, as `POST /api/gratitude` records it. */
export interface ComboRecord {
  /** The method the combo ended in. */
  method: Method;
  /** Where in hitTimes the combo committed to stroke or shake: 0 if it started there, null for taps only. */
  switchedAtHit: number | null;
  hits: number;
  /** Milliseconds after the first hit, one per hit. */
  hitTimes: number[];
  /** From the first hit to the end. */
  durationMs: number;
  /** Gratitude, multiplier included. */
  total: number;
  peakMult: number;
  peakTier: Tier;
  gameConfigVersion: string;
}

export type ComboEvent =
  /**
   * `secondsAdded`: how much the hit raised the seconds left; 0 when the bar isn't running yet.
   * `at`: its time in the record, ms after the first hit.
   */
  | { kind: "hit"; gratitude: number; secondsAdded: number; at: number }
  /** A touch past the rate limit: it animates but adds nothing. `at` as for a hit. */
  | { kind: "limited"; at: number }
  /** The first hit started the bar. */
  | { kind: "started" }
  | { kind: "tier"; tier: Tier }
  /** `startedAt`: the caller's time of the first hit, which the record's times count from. */
  | { kind: "ended"; record: ComboRecord; reason: EndReason; startedAt: number };

/** The combo as of the latest call, for drawing. */
export interface ComboView {
  phase: ComboPhase;
  /** Tap until the combo commits to stroke or shake. */
  method: Method;
  hits: number;
  total: number;
  multiplier: number;
  /** Null until the first hit. */
  tier: Tier | null;
  /** Seconds left if the hits stopped now; 0 unless the combo is running. */
  secondsLeft: number;
  /** secondsLeft over the seconds a full bar lasts as it starts, 0–1. */
  barFill: number;
  /** A tier-up has frozen the combo clock. */
  frozen: boolean;
}

export interface GratitudeCombo {
  readonly view: ComboView;
  /** A touch-down on the heart at `t` ms; for the first tap, its release. Ignored once committed to stroke or shake. */
  tapHeart: (t: number) => ComboEvent[];
  /** The detector unlocked stroke or shake at `t`: the combo commits to it, starting it first if need be, and that pass or reversal is a hit. */
  commitTo: (method: "stroke" | "shake", t: number) => ComboEvent[];
  /** A fast pass, once committed to stroke. */
  countStrokePass: (t: number) => ComboEvent[];
  /** A rhythmic reversal, once committed to shake. */
  countShakeReversal: (t: number) => ComboEvent[];
  /** Brings the rules to `t` ms: hits leaving the cadence window, the bar emptying, the safety stop. */
  advanceTo: (t: number) => ComboEvent[];
  /**
   * Ends it at `t` ms, because the page went hidden or the screen closed: the end's `reason`, unless
   * a rule ended it first. Before the first tap it ends without a record.
   */
  endCombo: (t: number, reason: "hidden" | "closed") => ComboEvent[];
  /**
   * The `ended` event `endCombo(t, reason)` would give, leaving the combo running: a combo still in
   * play, as the device keeps it. Null unless it's running.
   */
  endedAt: (
    t: number,
    reason: "hidden" | "closed",
  ) => Extract<ComboEvent, { kind: "ended" }> | null;
}

function tierFor(total: number, starts: GameConfig["tierStarts"]): Tier {
  if (total >= starts[3]) return 4;
  if (total >= starts[2]) return 3;
  if (total >= starts[1]) return 2;
  if (total >= starts[0]) return 1;
  return 0;
}

type Pending = { t: number; kind: "cadence" | "empty" | "cap" };

/** The bar's drain in closed form, one curve for the rules and the HUD's scale so they agree exactly. */
function barDrain(config: GameConfig) {
  const T = config.drainDoublingS;
  /** Bars drained between combo seconds a and b: K × (2^(b/T) − 2^(a/T)). */
  const K = (config.drainStart * T) / Math.LN2;
  const grow = (comboS: number) => 2 ** (comboS / T);
  /** Seconds a bar lasts from combo second `comboS` with no more hits. */
  const lasts = (bar: number, comboS: number) => T * Math.log2(bar / K + grow(comboS)) - comboS;
  return { K, grow, lasts };
}

/** Seconds a full bar lasts from the first hit with no more hits: the HUD's scale. */
export function fullBarSeconds(config: GameConfig = GAME_CONFIG): number {
  return barDrain(config).lasts(1, 0);
}

/**
 * The gratitude combo's rules, with no DOM and no clock of their own: every call is passed the time.
 * State changes only at events (hits, a hit leaving the cadence window, the ends) and is computed in
 * closed form between them, so a replay of the same hits gives the same record however the frames
 * fell. Times are held in whole milliseconds after the first hit.
 */
export function createGratitudeCombo(config: GameConfig = GAME_CONFIG): GratitudeCombo {
  const M = config.multiplier;
  const { K, grow, lasts } = barDrain(config);
  const fullBar = lasts(1, 0);
  const perSecond: Record<Method, number> = {
    tap: config.tapsPerSecond,
    stroke: config.passesPerSecond,
    shake: config.reversalsPerSecond,
  };

  let phase: ComboPhase = "ready";
  let method: Method = "tap";
  let switchedAtHit: number | null = null;
  /** The caller's time of the first hit. */
  let origin = 0;
  // The state as of the latest event, at `at` ms after the first hit.
  let at = 0;
  let bar = 0;
  /** Time since the first hit, less tier-up freezes. */
  let comboMs = 0;
  let mult = 1;
  let frozenUntil = 0;
  /** A token bucket per method, in thousandths of a hit, so refills stay whole numbers. */
  const tokens: Record<Method, { milli: number; at: number }> = {
    tap: { milli: config.burst * 1000, at: 0 },
    stroke: { milli: config.burst * 1000, at: 0 },
    shake: { milli: config.burst * 1000, at: 0 },
  };
  let total = 0;
  let peakMult = 1;
  let shownTier: Tier | null = null;
  /** The latest time the combo was brought to. */
  let latest = 0;
  const hitTimes: number[] = [];
  /** Hits still in the cadence window, oldest first, with their weights. */
  const cadence: { t: number; weight: number }[] = [];

  const target = () => {
    const hits = cadence.reduce((sum, h) => sum + h.weight, 0);
    return Math.min(M.max, 1 + M.perHit * Math.max(0, hits - M.freeHits));
  };

  /** The state at `x` ≥ `at`, with no event between. */
  function stateAt(x: number) {
    const elapsed = Math.max(0, x - Math.max(at, frozenUntil));
    if (phase !== "running" || elapsed === 0) return { bar, comboMs, mult };
    const goal = target();
    const rate = goal > mult ? M.rise : M.fall;
    return {
      bar: bar - K * (grow((comboMs + elapsed) / 1000) - grow(comboMs / 1000)),
      comboMs: comboMs + elapsed,
      mult: goal + (mult - goal) * Math.exp((-rate * elapsed) / 1000),
    };
  }

  function settleAt(x: number) {
    ({ bar, comboMs, mult } = stateAt(x));
    at = x;
    peakMult = Math.max(peakMult, mult);
  }

  function nextPending(): Pending | null {
    if (phase !== "running") return null;
    let next: Pending = { t: config.maxDurationMs, kind: "cap" };
    const leaves = cadence.length > 0 ? cadence[0].t + M.windowMs : Infinity;
    if (leaves < next.t) next = { t: leaves, kind: "cadence" };
    const empties = Math.max(at, frozenUntil) + lasts(bar, comboMs / 1000) * 1000;
    if (empties < next.t) next = { t: empties, kind: "empty" };
    return next;
  }

  /** The record as it stands, ending at `end`. */
  function recordAt(end: number): ComboRecord {
    return {
      method,
      switchedAtHit,
      hits: hitTimes.length,
      hitTimes: [...hitTimes],
      durationMs: Math.round(end),
      total,
      peakMult: Math.round(peakMult * 100) / 100,
      peakTier: tierFor(total, config.tierStarts),
      gameConfigVersion: config.version,
    };
  }

  function finish(end: number, reason: EndReason, events: ComboEvent[]) {
    settleAt(end);
    phase = "ended";
    latest = end;
    events.push({ kind: "ended", reason, startedAt: origin, record: recordAt(end) });
  }

  /** Runs every event due by `x`; true if one of them ended the combo. */
  function advance(x: number, events: ComboEvent[]): boolean {
    for (let next = nextPending(); next && next.t <= x; next = nextPending()) {
      if (next.kind !== "cadence") {
        finish(next.t, next.kind, events);
        return true;
      }
      settleAt(next.t);
      cadence.shift();
    }
    latest = Math.max(latest, x);
    return false;
  }

  /** One hit by `by` at caller time `t`. The first starts the bar, full, and weighs 1, like a tap. */
  function hit(by: Method, t: number): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (phase === "ended") return events;
    if (phase === "ready") origin = t;
    // Whole milliseconds, never before an event already run, so a replay meets the same order.
    const x = Math.max(Math.round(t - origin), at);
    if (advance(x, events)) return events;

    const bucket = tokens[by];
    bucket.milli = Math.min(config.burst * 1000, bucket.milli + (x - bucket.at) * perSecond[by]);
    bucket.at = x;
    if (bucket.milli < 1000) {
      events.push({ kind: "limited", at: x });
      return events;
    }
    bucket.milli -= 1000;

    settleAt(x);
    const weight = by === "tap" || hitTimes.length === 0 ? 1 : config.methodWeight;
    const before = phase === "running" ? lasts(bar, comboMs / 1000) : 0;
    hitTimes.push(x);
    cadence.push({ t: x, weight });
    if (phase === "ready") {
      phase = "running";
      bar = 1;
      comboMs = 0;
      events.push({ kind: "started" });
    } else {
      const n = hitTimes.length;
      const gain = config.gainFloor + config.gainAboveFloor * config.gainDecay ** (n - 2);
      bar = Math.min(1, bar + weight * gain);
    }

    const goal = target();
    if (goal > mult) mult += (goal - mult) * M.hitNudge;
    peakMult = Math.max(peakMult, mult);
    const gratitude = Math.round(config.gratitudePerHit * mult * weight);
    total += gratitude;
    const secondsAdded = before > 0 ? Math.max(0, lasts(bar, comboMs / 1000) - before) : 0;
    events.push({ kind: "hit", gratitude, secondsAdded, at: x });

    const tier = tierFor(total, config.tierStarts);
    if (shownTier === null || tier > shownTier) {
      shownTier = tier;
      frozenUntil = Math.max(frozenUntil, x + config.tierUpFreezeMs);
      events.push({ kind: "tier", tier });
    }
    latest = Math.max(latest, x);
    return events;
  }

  return {
    get view(): ComboView {
      const now = stateAt(Math.max(latest, at));
      const secondsLeft = phase === "running" ? Math.max(0, lasts(now.bar, now.comboMs / 1000)) : 0;
      return {
        phase,
        method,
        hits: hitTimes.length,
        total,
        multiplier: now.mult,
        tier: shownTier,
        secondsLeft,
        barFill: Math.min(1, secondsLeft / fullBar),
        // An ended combo's clock never moves again, so a freeze it ended inside would never lift.
        frozen: phase !== "ended" && latest < frozenUntil,
      };
    },

    tapHeart: (t) => (method === "tap" ? hit("tap", t) : []),

    commitTo(by, t) {
      if (method !== "tap") return [];
      const index = hitTimes.length;
      const events = hit(by, t);
      if (events.some((e) => e.kind === "hit")) {
        method = by;
        switchedAtHit = index;
      }
      return events;
    },

    countStrokePass: (t) => (method === "stroke" ? hit("stroke", t) : []),
    countShakeReversal: (t) => (method === "shake" ? hit("shake", t) : []),

    advanceTo(t) {
      const events: ComboEvent[] = [];
      if (phase === "running") advance(t - origin, events);
      return events;
    },

    endCombo(t, reason) {
      const events: ComboEvent[] = [];
      if (phase === "ended") return events;
      if (phase === "ready") {
        phase = "ended";
        return events;
      }
      const x = Math.max(Math.round(t - origin), at);
      if (!advance(x, events)) finish(x, reason, events);
      return events;
    },

    endedAt(t, reason) {
      if (phase !== "running") return null;
      // Its hits played again on a fresh combo end as this one would, and this one runs on untouched.
      const record = replayGratitudeCombo(recordAt(Math.max(Math.round(t - origin), at)), config);
      return { kind: "ended", reason, startedAt: origin, record };
    },
  };
}

/**
 * A record's hits played again through a fresh combo, the way they were made: taps, then from
 * `switchedAtHit` its passes or reversals. The rules are closed-form between events, so a record
 * replays to itself under the config it was played with.
 */
export function replayGratitudeCombo(
  record: ComboRecord,
  config: GameConfig = GAME_CONFIG,
): ComboRecord {
  if (record.hitTimes.length === 0) throw new Error("A gratitude record with no hits can't replay");
  const { method, switchedAtHit } = record;
  const combo = createGratitudeCombo(config);
  const events = record.hitTimes.flatMap((t, i) => {
    if (switchedAtHit === null || i < switchedAtHit) return combo.tapHeart(t);
    if (method === "tap")
      throw new Error(`A gratitude record switched at hit ${i} but ends in taps`);
    if (i === switchedAtHit) return combo.commitTo(method, t);
    return method === "stroke" ? combo.countStrokePass(t) : combo.countShakeReversal(t);
  });
  // durationMs is rounded, so a bar that ran out may have ended up to half a millisecond after it.
  events.push(...combo.advanceTo(record.durationMs + 0.5));
  // Hidden or closed, the record is the same: it doesn't say which.
  if (combo.view.phase !== "ended") events.push(...combo.endCombo(record.durationMs, "closed"));
  for (const e of events) if (e.kind === "ended") return e.record;
  throw new Error(`Replaying a gratitude record of ${record.hits} hits gave no record`);
}
