import {
  ArrangeIcon,
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
import { useEffectEvent, useId, useLayoutEffect, useRef } from "react";
import type { PersonView } from "../api/views";
import { useTranslation } from "../i18n/react";
import { ArtistChip } from "../stickers/ArtistChip";
import { EASE_OUT } from "../ui/easing";
import { LabelButton } from "../ui/LabelButton";
import { useHeldRepeat } from "../ui/useHeldRepeat";
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
  /** Give, where LINE's picker can send the sticker; without it there's no Give. */
  onGive?: () => void;
  onView: () => void;
  /** Back into its used sticker silhouette in the sticker tray; someone else's board has none. */
  onRemove?: () => void;
  /**
   * Arrange, for a press instead of a drag: whether its step tiles are out (the board keeps that, so
   * it holds for the next selection), and the step each takes. Someone else's board has none.
   */
  arrange?: { open: boolean; onOpen: (open: boolean) => void; onStep: (step: Step) => void };
  /** Escape hands focus back to the sticker. */
  onEscape: () => void;
  reduced: boolean;
  /** Its Original Artist, when someone other than the board's owner drew it: the chip heads the toolbar. */
  artist?: PersonView;
}

/** Arrange's step tiles in the order they read: moves on the first row, sizes and turns on the second. */
const ARRANGE: readonly { step: Step; Glyph: Icon }[] = [
  { step: "left", Glyph: CaretLeft },
  { step: "up", Glyph: CaretUp },
  { step: "down", Glyph: CaretDown },
  { step: "right", Glyph: CaretRight },
  { step: "smaller", Glyph: Minus },
  { step: "bigger", Glyph: Plus },
  { step: "turnLeft", Glyph: ArrowCounterClockwise },
  { step: "turnRight", Glyph: ArrowClockwise },
];

/** When a toolbar last went away; a new one within the handoff window is the same toolbar moving. */
let lastHidden = -Infinity;
const HANDOFF_MS = 50;

/** Give, View, Remove and Arrange for the selected sticker, beside it on the board; a read-only board has View. */
export function StickerToolbar({
  label,
  sticker,
  board,
  knobBelow,
  clearOf,
  onGive,
  onView,
  onRemove,
  arrange,
  onEscape,
  reduced,
  artist,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLDivElement>(null);
  const tilesId = useId();

  // Placed once it's measured, before it's painted: its width follows the labels it shows. Measuring
  // forces layout, so it's measured again only as its own size or what it keeps clear of changes.
  const place = useEffectEvent(() => {
    const el = ref.current;
    if (!el) return;
    const bar = { w: el.offsetWidth, h: el.offsetHeight };
    const { left, top } = toolbarSpot(sticker, board, bar, { knobBelow, clearOf });
    el.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    // The step tiles open on the row's far side from the sticker, so where the open toolbar fits,
    // opening them leaves the row in place.
    el.dataset.over = String(top + bar.h / 2 < sticker.y);
  });
  const { x, y, w, h, r } = sticker;
  const open = arrange?.open ?? false;
  useLayoutEffect(() => place(), [x, y, w, h, r, board.W, board.H, knobBelow, clearOf, open]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resized = new ResizeObserver(() => place());
    resized.observe(el);
    return () => resized.disconnect();
  }, []);

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

  // Opened here, the step tiles come out of the toolbar's row; already out, they come in with it.
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opened || reduced) return;
    const from = ref.current?.dataset.over === "true" ? "4px" : "-4px";
    tiles.current?.animate(
      [
        { opacity: 0, translate: `0 ${from}` },
        { opacity: 1, translate: "0 0" },
      ],
      { duration: 160, easing: EASE_OUT },
    );
  }, [open, reduced]);

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
        <div>
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
        {arrange && (
          <button
            type="button"
            className="sticker-toolbar__arrange-toggle"
            aria-label={t(($) => $.stickerBoard.toolbar.arrange.label)}
            aria-expanded={arrange.open}
            aria-controls={arrange.open ? tilesId : undefined}
            onClick={() => arrange.onOpen(!arrange.open)}
          >
            <ArrangeIcon size={18} weight={arrange.open ? "fill" : "bold"} />
          </button>
        )}
      </div>
      {arrange?.open && (
        <div
          ref={tiles}
          id={tilesId}
          className="sticker-toolbar__arrange"
          role="group"
          aria-label={t(($) => $.stickerBoard.toolbar.arrange.label)}
        >
          {ARRANGE.map(({ step, Glyph }) => (
            <StepTile
              key={step}
              label={t(($) => $.stickerBoard.toolbar.arrange[step])}
              Glyph={Glyph}
              onStep={() => arrange.onStep(step)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A step tile: a tap or a key takes its step once, and a hold repeats it until let go. */
function StepTile({ label, Glyph, onStep }: { label: string; Glyph: Icon; onStep: () => void }) {
  const held = useHeldRepeat(onStep);
  return (
    <button type="button" className="sticker-toolbar__step" aria-label={label} {...held}>
      <Glyph size={18} weight="bold" aria-hidden />
    </button>
  );
}
