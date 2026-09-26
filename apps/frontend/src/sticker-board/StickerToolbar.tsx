import { Eye, Gift, TrayArrowDown } from "@phosphor-icons/react";
import { useEffectEvent, useLayoutEffect, useRef } from "react";
import { LabelButton } from "../ui/LabelButton";
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
   * Give, where LINE's picker can send the sticker. A gift left packed (the app closed mid-send)
   * doesn't block it: packing again sets the stale one aside.
   */
  give: boolean;
  onGive: () => void;
  onView: () => void;
  /** Back into its used sticker silhouette in the sticker tray. */
  onRemove: () => void;
  /** Escape hands focus back to the sticker. */
  onEscape: () => void;
  reduced: boolean;
}

/** When a toolbar last went away; a new one within the handoff window is the same toolbar moving. */
let lastHidden = -Infinity;
const HANDOFF_MS = 50;

/** Give, View and Remove for the selected sticker, beside it on the board. */
export function StickerToolbar({
  label,
  sticker,
  board,
  knobBelow,
  clearOf,
  give,
  onGive,
  onView,
  onRemove,
  onEscape,
  reduced,
}: Props) {
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
      { duration: 160, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
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
      {give && (
        <LabelButton tone="aqua" size="sm" icon={<Gift size={18} aria-hidden />} onClick={onGive}>
          Give
        </LabelButton>
      )}
      <LabelButton size="sm" icon={<Eye size={18} aria-hidden />} onClick={onView}>
        View
      </LabelButton>
      <LabelButton size="sm" icon={<TrayArrowDown size={18} aria-hidden />} onClick={onRemove}>
        Remove
      </LabelButton>
    </div>
  );
}
