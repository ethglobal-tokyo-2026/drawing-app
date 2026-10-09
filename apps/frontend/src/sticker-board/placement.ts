import { clamp, clamp01 } from "../ui/easing";
import { seededRandom } from "../ui/seededRandom";

/** Where a sticker sits on its board. */
export interface Placement {
  /** False while the sticker waits in the sticker tray; its last spot is kept. */
  on: boolean;
  /** Center, as fractions of the board's field. */
  x: number;
  y: number;
  /** Long side, as a fraction of the board's unit (see `unitOf`). */
  s: number;
  /** Clockwise, in degrees. */
  r: number;
  /** Stacking order; higher is on top. */
  z: number;
}

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

/** Which of a board's two arrangements: the phone's, or the large layout a large screen shows. */
export type BoardLayout = "phone" | "large";

/**
 * The phone's board: DESIGN.md's 390 × 844 iPhone inside LINE, less the status bar, LINE's header
 * and the tab strip. The large layout sizes stickers by its width, and is first derived from it.
 */
export const PHONE_BOARD = { W: 390, H: 651 } as const;

/** A board's size in px, and its unit, which a sticker's long side is a share of. */
export interface BoardSize {
  W: number;
  H: number;
  U: number;
}

/**
 * What a sticker's size is a share of: the board's width on a phone; in the large layout the phone
 * board's, so a sticker keeps its phone size either way up and the room goes to the board.
 */
export const unitOf = (layout: BoardLayout, boardWidth: number) =>
  layout === "large" ? PHONE_BOARD.W : boardWidth;

/** Every layout, in the order a body that saves spots names them. */
const BOARD_LAYOUTS = ["phone", "large"] as const satisfies readonly BoardLayout[];

/** A sticker's spots to save, by layout. */
export type Spots = Partial<Record<BoardLayout, Placement>>;

/** `placement` as the one spot to save, in `layout`. */
export const spotsIn = (layout: BoardLayout, placement: Placement): Spots =>
  layout === "large" ? { large: placement } : { phone: placement };

/** The layouts a save's spots are in. */
export const layoutsIn = (spots: Spots) => BOARD_LAYOUTS.filter((layout) => spots[layout]);

/** An element's box on the board, which is its offset parent. */
export const boxOf = (el: HTMLElement): Box => ({
  left: el.offsetLeft,
  top: el.offsetTop,
  right: el.offsetLeft + el.offsetWidth,
  bottom: el.offsetTop + el.offsetHeight,
});

/** The box as it was when it hasn't moved, so measuring again doesn't re-render the board. */
export const kept = (was: Box | null, now: Box) =>
  was?.left === now.left &&
  was.top === now.top &&
  was.right === now.right &&
  was.bottom === now.bottom
    ? was
    : now;

/** The header band: your name, and the sticker tray's top. */
const HEADER = 86;
const INSET = 12;
/** Draw floats over the field's lower left rather than taking a band, so the field reaches almost to the foot. */
const FOOT = 16;
/** The right edge belongs to the sticker tray. */
const TRAY_EDGE = 40;
const S_MIN = 0.16;
export const S_MAX = 0.72;

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

/** A sticker's size at this unit: `s` sets its long side, and the art sets its shape. */
export function sizeOf(unit: number, s: number, art: { width: number; height: number }) {
  const long = s * unit;
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
  unit: number,
  p: Pick<Placement, "x" | "y" | "s" | "r">,
  art: { width: number; height: number },
) {
  const { x, y } = toPx(field, p);
  const { w, h } = sizeOf(unit, p.s, art);
  return { x, y, w, h, transform: transformAt(x, y, w, h, p.r) };
}

/** The rotate knob's center stands this far past the sticker's edge, turned with it (see the CSS). */
const KNOB_REACH = 42.5;
/** The knob's touch area reaches this far from its center. */
const KNOB_TOUCH = 22;

/**
 * Whether the rotate knob, which stands past the sticker's top edge and turns with it, would sit off
 * the board's top or under the name button, where it can't be reached.
 */
export function knobHidden(sticker: { x: number; y: number; h: number; r: number }, name: Box) {
  const turn = (sticker.r * Math.PI) / 180;
  const reach = sticker.h / 2 + KNOB_REACH;
  const x = sticker.x + Math.sin(turn) * reach;
  const y = sticker.y - Math.cos(turn) * reach;
  if (y - KNOB_TOUCH < 0) return true;
  return (
    x + KNOB_TOUCH > name.left &&
    x - KNOB_TOUCH < name.right &&
    y + KNOB_TOUCH > name.top &&
    y - KNOB_TOUCH < name.bottom
  );
}

/** How far the toolbar keeps from what it must stay clear of. */
const CLEARANCE = 8;
/** A second tap that opens the sticker lands near its middle, so a toolbar over the sticker keeps a fingertip clear of it. */
const MIDDLE_CLEAR = 22;

/**
 * Where the selected sticker's toolbar goes, in board pixels: under the sticker, clear of its turned
 * corners; on the other side when there's no room or it would meet `clearOf` (Draw); clear of the
 * knob on whichever side it stands; never over the header or the sticker tray's edge. With room on
 * neither side, it slides over the sticker's edge away from the knob, keeping the sticker's middle free.
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
  const highest = HEADER - 6;
  const lowest = board.H - toolbar.h - 12;
  /** Moved up off Draw when it would meet it. */
  const offDraw = (top: number) =>
    clearOf && meets(top) ? Math.min(top, clearOf.top - CLEARANCE - toolbar.h) : top;
  let top = sticker.y + reach + below;
  if (top + toolbar.h > board.H - 12 || meets(top)) top = sticker.y - reach - above - toolbar.h;
  if (top < highest) {
    const under = offDraw(Math.min(sticker.y + reach + below, lowest));
    const over = Math.max(sticker.y - reach - above - toolbar.h, highest);
    const freesMiddle = (t: number) =>
      t >= highest &&
      (t > sticker.y + MIDDLE_CLEAR || t + toolbar.h < sticker.y - MIDDLE_CLEAR) &&
      !meets(t);
    // A sticker too big to leave its middle free still gets its toolbar clear of Draw.
    top =
      (knobBelow ? [over, under] : [under, over]).find(freesMiddle) ??
      Math.max(highest, offDraw(clamp(sticker.y - toolbar.h / 2, highest, lowest)));
  }
  return { left, top };
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

/** How many spots are laid out for new stickers. */
export const LAID_OUT_SPOTS = SPOTS.length;

/** A laid-out spot is taken once a sticker's center sits this near it. */
export const TAKEN_WITHIN = 0.15;

/** Seeded spots tried for a new sticker once every laid-out spot is taken; the clearest wins. */
const SEEDED_TRIES = 24;

type Spot = readonly [x: number, y: number, s: number, r: number];

const span = (i: 0 | 1 | 2 | 3) => {
  const values = SPOTS.map((spot) => spot[i]);
  return [Math.min(...values), Math.max(...values)] as const;
};

/**
 * The laid-out spots' bounds for x, y, s and r: seeded spots stay inside them, as calm and as clear
 * of the header and Draw.
 */
export const SPOT_BOUNDS = { x: span(0), y: span(1), s: span(2), r: span(3) };

/** How far a spot is from the nearest sticker. Height counts for more, since the field is taller. */
const clearance = (x: number, y: number, taken: readonly Placement[]) =>
  taken.length ? Math.min(...taken.map((t) => Math.hypot(x - t.x, (y - t.y) * 1.4))) : 1;

/** The spot farthest from every sticker; the first wins a tie. */
function clearest(spots: readonly Spot[], taken: readonly Placement[]) {
  let spot = spots[0];
  let score = -1;
  for (const s of spots) {
    const c = clearance(s[0], s[1], taken);
    if (c > score) [spot, score] = [s, c];
  }
  return { spot, score };
}

/**
 * Seeded spots inside the laid-out ones' bounds, seeded by how many stickers the board holds: the
 * same board always tries the same spots, and each sticker added to it tries new ones.
 */
function seededSpots(count: number): Spot[] {
  const random = seededRandom(count);
  const within = ([lo, hi]: readonly [number, number], places: number) =>
    Number((lo + random() * (hi - lo)).toFixed(places));
  const { x, y, s, r } = SPOT_BOUNDS;
  return Array.from({ length: SEEDED_TRIES }, () => [
    within(x, 4),
    within(y, 4),
    within(s, 2),
    within(r, 0),
  ]);
}

/**
 * Where a new sticker goes: the laid-out spot farthest from every sticker already on the board. Once
 * each of those is taken, the clearest of a few seeded spots, so stickers that arrive together each
 * get their own instead of stacking on one.
 */
export function freeSpot(taken: readonly Placement[]): Pick<Placement, "x" | "y" | "s" | "r"> {
  const laidOut = clearest(SPOTS, taken);
  let best = laidOut.spot;
  if (laidOut.score < TAKEN_WITHIN) {
    const seeded = clearest(seededSpots(taken.length), taken);
    if (seeded.score > laidOut.score) best = seeded.spot;
  }
  const [x, y, s, r] = best;
  return { x, y, s, r };
}

/** The stacking order that puts a sticker above all the others. */
export const nextZ = (placements: readonly Placement[]) =>
  placements.reduce((top, p) => Math.max(top, p.z), 0) + 1;
