import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "../../i18n/react";
import { StrokeBuilder, type PenPressure } from "../../sticker-creation/canvas/brush";
import { context2d } from "../../sticker-creation/canvas/context2d";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { useReducedMotion } from "../../ui/useReducedMotion";

/** The pen's size on the strip, in CSS px: wide enough for the pressure to show. */
const TRY_SIZE = 12;
/** The ink stays this long after the last stroke, then fades. */
const TRY_FADE_AFTER_MS = 3000;
/** Ink, the color sheet's first swatch. */
const INK = "#1C1824";

type Sample = { clientX: number; clientY: number; pressure: number; timeStamp: number };

/**
 * Try it: a strip of drawing paper where the pen draws with the chosen pressure curve, so the choice
 * is felt, not guessed. Fingers draw too unless `fingersDraw` is off; a mouse draws by speed. The ink
 * fades a few seconds after the last stroke, or goes at once under reduced motion; nothing is kept.
 * Screen readers skip it.
 */
export function TryPenPressure({
  response,
  fingersDraw,
}: {
  response: PenPressure;
  fingersDraw: boolean;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  /** The stroke in progress, and where its latest sample was. */
  const live = useRef<{
    id: number;
    builder: StrokeBuilder;
    painted: number;
    x: number;
    y: number;
  } | null>(null);
  // Whether this pen senses pressure, learned as the drawing screen learns it.
  const sensed = useRef(false);
  const fade = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    // The strip takes the whole touch: no scroll, no Scribble or text selection from the Pencil, and
    // the cork never reads it as its pull toward the developer slip.
    const hold = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("touchstart", hold, { passive: false });
    el.addEventListener("touchmove", hold, { passive: false });
    return () => {
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchmove", hold);
      clearTimeout(fade.current);
      releaseCanvas(el);
    };
  }, []);

  const point = (el: HTMLCanvasElement, e: Sample) => {
    const box = el.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const paint = () => {
    const stroke = live.current;
    if (!stroke || !ctx.current) return;
    paintStroke(ctx.current, stroke.builder.op, stroke.painted, stroke.builder.count);
    stroke.painted = stroke.builder.count;
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // A stroke here isn't a press on the paper around it.
    e.stopPropagation();
    if (live.current || (!fingersDraw && e.pointerType === "touch")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // The pointer already lifted, or never existed (a synthetic event): nothing left to capture.
    }
    clearTimeout(fade.current);
    el.classList.remove("is-fading");
    // Sized to the strip at the screen's density, which clears it: what's left would fade anyway.
    const density = devicePixelRatio || 1;
    const [w, h] = [Math.round(el.clientWidth * density), Math.round(el.clientHeight * density)];
    if (el.width !== w || el.height !== h) [el.width, el.height] = [w, h];
    ctx.current ??= context2d(el);
    ctx.current.setTransform(density, 0, 0, density, 0, 0);
    const { x, y } = point(el, e);
    const builder = new StrokeBuilder({
      tool: "brush",
      color: INK,
      size: TRY_SIZE,
      x,
      y,
      t: e.timeStamp,
      T: 0,
      pressure: e.pressure,
      pointerType: e.pointerType,
      pressureVaries: sensed.current,
      response,
    });
    live.current = { id: e.pointerId, builder, painted: 0, x, y };
    paint();
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = live.current;
    if (stroke?.id !== e.pointerId) return;
    const native: Sample & { getCoalescedEvents?: () => Sample[] } = e.nativeEvent;
    const samples = native.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length ? samples : [native]) {
      const { x, y } = point(e.currentTarget, sample);
      stroke.builder.add(x, y, sample.pressure, sample.timeStamp);
      [stroke.x, stroke.y] = [x, y];
    }
    paint();
  };

  const end = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = live.current;
    if (stroke?.id !== e.pointerId) return;
    // The line curves all the way to the last sample.
    stroke.builder.settle(stroke.x, stroke.y);
    paint();
    live.current = null;
    if (stroke.builder.pressured) sensed.current = true;
    const el = e.currentTarget;
    fade.current = window.setTimeout(() => {
      if (reduced) releaseCanvas(el);
      else el.classList.add("is-fading");
    }, TRY_FADE_AFTER_MS);
  };

  return (
    <div className="try-pen-pressure" aria-hidden="true">
      <canvas
        ref={canvas}
        className="try-pen-pressure__ink"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onTransitionEnd={(e) => {
          if (!e.currentTarget.classList.contains("is-fading")) return;
          releaseCanvas(e.currentTarget);
          e.currentTarget.classList.remove("is-fading");
        }}
      />
      <span className="try-pen-pressure__label">
        {t(($) => $.stickerBoard.settings.pencil.pressure.tryIt)}
      </span>
    </div>
  );
}
