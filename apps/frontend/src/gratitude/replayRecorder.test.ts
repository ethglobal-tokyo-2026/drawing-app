import { describe, expect, it } from "vitest";
import type { ReplayV1 } from "../api/contract";
import { seededRandom } from "../ui/seededRandom";
import { createGratitudeCombo, type ComboEvent, type ComboRecord, type EndReason } from "./combo";
import { FEEL_CONFIG, GAME_CONFIG, type GameConfig } from "./gameConfig";
import { createReplayRecorder, STAGE_UNITS, STROKE_SAMPLE_GAP_MS } from "./replayRecorder";
import { createStrokeDetector } from "./strokeDetector";

type Ended = Extract<ComboEvent, { kind: "ended" }>;
const endOf = (events: readonly ComboEvent[]) => events.find((e): e is Ended => e.kind === "ended");

const STAGE = { width: 390, height: 741 };
/** The server's MAX_COMBO_MS, and the most a keepalive request carries. */
const MAX_COMBO_MS = 8000;
const MAX_BODY_BYTES = 64 * 1024;
const END_REASONS: readonly EndReason[] = ["sent", "empty", "cap", "hidden", "closed"];

/** Rows of `size` values from a flat list, the first `summed` of each added to the row before's. */
function runningRows(flat: readonly number[], size: number, summed: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < flat.length; i += size) {
    const before = rows[rows.length - 1];
    rows.push(flat.slice(i, i + size).map((v, j) => (before && j < summed ? before[j] + v : v)));
  }
  return rows;
}

const msSteps = (flat: readonly number[], size: number) => flat.filter((_, i) => i % size === 0);

/**
 * The replay as the server's planned check reads it (the REST plan's Task 7): its shape, then its
 * running values, then how it agrees with the record. Throws at the first rule it breaks; returns
 * the running values: every touch, stroke sample and reversal at its time after the first hit.
 */
function readReplay(replay: ReplayV1, record: ComboRecord) {
  const rule = (ok: boolean, what: string) => {
    if (!ok) throw new Error(`replay_invalid: ${what}`);
  };
  const int = Number.isInteger;
  rule(replay.v === 1, "v");
  rule(int(replay.seed) && replay.seed >= 0 && replay.seed <= 2 ** 32 - 1, "seed");
  rule(replay.intensity >= 0 && replay.intensity <= 1, "intensity");
  rule(replay.stage.length === 2 && replay.stage.every((px) => int(px) && px > 0), "stage");
  rule(int(replay.durationMs) && replay.durationMs >= 0, "durationMs");
  rule(replay.durationMs <= MAX_COMBO_MS, "durationMs past MAX_COMBO_MS");
  rule(END_REASONS.includes(replay.endReason), "endReason");
  const { switchedAtHit } = replay;
  rule(switchedAtHit === null || (int(switchedAtHit) && switchedAtHit >= 0), "switchedAtHit");
  rule(replay.hits.length % 4 === 0 && replay.hits.every(int), "hits");
  rule(
    replay.strokes.every((s) => s.length % 3 === 0 && s.every(int)),
    "strokes",
  );
  rule(replay.shakes.length % 2 === 0 && replay.shakes.every(int), "shakes");

  const steps = [
    ...msSteps(replay.hits, 4),
    ...replay.strokes.flatMap((s) => msSteps(s, 3)),
    ...msSteps(replay.shakes, 2),
  ];
  rule(
    steps.every((ms) => ms >= 0),
    "a negative ms step",
  );
  const hitsMs = msSteps(replay.hits, 4).reduce((sum, ms) => sum + ms, 0);
  rule(hitsMs <= replay.durationMs, "the hits' steps past durationMs");
  const touches = runningRows(replay.hits, 4, 3);
  const strokes = replay.strokes.map((s) => runningRows(s, 3, 3));
  const shakes = runningRows(replay.shakes, 2, 1);
  const onStage = (v: number) => v >= 0 && v <= STAGE_UNITS;
  for (const [, x, y] of [...touches, ...strokes.flat()])
    rule(onStage(x) && onStage(y), "position");
  rule(
    touches.every(([, , , counted]) => counted === 0 || counted === 1),
    "counted",
  );
  rule(
    shakes.every(([, direction]) => direction === 1 || direction === -1),
    "direction",
  );

  const counted = touches.filter(([, , , c]) => c === 1).length;
  rule(counted <= record.hits, "counted touches past hits");
  if (record.method === "tap") {
    rule(switchedAtHit === null && counted === record.hits, "a tap combo's counted touches");
  } else rule(switchedAtHit !== null, "a stroke or shake combo's switch");
  rule(replay.endReason !== "sent" || record.hits === 1, "sent with more than one hit");
  return { touches, strokes, shakes };
}

/**
 * The replay's touches and reversals, played through a fresh combo in the order it heard them, then
 * ended as the replay says. Every touch goes in, counted or not, so the rate limit decides again.
 */
function playBack(replay: ReplayV1, config: GameConfig = GAME_CONFIG) {
  const combo = createGratitudeCombo(config);
  const events: ComboEvent[] = [];
  for (const [at] of runningRows(replay.hits, 4, 3)) events.push(...combo.tapHeart(at));
  runningRows(replay.shakes, 2, 1).forEach(([at], i) => {
    events.push(...(i === 0 ? combo.commitTo("shake", at) : combo.countShakeReversal(at)));
  });
  const { durationMs, endReason } = replay;
  if (endReason === "hidden" || endReason === "closed") {
    events.push(...combo.endCombo(durationMs, endReason));
  } else {
    // durationMs is rounded, so a rule may have ended it up to half a millisecond later.
    events.push(...combo.advanceTo(durationMs + 0.5));
  }
  return endOf(events);
}

/** A combo and a recorder, each input told to both the way the engine tells them. */
function session(config: GameConfig = GAME_CONFIG) {
  const combo = createGratitudeCombo(config);
  const recorder = createReplayRecorder({ seed: 42, intensity: 0.7, ...STAGE });
  let ended: Ended | undefined;
  const hear = (events: ComboEvent[]) => {
    ended ??= endOf(events);
    return events;
  };
  return {
    combo,
    recorder,
    hear,
    get ended() {
      return ended;
    },
    tap: (t: number, x = 195, y = 400) => recorder.touch(x, y, hear(combo.tapHeart(t))),
    frame: (t: number) => hear(combo.advanceTo(t)),
    end: (t: number, reason: "hidden" | "closed") => hear(combo.endCombo(t, reason)),
    finish() {
      if (!ended) throw new Error("The combo never ended");
      return { ended, replay: recorder.finish(ended) };
    },
  };
}

interface TapOptions {
  config?: GameConfig;
  /** Ends it this long after the first tap, as the page going hidden or the X would. */
  stopAfter?: number;
  stopBy?: "hidden" | "closed";
  seed?: number;
}

/**
 * Taps about `rate` times a second from t = 1000 until the combo ends, at spread gaps and spots on
 * the heart, with a frame about every 16 ms that sometimes runs before the taps due by it.
 */
function tapCombo(rate: number, { config, stopAfter, stopBy = "hidden", seed = 1 }: TapOptions) {
  const random = seededRandom(seed);
  const s = session(config);
  let nextTap = 1000;
  for (let t = 1000; t < 30_000 && !s.ended; t += 16 * (0.8 + 0.4 * random())) {
    const late = random() < 0.5;
    if (late) s.frame(t);
    for (; nextTap <= t && !s.ended; nextTap += (1000 / rate) * (0.7 + 0.6 * random())) {
      s.tap(nextTap, 140 + 110 * random(), 320 + 130 * random());
    }
    if (!late) s.frame(t);
    if (stopAfter !== undefined && t >= 1000 + stopAfter && !s.ended) s.end(t, stopBy);
  }
  return s.finish();
}

describe("createReplayRecorder", () => {
  it("records a one-tap send", () => {
    const s = session();
    s.tap(5000, 195, 400);
    s.frame(5000 + GAME_CONFIG.catchWindowMs);
    const { replay } = s.finish();
    expect(replay).toEqual({
      v: 1,
      seed: 42,
      intensity: 0.7,
      stage: [390, 741],
      durationMs: GAME_CONFIG.catchWindowMs,
      endReason: "sent",
      switchedAtHit: null,
      // 195 of 390 px across, 400 of 741 down.
      hits: [0, 5000, 5398, 1],
      strokes: [],
      shakes: [],
    });
  });

  it("stores each touch's time and place as the change from the touch before, the first as it is", () => {
    const s = session();
    s.tap(1000, 195, 400);
    s.tap(1200, 234, 370.5);
    s.tap(1350, 156, 444.6);
    s.end(1500, "closed");
    expect(s.finish().replay.hits).toEqual([
      ...[0, 5000, 5398, 1],
      ...[200, 1000, -398, 1],
      ...[150, -2000, 1000, 1],
    ]);
  });

  it("keeps touches past the rate limit, uncounted", () => {
    const s = session();
    for (let t = 1000; t <= 1300; t += 10) s.tap(t);
    s.end(1400, "closed");
    const { ended, replay } = s.finish();
    const { touches } = readReplay(replay, ended.record);
    expect(touches).toHaveLength(31);
    expect(touches.filter(([, , , counted]) => counted === 0).length).toBeGreaterThan(0);
    expect(touches.filter(([, , , c]) => c === 1).map(([at]) => at)).toEqual(ended.record.hitTimes);
  });

  it("keeps positions on the stage, as shares of its latest size", () => {
    const s = session();
    s.tap(1000, 195, 400);
    s.recorder.strokeStart(1010, -40, 800);
    s.recorder.strokeMove(1060, 400, -5, false);
    s.recorder.resize(780, 1482);
    s.tap(1100, 390, 741);
    s.end(1200, "closed");
    const { ended, replay } = s.finish();
    const { touches, strokes } = readReplay(replay, ended.record);
    expect(replay.stage).toEqual([780, 1482]);
    expect(touches.map(([, x, y]) => [x, y])).toEqual([
      [5000, 5398],
      [5000, 5000],
    ]);
    expect(strokes[0].map(([, x, y]) => [x, y])).toEqual([
      [0, STAGE_UNITS],
      [STAGE_UNITS, 0],
    ]);
  });

  it("samples the stroke finger about 30 times a second, with every fast pass and where it lifted", () => {
    const s = session();
    s.tap(1000);
    s.tap(1100);
    s.recorder.strokeStart(1200, 100, 500);
    const moves: number[] = [];
    for (let t = 1208; t <= 1490; t += 8) {
      moves.push(t);
      s.recorder.strokeMove(t, 100 + (t - 1200) / 2, 500, t === 1344);
    }
    s.recorder.strokeEnd();
    s.end(1600, "hidden");
    const { ended, replay } = s.finish();
    const [stroke] = readReplay(replay, ended.record).strokes;
    const times = stroke.map(([at]) => at);
    expect(times[0]).toBe(200);
    expect(times).toContain(344);
    expect(times[times.length - 1]).toBe(488);
    const gaps = times.slice(1).map((at, i) => at - times[i]);
    const soon = gaps.filter((gap) => gap < STROKE_SAMPLE_GAP_MS);
    // Only the fast pass and the lift come sooner than the gap.
    expect(soon.length).toBeLessThanOrEqual(2);
    expect(times.length).toBeLessThan(moves.length / 3 + 3);
  });

  it("drops stroke samples from before the first hit and after the end, and strokes left with none", () => {
    const s = session();
    s.recorder.strokeStart(100, 50, 50);
    s.recorder.strokeMove(200, 60, 60, false);
    s.recorder.strokeEnd();
    s.recorder.strokeStart(900, 100, 500);
    s.recorder.strokeMove(1000, 120, 500, false);
    s.tap(1000);
    s.recorder.strokeMove(1040, 140, 500, false);
    s.end(1050, "closed");
    s.recorder.strokeMove(1100, 160, 500, false);
    const { ended, replay } = s.finish();
    expect(readReplay(replay, ended.record).strokes.map((st) => st.map(([at]) => at))).toEqual([
      [0, 40],
    ]);
  });
});

describe("a replay has all the data to play its combo back", () => {
  const cases: Array<[string, EndReason, number, TapOptions]> = [
    ["the bar running out", "empty", 5, {}],
    ["a mash past the rate limit", "empty", 40, { seed: 3 }],
    ["the safety stop", "cap", 10, { config: { ...GAME_CONFIG, drainStart: 0.001 } }],
    ["the page going hidden", "hidden", 8, { stopAfter: 2600, stopBy: "hidden" }],
    ["the X", "closed", 8, { stopAfter: 2100, stopBy: "closed" }],
    ["the X before the catch", "closed", 0.5, { stopAfter: 400, stopBy: "closed" }],
  ];

  it("breaks the check the way the server would refuse it", () => {
    const { ended, replay } = tapCombo(5, {});
    const broken = (change: Partial<ReplayV1>) => () =>
      readReplay({ ...replay, ...change }, ended.record);
    // Positions stored whole instead of as changes run off the stage by the third touch.
    expect(broken({ hits: replay.hits.map((v, i) => (i % 4 === 1 ? 5000 : v)) })).toThrow(
      "position",
    );
    expect(broken({ hits: [-1, ...replay.hits.slice(1)] })).toThrow("negative ms step");
    expect(broken({ durationMs: 10 })).toThrow("past durationMs");
    expect(broken({ endReason: "sent" })).toThrow("sent with more than one hit");
    expect(broken({ switchedAtHit: 2 })).toThrow("a tap combo's counted touches");
  });

  it.each(cases)("a tap combo ended by %s", (_, reason, rate, options) => {
    const { ended, replay } = tapCombo(rate, options);
    const { record } = ended;
    const { touches } = readReplay(replay, record);
    if (rate > GAME_CONFIG.tapsPerSecond) expect(touches.some(([, , , c]) => c === 0)).toBe(true);
    expect(replay.endReason).toBe(reason);
    expect(touches.filter(([, , , c]) => c === 1).map(([at]) => at)).toEqual(record.hitTimes);
    expect(replay.durationMs).toBe(record.durationMs);
    expect(playBack(replay, options.config)).toMatchObject({ reason, record });
    expect(JSON.stringify(replay).length).toBeLessThan(MAX_BODY_BYTES);
  });

  it("a one-tap send", () => {
    const { ended, replay } = tapCombo(0.5, {});
    readReplay(replay, ended.record);
    expect(replay).toMatchObject({ endReason: "sent", durationMs: GAME_CONFIG.catchWindowMs });
    expect(playBack(replay)).toMatchObject({ reason: "sent", record: ended.record });
  });

  it("a stroke combo: the taps before the switch, and a sample at every pass it counted", () => {
    const s = session();
    const detector = createStrokeDetector(FEEL_CONFIG.stroke);
    [1000, 1150, 1300].forEach((t) => s.tap(t));
    const down = 1450;
    detector.fingerDown(200, 520, down);
    s.recorder.strokeStart(down, 200, 520);
    // Up and down 120 px, 125 ms a run, a move every 8 ms, for 3 s; then the thumb lifts.
    for (let t = down + 8; !s.ended && t < down + 3000; t += 8) {
      const run = (t - down) / 125;
      const y = 520 - 120 * (run % 2 < 1 ? run % 1 : 1 - (run % 1));
      const pass = detector.fingerMove(200, y, t);
      s.recorder.strokeMove(t, 200, y, pass?.fast === true);
      if (pass?.fast && s.combo.view.method === "stroke") s.hear(s.combo.countStrokePass(t));
      else if (pass?.fast && pass.fastStreak >= FEEL_CONFIG.stroke.unlockPasses) {
        s.hear(s.combo.commitTo("stroke", t));
      }
      s.frame(t);
    }
    detector.fingerUp();
    s.recorder.strokeEnd();
    for (let t = down + 3000; !s.ended; t += 16) s.frame(t);

    const { ended, replay } = s.finish();
    const { record } = ended;
    const { touches, strokes } = readReplay(replay, record);
    expect(record).toMatchObject({ method: "stroke", switchedAtHit: 3 });
    expect(replay).toMatchObject({ endReason: "empty", switchedAtHit: 3 });
    expect(replay.durationMs).toBe(record.durationMs);
    expect(touches.map(([at]) => at)).toEqual(record.hitTimes.slice(0, 3));
    expect(strokes).toHaveLength(1);
    const sampled = new Set(strokes[0].map(([at]) => at));
    expect(record.hitTimes.slice(3).filter((at) => !sampled.has(at))).toEqual([]);
    expect(record.hits - 3).toBeGreaterThan(10);
  });

  it.each([0, 2])("a shake combo after %i taps, past the rate limit", (taps) => {
    const s = session();
    for (let i = 0; i < taps; i++) s.tap(1000 + i * 150);
    // Reversals every 55 ms, faster than the limit, from t = 1200 to 5000, with a frame every
    // 16 ms. The engine's shake unlocks on the 16th in a row, and every one after goes to the combo.
    let reversal = 0;
    for (let t = 1200; !s.ended; t += 16) {
      const due = 1200 + 55 * (reversal + 1);
      if (t >= due && due <= 5000) {
        reversal++;
        const direction = reversal % 2 === 0 ? 1 : -1;
        if (s.combo.view.method === "shake") {
          s.recorder.shake(direction, s.hear(s.combo.countShakeReversal(due)));
        } else if (reversal >= FEEL_CONFIG.shake.unlockAt) {
          s.recorder.shake(direction, s.hear(s.combo.commitTo("shake", due)));
        }
      }
      s.frame(t);
    }

    const { ended, replay } = s.finish();
    const { record } = ended;
    const { shakes } = readReplay(replay, record);
    expect(record).toMatchObject({ method: "shake", switchedAtHit: taps });
    expect(replay.endReason).toBe("empty");
    expect(shakes.length).toBeGreaterThan(record.hits - taps);
    expect(new Set(shakes.map(([, direction]) => direction))).toEqual(new Set([1, -1]));
    expect(playBack(replay)).toMatchObject({ reason: replay.endReason, record });
  });
});
