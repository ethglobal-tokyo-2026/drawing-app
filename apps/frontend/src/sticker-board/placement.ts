import { MAX_LARGE_SCALE, MAX_SCALE } from "@drawing-app/api/client";
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
 * The phone's board: DESIGN.md's iPhone frame inside LINE, less the status bar, LINE's header and the
 * tab strip. The large layout sizes stickers by its width, and is first derived from it.
 */
export const PHONE_BOARD = { W: 390, H: 651 } as const;

/** A board's size in px, and its unit, which a sticker's long side is a share of. */
export interface BoardSize {
  W: number;
  H: number;
  U: number;
}

/** The widest iPhone's width: a phone layout wider than it, such as LINE's sheet on an iPad, sizes stickers by it. */
export const PHONE_UNIT_MAX = 440;

/**
 * What a sticker's size is a share of: the board's width on a phone; in the large layout the phone
 * board's, so a sticker keeps its phone size either way up and the room goes to the board. A phone
 * layout wider than the widest phone keeps that phone's unit, and the extra width is board.
 */
export const unitOf = (layout: BoardLayout, boardWidth: number) =>
  layout === "large" ? PHONE_BOARD.W : Math.min(boardWidth, PHONE_UNIT_MAX);

/** Every layout, in the order a body that saves spots names them. */
const BOARD_LAYOUTS = ["phone", "large"] as const satisfies readonly BoardLayout[];

/** A sticker's spots to save, by layout. */
export type Spots = Partial<Record<BoardLayout, Placement>>;

/** `placement` as the one spot to save, in `layout`. */
export const spotsIn = (layout: BoardLayout, placement: Placement): Spots =>
  layout === "large" ? { large: placement } : { phone: placement };

/** The layouts a save's spots are in. */
export const layoutsIn = (spots: Spots) => BOARD_LAYOUTS.filter((layout) => spots[layout]);

/** An element's box on the board, through any positioned box it sits in, such as the header row. */
export function boxOf(el: HTMLElement): Box {
  let [left, top] = [el.offsetLeft, el.offsetTop];
  for (
    let parent = el.offsetParent;
    parent instanceof HTMLElement && !parent.classList.contains("board");
    parent = parent.offsetParent
  ) {
    left += parent.offsetLeft;
    top += parent.offsetTop;
  }
  return { left, top, right: left + el.offsetWidth, bottom: top + el.offsetHeight };
}

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
export const TRAY_EDGE = 40;
/** The longest a sticker's long side gets in each layout, whatever its shape; the API refuses past it. */
const S_CEILING: Record<BoardLayout, number> = { phone: MAX_SCALE, large: MAX_LARGE_SCALE };

export const fieldOf = (width: number, height: number): Field => ({
  left: INSET + 4,
  top: HEADER,
  w: width - (INSET + 4) - TRAY_EDGE,
  h: Math.max(120, height - FOOT - HEADER),
});

/** A sticker's art as a board sizes it: its image's shape, and its drawn size on the sheet, in units. */
export interface Art {
  width: number;
  height: number;
  drawnWidth: number;
  drawnHeight: number;
}

/**
 * Board px per sheet unit at a sticker's natural size, on the phone board: every sticker shows at the
 * same share of the size it was drawn, so line weights match from sticker to sticker. A quarter lands
 * a sticker drawn at the usual size where every new sticker landed when they all landed alike.
 */
export const NATURAL_SCALE = 0.25;

/** How much larger a new sticker lands in the large layout than on a phone, which has less room. */
export const LARGE_LANDING_GROWTH = 1.25;

/** A sticker's natural size in `layout`, as `s`: its drawn long side at NATURAL_SCALE on the phone board. */
export function naturalSOf(art: Pick<Art, "drawnWidth" | "drawnHeight">, layout: BoardLayout) {
  const s = (Math.max(art.drawnWidth, art.drawnHeight) * NATURAL_SCALE) / PHONE_BOARD.W;
  return layout === "large" ? s * LARGE_LANDING_GROWTH : s;
}

/** A resize takes a sticker down to its natural size over this, and up to its natural size times this. */
export const RESIZE_REACH = 2;

/** The sizes a sticker can take, as `s`. */
export interface SRange {
  min: number;
  max: number;
}

/**
 * The sizes a sticker takes in `layout`, on a board with this field and unit: half to twice its
 * natural size, as long as it fits the field and the layout's ceiling, which win.
 */
export function sRangeOf(art: Art, layout: BoardLayout, field: Field, unit: number): SRange {
  const wide = art.width >= art.height;
  const shortShare = Math.min(art.width, art.height) / Math.max(art.width, art.height);
  const fits = Math.min(
    (wide ? field.w : field.h) / unit,
    (wide ? field.h : field.w) / unit / shortShare,
  );
  const natural = naturalSOf(art, layout);
  return {
    min: natural / RESIZE_REACH,
    max: Math.min(natural * RESIZE_REACH, fits, S_CEILING[layout]),
  };
}

/** `s` kept in `range`; where the field leaves less than its least, the field wins. */
export const clampS = (s: number, range: SRange) => clamp(s, range.min, range.max);

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

/** Whether two boxes come within `by` px of each other. */
export const meets = (a: Box, b: Box, by = 0) =>
  a.left < b.right + by && a.right > b.left - by && a.top < b.bottom + by && a.bottom > b.top - by;

/** Half the width and height of the box a `w` by `h` box turned by `r` degrees takes up. */
export function extentsOf(w: number, h: number, r: number) {
  const turn = (r * Math.PI) / 180;
  const [cos, sin] = [Math.abs(Math.cos(turn)), Math.abs(Math.sin(turn))];
  return { ex: (cos * w + sin * h) / 2, ey: (sin * w + cos * h) / 2 };
}

/** The rotate knob's center stands this far past the sticker's edge, turned with it (see the CSS). */
const KNOB_REACH = 42.5;
/** The knob's touch area reaches this far from its center. */
const KNOB_TOUCH = 22;

/** The rotate knob's touch area, above the sticker's top edge or hanging below it, turned with it. */
export function knobBox(
  sticker: { x: number; y: number; h: number; r: number },
  below: boolean,
): Box {
  const turn = ((sticker.r + (below ? 180 : 0)) * Math.PI) / 180;
  const reach = sticker.h / 2 + KNOB_REACH;
  const x = sticker.x + Math.sin(turn) * reach;
  const y = sticker.y - Math.cos(turn) * reach;
  return {
    left: x - KNOB_TOUCH,
    top: y - KNOB_TOUCH,
    right: x + KNOB_TOUCH,
    bottom: y + KNOB_TOUCH,
  };
}

/**
 * Whether the rotate knob, which stands past the sticker's top edge and turns with it, would sit off
 * the board's top or under the name button, where it can't be reached.
 */
export function knobHidden(sticker: { x: number; y: number; h: number; r: number }, name: Box) {
  const knob = knobBox(sticker, false);
  return knob.top < 0 || meets(knob, name);
}

/** How far the toolbar keeps from what it must stay clear of. */
const CLEARANCE = 8;
/** A second tap that opens the sticker lands near its middle, so a toolbar over the sticker keeps a fingertip clear of it. */
export const MIDDLE_CLEAR = 22;

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
  const reach = extentsOf(sticker.w, sticker.h, sticker.r).ey + 12;
  const [below, above] = knobBelow ? [50, 14] : [14, 50];
  const left = clamp(sticker.x - toolbar.w / 2, 10, board.W - toolbar.w - TRAY_EDGE - 4);
  const meetsDraw = (top: number) =>
    Boolean(
      clearOf &&
      meets({ left, top, right: left + toolbar.w, bottom: top + toolbar.h }, clearOf, CLEARANCE),
    );
  const highest = HEADER - 6;
  const lowest = board.H - toolbar.h - 12;
  /** Moved up off Draw when it would meet it. */
  const offDraw = (top: number) =>
    clearOf && meetsDraw(top) ? Math.min(top, clearOf.top - CLEARANCE - toolbar.h) : top;
  let top = sticker.y + reach + below;
  if (top > lowest || meetsDraw(top)) top = sticker.y - reach - above - toolbar.h;
  if (top < highest) {
    const under = offDraw(Math.min(sticker.y + reach + below, lowest));
    const over = Math.max(sticker.y - reach - above - toolbar.h, highest);
    const freesMiddle = (t: number) =>
      t >= highest &&
      (t > sticker.y + MIDDLE_CLEAR || t + toolbar.h < sticker.y - MIDDLE_CLEAR) &&
      !meetsDraw(t);
    // A sticker too big to leave its middle free still gets its toolbar clear of Draw.
    top =
      (knobBelow ? [over, under] : [under, over]).find(freesMiddle) ??
      Math.max(highest, offDraw(clamp(sticker.y - toolbar.h / 2, highest, lowest)));
  }
  return { left, top };
}

/**
 * Spots for new stickers, as x, y and r: calm, and clear of the header and Draw. The empty board
 * shows the first as a dashed spot, so the first sticker lands in it.
 */
const SPOTS = [
  [0.5, 0.42, 2],
  [0.72, 0.8, 3],
  [0.28, 0.8, -4],
  [0.26, 0.4, -3],
  [0.75, 0.3, 5],
  [0.5, 0.15, -6],
] as const;

/** Where the empty board's dashed spot sits: the first sticker's spot. */
export const FIRST_SPOT = { x: SPOTS[0][0], y: SPOTS[0][1] };

/** How many spots are laid out for new stickers. */
export const LAID_OUT_SPOTS = SPOTS.length;

/** Seeded spots tried for a new sticker once every laid-out spot is taken; the clearest wins. */
const SEEDED_TRIES = 24;

type Spot = readonly [x: number, y: number, r: number];

const span = (i: 0 | 1 | 2) => {
  const values = SPOTS.map((spot) => spot[i]);
  return [Math.min(...values), Math.max(...values)] as const;
};

/**
 * The laid-out spots' bounds for x, y and r: seeded spots stay inside them, as calm and as clear of
 * the header and Draw.
 */
export const SPOT_BOUNDS = { x: span(0), y: span(1), r: span(2) };

/**
 * Seeded spots inside the laid-out ones' bounds, seeded by how many stickers the board holds: the
 * same board always tries the same spots, and each sticker added to it tries new ones.
 */
function seededSpots(count: number): Spot[] {
  const random = seededRandom(count);
  const within = ([lo, hi]: readonly [number, number], places: number) =>
    Number((lo + random() * (hi - lo)).toFixed(places));
  const { x, y, r } = SPOT_BOUNDS;
  return Array.from({ length: SEEDED_TRIES }, () => [within(x, 4), within(y, 4), within(r, 0)]);
}

/** The phone board, measured: where a layout that isn't on screen lands its stickers. */
export const PHONE_BOARD_SIZE: BoardSize = { ...PHONE_BOARD, U: unitOf("phone", PHONE_BOARD.W) };

/** A sticker already on the board: its spot, and its art's shape. */
export interface Taken {
  placement: Placement;
  art: Pick<Art, "width" | "height">;
}

/** A box's center and the half extents of its turned box, in board px. */
export interface Footprint {
  x: number;
  y: number;
  ex: number;
  ey: number;
}

export function footprintOf(
  field: Field,
  unit: number,
  p: Pick<Placement, "x" | "y" | "s" | "r">,
  art: Pick<Art, "width" | "height">,
): Footprint {
  const { x, y } = toPx(field, p);
  const { w, h } = sizeOf(unit, p.s, art);
  return { x, y, ...extentsOf(w, h, p.r) };
}

/** How far apart two footprints are, in px, on the axis they're furthest apart on; below zero, they overlap. */
export const gapOf = (a: Footprint, b: Footprint) =>
  Math.max(Math.abs(a.x - b.x) - a.ex - b.ex, Math.abs(a.y - b.y) - a.ey - b.ey);

/** A center moved in as far as a box reaching `e` from it needs to stay on the field; too big, it centers. */
export const fitIn = (c: number, lo: number, span: number, e: number) =>
  2 * e >= span ? lo + span / 2 : Math.min(lo + span - e, Math.max(lo + e, c));

/**
 * Where a new sticker goes in `layout`, at its natural size: the laid-out spot with the most room
 * around it for a sticker that size, moved in to keep it on the field. Once each of those overlaps a
 * sticker, the roomiest of a few seeded spots, so stickers that arrive together each get their own
 * instead of stacking on one.
 */
export function freeSpot(
  taken: readonly Taken[],
  art: Art,
  layout: BoardLayout,
  board: BoardSize,
): Pick<Placement, "x" | "y" | "s" | "r"> {
  const field = fieldOf(board.W, board.H);
  const s = clampS(naturalSOf(art, layout), sRangeOf(art, layout, field, board.U));
  const others = taken.map((t) => footprintOf(field, board.U, t.placement, t.art));
  /** A spot's place on the field for this sticker, and the room it leaves to the nearest sticker. */
  const scored = ([x0, y0, r]: Spot) => {
    const at = footprintOf(field, board.U, { x: x0, y: y0, s, r }, art);
    at.x = fitIn(at.x, field.left, field.w, at.ex);
    at.y = fitIn(at.y, field.top, field.h, at.ey);
    const room = Math.min(...others.map((o) => gapOf(at, o)));
    return { spot: { ...toFrac(field, at), s, r }, room };
  };
  /** The roomiest spot; the first wins a tie. */
  const roomiest = (spots: readonly Spot[]) =>
    spots.map(scored).reduce((best, next) => (next.room > best.room ? next : best));
  const laidOut = roomiest(SPOTS);
  if (laidOut.room >= 0) return roundSpot(laidOut.spot);
  const seeded = roomiest(seededSpots(taken.length));
  return roundSpot(seeded.room > laidOut.room ? seeded.spot : laidOut.spot);
}

const round = (v: number, places: number) => Number(v.toFixed(places));

/**
 * A spot at the precision it's saved at: its center and size to 4 places, finer than a pixel on any
 * board, and its turn to 2.
 */
export const roundSpot = <P extends Pick<Placement, "x" | "y" | "s" | "r">>(p: P): P => ({
  ...p,
  x: round(p.x, 4),
  y: round(p.y, 4),
  s: round(p.s, 4),
  r: round(p.r, 2),
});

/** The stacking order that puts a sticker above all the others. */
export const nextZ = (placements: readonly Placement[]) =>
  placements.reduce((top, p) => Math.max(top, p.z), 0) + 1;
