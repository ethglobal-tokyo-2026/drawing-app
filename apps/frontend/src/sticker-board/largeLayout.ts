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
  largeLandingSize,
  maxSOf,
  PHONE_BOARD,
  sizeOf,
  toPx,
  unitOf,
  type BoardLayout,
  type BoardSize,
  type Field,
  type Placement,
} from "./placement";

const round4 = (v: number) => Number(v.toFixed(4));

/** The share of each axis of the large board's field the phone's arrangement spreads across, centered. */
export const LARGE_SPREAD = 0.88;

/**
 * Where a sticker's phone spot lands in a large layout derived from the phone's: the phone's
 * arrangement spread across the large board's field, the sticker a size larger, as a new sticker
 * lands there, up to `maxS`.
 */
export function largeSpotFrom(phone: Placement, maxS: number): Placement {
  return {
    ...phone,
    x: round4(0.5 + (phone.x - 0.5) * LARGE_SPREAD),
    y: round4(0.5 + (phone.y - 0.5) * LARGE_SPREAD),
    s: Math.min(largeLandingSize(phone.s), maxS),
  };
}

/** A sticker's center and the half extents of its turned box, in board pixels. */
interface Footprint {
  x: number;
  y: number;
  ex: number;
  ey: number;
}

type Art = Pick<PlacedBoardSticker, "width" | "height">;

function footprintOf(field: Field, unit: number, p: Placement, art: Art): Footprint {
  const { x, y } = toPx(field, p);
  const { w, h } = sizeOf(unit, p.s, art);
  const turn = (p.r * Math.PI) / 180;
  const [cos, sin] = [Math.abs(Math.cos(turn)), Math.abs(Math.sin(turn))];
  return { x, y, ex: (cos * w + sin * h) / 2, ey: (sin * w + cos * h) / 2 };
}

/** How deep two footprints overlap on each axis; at or below zero on either, they're clear. */
const depthOf = (a: Footprint, b: Footprint) => ({
  x: a.ex + b.ex - Math.abs(a.x - b.x),
  y: a.ey + b.ey - Math.abs(a.y - b.y),
});

const overlap = (a: Footprint, b: Footprint) => {
  const depth = depthOf(a, b);
  return depth.x > 0 && depth.y > 0;
};

/** Passes over the pairs the spread pushed together; each pass settles what the last one left. */
const PULL_PASSES = 32;
/** Pulled-apart stickers end this far clear, in px, so rounding their spots can't overlap them again. */
const PULL_CLEAR = 1;

/**
 * The derived spots with every pair that was clear on the phone pulled clear again, along the axis
 * they overlap least on, without leaving the field. Stickers stacked on the phone stay stacked. Pairs
 * go in the order of the stickers' ids, so the owner and a visitor pull them apart alike.
 */
function pulledApart(
  shown: readonly { id: string; art: Art; phone: Placement; large: Placement }[],
  board: BoardSize,
): Map<string, Placement> {
  const items = [...shown].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const phoneField = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
  const phoneUnit = unitOf("phone", PHONE_BOARD.W);
  const phone = items.map((s) => footprintOf(phoneField, phoneUnit, s.phone, s.art));
  const pairs: [number, number][] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) if (!overlap(phone[i], phone[j])) pairs.push([i, j]);
  const field = fieldOf(board.W, board.H);
  const at = items.map((s) => footprintOf(field, board.U, s.large, s.art));
  const bounds = { x: [field.left, field.left + field.w], y: [field.top, field.top + field.h] };
  /** Moves a footprint up to `by` along `axis`, inside the field; returns how far it moved. */
  const move = (f: Footprint, axis: "x" | "y", by: number) => {
    const [lo, hi] = bounds[axis];
    const was = f[axis];
    f[axis] = Math.min(hi, Math.max(lo, was + by));
    return Math.abs(f[axis] - was);
  };
  for (let pass = 0; pass < PULL_PASSES; pass++) {
    let pulled = false;
    for (const [i, j] of pairs) {
      const depth = depthOf(at[i], at[j]);
      if (depth.x <= 0 || depth.y <= 0) continue;
      pulled = true;
      const axis = depth.x < depth.y ? "x" : "y";
      const dir = at[i][axis] <= at[j][axis] ? -1 : 1;
      const half = (depth[axis] + PULL_CLEAR) / 2;
      // What one can't move for the field's edge, the other moves instead.
      const first = move(at[i], axis, dir * half);
      move(at[j], axis, -dir * (2 * half - first));
    }
    if (!pulled) break;
  }
  return new Map(
    items.map((s, i) => [
      s.id,
      {
        ...s.large,
        x: round4((at[i].x - field.left) / field.w),
        y: round4((at[i].y - field.top) / field.h),
      },
    ]),
  );
}

/** A sticker's spot in a derived large layout. */
export interface LargeSpot {
  id: string;
  placement: Placement;
}

/**
 * The large layout derived from the phone's for a board this big: a spot for each sticker you hold,
 * spread across the board, and the stickers on it pulled clear of each other where they were on the phone.
 */
export function deriveLargeLayout(stickers: readonly PlacedBoardSticker[], board: BoardSize) {
  const field = fieldOf(board.W, board.H);
  const deriving = stickers
    .filter((s) => s.held && !s.placements.large)
    .map((s) => ({
      id: s.id,
      art: s,
      phone: s.placements.phone,
      large: largeSpotFrom(s.placements.phone, maxSOf(s, "large", field, board.U)),
    }));
  // Only the stickers the board shows: one in a gift has left it.
  const pulled = pulledApart(
    deriving.filter(({ art, phone }) => phone.on && !art.openGift),
    board,
  );
  const spots = new Map(deriving.map(({ id, large }) => [id, pulled.get(id) ?? large]));
  const derived: LargeSpot[] = [];
  const next = stickers.map((s) => {
    const placement = spots.get(s.id);
    if (!placement) return s;
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
