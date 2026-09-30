// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOnHeart, listenForTouches, type HeartArea } from "./touchInput";

const heart: HeartArea = { cx: 200, cy: 400, width: 220, height: 212 };
const TAP_SLOP_PX = 12;
const TAP_HOLD_MS = 800;

let stage: HTMLDivElement;
let stop: () => void;
const onHeartDown = vi.fn();
const onHeartTap = vi.fn();
const onStrokeStart = vi.fn<(t: number, x: number, y: number) => void>();
const onStrokeMove = vi.fn<(t: number, x: number, y: number) => void>();
const onStrokeEnd = vi.fn<() => void>();

/** A pointer event at stage point (x, y), `t` ms into the test. */
function pointer(type: string, x: number, y: number, t: number, pointerId = 1) {
  const e = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    pointerId,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(e, "timeStamp", { value: t });
  stage.dispatchEvent(e);
}

beforeEach(() => {
  stage = document.createElement("div");
  document.body.append(stage);
  stop = listenForTouches(
    stage,
    {
      heartArea: () => heart,
      toStage: (e) => ({ x: e.clientX, y: e.clientY }),
      tapSlopPx: TAP_SLOP_PX,
      tapHoldMs: TAP_HOLD_MS,
    },
    { onHeartDown, onHeartTap, onStrokeStart, onStrokeMove, onStrokeEnd },
  );
});

afterEach(() => {
  stop();
  stage.remove();
  vi.clearAllMocks();
});

describe("isOnHeart", () => {
  it("takes a touch in the heart's resting box or just past the middle of a side, and none further", () => {
    const right = heart.cx + heart.width / 2;
    const bottom = heart.cy + heart.height / 2;
    expect(isOnHeart(right - 1, heart.cy, heart)).toBe(true);
    expect(isOnHeart(heart.cx, bottom - 1, heart)).toBe(true);
    // The ellipse reaches past the side, and the box fills the corner the ellipse misses.
    expect(isOnHeart(right + 1, heart.cy, heart)).toBe(true);
    expect(isOnHeart(right - 1, bottom - 1, heart)).toBe(true);
    expect(isOnHeart(right + heart.width * 0.1, heart.cy, heart)).toBe(false);
    expect(isOnHeart(right + 1, bottom + 1, heart)).toBe(false);
  });
});

describe("listenForTouches", () => {
  it("reports a finger going down on the heart, and ignores one beside it", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0);
    pointer("pointerdown", heart.cx + heart.width, heart.cy, 10, 2);
    expect(onHeartDown).toHaveBeenCalledTimes(1);
    expect(onHeartDown).toHaveBeenCalledWith(0, heart.cx, heart.cy);
  });

  it("counts every finger on the heart", () => {
    pointer("pointerdown", heart.cx - 30, heart.cy, 0, 1);
    pointer("pointerdown", heart.cx + 30, heart.cy, 5, 2);
    expect(onHeartDown).toHaveBeenCalledTimes(2);
  });

  it("reports a quick lift as a tap, and a drag or a hold, from the slop and hold time on, as neither", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0);
    pointer("pointerup", heart.cx, heart.cy, 120);
    pointer("pointerdown", heart.cx, heart.cy, 1000, 2);
    pointer("pointermove", heart.cx + TAP_SLOP_PX, heart.cy, 1050, 2);
    pointer("pointerup", heart.cx + TAP_SLOP_PX, heart.cy, 1100, 2);
    pointer("pointerdown", heart.cx, heart.cy, 2000, 3);
    pointer("pointerup", heart.cx, heart.cy, 2000 + TAP_HOLD_MS, 3);
    expect(onHeartTap).toHaveBeenCalledTimes(1);
    expect(onHeartTap).toHaveBeenCalledWith(120, heart.cx, heart.cy);
  });
});

describe("the stroke finger", () => {
  it("is the first finger to drag past the slop anywhere, and reports its moves from there", () => {
    const x = heart.cx + heart.width;
    pointer("pointerdown", x, 100, 0);
    pointer("pointermove", x, 100 + TAP_SLOP_PX - 1, 10);
    expect(onStrokeStart).not.toHaveBeenCalled();
    pointer("pointermove", x, 100 + TAP_SLOP_PX, 20);
    pointer("pointermove", x, 160, 30);
    expect(onStrokeStart).toHaveBeenCalledWith(0, x, 100);
    expect(onStrokeMove.mock.calls).toEqual([
      [20, x, 100 + TAP_SLOP_PX],
      [30, x, 160],
    ]);
    pointer("pointerup", x, 160, 40);
    expect(onStrokeEnd).toHaveBeenCalledTimes(1);
  });

  it("can't tap until it lifts, even back where it went down", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0);
    pointer("pointermove", heart.cx, heart.cy + 60, 40);
    pointer("pointermove", heart.cx, heart.cy, 80);
    pointer("pointerup", heart.cx, heart.cy, 120);
    expect(onStrokeStart).toHaveBeenCalledTimes(1);
    expect(onHeartTap).not.toHaveBeenCalled();
    pointer("pointerdown", heart.cx, heart.cy, 200);
    pointer("pointerup", heart.cx, heart.cy, 260);
    expect(onHeartTap).toHaveBeenCalledWith(260, heart.cx, heart.cy);
  });

  it("keeps a mouse's pointer on the stage until it lifts, so a release off the stage still ends the stroke", () => {
    const captured = new Set<number>();
    const capture = vi.fn((id: number) => void captured.add(id));
    const release = vi.fn((id: number) => void captured.delete(id));
    stage.setPointerCapture = capture;
    stage.hasPointerCapture = (id: number) => captured.has(id);
    stage.releasePointerCapture = release;
    pointer("pointerdown", heart.cx, heart.cy, 0, 4);
    expect(capture).toHaveBeenCalledWith(4);
    pointer("pointermove", heart.cx, heart.cy + 60, 20, 4);
    // Captured, the browser sends the lift to the stage wherever the mouse is.
    pointer("pointerup", heart.cx, heart.cy + 900, 40, 4);
    expect(onStrokeEnd).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(4);
  });

  it("ends a stroke whose pointer capture is lost, and a hover after it strokes nothing", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0, 5);
    pointer("pointermove", heart.cx, heart.cy + 60, 20, 5);
    pointer("lostpointercapture", heart.cx, heart.cy + 60, 30, 5);
    expect(onStrokeEnd).toHaveBeenCalledTimes(1);
    onStrokeMove.mockClear();
    pointer("pointermove", heart.cx, heart.cy - 60, 50, 5);
    expect(onStrokeMove).not.toHaveBeenCalled();
    expect(onStrokeStart).toHaveBeenCalledTimes(1);
  });

  it("keeps the stroke from a second finger that drags too", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0, 1);
    pointer("pointermove", heart.cx, heart.cy + 40, 20, 1);
    pointer("pointerdown", heart.cx + 40, heart.cy, 30, 2);
    pointer("pointermove", heart.cx + 40, heart.cy + 60, 40, 2);
    pointer("pointermove", heart.cx, heart.cy - 40, 50, 1);
    expect(onStrokeStart).toHaveBeenCalledTimes(1);
    expect(onStrokeMove.mock.calls.map(([t]) => t)).toEqual([20, 50]);
    pointer("pointerup", heart.cx + 40, heart.cy + 60, 60, 2);
    expect(onStrokeEnd).not.toHaveBeenCalled();
  });

  it("goes to a second finger still dragging once the first lifts, as thumbs swap", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0, 1);
    pointer("pointermove", heart.cx, heart.cy + 40, 20, 1);
    pointer("pointerdown", heart.cx + 40, heart.cy, 30, 2);
    pointer("pointermove", heart.cx + 40, heart.cy + 40, 40, 2);
    pointer("pointerup", heart.cx, heart.cy + 40, 50, 1);
    expect(onStrokeEnd).toHaveBeenCalledTimes(1);
    pointer("pointermove", heart.cx + 40, heart.cy + 80, 60, 2);
    pointer("pointermove", heart.cx + 40, heart.cy + 120, 70, 2);
    expect(onStrokeStart).toHaveBeenLastCalledWith(60, heart.cx + 40, heart.cy + 80);
    expect(onStrokeMove).toHaveBeenLastCalledWith(70, heart.cx + 40, heart.cy + 120);
    pointer("pointerup", heart.cx + 40, heart.cy + 120, 80, 2);
    expect(onStrokeEnd).toHaveBeenCalledTimes(2);
    expect(onHeartTap).not.toHaveBeenCalled();
  });
});
