import { describe, expect, it } from "vitest";
import type { ReplayV1 } from "@drawing-app/api/client";
import { FEEL_CONFIG, GAME_CONFIG } from "../gameConfig";
import type { HeartBox } from "../miniHeartPhysics";
import { heartRest, LIVE_FRAME } from "../stageLayout";
import { session, STAGE, strokeStartedCombo, strokeUpAndDown } from "../testCombos";
import { isOnHeart } from "../touchInput";
import {
  createReplayFeed,
  MAX_REPLAY_SPEED,
  REPLAY_REAL_TIME_MS,
  replaySpeed,
  type FeedInput,
  type StagePoint,
} from "./replayFeed";

/** The heart on the stage the tests record on: fed onto it, every input stays where it was. */
const RECORDED_HEART = heartRest(STAGE.width, STAGE.height, LIVE_FRAME);

const px = ({ x, y }: StagePoint) => [Math.round(x), Math.round(y)];

/** An input as a readable row: its kind, its time, where it is to the px, and what it says. */
function row(input: FeedInput): (string | number | boolean | null)[] {
  switch (input.kind) {
    case "touch":
      return [input.kind, input.at, ...px(input.point), input.counted];
    case "strokeStart":
      return [input.kind, input.at, ...px(input.point)];
    case "strokeMove":
      return [input.kind, input.at, ...px(input.point), input.fastPass];
    case "strokeEnd":
      return [input.kind, input.at];
    case "reversal":
      return [input.kind, input.at, input.direction];
  }
}

describe("createReplayFeed", () => {
  it("gives back what the recorder heard, in time order and where it was", () => {
    const s = session();
    // Five quick taps: the last is past the rate limit.
    [1000, 1010, 1020, 1030, 1040].forEach((t, i) => s.tap(t, 180 + 10 * i, 420));
    // A slow drag, with no passes, that the shake unlock lets go of.
    s.fingerDown(1100, 200, 600);
    [1140, 1180, 1220].forEach((t, i) => s.move(t, 200, 610 + 10 * i));
    s.reverse(1300, 1);
    [1400, 1500, 1600].forEach((t, i) => s.reverse(t, i % 2 === 0 ? -1 : 1));
    s.end(1700, "closed");
    const { ended, replay } = s.finish();

    const feed = createReplayFeed(replay, RECORDED_HEART);
    expect(feed.inputs.map(row)).toEqual([
      ["touch", 0, 180, 420, true],
      ["touch", 10, 190, 420, true],
      ["touch", 20, 200, 420, true],
      ["touch", 30, 210, 420, true],
      ["touch", 40, 220, 420, false],
      ["strokeStart", 100, 200, 600],
      ["strokeMove", 140, 200, 610, false],
      ["strokeMove", 180, 200, 620, false],
      ["strokeMove", 220, 200, 630, false],
      ["strokeEnd", 220],
      ["reversal", 300, 1],
      ["reversal", 400, -1],
      ["reversal", 500, 1],
      ["reversal", 600, -1],
    ]);
    expect(feed.end).toEqual({ at: ended.record.durationMs, reason: ended.reason });
  });

  it("orders inputs at the same ms as the combo heard them, one stroke at a time", () => {
    const replay: ReplayV1 = {
      v: 1,
      seed: 1,
      intensity: 1,
      stage: [STAGE.width, STAGE.height],
      durationMs: 300,
      endReason: "closed",
      switchedAtHit: 2,
      // Taps at 0 and 100.
      hits: [0, 5000, 6000, 1, 100, 0, 0, 1],
      strokes: [
        // Down at 0, a move at 100.
        [0, 2000, 8000, 100, 0, -500],
        // Down at 50, while the first still stroked; a move at 200 that ended a fast pass.
        [50, 8000, 8000, 150, 0, -500],
      ],
      // The shake unlock at 200.
      shakes: [200, 1],
      strokePasses: [[], [1]],
    };
    const inputs = createReplayFeed(replay, RECORDED_HEART).inputs;
    expect(inputs.map(({ kind, at }) => [kind, at])).toEqual([
      ["touch", 0],
      ["strokeStart", 0],
      ["touch", 100],
      ["strokeMove", 100],
      ["strokeEnd", 100],
      // The second finger starts its stroke once the first lifts, as the engine heard it.
      ["strokeStart", 100],
      ["strokeMove", 200],
      ["strokeEnd", 200],
      ["reversal", 200],
    ]);
    expect(
      inputs.flatMap((input) => (input.kind === "strokeMove" ? [input.fastPass] : [])),
    ).toEqual([false, true]);
  });

  it("marks the moves that ended a fast pass, from the one that started the combo on", () => {
    const { ended, replay, fastPasses } = strokeStartedCombo();
    const inputs = createReplayFeed(replay, RECORDED_HEART).inputs;
    const { durationMs } = ended.record;
    expect(
      inputs.flatMap((input) => (input.kind === "strokeMove" && input.fastPass ? [input.at] : [])),
    ).toEqual(fastPasses.filter((at) => at >= 0 && at <= durationMs));
    // The unlocking pass is where the stored stroke starts: the finger starts there, and moves there.
    const [start, move] = inputs;
    expect(start).toMatchObject({ kind: "strokeStart", at: 0 });
    expect(move).toEqual({ ...start, kind: "strokeMove", fastPass: true });
  });

  it("gives each input once, when its time comes", () => {
    const s = session();
    [1000, 1100, 1200].forEach((t) => s.tap(t));
    strokeUpAndDown(s, { from: 1250, until: 2250 });
    s.end(2300, "closed");
    const feed = createReplayFeed(s.finish().replay, RECORDED_HEART);

    const given: FeedInput[] = [];
    let before = -Infinity;
    for (let at = 0; at <= feed.end.at + 16; at += 16) {
      const due = feed.due(at);
      expect(due.every((input) => input.at > before && input.at <= at)).toBe(true);
      expect(feed.due(at)).toEqual([]);
      given.push(...due);
      before = at;
    }
    expect(given).toEqual(feed.inputs);
  });
});

describe("where a replay's inputs land", () => {
  /** The replay's stage in the gratitude card, and its heart under the replay's HUD. */
  const CARD = { width: 268, height: 300 };
  const CARD_HEART = heartRest(CARD.width, CARD.height, { above: 64 });

  /** Where a point sits on a heart: its offset from the middle, in heart widths and heights. */
  const onHeart = ({ x, y }: StagePoint, heart: HeartBox) => [
    (x - heart.x) / heart.width,
    (y - heart.y) / heart.height,
  ];
  /** The same place, to within the rounding of a recorded position. */
  const near = ([x, y]: number[]): unknown[] => [expect.closeTo(x, 3), expect.closeTo(y, 3)];

  const points = (inputs: readonly FeedInput[]) =>
    inputs.flatMap((input) => ("point" in input ? [input.point] : []));

  it.each([
    ["a phone", STAGE],
    ["a tablet, with the heart at its widest", { width: 820, height: 1180 }],
  ])("keeps a touch's place on the heart, recorded on %s", (_, stage) => {
    const recorded = heartRest(stage.width, stage.height, LIVE_FRAME);
    // The heart's middle, and eight spots just inside its reach.
    const reach = 0.97 * (1 + FEEL_CONFIG.heartReach);
    const spots: StagePoint[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      x: recorded.x + (Math.cos((i * Math.PI) / 4) * reach * recorded.width) / 2,
      y: recorded.y + (Math.sin((i * Math.PI) / 4) * reach * recorded.height) / 2,
    }));
    spots.push({ x: recorded.x, y: recorded.y });
    const s = session();
    s.recorder.resize(stage.width, stage.height);
    spots.forEach(({ x, y }, i) => s.tap(1000 + 100 * i, x, y));
    s.end(1000 + 100 * spots.length, "closed");

    const touches = points(createReplayFeed(s.finish().replay, CARD_HEART).inputs);
    expect(touches.map((point) => onHeart(point, CARD_HEART))).toEqual(
      spots.map((spot) => near(onHeart(spot, recorded))),
    );
    const area = { cx: CARD_HEART.x, cy: CARD_HEART.y, ...CARD_HEART };
    expect(touches.every(({ x, y }) => isOnHeart(x, y, area))).toBe(true);
  });

  it("keeps a stroke's shape around the heart, unclamped past the replay stage's edge", () => {
    const recorded = heartRest(STAGE.width, STAGE.height, LIVE_FRAME);
    // A drag along the bottom of the phone, far under the heart.
    const path: StagePoint[] = [
      { x: 60, y: 700 },
      { x: 140, y: 720 },
      { x: 220, y: 735 },
      { x: 300, y: 710 },
    ];
    const s = session();
    s.tap(1000);
    s.fingerDown(1100, path[0].x, path[0].y);
    path.slice(1).forEach(({ x, y }, i) => s.move(1140 + 40 * i, x, y));
    s.lift();
    s.end(1400, "closed");

    const stroke = points(createReplayFeed(s.finish().replay, CARD_HEART).inputs).slice(1);
    expect(stroke.map((point) => onHeart(point, CARD_HEART))).toEqual(
      path.map((point) => near(onHeart(point, recorded))),
    );
    expect(Math.max(...stroke.map(({ y }) => y))).toBeGreaterThan(CARD.height);
  });
});

describe("replaySpeed", () => {
  /** How long a combo of `durationMs` takes to replay. */
  const replayMs = (durationMs: number) => durationMs / replaySpeed(durationMs);

  it("plays a combo up to REPLAY_REAL_TIME_MS in real time, and a longer one in REPLAY_REAL_TIME_MS", () => {
    for (const ms of [0, REPLAY_REAL_TIME_MS / 2, REPLAY_REAL_TIME_MS])
      expect(replayMs(ms)).toBe(ms);
    for (const ms of [REPLAY_REAL_TIME_MS + 1, REPLAY_REAL_TIME_MS * MAX_REPLAY_SPEED]) {
      expect(replayMs(ms)).toBeCloseTo(REPLAY_REAL_TIME_MS);
    }
  });

  it("never plays faster than MAX_REPLAY_SPEED, which still fits the longest combo the rules allow", () => {
    expect(replaySpeed(REPLAY_REAL_TIME_MS * MAX_REPLAY_SPEED * 2)).toBe(MAX_REPLAY_SPEED);
    expect(replayMs(GAME_CONFIG.maxDurationMs)).toBeLessThanOrEqual(REPLAY_REAL_TIME_MS);
  });
});
