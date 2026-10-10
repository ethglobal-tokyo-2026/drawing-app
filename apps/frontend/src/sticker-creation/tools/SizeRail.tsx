import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "../../i18n/react";
import { clamp, clamp01 } from "../../ui/easing";
import { sizePx } from "../canvas/brush";
import { useDrag } from "./useDrag";
import "./SizeRail.css";

/** The thumb's center runs from this far below the rail's top… */
const THUMB_TOP = 18;
/** …to `--thumb-foot` above its foot, room for the px label; this when no CSS lays the rail out. */
const THUMB_FOOT = 44;
/** How far one arrow key, or [ and ] on the drawing screen, moves the size. */
export const SIZE_STEP = 0.04;
/** The rail's ends as it reads them out, rounded as its value is. */
const LEAST_PX = Math.round(sizePx(0));
const MOST_PX = Math.round(sizePx(1));

/** The rail's length from top to foot, as its CSS lays it out. */
interface Travel {
  height: number;
  foot: number;
}

const travelOf = (rail: HTMLElement, height: number): Travel => ({
  height,
  foot: parseFloat(getComputedStyle(rail).getPropertyValue("--thumb-foot")) || THUMB_FOOT,
});
/** How far from the rail's top the thumb's center sits for a size. */
const thumbCenter = (value: number, { height, foot }: Travel) =>
  THUMB_TOP + (1 - value) * (height - THUMB_TOP - foot);
/** The size held by a thumb whose center is this far from the rail's top. */
const sizeAt = (center: number, { height, foot }: Travel) =>
  clamp01(1 - (center - THUMB_TOP) / (height - THUMB_TOP - foot));

/**
 * The size as CSS draws it: the thumb's place, the tip's dot, the px label, and the ghost's width,
 * the size the brush draws at on the sheet as it's shown, `scale` CSS px to the unit.
 */
function sizeStyle(value: number, scale: number): CSSProperties {
  const px = sizePx(value);
  return {
    "--v": value,
    "--d": `${px * scale}px`,
    "--tip": `${clamp(px, 5, 24)}px`,
    "--px": Math.round(px),
  };
}

interface Props {
  /** 0–1 along the rail. */
  value: number;
  eraser: boolean;
  /** A finger is on the rail: it lifts and the size shows mid-sheet. */
  active: boolean;
  /** How many CSS px a sheet unit spans on screen. */
  scale: number;
  onChange: (value: number) => void;
  onHold: (holding: boolean) => void;
}

/**
 * The size rail: a groove down the left edge, a thumb that is the brush tip itself, and the size
 * in sheet units, shown as px, at its foot. While a finger is on it, a ghost of the tip shows
 * mid-sheet at the size it draws. Only the thumb takes a finger, so a stroke beside it is a stroke.
 */
export function SizeRail({ value, eraser, active, scale, onChange, onHold }: Props) {
  const { t } = useTranslation();
  const rail = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const dragged = useRef(value);
  // The rail's top and travel, and how far the finger landed from the thumb's center: the thumb moves
  // with the finger from where it took hold, rather than jumping to it.
  const railTop = useRef(0);
  const travel = useRef<Travel | null>(null);
  const grabbed = useRef(0);

  const drag = useDrag({
    onStart: (_x, y) => {
      const el = rail.current;
      if (el) {
        const box = el.getBoundingClientRect();
        railTop.current = box.top;
        travel.current = travelOf(el, box.height);
        grabbed.current = y - box.top - thumbCenter(value, travel.current);
      }
      onHold(true);
    },
    onMove: (_x, y) => {
      if (!travel.current) return;
      dragged.current = sizeAt(y - grabbed.current - railTop.current, travel.current);
      for (const el of [rail.current, ghost.current])
        for (const [name, v] of Object.entries(sizeStyle(dragged.current, scale)))
          el?.style.setProperty(name, String(v));
    },
    onEnd: () => {
      onChange(dragged.current);
      onHold(false);
    },
    onAbandon: () => onHold(false),
  });

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    onChange(clamp01(value + step * SIZE_STEP));
  };

  const px = Math.round(sizePx(value));
  const style = sizeStyle(value, scale);
  return (
    <>
      <div
        ref={rail}
        className={`size-rail ${active ? "is-active" : ""} ${eraser ? "is-eraser" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label={
          eraser
            ? t(($) => $.stickerCreation.sizeRail.eraser)
            : t(($) => $.stickerCreation.sizeRail.brush)
        }
        aria-orientation="vertical"
        aria-valuemin={LEAST_PX}
        aria-valuemax={MOST_PX}
        aria-valuenow={px}
        aria-valuetext={t(($) => $.stickerCreation.sizeRail.value, { size: px })}
        style={style}
        onKeyDown={onKeyDown}
      >
        <span className="size-track" />
        <span className="size-thumb" {...drag}>
          <span className="size-tip" />
        </span>
        <span className="size-num" aria-hidden="true" />
      </div>
      <div
        ref={ghost}
        className={`size-ghost ${active ? "is-on" : ""} ${eraser ? "is-eraser" : ""}`}
        style={style}
        aria-hidden="true"
      />
    </>
  );
}
