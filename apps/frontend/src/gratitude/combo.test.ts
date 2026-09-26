import { describe, expect, it } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import {
  createGratitudeCombo,
  fullBarSeconds,
  replayGratitudeCombo,
  type ComboEvent,
} from "./combo";
import { GAME_CONFIG, type GameConfig } from "./gameConfig";

type Ended = Extract<ComboEvent, { kind: "ended" }>;
const endOf = (events: readonly ComboEvent[]) => events.find((e): e is Ended => e.kind === "ended");

interface PlayOptions {
  config?: GameConfig;
  jitter?: number;
  seed?: number;
}

/**
 * Taps the heart `rate` times a second from t = 0 until the combo ends, with a frame between taps.
 * `jitter` spreads each gap and each frame by up to that share, from `seed`, and runs some frames
 * before the taps due by them, as late pointer events do.
 */
function play(rate: number, { config = GAME_CONFIG, jitter = 0, seed = 1 }: PlayOptions = {}) {
  const random = seededRandom(seed);
  const spread = () => 1 + jitter * (random() * 2 - 1);
  const combo = createGratitudeCombo(config);
  const events: ComboEvent[] = [];
  let nextTap = 0;
  for (let t = 0; t < 20_000; t += 16 * spread()) {
    const late = jitter > 0 && random() < 0.5;
    if (late) events.push(...combo.advanceTo(t));
    for (; nextTap <= t; nextTap += (1000 / rate) * spread())
      events.push(...combo.tapHeart(nextTap));
    if (!late) events.push(...combo.advanceTo(t));
    const end = endOf(events);
    if (end)
      return {
        record: end.record,
        events,
        limited: events.filter((e) => e.kind === "limited").length,
      };
  }
  throw new Error(`A combo at ${rate} taps a second never ended`);
}

/**
 * Taps faster than the rate limit counts, then rests for the cadence window. Taps land on whole
 * milliseconds, so the multiplier read on either side of one changes by that tap alone.
 */
function mash(config: GameConfig) {
  const combo = createGratitudeCombo(config);
  let risesAtHits = 0;
  let peak = 1;
  let mostSecondsLeft = 0;
  for (let t = 0; t <= 1500; t += 40) {
    combo.advanceTo(t);
    const before = combo.view.multiplier;
    combo.tapHeart(t);
    const { multiplier, secondsLeft } = combo.view;
    if (multiplier > before) risesAtHits++;
    peak = Math.max(peak, before, multiplier);
    mostSecondsLeft = Math.max(mostSecondsLeft, secondsLeft);
  }
  const mashed = combo.view;
  combo.advanceTo(1500 + config.multiplier.windowMs);
  return { risesAtHits, peak, mostSecondsLeft, mashed, rested: combo.view.multiplier };
}

describe("createGratitudeCombo", () => {
  it("sends with one tap when no second tap catches the heart", () => {
    const combo = createGratitudeCombo();
    combo.tapHeart(5000);
    expect(combo.advanceTo(5000 + GAME_CONFIG.catchWindowMs - 1)).toEqual([]);
    const end = endOf(combo.advanceTo(5000 + GAME_CONFIG.catchWindowMs));
    expect(end).toMatchObject({
      caught: false,
      record: {
        hits: 1,
        hitTimes: [0],
        durationMs: GAME_CONFIG.catchWindowMs,
        total: GAME_CONFIG.gratitudePerHit,
      },
    });
  });

  it("starts the bar, full, when a second tap catches the heart", () => {
    const combo = createGratitudeCombo();
    combo.tapHeart(0);
    expect(combo.tapHeart(300).map((e) => e.kind)).toEqual(["caught", "hit", "tier"]);
    expect(combo.view).toMatchObject({ phase: "running", tier: 0, barFill: 1 });
  });

  it("lasts longer and reaches a higher tier and total the faster the taps", () => {
    const [calm, eager, mashing] = [3, 6, 13].map((rate) => play(rate).record);
    expect(calm.durationMs).toBeLessThan(eager.durationMs);
    expect(eager.durationMs).toBeLessThan(mashing.durationMs);
    expect(calm.total).toBeLessThan(eager.total);
    expect(eager.total).toBeLessThan(mashing.total);
    expect(calm.peakTier).toBeLessThan(mashing.peakTier);
  });

  it("counts no more hits than the rate limit allows", () => {
    const { record, limited } = play(40);
    expect(limited).toBeGreaterThan(0);
    for (const start of record.hitTimes) {
      const inOneSecond = record.hitTimes.filter((t) => t >= start && t < start + 1000).length;
      expect(inOneSecond).toBeLessThanOrEqual(GAME_CONFIG.tapsPerSecond + GAME_CONFIG.burst);
    }
  });

  it("only ever climbs the tiers", () => {
    const tiers = play(13).events.flatMap((e) => (e.kind === "tier" ? [e.tier] : []));
    expect(tiers.length).toBeGreaterThan(2);
    tiers.slice(1).forEach((tier, i) => expect(tier).toBeGreaterThan(tiers[i]));
  });

  it("stops at the safety limit however long the bar would last", () => {
    const slowDrain: GameConfig = { ...GAME_CONFIG, drainStart: 0.001 };
    expect(play(10, { config: slowDrain }).record.durationMs).toBe(slowDrain.maxDurationMs);
  });

  it("ends at once, with its result, when the page goes hidden", () => {
    const combo = createGratitudeCombo();
    [0, 200, 400].forEach((t) => combo.tapHeart(t));
    expect(endOf(combo.endCombo(500))).toMatchObject({
      caught: true,
      record: { hits: 3, durationMs: 500 },
    });
  });

  it("climbs the multiplier at hits and at its rise rate, to its max, and sinks it at its fall rate", () => {
    const M = GAME_CONFIG.multiplier;
    const played = mash(GAME_CONFIG);
    expect(played.risesAtHits).toBeGreaterThan(0);
    expect(played.peak).toBeLessThanOrEqual(M.max);
    // Right after hits, the bar never holds more than full.
    expect(played.mostSecondsLeft).toBeLessThanOrEqual(fullBarSeconds());
    expect(played.rested).toBeLessThan(played.mashed.multiplier);
    expect(played.rested).toBeGreaterThanOrEqual(1);

    const quickRise = mash({ ...GAME_CONFIG, multiplier: { ...M, rise: M.rise * 2 } });
    const quickFall = mash({ ...GAME_CONFIG, multiplier: { ...M, fall: M.fall * 2 } });
    expect(quickRise.mashed.total).toBeGreaterThan(played.mashed.total);
    expect(quickFall.rested).toBeLessThan(played.rested);
  });

  it("holds the combo clock through a tier-up's freeze, and lifts it when the combo ends", () => {
    const { tierUpFreezeMs } = GAME_CONFIG;
    const combo = createGratitudeCombo();
    combo.tapHeart(0);
    // The catch brings ありがと, a tier-up.
    combo.tapHeart(300);
    const { secondsLeft } = combo.view;
    combo.advanceTo(300 + tierUpFreezeMs - 1);
    expect(combo.view).toMatchObject({ frozen: true, secondsLeft });
    combo.advanceTo(300 + tierUpFreezeMs + 100);
    expect(combo.view.frozen).toBe(false);
    expect(combo.view.secondsLeft).toBeLessThan(secondsLeft);

    const endedInFreeze = createGratitudeCombo();
    endedInFreeze.tapHeart(0);
    endedInFreeze.tapHeart(300);
    endedInFreeze.endCombo(300 + tierUpFreezeMs / 2);
    expect(endedInFreeze.view).toMatchObject({ phase: "ended", frozen: false });
  });

  it("ends without a record when closed before the first tap", () => {
    const combo = createGratitudeCombo();
    expect(combo.endCombo(100)).toEqual([]);
    expect(combo.tapHeart(200)).toEqual([]);
  });

  it("records its times in whole milliseconds, rising from 0", () => {
    for (const rate of [3, 8, 16]) {
      const { record } = play(rate, { jitter: 0.2 });
      expect(record.hitTimes[0]).toBe(0);
      record.hitTimes
        .slice(1)
        .forEach((t, i) => expect(t).toBeGreaterThanOrEqual(record.hitTimes[i]));
      expect(record.hitTimes.every(Number.isInteger), `at ${rate} taps a second`).toBe(true);
      expect(Number.isInteger(record.durationMs), `at ${rate} taps a second`).toBe(true);
    }
  });

  it("brings 照れ no sooner than the 7th tap at any steady speed", () => {
    for (let rate = 2; rate <= 16; rate++) {
      let hits = 0;
      for (const e of play(rate).events) {
        if (e.kind === "hit") hits++;
        if (e.kind === "tier" && e.tier === 1)
          expect(hits, `at ${rate} taps a second`).toBeGreaterThanOrEqual(7);
      }
    }
  });
});

describe("replayGratitudeCombo", () => {
  it("gives the same record from its hit times, however the frames fell", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { record } = play(4 + seed * 2, { jitter: 0.4, seed });
      expect(replayGratitudeCombo(record), `seed ${seed}`).toEqual(record);
    }
  });
});
