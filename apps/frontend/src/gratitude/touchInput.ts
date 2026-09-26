/** The heart's resting box, in the stage's own pixels. */
export interface HeartArea {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * On the heart at rest: inside its box, or inside the ellipse through the box's edges grown by 7%,
 * which reaches a little past the middle of each side. The area never follows the heart's squash or
 * tremor, so an animation can't move the target out from under a thumb.
 */
export function isOnHeart(x: number, y: number, heart: HeartArea): boolean {
  const dx = (x - heart.cx) / (heart.width / 2);
  const dy = (y - heart.cy) / (heart.height / 2);
  return dx * dx + dy * dy < 1.15 || (Math.abs(dx) < 1 && Math.abs(dy) < 1);
}

export interface TouchHandlers {
  /** A finger went down on the heart. */
  onHeartDown: (t: number, x: number, y: number) => void;
  /** A finger lifted off the heart without dragging or holding: the first tap. */
  onHeartTap: (t: number, x: number, y: number) => void;
}

export interface TouchOptions {
  /** Read on every touch, so a resize can move it. */
  heartArea: () => HeartArea;
  /** A pointer's position in the stage's own pixels. */
  toStage: (e: PointerEvent) => { x: number; y: number };
  /** A touch that travels further is a drag. */
  tapSlopPx: number;
  /** A touch held longer is a hold. */
  tapHoldMs: number;
}

interface Grab {
  x: number;
  y: number;
  t: number;
  dragged: boolean;
}

/** Reports touches on the heart until the returned function is called. Every finger counts. */
export function listenForTouches(
  stage: HTMLElement,
  options: TouchOptions,
  handlers: TouchHandlers,
): () => void {
  const grabs = new Map<number, Grab>();

  const onDown = (e: PointerEvent) => {
    if (e.button > 0) return;
    const { x, y } = options.toStage(e);
    if (!isOnHeart(x, y, options.heartArea())) return;
    e.preventDefault();
    grabs.set(e.pointerId, { x, y, t: e.timeStamp, dragged: false });
    handlers.onHeartDown(e.timeStamp, x, y);
  };
  const onMove = (e: PointerEvent) => {
    const grab = grabs.get(e.pointerId);
    if (!grab || grab.dragged) return;
    const { x, y } = options.toStage(e);
    if (Math.hypot(x - grab.x, y - grab.y) > options.tapSlopPx) grab.dragged = true;
  };
  const onUp = (e: PointerEvent) => {
    const grab = grabs.get(e.pointerId);
    grabs.delete(e.pointerId);
    if (!grab || grab.dragged || e.timeStamp - grab.t >= options.tapHoldMs) return;
    handlers.onHeartTap(e.timeStamp, grab.x, grab.y);
  };
  const onCancel = (e: PointerEvent) => grabs.delete(e.pointerId);

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onCancel);
  return () => {
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onCancel);
  };
}
