// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOnHeart, listenForTouches, type HeartArea } from "./touchInput";

const heart: HeartArea = { cx: 200, cy: 400, width: 220, height: 212 };

let stage: HTMLDivElement;
let stop: () => void;
const onHeartDown = vi.fn();
const onHeartTap = vi.fn();

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
      tapSlopPx: 12,
      tapHoldMs: 800,
    },
    { onHeartDown, onHeartTap },
  );
});

afterEach(() => {
  stop();
  stage.remove();
  vi.clearAllMocks();
});

describe("isOnHeart", () => {
  it("takes a touch just inside the heart's resting box and refuses one just outside it", () => {
    const right = heart.cx + heart.width / 2;
    const bottom = heart.cy + heart.height / 2;
    expect(isOnHeart(right - 1, heart.cy, heart)).toBe(true);
    expect(isOnHeart(heart.cx, bottom - 1, heart)).toBe(true);
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

  it("reports a quick lift as a tap, and a drag or a hold as neither", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0);
    pointer("pointerup", heart.cx, heart.cy, 120);
    pointer("pointerdown", heart.cx, heart.cy, 1000, 2);
    pointer("pointermove", heart.cx + 20, heart.cy, 1050, 2);
    pointer("pointerup", heart.cx + 20, heart.cy, 1100, 2);
    pointer("pointerdown", heart.cx, heart.cy, 2000, 3);
    pointer("pointerup", heart.cx, heart.cy, 2900, 3);
    expect(onHeartTap).toHaveBeenCalledTimes(1);
    expect(onHeartTap).toHaveBeenCalledWith(120, heart.cx, heart.cy);
  });
});
