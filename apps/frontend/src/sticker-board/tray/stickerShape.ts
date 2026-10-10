import type { BoardSticker } from "../boardSticker";
import { messageOf } from "../../i18n/errorMessage";
import { formatNo } from "../../stickers/format";
import { maskPixels } from "../../stickers/maskPixels";
import type { StickerUrls } from "../../stickers/stickerUrls";
import { outlineShape, shapeFromMask, type Shape } from "./sheetPacking";

/** A traced mask's long side, in cells: fine enough for a sticker sheet, quick to trace. */
const TRACE_SIDE = 120;
/** Even a tiny or very long sticker gets this many cells across. */
const TRACE_MIN = 8;
/** The alpha at which a mask cell counts as inside the cut. */
const INSIDE = 128;

type ShapeSource = Pick<BoardSticker, "id" | "no" | "width" | "height" | "outline">;

// By sticker: a sealed sticker's cut never changes.
const known = new Map<string, Shape>();
const tracing = new Map<string, Promise<Shape>>();
/**
 * Stickers whose mask couldn't be traced, by id: kept, so they aren't traced again, until a stored
 * outline takes their place.
 */
const untraced = new Map<string, Shape>();
/** Stickers whose cut line couldn't be read, by id, and why: their sheets pack each as a box. */
const unreadable = new Map<string, string>();

/** Why a sticker's cut line couldn't be read, or undefined when it could. */
export const unreadableCut = (id: string): string | undefined => unreadable.get(id);

/**
 * A sticker's shape if it's known now: a stored outline always is, and a mask once it's traced or its
 * trace has failed.
 */
export function knownShape(sticker: ShapeSource): Shape | undefined {
  let shape = known.get(sticker.id);
  if (!shape && sticker.outline !== undefined) {
    shape = outlineShape(sticker.outline, sticker.width, sticker.height);
    untraced.delete(sticker.id);
    unreadable.delete(sticker.id);
    if (shape.poly.length < 3) {
      unreadable.set(sticker.id, "its stored cut line has fewer than 3 points");
      console.error(
        `${formatNo(sticker.no)}'s stored cut line is unreadable, so its sheet packs its box`,
      );
    }
    known.set(sticker.id, shape);
  }
  return shape ?? untraced.get(sticker.id);
}

/**
 * Where a dot badge sticks on a sticker, in 0-1 units of its image: the point on its cut line nearest
 * the top-right corner, since a drawn shape rarely fills that corner. The corner itself until its cut
 * line is known.
 */
export function dotSpot(sticker: ShapeSource): { x: number; y: number } {
  const ring = knownShape(sticker)?.poly ?? [];
  const { width: w, height: h } = sticker;
  let spot = { x: 1, y: 0 };
  if (ring.length < 3) return spot;
  let nearest = Infinity;
  ring.forEach(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % ring.length];
    // Measured in pixels, so a long sticker's sides count as they look.
    const dx = (bx - ax) * w;
    const dy = (by - ay) * h;
    const along = ((1 - ax) * w * dx - ay * h * dy) / (dx * dx + dy * dy || 1);
    const t = Math.min(1, Math.max(0, along));
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const away = ((1 - x) * w) ** 2 + (y * h) ** 2;
    if (away < nearest) {
      nearest = away;
      spot = { x, y };
    }
  });
  return spot;
}

/** A sticker's shape: its stored outline, or else its mask, traced once. */
export function stickerShape(
  sticker: ShapeSource,
  urls: Pick<StickerUrls, "mask">,
): Promise<Shape> {
  const shape = knownShape(sticker);
  if (shape) return Promise.resolve(shape);
  let trace = tracing.get(sticker.id);
  if (!trace) {
    trace = traceMask(urls.mask, sticker.width, sticker.height).then(
      (traced) => {
        known.set(sticker.id, traced);
        tracing.delete(sticker.id);
        return traced;
      },
      (error: unknown) => {
        // No cut line, so it packs as its box, and its spot traces none.
        const box: Shape = { w: sticker.width, h: sticker.height, poly: [] };
        untraced.set(sticker.id, box);
        tracing.delete(sticker.id);
        unreadable.set(sticker.id, messageOf(error));
        console.error(
          `Tracing ${formatNo(sticker.no)}'s cut failed, so its sheet packs its box`,
          error,
        );
        return box;
      },
    );
    tracing.set(sticker.id, trace);
  }
  return trace;
}

async function traceMask(url: string, width: number, height: number): Promise<Shape> {
  const k = TRACE_SIDE / Math.max(width, height);
  const cols = Math.max(TRACE_MIN, Math.round(width * k));
  const rows = Math.max(TRACE_MIN, Math.round(height * k));
  const alpha = (await maskPixels(url, { width: cols, height: rows })).data;
  const bits = new Uint8Array(cols * rows);
  for (let i = 0; i < bits.length; i++) bits[i] = alpha[i * 4 + 3] >= INSIDE ? 1 : 0;
  return shapeFromMask(bits, cols, rows, width, height);
}
