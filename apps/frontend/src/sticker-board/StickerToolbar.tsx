import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  GiveIcon,
  ArrowClockwise,
  ArrowCounterClockwise,
  Minus,
  Plus,
  RemoveIcon,
  ViewIcon,
  type Icon,
} from "../icons";
import { useEffectEvent, useLayoutEffect, useRef } from "react";
import type { PersonView } from "../api/views";
import { useTranslation } from "../i18n/react";
import { ArtistChip } from "../stickers/ArtistChip";
import { EASE_OUT } from "../ui/easing";
import { LabelButton } from "../ui/LabelButton";
import type { Step } from "./boardGesture";
import { toolbarSpot, type Box } from "./placement";

interface Props {
  /** Names the toolbar after its sticker. */
  label: string;
  /** The selected sticker's box on the board, in board pixels, and its turn. */
  sticker: { x: number; y: number; w: number; h: number; r: number };
  board: { W: number; H: number };
  /** Whether the sticker's knob hangs below it, so the toolbar keeps clear of it there. */
  knobBelow: boolean;
  /** Draw's box on the board, which the toolbar keeps clear of so a press meant for it can't land on Draw. */
  clearOf: Box | null;
  /**
   * Give, where LINE's picker can send the sticker; without it there's no Give. A gift left packed
   * (the app closed mid-send) doesn't block it: packing again sets the stale one aside.
   */
  onGive?: () => void;
  onView: () => void;
  /** Back into its used sticker silhouette in the sticker tray; someone else's board has none. */
  onRemove?: () => void;
  /** Moves, turns or resizes it a step, for a press instead of a drag; someone else's board has none. */
  onArrange?: (step: Step) => void;
  /** Escape hands focus back to the sticker. */
  onEscape: () => void;
  reduced: boolean;
  /** Its Original Artist, when someone other than the board's owner drew it: the chip heads the toolbar. */
  artist?: PersonView;
}

/** The Arrange row's buttons, in the order they read. */
const ARRANGE: readonly { step: Step; Glyph: Icon }[] = [
  { step: "left", Glyph: CaretLeft },
  { step: "right", Glyph: CaretRight },
  { step: "up", Glyph: CaretUp },
  { step: "down", Glyph: CaretDown },
  { step: "smaller", Glyph: Minus },
  { step: "bigger", Glyph: Plus },
  { step: "turnLeft", Glyph: ArrowCounterClockwise },
  { step: "turnRight", Glyph: ArrowClockwise },
];

/** When a toolbar last went away; a new one within the handoff window is the same toolbar moving. */
let lastHidden = -Infinity;
const HANDOFF_MS = 50;

/** Give, View and Remove for the selected sticker, beside it on the board; a read-only board has View. */
export function StickerToolbar({
  label,
  sticker,
  board,
  knobBelow,
  clearOf,
  onGive,
  onView,
  onRemove,
  onArrange,
  onEscape,
  reduced,
  artist,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Placed once it's measured, before it's painted: its width follows the labels it shows.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { left, top } = toolbarSpot(
      sticker,
      board,
      { w: el.offsetWidth, h: el.offsetHeight },
      { knobBelow, clearOf },
    );
    el.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
  });

  // It comes in when it first shows. Selection moving straight to another sticker swaps one toolbar
  // for another in the same commit, and that one moves over without coming in again.
  const reveal = useEffectEvent(() => {
    if (reduced || performance.now() - lastHidden < HANDOFF_MS) return;
    ref.current?.animate(
      [
        { opacity: 0, translate: "0 -4px" },
        { opacity: 1, translate: "0 0" },
      ],
      { duration: 160, easing: EASE_OUT },
    );
  });
  useLayoutEffect(() => {
    reveal();
    return () => {
      lastHidden = performance.now();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="sticker-toolbar"
      role="toolbar"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Escape") onEscape();
      }}
    >
      {artist && (
        <div className="sticker-toolbar__by">
          <ArtistChip artist={artist} bare />
        </div>
      )}
      <div className="sticker-toolbar__acts">
        {onGive && (
          <LabelButton tone="aqua" size="sm" icon={<GiveIcon size={18} />} onClick={onGive}>
            {t(($) => $.stickerBoard.toolbar.give)}
          </LabelButton>
        )}
        <LabelButton size="sm" icon={<ViewIcon size={18} />} onClick={onView}>
          {t(($) => $.stickerBoard.toolbar.view)}
        </LabelButton>
        {onRemove && (
          <LabelButton size="sm" icon={<RemoveIcon size={18} />} onClick={onRemove}>
            {t(($) => $.stickerBoard.toolbar.remove)}
          </LabelButton>
        )}
      </div>
      {onArrange && (
        <div
          className="sticker-toolbar__arrange"
          role="group"
          aria-label={t(($) => $.stickerBoard.toolbar.arrange.label)}
        >
          {ARRANGE.map(({ step, Glyph }) => (
            <button
              key={step}
              type="button"
              className="sticker-toolbar__step"
              aria-label={t(($) => $.stickerBoard.toolbar.arrange[step])}
              onClick={() => onArrange(step)}
            >
              <Glyph size={18} weight="bold" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
