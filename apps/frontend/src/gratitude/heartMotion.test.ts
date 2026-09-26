import { describe, expect, it, vi } from "vitest";
import { FEEL_CONFIG } from "./gameConfig";
import {
  createHeartMotion,
  type HeartFrame,
  type HeartLayout,
  type HeartMotionState,
  type WallHit,
} from "./heartMotion";

const LAYOUT: HeartLayout = {
  rest: { x: 195, y: 440 },
  width: 226,
  height: 218,
  giver: { x: 128, y: 120 },
  screen: { width: 390, height: 741 },
  ceiling: 236,
};
const RUNNING: HeartMotionState = {
  phase: "running",
  tier: 1,
  intensity: 0.7,
  reduced: false,
  sendingProgress: 0,
  leanToward: null,
  strokeStretch: null,
};
const FRAME_S = 1 / 60;

function heartWith(onWallHit: (hit: WallHit) => void = () => {}) {
  return createHeartMotion(LAYOUT, () => 0.5, onWallHit);
}

/** Steps `seconds` of frames, and returns them. */
function run(
  heart: ReturnType<typeof createHeartMotion>,
  seconds: number,
  state: Partial<HeartMotionState> | ((s: number) => Partial<HeartMotionState>) = {},
): HeartFrame[] {
  const frames: HeartFrame[] = [];
  for (let s = 0; s < seconds; s += FRAME_S) {
    const extra = typeof state === "function" ? state(s) : state;
    frames.push(heart.step(FRAME_S, FRAME_S, { ...RUNNING, ...extra }));
  }
  return frames;
}

function last(frames: readonly HeartFrame[]): HeartFrame {
  const frame = frames.at(-1);
  if (!frame) throw new Error("No frames were stepped");
  return frame;
}
const rotation = (frame: HeartFrame) => Number(/rotate\((-?[\d.]+)deg\)/.exec(frame.anchor)?.[1]);
const anchorScale = (frame: HeartFrame) => Number(/scale\(([\d.]+)\)$/.exec(frame.anchor)?.[1]);
/** The stretch along its axis, from the body's first scale. */
const stretch = (frame: HeartFrame) =>
  Number(/^rotate\([^)]*\) scale\(([\d.]+),/.exec(frame.body)?.[1] ?? 1);

describe("createHeartMotion", () => {
  it("keeps a loose heart's top edge under the ceiling, and hits the top where its top edge is", () => {
    const hits: WallHit[] = [];
    const heart = heartWith((hit) => hits.push(hit));
    heart.comeLoose();
    heart.kickLoose({ x: 0, y: -1 }, 30);
    const frames = run(heart, 2);
    for (const f of frames) {
      const r = (LAYOUT.width / 2) * f.scale * 0.92;
      expect(f.y - r).toBeGreaterThanOrEqual(LAYOUT.ceiling - 0.001);
    }
    const top = hits.find((hit) => hit.edge === "top");
    expect(top?.y).toBeCloseTo(LAYOUT.ceiling, 3);
  });

  it("stops a loose heart where it is once the combo calms, with no more wall hits", () => {
    const onWallHit = vi.fn<(hit: WallHit) => void>();
    const heart = heartWith(onWallHit);
    heart.comeLoose();
    heart.kickLoose({ x: 1, y: 0 }, 30);
    const before = run(heart, 0.3).at(-1);
    heart.calm();
    onWallHit.mockClear();
    const after = run(heart, 3);
    expect(onWallHit).not.toHaveBeenCalled();
    expect(after.at(-1)?.x).toBeCloseTo(before?.x ?? 0, 0);
    expect(after.at(-1)?.y).toBeCloseTo(before?.y ?? 0, 0);
  });

  it("stops a loose heart as it goes limp", () => {
    const onWallHit = vi.fn<(hit: WallHit) => void>();
    const heart = heartWith(onWallHit);
    heart.comeLoose();
    heart.kickLoose({ x: -1, y: 0 }, 30);
    run(heart, 0.2);
    heart.goLimp();
    onWallHit.mockClear();
    const frames = run(heart, 3, { tier: 4 });
    expect(onWallHit).not.toHaveBeenCalled();
    expect(frames.at(-1)?.x).toBeCloseTo(frames[0]?.x ?? 0, 3);
  });

  it("flies a loose heart to the giver from its loose size, not full size", () => {
    const heart = heartWith();
    heart.comeLoose();
    const loose = last(run(heart, 1));
    void heart.flyToGiver();
    const first = last(run(heart, FRAME_S));
    expect(loose.scale).toBeLessThan(0.7);
    expect(first.scale).toBeLessThanOrEqual(loose.scale);
    expect(anchorScale(first)).toBeLessThan(0.7);
  });

  it("winds up on a first tap straight after a drag, without a jump in its lean", () => {
    const heart = heartWith();
    heart.pullTo(90, 0);
    run(heart, 0.3, { phase: "ready", tier: null });
    heart.pullTo(0, null);
    run(heart, 0.05, { phase: "ready", tier: null });
    const frames = run(heart, 0.8, (s) => ({
      phase: "sending",
      tier: null,
      sendingProgress: s / 0.8,
    }));
    const leans = frames.map(rotation);
    for (let i = 1; i < leans.length; i++) {
      expect(Math.abs(leans[i] - leans[i - 1])).toBeLessThan(1);
    }
    expect(leans.at(-1)).toBeLessThan(-7);
  });

  it("eases its tilt back upright once the wrist stops moving it", () => {
    const heart = heartWith();
    heart.swayWith(0, 9.8);
    expect(Math.abs(rotation(last(run(heart, 2))))).toBeGreaterThan(6);
    heart.stopSway();
    expect(Math.abs(rotation(last(run(heart, 2))))).toBeLessThan(0.5);
  });

  it("stretches a stroked heart only a little with reduced motion", () => {
    const stroked = { strokeStretch: { speed: 5, angle: 90 } };
    expect(stretch(last(run(heartWith(), 1, stroked)))).toBeGreaterThan(1.2);
    const reduced = last(run(heartWith(), 1, { ...stroked, reduced: true }));
    expect(stretch(reduced)).toBeLessThanOrEqual(1 + FEEL_CONFIG.stroke.reducedStretch + 0.001);
  });
});
