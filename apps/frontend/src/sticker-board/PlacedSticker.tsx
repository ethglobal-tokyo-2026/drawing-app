import { ArrowClockwise } from "../icons";
import { memo, useEffectEvent, useLayoutEffect, useRef } from "react";
import { useTranslation } from "../i18n/react";
import { formatNo, spokenDuration } from "../stickers/format";
import { playStick } from "../stickers/stick";
import { StickerFigure } from "../stickers/StickerFigure";
import type { BoardSticker } from "./boardSticker";
import { stickerBox, type Field } from "./placement";
import type { Hold } from "./useBoardGestures";
import { useCrease } from "./useCreases";

interface Props {
  sticker: BoardSticker;
  field: Field;
  /** What its size is a share of (see `unitOf`). */
  unit: number;
  /** Its place in the stack, from the bottom. */
  stack: number;
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
  /** Its place in reading order, from 1, among `setSize` stickers: a screen reader says "3 of 6". */
  position: number;
  setSize: number;
  /** What the keys do to it, which changes once it's selected. */
  hintId: string;
  /** Drawn by someone other than the board's owner: it wears foil. */
  foil?: boolean;
  /** An NSFW sticker the viewer has no NSFW opt-in to see: its veiled image, blurred inside its cut. */
  veiled?: boolean;
  /** Who drew it, as printed, when that isn't the board's owner: its label names them. */
  by?: string;
}

const CORNERS = ["nw", "ne", "sw", "se"] as const;

/**
 * A sticker at its placement on the board. Memoized: a gesture's start and end re-render the board,
 * and only the stickers whose props changed need to follow.
 */
export const PlacedSticker = memo(function PlacedSticker({
  sticker,
  field,
  unit,
  stack,
  selected,
  knobBelow,
  held,
  landing,
  onLanded,
  reduced,
  tabbable,
  position,
  setSize,
  hintId,
  foil = false,
  veiled = false,
  by,
}: Props) {
  const { t } = useTranslation();
  const crease = useCrease(sticker.id);
  const lift = useRef<HTMLDivElement>(null);
  const box = stickerBox(field, unit, sticker.placement, sticker);

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
  ];
  const named = {
    no: formatNo(sticker.no),
    duration: spokenDuration(sticker.timeUsed),
    position,
    setSize,
  };
  return (
    <div
      className={classes.filter(Boolean).join(" ")}
      data-sticker-id={sticker.id}
      role="button"
      aria-roledescription={t(($) => $.stickerBoard.placedSticker.roleDescription)}
      aria-pressed={selected}
      tabIndex={tabbable ? 0 : -1}
      aria-label={[
        by
          ? t(($) => $.stickerBoard.placedSticker.labelBy, { ...named, artist: by })
          : t(($) => $.stickerBoard.placedSticker.label, named),
        veiled && t(($) => $.stickers.nsfw.veiled),
      ]
        .filter(Boolean)
        .join(", ")}
      aria-describedby={hintId}
      style={{
        width: box.w,
        height: box.h,
        transform: box.transform,
        zIndex: 10 + stack,
      }}
    >
      <div className="placed-sticker__lift" ref={lift}>
        <StickerFigure
          urls={sticker.urls}
          width={sticker.width}
          height={sticker.height}
          foil={foil ? "board" : undefined}
          nsfw={sticker.nsfw}
          kyotoSeika={sticker.kyotoSeikaSubjects !== null}
          veiled={veiled}
          no={sticker.no}
          turn={sticker.placement.r}
          stuck
          // A landing sticker's stick animation shows it arrive; it isn't held back as well.
          reveal={!landing}
          crease={crease}
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
