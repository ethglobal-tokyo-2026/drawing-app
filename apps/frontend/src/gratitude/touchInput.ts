import { FEEL_CONFIG } from "./gameConfig";

/** The heart's resting box, in the stage's own pixels. */
export interface HeartArea {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * On the heart at rest: inside its box, or inside the ellipse through the box's edges grown by
 * `heartReach`, which reaches a little past the middle of each side. The area never follows the
 * heart's squash or tremor, so an animation can't move the target out from under a thumb.
 */
export function isOnHeart(x: number, y: number, heart: HeartArea): boolean {
  const dx = (x - heart.cx) / (heart.width / 2);
  const dy = (y - heart.cy) / (heart.height / 2);
  const reach = 1 + FEEL_CONFIG.heartReach;
  return dx * dx + dy * dy < reach * reach || (Math.abs(dx) < 1 && Math.abs(dy) < 1);
}

export interface TouchHandlers {
  /** A finger went down on the heart. */
  onHeartDown: (t: number, x: number, y: number) => void;
  /** A finger lifted off the heart without dragging or holding: the first tap. */
  onHeartTap: (t: number, x: number, y: number) => void;
  /** A finger dragged past the slop, anywhere, with no stroke under way: where and when it went down. */
  onStrokeStart: (t: number, x: number, y: number) => void;
  /** The stroke finger moved, from the move that started the stroke on. */
  onStrokeMove: (t: number, x: number, y: number) => void;
  /** The stroke finger lifted. */
  onStrokeEnd: () => void;
}

export interface TouchOptions {
  /** Read on every touch, so a resize can move it. */
  heartArea: () => HeartArea;
  /** A pointer's position in the stage's own pixels. */
  toStage: (e: PointerEvent) => { x: number; y: number };
  /** A touch that travels this far is a drag. */
  tapSlopPx: number;
  /** A touch held this long is a hold. */
  tapHoldMs: number;
}

interface Grab {
  x: number;
  y: number;
  t: number;
  onHeart: boolean;
  dragged: boolean;
}

/**
 * Reports touches until the returned function is called. Every finger on the heart counts; one
 * finger at a time strokes, the first to drag, wherever it went down.
 */
export function listenForTouches(
  stage: HTMLElement,
  options: TouchOptions,
  handlers: TouchHandlers,
): () => void {
  const grabs = new Map<number, Grab>();
  let strokeFinger: number | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.button > 0) return;
    // The stage keeps the pointer until it lifts, so a mouse let go off the stage still lifts here.
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events have no active pointer to capture; the touch still counts.
    }
    const { x, y } = options.toStage(e);
    const onHeart = isOnHeart(x, y, options.heartArea());
    grabs.set(e.pointerId, { x, y, t: e.timeStamp, onHeart, dragged: false });
    if (!onHeart) return;
    e.preventDefault();
    handlers.onHeartDown(e.timeStamp, x, y);
  };
  const onMove = (e: PointerEvent) => {
    const grab = grabs.get(e.pointerId);
    if (!grab) return;
    const { x, y } = options.toStage(e);
    if (!grab.dragged && Math.hypot(x - grab.x, y - grab.y) >= options.tapSlopPx) {
      grab.dragged = true;
      if (strokeFinger === null) {
        strokeFinger = e.pointerId;
        handlers.onStrokeStart(grab.t, grab.x, grab.y);
      }
    }
    if (e.pointerId === strokeFinger) handlers.onStrokeMove(e.timeStamp, x, y);
  };
  const lift = (e: PointerEvent) => {
    const grab = grabs.get(e.pointerId);
    grabs.delete(e.pointerId);
    if (stage.hasPointerCapture?.(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    if (e.pointerId === strokeFinger) {
      strokeFinger = null;
      handlers.onStrokeEnd();
    }
    return grab;
  };
  const onUp = (e: PointerEvent) => {
    const grab = lift(e);
    if (!grab?.onHeart || grab.dragged || e.timeStamp - grab.t >= options.tapHoldMs) return;
    handlers.onHeartTap(e.timeStamp, grab.x, grab.y);
  };
  const onCancel = (e: PointerEvent) => {
    lift(e);
  };

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onCancel);
  // Capture lost without a lift, as when the browser takes the pointer: the touch is over.
  stage.addEventListener("lostpointercapture", onCancel);
  return () => {
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onCancel);
    stage.removeEventListener("lostpointercapture", onCancel);
  };
}
