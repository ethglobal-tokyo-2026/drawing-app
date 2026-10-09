import type { BoardStickerView } from "../boardSticker";

/**
 * "here" in its spot, "used" out on the board (its used sticker silhouette shows), "inTheBag" packed
 * in a gift and "onItsWay" sent (its spot shows it under frost), "given" away (its spot stays, with
 * only its cut line traced).
 */
type TraySlotState = "here" | "used" | "inTheBag" | "onItsWay" | "given";

/** A sticker's permanent place in the sticker tray. */
export interface TraySlot {
  id: string;
  /** When it came to you: sealed, or received. */
  arrivedAt: number;
  /** Its stand-in spot until every sticker's shape is known: packing moves it, never out of order. */
  sheet: number;
  slot: number;
  state: TraySlotState;
}

/** Stand-in spots to a sticker sheet. */
const PER_SHEET = 6;

/** A sticker in a gift waits in its spot, wherever its spot on the board. */
function stateOf(s: Pick<BoardStickerView, "placement" | "held" | "openGift">): TraySlotState {
  if (!s.held) return "given";
  if (s.openGift) return s.openGift.status === "sent" ? "onItsWay" : "inTheBag";
  return s.placement.on ? "used" : "here";
}

/**
 * Every sticker you've held, in arrival order, each in its permanent slot. Given ones keep theirs, so
 * nothing after them shifts.
 */
export function traySlots(
  stickers: readonly Pick<
    BoardStickerView,
    "id" | "no" | "arrivedAt" | "placement" | "held" | "openGift"
  >[],
): TraySlot[] {
  return [...stickers]
    .sort((a, b) => a.arrivedAt - b.arrivedAt || a.no - b.no)
    .map((s, n) => ({
      id: s.id,
      arrivedAt: s.arrivedAt,
      sheet: Math.floor(n / PER_SHEET),
      slot: n % PER_SHEET,
      state: stateOf(s),
    }));
}

/**
 * NEW: the stickers that arrived in today's ticket day and the open tray hasn't shown yet. A sticker
 * lands on the board when it's sealed or received, so a fresh arrival is NEW as its hole; one in a
 * gift or given away has left.
 */
export function newSlots(
  slots: readonly TraySlot[],
  {
    today,
    dayOf,
    seen,
  }: {
    today: string;
    /** The ticket day a time falls in. */
    dayOf: (at: number) => string;
    seen: ReadonlySet<string>;
  },
): Set<string> {
  return new Set(
    slots
      .filter(
        (s) =>
          (s.state === "here" || s.state === "used") &&
          !seen.has(s.id) &&
          dayOf(s.arrivedAt) === today,
      )
      .map((s) => s.id),
  );
}
