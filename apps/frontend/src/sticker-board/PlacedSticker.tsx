import { ArrowClockwise } from "@phosphor-icons/react";
import { memo, useEffectEvent, useLayoutEffect, useRef } from "react";
import { formatNo, spokenDuration } from "../stickers/format";
import { useFold } from "../stickers/liftedCorner";
import { playStick } from "../stickers/stick";
import { StickerFigure } from "../stickers/StickerFigure";
import type { BoardSticker } from "./boardSticker";
import { stickerBox, type Field } from "./placement";
import type { Hold } from "./useBoardGestures";

interface Props {
  sticker: BoardSticker;
  field: Field;
  boardWidth: number;
  /** Its place in the stack, from the bottom. */
  stack: number;
  /** Whether its corner is lifted. */
  curled: boolean;
  selected: boolean;
  /** Whether its rotate knob hangs below it, where above it couldn't be reached. */
  knobBelow: boolean;
  /** How it's held, while it's in hand. */
  held?: Hold["kind"];
  /** Whether it arrives by landing on the board; `onLanded` says when it has stuck. */
  landing: boolean;
  onLanded: () => void;
  reduced: boolean;
  /** Whether it's the stickers' one Tab stop. */
  tabbable: boolean;
  /** Its place in reading order, as a screen reader says it: "3 of 6". */
  position: string;
  /** What the keys do to it, which changes once it's selected. */
  hintId: string;
  /** Drawn by someone other than the board's owner: it wears foil. */
  foil?: boolean;
  /** Who drew it, as printed, when that isn't the board's owner: its label names them. */
  by?: string;
  /** Its gratitude glow, from 0 (none) to 1 (brightest). */
  glow?: number;
}

const CORNERS = ["nw", "ne", "sw", "se"] as const;

/**
 * A sticker at its placement on the board. Memoized: a gesture's start and end re-render the board,
 * and only the stickers whose props changed need to follow.
 */
export const PlacedSticker = memo(function PlacedSticker({
  sticker,
  field,
  boardWidth,
  stack,
  curled,
  selected,
  knobBelow,
  held,
  landing,
  onLanded,
  reduced,
  tabbable,
  position,
  hintId,
  foil = false,
  by,
  glow = 0,
}: Props) {
  const lift = useRef<HTMLDivElement>(null);
  const fold = useFold(sticker.id, sticker.urls.mask, curled);
  const box = stickerBox(field, boardWidth, sticker.placement, sticker);

  const land = useEffectEvent((el: HTMLElement) =>
    playStick(el, { from: "land", delay: 380, reduced }),
  );
  const landed = useEffectEvent(onLanded);
  // Before the first paint, so it never shows in place before it lands.
  useLayoutEffect(() => {
    const el = lift.current;
    if (!landing || !el) return;
    let current = true;
    void land(el).then(() => {
      if (current) landed();
    });
    return () => {
      current = false;
    };
  }, [landing]);

  const classes = [
    "placed-sticker",
    selected && "is-selected",
    knobBelow && "is-knob-below",
    held === "drag" && "is-dragging",
    held === "handle" && "is-handling",
    landing && "is-landing",
    glow > 0 && "is-glowing",
  ];
  return (
    <div
      className={classes.filter(Boolean).join(" ")}
      data-sticker-id={sticker.id}
      role="button"
      aria-roledescription="sticker"
      aria-pressed={selected}
      tabIndex={tabbable ? 0 : -1}
      aria-label={`${formatNo(sticker.no)}, drawn in ${spokenDuration(sticker.timeUsed)}${by ? `, by ${by}` : ""}, ${position}`}
      aria-describedby={hintId}
      style={{
        width: box.w,
        height: box.h,
        transform: box.transform,
        zIndex: 10 + stack,
        ...(glow > 0 && { "--glow": glow.toFixed(2) }),
      }}
    >
      <div className="placed-sticker__lift" ref={lift}>
        <StickerFigure
          urls={sticker.urls}
          width={sticker.width}
          height={sticker.height}
          fold={fold}
          foil={foil ? "board" : undefined}
          no={sticker.no}
          turn={sticker.placement.r}
        />
      </div>
      {/* A clear frame, four corners to resize and a knob on a stem to turn. */}
      <span className="placed-sticker__frame" aria-hidden="true">
        {CORNERS.map((corner) => (
          <i
            key={corner}
            className={`placed-sticker__handle placed-sticker__handle--${corner}`}
            data-handle="scale"
          />
        ))}
        <i className="placed-sticker__rotate">
          <i className="placed-sticker__stem" />
          <i className="placed-sticker__knob" data-handle="rotate">
            <ArrowClockwise size={16} />
          </i>
        </i>
      </span>
    </div>
  );
});
