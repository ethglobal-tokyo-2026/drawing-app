import type { BoardSticker, BoardStickerView } from "./boardSticker";
import { toPx, type Field } from "./placement";

/** A sticker's center on the board, in board pixels. */
interface StickerPoint {
  id: string;
  x: number;
  y: number;
}

/** Centers closer in height than this read as one row. */
const ROW_SLACK = 48;

/** The stickers in rows from the top, each row from the left. */
function rowsOf(points: readonly StickerPoint[]): StickerPoint[][] {
  const rows: StickerPoint[][] = [];
  for (const p of [...points].sort((a, b) => a.y - b.y)) {
    const row = rows.at(-1);
    if (row && p.y - row[0].y < ROW_SLACK) row.push(p);
    else rows.push([p]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

/** The stickers in reading order: rows from the top, each row from the left. */
export const readingOrder = (points: readonly StickerPoint[]) =>
  rowsOf(points).flatMap((row) => row.map((p) => p.id));

/** The stickers' centers on `field`, in board pixels. */
export const pointsOn = (
  stickers: readonly Pick<BoardSticker, "id" | "placement">[],
  field: Field,
): StickerPoint[] => stickers.map((s) => ({ id: s.id, ...toPx(field, s.placement) }));

/** The stickers on `field` in reading order, as the arrow keys and screen readers take them. */
export const orderOn = (
  stickers: readonly Pick<BoardSticker, "id" | "placement">[],
  field: Field,
) => readingOrder(pointsOn(stickers, field));

/**
 * Where focus goes from the sticker `id` as it leaves the board: the next sticker along in reading
 * `order` that `stays`, else the nearest one before it; undefined when none stays.
 */
export function focusAfterLeaving(
  order: readonly string[],
  id: string,
  stays: (other: string) => boolean,
): string | undefined {
  const i = order.indexOf(id);
  return [...order.slice(i + 1), ...order.slice(0, i).reverse()].find(stays);
}

/** The stickers in a gift after the rest, each part in the order it came: how the detail pages yours. */
export const inGiftsLast = <S extends Pick<BoardStickerView, "openGift">>(
  stickers: readonly S[],
) => [...stickers.filter((s) => !s.openGift), ...stickers.filter((s) => s.openGift)];

/**
 * Where a key sends focus from the sticker `from`: Left and Right step through reading order, Up and
 * Down go to the nearest sticker in the rows that way, Home and End to the first and the last. `from`
 * again when nothing lies that way; undefined for any other key.
 */
export function focusStep(
  points: readonly StickerPoint[],
  from: string,
  key: string,
): string | undefined {
  const rows = rowsOf(points);
  const order = rows.flat();
  const i = order.findIndex((p) => p.id === from);
  const at = order[i];
  if (!at) return undefined;
  if (key === "ArrowLeft") return order[Math.max(0, i - 1)].id;
  if (key === "ArrowRight") return order[Math.min(order.length - 1, i + 1)].id;
  if (key === "Home") return order[0].id;
  if (key === "End") return order[order.length - 1].id;
  if (key !== "ArrowUp" && key !== "ArrowDown") return undefined;
  const row = rows.findIndex((r) => r.includes(at));
  const ahead = key === "ArrowUp" ? rows.slice(0, row).flat() : rows.slice(row + 1).flat();
  let best = at;
  let bestScore = Infinity;
  for (const p of ahead) {
    // Straight up or down counts for more than off to one side.
    const score = Math.abs(p.y - at.y) + Math.abs(p.x - at.x) * 2;
    if (score < bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best.id;
}
