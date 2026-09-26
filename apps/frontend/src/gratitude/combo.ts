import { GAME_CONFIG, type GameConfig } from "./gameConfig";

export type Method = "tap" | "stroke" | "shake";
/** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
export type Tier = 0 | 1 | 2 | 3 | 4;
export type ComboPhase = "ready" | "sending" | "running" | "ended";

/** A finished combo, as the draft schema's `gratitude` table records it. */
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
  /** `secondsAdded`: how much the hit raised the seconds left; 0 when the bar isn't running yet. */
  | { kind: "hit"; gratitude: number; secondsAdded: number }
  /** A touch past the rate limit: it animates but adds nothing. */
  | { kind: "limited" }
  | { kind: "caught" }
  | { kind: "tier"; tier: Tier }
  /** `caught`: false for a one-tap send, or an end before the catch. */
  | { kind: "ended"; record: ComboRecord; caught: boolean };

/** The combo as of the latest call, for drawing. */
export interface ComboView {
  phase: ComboPhase;
  hits: number;
  total: number;
  multiplier: number;
  /** Null until the catch: ありがと's face and slam wait for it. */
  tier: Tier | null;
  /** Seconds left if the hits stopped now; 0 unless the combo is running. */
  secondsLeft: number;
  /** secondsLeft over the seconds a full bar lasts at the catch, 0–1. */
  barFill: number;
  /** A tier-up has frozen the combo clock. */
  frozen: boolean;
}

export interface GratitudeCombo {
  readonly view: ComboView;
  /** A touch-down on the heart at `t` ms; for the first tap, its release. */
  tapHeart: (t: number) => ComboEvent[];
  /** Brings the rules to `t` ms: the catch window closing, hits leaving the cadence window, the bar emptying, the safety stop. */
  advanceTo: (t: number) => ComboEvent[];
  /** Ends it at `t` ms, because the page went hidden or the screen closed. Before the first tap it ends without a record. */
  endCombo: (t: number) => ComboEvent[];
}

export function tierFor(total: number, starts: GameConfig["tierStarts"]): Tier {
  if (total >= starts[4]) return 4;
  if (total >= starts[3]) return 3;
  if (total >= starts[2]) return 2;
  if (total >= starts[1]) return 1;
  return 0;
}

type Pending = { t: number; kind: "sendEnd" | "cadence" | "empty" | "cap" };

/** Seconds a full bar lasts from the catch with no more hits: the HUD's scale. */
export function fullBarSeconds(config: GameConfig = GAME_CONFIG): number {
  const T = config.drainDoublingS;
  return T * Math.log2(1 + Math.LN2 / (T * config.drainStart));
}

/**
 * The gratitude combo's rules, with no DOM and no clock of their own: every call is passed the time.
 * State changes only at events (hits, a hit leaving the cadence window, the ends) and is computed in
 * closed form between them, so a replay of the same hit times gives the same record however the
 * frames fell. Times are held in whole milliseconds after the first hit.
 */
export function createGratitudeCombo(config: GameConfig = GAME_CONFIG): GratitudeCombo {
  const M = config.multiplier;
  const T = config.drainDoublingS;
  /** Bars drained between combo seconds a and b: K × (2^(b/T) − 2^(a/T)). */
  const K = (config.drainStart * T) / Math.LN2;
  const grow = (comboS: number) => 2 ** (comboS / T);
  /** Seconds a bar lasts from combo second `comboS` with no more hits. */
  const lasts = (bar: number, comboS: number) => T * Math.log2(bar / K + grow(comboS)) - comboS;
  const fullBar = fullBarSeconds(config);

  let phase: ComboPhase = "ready";
  /** The caller's time of the first hit. */
  let origin = 0;
  // The state as of the latest event, at `at` ms after the first hit.
  let at = 0;
  let bar = 0;
  /** Time since the catch, less tier-up freezes. */
  let comboMs = 0;
  let mult = 1;
  let frozenUntil = 0;
  let milliTokens = config.burst * 1000;
  let tokensAt = 0;
  let total = 0;
  let peakMult = 1;
  let shownTier: Tier | null = null;
  /** The latest time the combo was brought to. */
  let latest = 0;
  const hitTimes: number[] = [];
  /** Hit times still in the cadence window, oldest first. */
  const cadence: number[] = [];

  const target = () => Math.min(M.max, 1 + M.perHit * Math.max(0, cadence.length - M.freeHits));

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
    if (phase === "sending") return { t: config.catchWindowMs, kind: "sendEnd" };
    if (phase !== "running") return null;
    let next: Pending = { t: config.maxDurationMs, kind: "cap" };
    const leaves = cadence.length > 0 ? cadence[0] + M.windowMs : Infinity;
    if (leaves < next.t) next = { t: leaves, kind: "cadence" };
    const empties = Math.max(at, frozenUntil) + lasts(bar, comboMs / 1000) * 1000;
    if (empties < next.t) next = { t: empties, kind: "empty" };
    return next;
  }

  function finish(end: number, caught: boolean, events: ComboEvent[]) {
    settleAt(end);
    phase = "ended";
    latest = end;
    events.push({
      kind: "ended",
      caught,
      record: {
        method: "tap",
        switchedAtHit: null,
        hits: hitTimes.length,
        hitTimes: [...hitTimes],
        durationMs: Math.round(end),
        total,
        peakMult: Math.round(peakMult * 100) / 100,
        peakTier: tierFor(total, config.tierStarts),
        gameConfigVersion: config.version,
      },
    });
  }

  /** Runs every event due by `x`; true if one of them ended the combo. */
  function advance(x: number, events: ComboEvent[]): boolean {
    for (let next = nextPending(); next && next.t <= x; next = nextPending()) {
      if (next.kind !== "cadence") {
        finish(next.t, next.kind !== "sendEnd", events);
        return true;
      }
      settleAt(next.t);
      cadence.shift();
    }
    latest = Math.max(latest, x);
    return false;
  }

  return {
    get view(): ComboView {
      const now = stateAt(Math.max(latest, at));
      const secondsLeft = phase === "running" ? Math.max(0, lasts(now.bar, now.comboMs / 1000)) : 0;
      return {
        phase,
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

    tapHeart(t) {
      const events: ComboEvent[] = [];
      if (phase === "ended") return events;
      if (phase === "ready") origin = t;
      // Whole milliseconds, never before an event already run, so a replay meets the same order.
      const x = Math.max(Math.round(t - origin), at);
      if (advance(x, events)) return events;

      milliTokens = Math.min(
        config.burst * 1000,
        milliTokens + (x - tokensAt) * config.tapsPerSecond,
      );
      tokensAt = x;
      if (milliTokens < 1000) {
        events.push({ kind: "limited" });
        return events;
      }
      milliTokens -= 1000;

      settleAt(x);
      const before = phase === "running" ? lasts(bar, comboMs / 1000) : 0;
      hitTimes.push(x);
      cadence.push(x);
      if (phase === "ready") phase = "sending";
      else if (phase === "sending") {
        phase = "running";
        bar = 1;
        comboMs = 0;
        events.push({ kind: "caught" });
      } else {
        const n = hitTimes.length;
        bar = Math.min(
          1,
          bar + config.gainFloor + config.gainAboveFloor * config.gainDecay ** (n - 3),
        );
      }

      const goal = target();
      if (goal > mult) mult += (goal - mult) * M.hitNudge;
      peakMult = Math.max(peakMult, mult);
      const gratitude = Math.round(config.gratitudePerHit * mult);
      total += gratitude;
      const secondsAdded = before > 0 ? Math.max(0, lasts(bar, comboMs / 1000) - before) : 0;
      events.push({ kind: "hit", gratitude, secondsAdded });

      if (phase === "running") {
        const tier = tierFor(total, config.tierStarts);
        if (shownTier === null || tier > shownTier) {
          shownTier = tier;
          frozenUntil = Math.max(frozenUntil, x + config.tierUpFreezeMs);
          events.push({ kind: "tier", tier });
        }
      }
      latest = Math.max(latest, x);
      return events;
    },

    advanceTo(t) {
      const events: ComboEvent[] = [];
      if (phase === "sending" || phase === "running") advance(t - origin, events);
      return events;
    },

    endCombo(t) {
      const events: ComboEvent[] = [];
      if (phase === "ended") return events;
      if (phase === "ready") {
        phase = "ended";
        return events;
      }
      const x = Math.max(Math.round(t - origin), at);
      if (!advance(x, events)) finish(x, phase === "running", events);
      return events;
    },
  };
}
