import { MAX_LARGE_LAYOUT_BATCH } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";
import { toApiPlacement } from "../api/views";
import {
  hasLargeLayout,
  placeUnplaced,
  type PlacedBoardSticker,
  type UnplacedBoardSticker,
} from "./boardSticker";
import {
  fieldOf,
  PHONE_BOARD,
  type BoardLayout,
  type BoardSize,
  type Placement,
} from "./placement";

const round4 = (v: number) => Number(v.toFixed(4));

/**
 * Where a sticker's phone spot lands in a large layout derived from the phone's: the phone's whole
 * arrangement at the stickers' own size, centered on the large board's field, fitted to a side too
 * short for it.
 */
export function largeSpotFrom(phone: Placement, board: BoardSize): Placement {
  const from = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
  const to = fieldOf(board.W, board.H);
  // Distances keep their share of a sticker's size: they grow by the unit over the phone board's.
  const k = board.U / PHONE_BOARD.W;
  const spanX = Math.min(1, (from.w * k) / to.w);
  const spanY = Math.min(1, (from.h * k) / to.h);
  return {
    ...phone,
    x: round4(0.5 + (phone.x - 0.5) * spanX),
    y: round4(0.5 + (phone.y - 0.5) * spanY),
  };
}

/** A sticker's spot in a derived large layout. */
export interface LargeSpot {
  id: string;
  placement: Placement;
}

/** The large layout derived from the phone's for a board this big: a spot for each sticker you hold. */
export function deriveLargeLayout(stickers: readonly PlacedBoardSticker[], board: BoardSize) {
  const derived: LargeSpot[] = [];
  const next = stickers.map((s) => {
    if (!s.held || s.placements.large) return s;
    const placement = largeSpotFrom(s.placements.phone, board);
    derived.push({ id: s.id, placement });
    return { ...s, placements: { ...s.placements, large: placement } };
  });
  return { stickers: next, derived };
}

/**
 * Someone else's board in the layout the visitor's screen shows: as its owner laid it out, or, on a
 * large screen whose owner has no large layout yet, derived as their own board will derive it.
 */
export function laidOutForVisitor(
  loaded: readonly UnplacedBoardSticker[],
  layout: BoardLayout,
  board: BoardSize | null,
): PlacedBoardSticker[] {
  const { stickers } = placeUnplaced(loaded);
  if (layout === "phone" || !board || hasLargeLayout(stickers)) return stickers;
  return deriveLargeLayout(stickers, board).stickers;
}

/** Saves a derived large layout where none is saved, in requests the API takes. */
export async function saveDerivedLayout(
  api: Pick<ApiClient, "saveLargeLayout">,
  derived: readonly LargeSpot[],
) {
  const batches: LargeSpot[][] = [];
  for (let i = 0; i < derived.length; i += MAX_LARGE_LAYOUT_BATCH)
    batches.push(derived.slice(i, i + MAX_LARGE_LAYOUT_BATCH));
  const saved = await Promise.all(
    batches.map((batch) =>
      api.saveLargeLayout(
        batch.map(({ id, placement }) => ({
          stickerId: id,
          largePlacement: toApiPlacement(placement),
        })),
      ),
    ),
  );
  return saved.flat();
}
