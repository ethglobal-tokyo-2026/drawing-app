import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { useTranslation } from "../../i18n/react";
import type { PenPressure } from "../../sticker-creation/canvas/brush";
import {
  InkEngine,
  type InkEvents,
  type InkSettings,
} from "../../sticker-creation/canvas/inkEngine";
import { InkSurface } from "../../sticker-creation/canvas/inkSurface";
import type { Step } from "../../sticker-creation/canvas/ops";
import { FIRST_SMOOTHING } from "../../sticker-creation/canvas/stabilizer";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { useReducedMotion } from "../../ui/useReducedMotion";

/** The pen's size on the strip, in CSS px: wide enough for the pressure to show. */
const TRY_SIZE = 12;
/** The ink stays this long after the last stroke, then fades. */
const TRY_FADE_AFTER_MS = 3000;
/** Ink, the color sheet's first swatch. */
const INK = "#1C1824";
/**
 * A page holding only a clear: loaded without a frame, it takes the strip's own area as its frame,
 * one CSS px to the unit, as a drawing kept without a frame does.
 */
const BLANK: readonly Step[] = [{ tool: "clear" }];

/** The strip draws as a fresh sheet does, with the brush at its size and the chosen curve. */
const settingsFor = (response: PenPressure, fingersDraw: boolean): InkSettings => ({
  tool: "brush",
  color: INK,
  size: TRY_SIZE,
  smoothing: FIRST_SMOOTHING,
  locked: false,
  paused: false,
  panelOpen: false,
  inputMode: fingersDraw ? "pencilAndFinger" : "pencilOnly",
  penPressure: response,
  sessionMs: () => 0,
});

/** The strip shows no hover ring, keeps nothing, and has no panel or pause to report. */
const ignore = () => {};
const EVENTS: InkEvents = {
  onHistory: ignore,
  onCommit: ignore,
  onBlocked: ignore,
  onDismissPanel: ignore,
  onPen: ignore,
  onHover: ignore,
};

/**
 * Try it: a strip of drawing paper where the pen draws through the drawing screen's own ink engine
 * with the chosen pressure curve, so the choice is felt, not guessed. Fingers draw too unless
 * `fingersDraw` is off; a mouse draws by speed. The ink fades a few seconds after the last stroke,
 * or goes at once under reduced motion; nothing is kept. Screen readers skip it.
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
  const engine = useRef<InkEngine | null>(null);
  /** The strip's size and density the ink was framed at; null once it has faded. */
  const framed = useRef<string | null>(null);
  const initialSettings = useEffectEvent(() => settingsFor(response, fingersDraw));
  const faded = (el: HTMLCanvasElement) => {
    releaseCanvas(el);
    framed.current = null;
  };
  const fadeOut = useEffectEvent((el: HTMLCanvasElement) => {
    if (reduced) faded(el);
    else el.classList.add("is-fading");
  });

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ink = new InkEngine(new InkSurface(el), initialSettings(), EVENTS);
    let fade: number | undefined;
    // Framed to the strip at the screen's density as a stroke lands, which clears it: what's left
    // would fade anyway. This runs before the engine hears the pointer.
    const onDown = (e: PointerEvent) => {
      // A stroke here isn't a press on the paper around it.
      e.stopPropagation();
      clearTimeout(fade);
      el.classList.remove("is-fading");
      const size = `${el.clientWidth}x${el.clientHeight}@${devicePixelRatio}`;
      if (framed.current === size) return;
      framed.current = size;
      ink.load(BLANK, null);
      ink.fit({ width: el.clientWidth, height: el.clientHeight }, devicePixelRatio);
    };
    const onLift = () => {
      clearTimeout(fade);
      fade = window.setTimeout(() => fadeOut(el), TRY_FADE_AFTER_MS);
    };
    // The strip takes the whole touch: no scroll, no Scribble or text selection from the Pencil, and
    // the cork never reads it as its pull toward the developer slip.
    const hold = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("pointerdown", onDown);
    const detach = ink.attach(el);
    el.addEventListener("pointerup", onLift);
    el.addEventListener("pointercancel", onLift);
    el.addEventListener("touchstart", hold, { passive: false });
    el.addEventListener("touchmove", hold, { passive: false });
    engine.current = ink;
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onLift);
      el.removeEventListener("pointercancel", onLift);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchmove", hold);
      detach();
      clearTimeout(fade);
      ink.dispose();
      engine.current = null;
      faded(el);
    };
  }, []);

  useLayoutEffect(() => {
    if (engine.current) engine.current.settings = settingsFor(response, fingersDraw);
  });

  return (
    <div className="try-pen-pressure" aria-hidden="true">
      <canvas
        ref={canvas}
        className="try-pen-pressure__ink"
        onTransitionEnd={(e) => {
          if (!e.currentTarget.classList.contains("is-fading")) return;
          faded(e.currentTarget);
          e.currentTarget.classList.remove("is-fading");
        }}
      />
      <span className="try-pen-pressure__label">
        {t(($) => $.stickerBoard.settings.pencil.pressure.tryIt)}
      </span>
    </div>
  );
}
