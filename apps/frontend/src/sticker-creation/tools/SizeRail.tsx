import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "../../i18n/react";
import { clamp01 } from "../../ui/easing";
import { sizePx } from "../canvas/brush";
import { useDrag } from "./useDrag";
import "./SizeRail.css";

/** The thumb's center runs from this far below the rail's top… */
const THUMB_TOP = 18;
/** …to this far above its foot, where the px label sits. */
const THUMB_BOTTOM = 44;
/** How far one arrow key moves the size. */
const KEY_STEP = 0.04;

/** How far from the rail's top the thumb's center sits for a size, in a rail this tall. */
const thumbCenter = (value: number, height: number) =>
  THUMB_TOP + (1 - value) * (height - THUMB_TOP - THUMB_BOTTOM);
/** The size held by a thumb whose center is this far from the rail's top. */
const sizeAt = (center: number, height: number) =>
  clamp01(1 - (center - THUMB_TOP) / (height - THUMB_TOP - THUMB_BOTTOM));

/** The size as CSS draws it: the thumb's place, the tip's dot, the ghost's width and the px label. */
function sizeStyle(value: number): CSSProperties {
  const px = sizePx(value);
  return {
    "--v": value,
    "--d": `${px}px`,
    "--tip": `${Math.min(24, Math.max(5, px))}px`,
    "--px": Math.round(px),
    "--px-digits": String(Math.round(px)).length,
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
 * at its foot. While a finger is on it, a ghost of the tip shows mid-sheet at its real size. Only the
 * thumb takes a finger, so a stroke that starts beside it is a stroke.
 */
export function SizeRail({ value, eraser, active, onChange, onHold }: Props) {
  const { t } = useTranslation();
  const rail = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const dragged = useRef(value);
  // The rail's box, and how far the finger landed from the thumb's center: the thumb moves with the
  // finger from where it took hold, rather than jumping to it.
  const railBox = useRef<DOMRect | null>(null);
  const grabbed = useRef(0);

  const drag = useDrag({
    onStart: (_x, y) => {
      const box = rail.current?.getBoundingClientRect() ?? null;
      railBox.current = box;
      grabbed.current = box ? y - box.top - thumbCenter(value, box.height) : 0;
      onHold(true);
    },
    onMove: (_x, y) => {
      const box = railBox.current;
      if (!box) return;
      dragged.current = sizeAt(y - grabbed.current - box.top, box.height);
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
        aria-label={
          eraser
            ? t(($) => $.stickerCreation.sizeRail.eraser)
            : t(($) => $.stickerCreation.sizeRail.brush)
        }
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={48}
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
