import type { Placement } from "../stickers/stickerStorage";

/** The board's field: where stickers sit, under the header band, clear of the sticker tray's edge. */
export interface Field {
  left: number;
  top: number;
  w: number;
  h: number;
}

/** A box on the board, in board pixels. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The header band: your name, and the sticker tray's top. */
const HEADER = 86;
const INSET = 12;
/** Draw floats over the field's lower left rather than taking a band, so the field reaches almost to the foot. */
const FOOT = 16;
/** The right edge belongs to the sticker tray. */
const TRAY_EDGE = 40;
const S_MIN = 0.16;
export const S_MAX = 0.72;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

export const fieldOf = (width: number, height: number): Field => ({
  left: INSET + 4,
  top: HEADER,
  w: width - (INSET + 4) - TRAY_EDGE,
  h: Math.max(120, height - FOOT - HEADER),
});

export const clampS = (s: number) => Math.min(S_MAX, Math.max(S_MIN, s));

export const toPx = (f: Field, p: { x: number; y: number }) => ({
  x: f.left + p.x * f.w,
  y: f.top + p.y * f.h,
});

export const toFrac = (f: Field, pt: { x: number; y: number }) => ({
  x: clamp01((pt.x - f.left) / f.w),
  y: clamp01((pt.y - f.top) / f.h),
});

/** A sticker's size on a board this wide: `s` sets its long side, and the art sets its shape. */
export function sizeOf(boardWidth: number, s: number, art: { width: number; height: number }) {
  const long = s * boardWidth;
  return art.width >= art.height
    ? { w: long, h: (long * art.height) / art.width }
    : { w: (long * art.width) / art.height, h: long };
}

/** The transform that puts a box this big, turned by `r`, with its center at `x`, `y`. */
export const transformAt = (x: number, y: number, w: number, h: number, r: number) =>
  `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${r.toFixed(2)}deg)`;

/** A sticker's box on the board, in board pixels, and the transform that puts it there. */
export function stickerBox(
  field: Field,
  boardWidth: number,
  p: Pick<Placement, "x" | "y" | "s" | "r">,
  art: { width: number; height: number },
) {
  const { x, y } = toPx(field, p);
  const { w, h } = sizeOf(boardWidth, p.s, art);
  return { x, y, w, h, transform: transformAt(x, y, w, h, p.r) };
}

/** The rotate knob's center stands this far past the sticker's edge, turned with it (see the CSS). */
const KNOB_REACH = 42.5;
const KNOB_RADIUS = 14;

/**
 * Whether the rotate knob, which stands past the sticker's top edge and turns with it, would sit off
 * the board's top or under the name button, where it can't be reached.
 */
export function knobHidden(sticker: { x: number; y: number; h: number; r: number }, name: Box) {
  const turn = (sticker.r * Math.PI) / 180;
  const reach = sticker.h / 2 + KNOB_REACH;
  const x = sticker.x + Math.sin(turn) * reach;
  const y = sticker.y - Math.cos(turn) * reach;
  if (y - KNOB_RADIUS < 0) return true;
  return (
    x + KNOB_RADIUS > name.left &&
    x - KNOB_RADIUS < name.right &&
    y + KNOB_RADIUS > name.top &&
    y - KNOB_RADIUS < name.bottom
  );
}

/** How far the toolbar keeps from what it must stay clear of. */
const CLEARANCE = 8;

/**
 * Where the selected sticker's toolbar goes, in board pixels: under the sticker, clear of its turned
 * corners; on the other side when there's no room or it would meet `clearOf` (Draw); clear of the
 * knob on whichever side it stands; never over the header or the sticker tray's edge.
 */
export function toolbarSpot(
  sticker: { x: number; y: number; w: number; h: number; r: number },
  board: { W: number; H: number },
  toolbar: { w: number; h: number },
  { knobBelow = false, clearOf }: { knobBelow?: boolean; clearOf?: Box | null } = {},
) {
  const turn = (sticker.r * Math.PI) / 180;
  const reach =
    (Math.abs(Math.sin(turn)) * sticker.w + Math.abs(Math.cos(turn)) * sticker.h) / 2 + 12;
  const [below, above] = knobBelow ? [50, 14] : [14, 50];
  const left = clamp(sticker.x - toolbar.w / 2, 10, board.W - toolbar.w - TRAY_EDGE - 4);
  const meets = (top: number) =>
    Boolean(
      clearOf &&
      left < clearOf.right + CLEARANCE &&
      left + toolbar.w > clearOf.left - CLEARANCE &&
      top < clearOf.bottom + CLEARANCE &&
      top + toolbar.h > clearOf.top - CLEARANCE,
    );
  let top = sticker.y + reach + below;
  if (top + toolbar.h > board.H - 12 || meets(top)) top = sticker.y - reach - above - toolbar.h;
  if (top < HEADER - 6) {
    top = clamp(sticker.y - toolbar.h / 2, HEADER - 6, board.H - toolbar.h - 12);
    // A sticker too big to clear on either side still gets its toolbar clear of Draw.
    if (clearOf && meets(top)) top = Math.max(HEADER - 6, clearOf.top - CLEARANCE - toolbar.h);
  }
  return { left, top };
}

/** How far to slide a caption centered at `x` so it stays on the board, clear of the tray's edge. */
export function keepOnBoard(x: number, halfWidth: number, boardWidth: number) {
  const past = x + halfWidth - (boardWidth - TRAY_EDGE - 4);
  return Math.max(0, 4 - (x - halfWidth)) - Math.max(0, past);
}

/**
 * Spots for new stickers, as x, y, s and r: calm, and clear of the header and Draw. The empty board
 * shows the first as a dashed spot, so the first sticker lands in it.
 */
const SPOTS = [
  [0.5, 0.42, 0.36, 2],
  [0.72, 0.8, 0.34, 3],
  [0.28, 0.8, 0.32, -4],
  [0.26, 0.4, 0.3, -3],
  [0.75, 0.3, 0.3, 5],
  [0.5, 0.15, 0.3, -6],
] as const;

/** Where the empty board's dashed spot sits: the first sticker's spot. */
export const FIRST_SPOT = { x: SPOTS[0][0], y: SPOTS[0][1] };

/** Where a new sticker goes: the spot farthest from every sticker already on the board. */
export function freeSpot(taken: readonly Placement[]): Pick<Placement, "x" | "y" | "s" | "r"> {
  let best: (typeof SPOTS)[number] = SPOTS[0];
  let bestScore = -1;
  for (const spot of SPOTS) {
    const [x, y] = spot;
    // Height counts for more, since the field is taller than it is wide.
    const score = taken.length
      ? Math.min(...taken.map((t) => Math.hypot(x - t.x, (y - t.y) * 1.4)))
      : 1;
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  const [x, y, s, r] = best;
  return { x, y, s, r };
}

/** The stacking order that puts a sticker above all the others. */
export const nextZ = (placements: readonly Placement[]) =>
  placements.reduce((top, p) => Math.max(top, p.z), 0) + 1;
