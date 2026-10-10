import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "../../i18n/react";
import { clamp, EASE_OUT } from "../../ui/easing";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { NUDGE_MS } from "../nudge";
import { useDrag } from "../tools/useDrag";
import "./OpacitySlider.css";

/** The track's top, where the layer shows in full, and its foot, where the layer is hidden. */
const FULL = 100;
const HIDDEN = 0;
/** The thumb's side in CSS px; it travels the track's length less this. CSS reads it as `--thumb`. */
const THUMB = 16;
/** How far one arrow key moves the opacity, in percent. */
export const KEY_STEP = 5;
/** How far a press may move and still be a tap: an unverified guess, to tune by feel. */
export const TAP_SLOP = 4;
/** The longest from one tap's release to the next press that still makes a double-tap: an unverified guess, to tune by feel. */
export const DOUBLE_TAP_MS = 300;
/** How long the hint stays beside the slider after a stroke meets a hidden layer. */
export const HINT_MS = 2500;

/** The thumb's shake along the track, upward first: the way to raise a hidden layer. */
const SHAKE: Keyframe[] = [
  { translate: "0 0" },
  { translate: "0 -6px", offset: 0.3 },
  { translate: "0 2px", offset: 0.6 },
  { translate: "0 0" },
];

/** The opacity of a thumb grabbed at `from` once its finger has moved `dy` CSS px down. */
const opacityAfter = (from: number, dy: number, length: number) =>
  clamp(Math.round(from - (dy / Math.max(1, length - THUMB)) * FULL), HIDDEN, FULL);

/** Where a key sends the opacity from `value`; null for a key the slider doesn't take. */
function keyTarget(key: string, value: number): number | null {
  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return clamp(value + KEY_STEP, HIDDEN, FULL);
    case "ArrowDown":
    case "ArrowLeft":
      return clamp(value - KEY_STEP, HIDDEN, FULL);
    case "Home":
      return HIDDEN;
    case "End":
      return FULL;
    default:
      return null;
  }
}

export interface OpacitySliderProps {
  /** 0–100, whole numbers. */
  value: number;
  /** The track's length, CSS px; the column sizes it. */
  length: number;
  /** The screen edge the column sits on: the readout and the thumb's touch area lean the other way, toward the sheet. */
  edge: "left" | "right";
  /** Live while dragging: the layer shows this opacity, and nothing is a step yet. */
  onPreview: (value: number) => void;
  /** Once per drag (on release), per key press, or per double-tap reset; never with the value the layer already has. */
  onCommit: (value: number) => void;
  /** A finger is on the thumb, which holds the clock. */
  onHold: (holding: boolean) => void;
  /** Bumped when a stroke landed on the hidden layer: the slider nudges, and the hint shows. */
  nudge: number;
}

/**
 * The opacity slider: a thin line beside the layer chips, full at the top, with a thumb that is the
 * only part to take a finger, so a stroke starting beside the track draws. The thumb moves with the
 * finger from where it was grabbed, a double-tap on it resets to full, and the value shows beside it
 * while it's held. A drag only redraws the slider and previews; the value lands once, on release.
 */
export function OpacitySlider({
  value,
  length,
  edge,
  onPreview,
  onCommit,
  onHold,
  nudge,
}: OpacitySliderProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const slider = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const [held, setHeld] = useState(false);

  // The press in progress: where and at what opacity it began, what the thumb shows now, how far it
  // has moved, and whether it came soon enough after a tap to be a double-tap's second.
  const press = useRef({ y: 0, from: value, shown: value, travelled: 0, doubleTap: false });
  const lastTapEnd = useRef<number | null>(null);

  const show = (percent: number) => {
    slider.current?.style.setProperty("--v", String(percent / FULL));
    if (readout.current)
      readout.current.textContent = t(($) => $.stickerCreation.opacitySlider.value, {
        value: percent,
      });
  };

  const drag = useDrag({
    onStart: (_x, y) => {
      const sinceTap =
        lastTapEnd.current === null ? Infinity : performance.now() - lastTapEnd.current;
      press.current = {
        y,
        from: value,
        shown: value,
        travelled: 0,
        doubleTap: sinceTap <= DOUBLE_TAP_MS,
      };
      setHeld(true);
      onHold(true);
    },
    onMove: (_x, y) => {
      const p = press.current;
      p.travelled = Math.max(p.travelled, Math.abs(y - p.y));
      const percent = opacityAfter(p.from, y - p.y, length);
      if (percent === p.shown) return;
      p.shown = percent;
      show(percent);
      onPreview(percent);
    },
    onEnd: () => {
      const p = press.current;
      const tap = p.travelled <= TAP_SLOP;
      // A tap leaves the opacity as it was, however its finger rocked.
      if (tap && p.shown !== p.from) {
        p.shown = p.from;
        show(p.from);
        onPreview(p.from);
      }
      const reset = tap && p.doubleTap;
      lastTapEnd.current = tap && !reset ? performance.now() : null;
      const next = reset ? FULL : p.shown;
      if (next !== p.from) onCommit(next);
      setHeld(false);
      onHold(false);
    },
    // Gone mid-drag: the layer goes back to the opacity it had, and the clock runs again.
    onAbandon: () => {
      const p = press.current;
      if (p.shown !== p.from) onPreview(p.from);
      onHold(false);
    },
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const next = keyTarget(e.key, value);
    if (next === null) return;
    e.preventDefault();
    if (next !== value) onCommit(next);
  };

  // A stroke that met the hidden layer bumps `nudge`: the thumb shakes and the hint shows for a while.
  const [seenNudge, setSeenNudge] = useState(nudge);
  const [hinted, setHinted] = useState(false);
  if (nudge !== seenNudge) {
    setSeenNudge(nudge);
    setHinted(true);
  }
  useEffect(() => {
    if (!hinted) return undefined;
    if (!reduced) thumb.current?.animate(SHAKE, { duration: NUDGE_MS, easing: EASE_OUT });
    const hide = setTimeout(() => setHinted(false), HINT_MS);
    return () => clearTimeout(hide);
  }, [hinted, seenNudge, reduced]);

  const hint = t(($) => $.stickerCreation.opacitySlider.hiddenHint);
  const style: CSSProperties = { "--v": value / FULL, "--thumb": `${THUMB}px`, height: length };
  return (
    <>
      <div
        ref={slider}
        className={`opacity-slider ${held ? "is-held" : ""}`}
        data-edge={edge}
        role="slider"
        tabIndex={0}
        aria-label={t(($) => $.stickerCreation.opacitySlider.label)}
        aria-orientation="vertical"
        aria-valuemin={HIDDEN}
        aria-valuemax={FULL}
        aria-valuenow={value}
        aria-valuetext={t(($) => $.stickerCreation.opacitySlider.value, { value })}
        style={style}
        onKeyDown={onKeyDown}
      >
        <span className="opacity-track" />
        <span className="opacity-fill" />
        <span ref={thumb} className="opacity-thumb" {...drag} />
        <span ref={readout} className="opacity-readout" aria-hidden="true" />
        <span className={`opacity-hint ${hinted && !held ? "is-on" : ""}`} aria-hidden="true">
          {hint}
        </span>
      </div>
      <span className="visually-hidden" role="status">
        {hinted ? hint : ""}
      </span>
    </>
  );
}
