import type { StickerGiftStatus } from "../../giving/giftStore";
import type { StickerRecord } from "../../stickers/stickerStorage";

/**
 * "here" in its spot, "used" out on the board (its used sticker silhouette shows), "given" away (its
 * spot stays blank).
 */
type TraySlotState = "here" | "used" | "given";

/** A sticker's permanent place in the sticker tray. */
export interface TraySlot {
  id: string;
  /** Every sticker here is your own, so it arrived when it was sealed. */
  arrivedAt: number;
  /** Its stand-in spot until every sticker's shape is known: packing moves it, never out of order. */
  sheet: number;
  slot: number;
  state: TraySlotState;
}

/** Stand-in spots to a sticker sheet. */
const PER_SHEET = 6;

/**
 * Every sticker you've held, in arrival order, each in its permanent slot. Given ones keep theirs, so
 * nothing after them shifts.
 */
export function traySlots(
  stickers: readonly Pick<StickerRecord, "id" | "no" | "createdAt" | "placement">[],
  gifts: ReadonlyMap<string, StickerGiftStatus>,
): TraySlot[] {
  return [...stickers]
    .sort((a, b) => a.createdAt - b.createdAt || a.no - b.no)
    .map((s, n) => ({
      id: s.id,
      arrivedAt: s.createdAt,
      sheet: Math.floor(n / PER_SHEET),
      slot: n % PER_SHEET,
      state: gifts.get(s.id)?.state === "sent" ? "given" : s.placement?.on ? "used" : "here",
    }));
}

/**
 * NEW: the stickers in the tray that arrived in today's ticket day and haven't been seen in the open
 * tray. One out on the board has been seen there, and its used sticker silhouette shows no sticker.
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
      .filter((s) => s.state === "here" && !seen.has(s.id) && dayOf(s.arrivedAt) === today)
      .map((s) => s.id),
  );
}
