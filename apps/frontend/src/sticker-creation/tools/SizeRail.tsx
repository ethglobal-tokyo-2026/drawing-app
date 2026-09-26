import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { sizePx } from "../canvas/brush";
import { useDrag } from "./useDrag";
import "./SizeRail.css";

/** The thumb's center runs from this far below the rail's top… */
const THUMB_TOP = 18;
/** …to this far above its foot, where the px label sits. */
const THUMB_BOTTOM = 44;
/** How far one arrow key moves the size. */
const KEY_STEP = 0.04;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The size as CSS draws it: the thumb's place, the tip's dot, the ghost's width and the px label. */
function sizeStyle(value: number): CSSProperties {
  const px = sizePx(value);
  return {
    "--v": value,
    "--d": `${px}px`,
    "--tip": `${Math.min(24, Math.max(5, px))}px`,
    "--px": Math.round(px),
  };
}

interface Props {
  /** 0–1 along the rail. */
  value: number;
  eraser: boolean;
  /** A finger is on the rail: it lifts and the size shows mid-sheet. */
  active: boolean;
  onChange: (value: number) => void;
  onHold: (holding: boolean) => void;
}

/**
 * The size rail: a groove down the left edge, a thumb that is the brush tip itself, and the size in px
 * at its foot. While a finger is on it, a ghost of the tip shows mid-sheet at its real size.
 */
export function SizeRail({ value, eraser, active, onChange, onHold }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const dragged = useRef(value);

  const drag = useDrag({
    onStart: () => onHold(true),
    onMove: (_x, y, box) => {
      dragged.current = clamp01(
        1 - (y - box.top - THUMB_TOP) / (box.height - THUMB_TOP - THUMB_BOTTOM),
      );
      for (const el of [rail.current, ghost.current])
        for (const [name, v] of Object.entries(sizeStyle(dragged.current)))
          el?.style.setProperty(name, String(v));
    },
    onEnd: () => {
      onChange(dragged.current);
      onHold(false);
    },
  });

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    onChange(clamp01(value + step * KEY_STEP));
  };

  const px = Math.round(sizePx(value));
  const style = sizeStyle(value);
  return (
    <>
      <div
        ref={rail}
        className={`size-rail ${active ? "is-active" : ""} ${eraser ? "is-eraser" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label={eraser ? "Eraser size" : "Brush size"}
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={48}
        aria-valuenow={px}
        aria-valuetext={`${px} px`}
        style={style}
        onKeyDown={onKeyDown}
        {...drag}
      >
        <span className="size-track" />
        <span className="size-thumb">
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
