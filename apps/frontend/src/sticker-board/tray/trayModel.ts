/**
 * The sticker tray's model: the stickers it holds, the sticker sheet each is packed on, and the
 * stack's order; with the types, measures and helpers every part of the tray shares.
 */
import { tokyoTicketDay } from "@drawing-app/api/client";
import type { StickerUrls } from "../../stickers/stickerUrls";
import { clamp } from "../../ui/easing";
import { packSheets, type PackedItem, type Shape } from "./sheetPacking";
import { knownShape, stickerShape, unreadableCut } from "./stickerShape";
import type { TrayProblem } from "./trayProblem";
import { newSlots, type TraySlot } from "./traySlots";
import { showsFrom, type Zipper } from "./zipper";

/** A sticker as the sticker tray holds it: its slot, and what it's drawn from. */
export interface TraySticker extends TraySlot {
  no: number;
  /** The image's size. */
  width: number;
  height: number;
  outline?: string;
  urls: Pick<StickerUrls, "png" | "mask" | "foil">;
  /** Drawn by someone else: a received gift. */
  gift: boolean;
  /** An NSFW sticker: it wears pink foil, whoever drew it. */
  nsfw: boolean;
  /** Drawn in Kyoto Seika Practice Mode: it wears that foil, whoever drew it. */
  kyotoSeika: boolean;
  /** An NSFW sticker for someone without the NSFW opt-in: its image is the veiled one, so it wears the 18+ mark. */
  veiled: boolean;
  /** Shown in the open tray before, so it isn't NEW. */
  seen: boolean;
  /** Given away and received: who has it, printed. Its spot opens it among the stickers you gave. */
  givenTo?: string;
  /** On its way: who it waits for, printed, when the app knows. */
  onItsWayTo?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

/** A sticker's center, size and turn. */
export interface Box extends Point, Size {
  r: number;
}

/**
 * Where the board sits on screen and how much it's drawn scaled, mid-turn. It holds still through a
 * gesture, so it's read once when the gesture begins instead of on every move.
 */
export interface BoardView {
  left: number;
  top: number;
  k: number;
}

/** What the sticker tray needs from its board, all in board pixels. */
export interface TrayBoard {
  /** Where a sticker sits on the board; null when it isn't there. */
  stickerRect: (id: string) => Box | null;
  /** How big a sticker is on the board. */
  sizeFor: (id: string) => Size;
  /**
   * Sticks a sticker on at `at`, or at a free spot; resolves with its element once it's drawn, or null
   * when the board couldn't take it.
   */
  place: (id: string, at?: { x: number; y: number; r: number }) => Promise<HTMLElement | null>;
  /** A sticker went back into its used sticker silhouette. */
  remove: (id: string) => void;
  /** Shows where a sticker is on the board, and moves focus to it. */
  pulse: (id: string) => void;
  /** Opens a given sticker's detail, among the stickers you gave. */
  openGiven: (id: string) => void;
  /** Opens a sticker in a gift, packed or on its way, among your stickers. */
  openYours: (id: string) => void;
}

/**
 * A board sticker dragged over the tray: whether it's over it, and where its used sticker silhouette
 * draws it in.
 */
export interface TrayDrag {
  over: boolean;
  snap: { x: number; y: number; scale: number; r: number } | null;
}

export type Geometry = ReturnType<Zipper["geometry"]>;
/** The folder tabs' filters, in their order. */
export const FILTERS = ["all", "mine", "gifts"] as const;
export type Filter = (typeof FILTERS)[number];
export type SlotState = TraySlot["state"] | "peeling";

export interface Slot extends TraySticker {
  /** Its packed spot, once every sticker's shape is known. */
  pos?: PackedItem;
}

/** The tray's one press at a time, on the stack or on the pulled-out sheet. */
export interface Gesture {
  id: number;
  view: BoardView;
  /** The pulled-out sheet it's on; null on the stack. */
  pulled: Pulled | null;
  p0: Point;
  mode: "maybe" | "page" | "peel" | "pull" | "move" | "none";
  slotEl: HTMLElement | null;
  /** How deep in the stack the pressed sheet sits. */
  depth: number;
  last: Point;
  lt: number;
  vx: number;
  vy: number;
  /** How far a page turn has lifted the front sheet. */
  dy: number;
  /** The front sheet a page turn lifts, found as the turn begins. */
  sheet: HTMLElement | null;
  peel: Peel | null;
  /** Where the pulled-out sheet was when this move began. */
  at: Point | null;
}

/** A sticker in hand, from its press to where it lands. */
export interface Peel {
  s: Slot;
  /** Where it sat on its sheet. */
  r: Box;
  size: Size;
  el: HTMLDivElement;
  curl: HTMLDivElement;
  phase: "curl" | "free";
  x: number;
  y: number;
  vx: number;
  scale: number;
  rot: number;
  raf: number;
  target: Point | null;
  startX: number;
}

/** A sheet pulled out over the board. */
export interface Pulled {
  f: number;
  el: HTMLDivElement;
  x: number;
  y: number;
  g0: Point;
  /** Free of the tray, floating over the board. */
  out: boolean;
  /** Its own listeners, which go with it. */
  listening: AbortController;
}

export interface TrayState {
  filter: Filter;
  /** The stack, front first: sheet numbers, the oldest sheet being 0. */
  order: number[];
  /** The stack's top left, in the column's pixels. */
  stackAt: Point;
  /** The foot of the window the stack shows through, in the column's pixels: a sheet below it is behind the fabric. */
  windowBot: number | null;
  geo: Geometry | null;
  busy: boolean;
  g: Gesture | null;
  /** The board sticker whose used sticker silhouette is breathing. */
  target: string | null;
  dwell: number;
  /** The board sticker being dragged, and whether the tray was open when its drag began. */
  drop: { id: string; wasOpen: boolean; view: BoardView } | null;
  shutTimer: number;
  relaxTimer: number;
  /** Board stickers flying back into their used sticker silhouettes: the sheets redraw once they land. */
  landing: Set<string>;
  spreadOpen: boolean;
  /** What's been on show in the open tray: seen once the tray zips shut. */
  shown: Set<string>;
  pulled: Pulled | null;
  /** The stickers the tray holds, and how many sheets they fill. */
  model: ReturnType<typeof modelOf>;
  /** How the tray fits its board: the stack's scale, the column's growth and the open pouch's room. */
  fit: TrayFit;
  /** The sheets' page height in sheet px, the one the stickers were packed for. */
  sheetH: number;
  /** The stack's window is on show: the tray open, opening, or pulled to a crack. */
  onShow: boolean;
  /** The stickers changed while the sheets were out of sight, under a hand or mid-turn: they're
   * rebuilt once they show and that's over. */
  stale: boolean;
  /** The sheet count the stack's order was dealt for. */
  orderedFor: number;
  /**
   * Slots ask for their images once the board has assembled or the tray first shows, so a closed tray
   * doesn't download alongside the board's own stickers.
   */
  imagesOn: boolean;
  /** The tray is gone: work that finishes after it does nothing. */
  destroyed: boolean;
}

/** What every part of the sticker tray is given: its board, its elements and their helpers, its state. */
export interface Tray {
  board: HTMLElement;
  api: TrayBoard;
  /** Something the tray couldn't do, for the board to say. */
  problem: (problem: TrayProblem) => void;
  doc: Document;
  win: Window & typeof globalThis;
  /** The person asked for reduced motion. */
  reduced: () => boolean;
  /** Listens until the tray is destroyed. */
  listen: <K extends keyof HTMLElementEventMap>(
    el: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ) => void;
  /** A timeout the tray clears when it's destroyed. */
  later: (fn: () => void, ms: number) => number;
  cancel: (t: number) => void;
  make: <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    ...kids: (Node | string)[]
  ) => HTMLElementTagNameMap[K];
  decorative: <T extends Element>(el: T) => T;
  icon: (d: string) => SVGSVGElement;
  zip: Zipper;
  /** The tray's fixed words, in the app's language. */
  words: Readonly<
    Record<"sheets" | "tabs" | "new" | "putBack" | "slotHint" | "spread" | "empty", string>
  >;
  root: HTMLDivElement;
  /** Where a sticker in hand would land on the board. */
  land: HTMLDivElement;
  /** What's out over the board: a sticker in hand, a pulled-out sheet. */
  fly: HTMLDivElement;
  mat: HTMLDivElement;
  spreadLayer: HTMLDivElement;
  stack: HTMLDivElement;
  tabsEl: HTMLDivElement;
  /** What the sheet in front's stickers do, said once for the sheet. */
  hint: HTMLParagraphElement;
  /** Says a change on the tray's one polite status line. */
  say: (text: string) => void;
  ui: TrayState;
  /** The board's width and height, and where the tray's column starts on it. */
  Wb: () => number;
  Hb: () => number;
  colLeft: () => number;
  /** The open mouth's left lip, as the board's x; null before the Zipper has drawn. */
  lipLeft: () => number | null;
  /** Where the tray starts on the board, under its header (see `trayTopFor`). */
  trayTop: () => number;
  /** Where the open pouch ends, as the board's y: where its mouth closes in. */
  pouchFoot: () => number;
  boardView: () => BoardView;
}

/** Each sheet behind the front one sits this much lower, so its dated foot shows. */
export const PEEK = 15;
/** Sheets shown behind the front one; deeper ones become the stack's depth, a button that spreads them. */
export const PEEKS = 3;
/** The +N button's height, and its gap under the last edge behind the front sheet. */
export const DEPTH_BUTTON_H = 22;
export const DEPTH_GAP = 3;
/** The +N button under the edges behind the front sheet, with its gap. */
const DEPTH_ROOM = DEPTH_GAP + DEPTH_BUTTON_H;
/** Under the front sheet of a deep stack: the edges behind it, and the +N button. */
export const STACK_FOOT = PEEKS * PEEK + DEPTH_ROOM;
/** Under the front sheet of a stack of `sheets`: the edges shown behind it, and the +N button once deeper ones hide. */
export const stackFootFor = (sheets: number) =>
  Math.min(PEEKS, Math.max(0, sheets - 1)) * PEEK + (sheets - 1 > PEEKS ? DEPTH_ROOM : 0);
/** A sheet's width, and its page's least height: the page grows taller to fill the open pouch. */
export const SHEET = { w: 156, h: 364 };
/** Packing keeps clear of the sheet's tear strip at the top and its dated foot. */
export const PACK_MARGIN = { top: 30, right: 10, bottom: 24, left: 10 };
/** The tray runs from under the board's header and its gifts badge to its foot; a large screen's header
 * row, where the gifts sit beside your name, is taller. */
export const trayTopFor = (largeScreen: boolean) => (largeScreen ? 80 : 72);
/** The tray's column: wide enough for the left row's full travel. */
export const COL = 205;
/** How far the left row travels open: the tray takes about half the screen. */
export const GMAX = 172;
/** The chain's center line runs this far in from the column's right edge. */
const CHAIN_INSET = 15;
/** The chain's center line, from the left of a column grown by `grow`. */
export const chainAtFor = (grow: number) => COL * grow - CHAIN_INSET;
/** The Zipper's track keeps this clear above and below it in the column. */
export const TRACK_INSETS = [6, 6] as const;
/** The window the stack shows through starts this far inside the left lip, and the open stack this far inside it. */
const WINDOW_INSET = 3;
export const STACK_X = 3;
/** The stack's top in the open tray, under its folder tabs. */
export const STACK_Y = 72;
/** The window's left edge, in the column's px: inside the left lip, where a mouth `G` wide shows through. */
export const windowLeft = (chainX: number, G: number, spread: number) =>
  chainX - showsFrom(spread) * G + WINDOW_INSET;
/** How the mouth sags to a crack while something is out over the board. */
export const CRACK = 0.12;
/**
 * However short the tray, the stack is shrunk to no less than this, so the dates on its narrowest
 * edge, kept at the fine-print floor, still sit beside the sheet's number.
 */
export const MIN_SCALE = 0.5;
/**
 * On a large screen the stack grows no larger than this: its stickers come out about the size of the
 * board's, and the open pouch leaves most of the board in view.
 */
export const MAX_STACK_SCALE = 1.5;
/** The open mouth keeps this much lining under the stack's foot, where the +N button's reach ends. */
export const POUCH_LINING = 24;

/** How the tray fits its board. */
export interface TrayFit {
  /**
   * The stack's scale: below 1 to fit a short board, above 1 to fill a large screen's room. The sheets
   * scale; the edges behind the front one, their dates and the +N button keep their size on screen.
   */
  scale: number;
  /** What the column and the mouth's travel grow by, and a pulled-out sheet's size: 1 but on a large screen. */
  grow: number;
  /**
   * The open pouch's room for the stack, in the column's px: from the stack's top down to the lining
   * over the bottom stop. The front sheet's page and the stack's foot under it fill it.
   */
  room: number;
}

/** Before the board has a size: the page at its least height. */
const PHONE_FIT: TrayFit = { scale: 1, grow: 1, room: SHEET.h };

/**
 * The tray on its board. The stack shrinks until a deep stack of least-height pages fits the mouth
 * opened to the rail's far stop; on a large screen it grows to fill it, up to MAX_STACK_SCALE, and the
 * column and the mouth's travel grow with it. Whatever room is left goes to the pages' height
 * (`sheetHeightFor`). `windowFoot` is where the open mouth ends when it closes in this many px short
 * of the slider.
 */
export function trayFitFor(large: boolean, windowFoot: (short: number) => number | null): TrayFit {
  const foot = windowFoot(0);
  if (foot === null) return PHONE_FIT;
  // The scale whose deepest stack ends where the open mouth does.
  const fills = (foot - 2 - STACK_Y - STACK_FOOT) / SHEET.h;
  const scale = large && fills > 1 ? Math.min(fills, MAX_STACK_SCALE) : clamp(fills, MIN_SCALE, 1);
  return {
    scale,
    grow: large ? Math.max(1, scale) : 1,
    room: foot - 2 - STACK_Y - POUCH_LINING,
  };
}

/** The page's height in sheet px on a stack of `sheets`: it fills the room above the stack's foot. */
export const sheetHeightFor = (fit: TrayFit, sheets: number) =>
  Math.max(SHEET.h, (fit.room - stackFootFor(sheets)) / fit.scale);

/**
 * How far short of the slider on the far stop the open mouth closes in: just below the stack's foot,
 * so the open pouch holds no bare lining under the sheets. Pages that fill the pouch leave none.
 */
export const mouthShortFor = (fit: TrayFit, sheets: number, sheetH: number) =>
  Math.max(0, Math.floor(fit.room - fit.scale * sheetH - stackFootFor(sheets)));
/**
 * Phosphor's Stack and X icons, bold; and, fill, the dot of a sticker in a gift by its spot's state:
 * Gift in the bag, PaperPlaneTilt on its way.
 */
export const ICONS = {
  stack:
    "M234.36,170A12,12,0,0,1,230,186.37l-96,56a12,12,0,0,1-12.1,0l-96-56a12,12,0,0,1,12.09-20.74l90,52.48L218,165.63A12,12,0,0,1,234.36,170ZM218,117.63,128,170.11,38.05,117.63A12,12,0,0,0,26,138.37l96,56a12,12,0,0,0,12.1,0l96-56A12,12,0,0,0,218,117.63ZM20,80a12,12,0,0,1,6-10.37l96-56a12.06,12.06,0,0,1,12.1,0l96,56a12,12,0,0,1,0,20.74l-96,56a12,12,0,0,1-12.1,0l-96-56A12,12,0,0,1,20,80Zm35.82,0L128,122.11,200.18,80,128,37.89Z",
  x: "M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z",
  inTheBag:
    "M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16h60a4,4,0,0,0,4-4V120H40V88h80v32h16V88h80v32H136v92a4,4,0,0,0,4,4h60a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM84.51,59a13.69,13.69,0,0,1-4.5-10A16.62,16.62,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92C109.71,70.39,94,67.43,84.51,59Zm87,0c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08,13.69,13.69,0,0,1,171.49,59Z",
  onItsWay:
    "M231.4,44.34s0,.1,0,.15l-58.2,191.94a15.88,15.88,0,0,1-14,11.51q-.69.06-1.38.06a15.86,15.86,0,0,1-14.42-9.15L107,164.15a4,4,0,0,1,.77-4.58l57.92-57.92a8,8,0,0,0-11.31-11.31L96.43,148.26a4,4,0,0,1-4.58.77L17.08,112.64a16,16,0,0,1,2.49-29.8l191.94-58.2.15,0A16,16,0,0,1,231.4,44.34Z",
};

export const SVG_NS = "http://www.w3.org/2000/svg";
export const cssUrl = (url: string) => `url("${url}")`;
export const px = (v: number) => `${v.toFixed(1)}px`;
const isShape = (s: Shape | undefined): s is Shape => s !== undefined;
export const dayOf = (t: number) => tokyoTicketDay(new Date(t));
export const matchesFilter = (s: Slot, f: Filter) =>
  f === "all" || (f === "mine" ? !s.gift : s.gift);

/** Resolves when an animation ends, finished or cancelled along with its element. */
export function ended(a: Animation): Promise<void> {
  return a.finished.then(
    () => undefined,
    (error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        console.error("A sticker tray animation failed", error);
    },
  );
}

/** A pointer's place in board pixels: the board may be drawn scaled, mid-turn. */
export const boardPoint = (e: PointerEvent, view: BoardView): Point => ({
  x: (e.clientX - view.left) / view.k,
  y: (e.clientY - view.top) / view.k,
});
export const targetOf = (e: Event) => (e.target instanceof Element ? e.target : null);

/** Copies the stickers into slots, and remembers the ones already seen. */
export function modelOf(list: readonly TraySticker[], seen: Set<string>) {
  for (const s of list) if (s.seen) seen.add(s.id);
  const slots: Slot[] = list.map((s) => ({ ...s }));
  return { slots, count: Math.max(1, ...slots.map((s) => s.sheet + 1)) };
}

/** A new tray's state, holding `model`: shut, with every sheet dealt and nothing in hand. */
export function createTrayState(model: TrayState["model"]): TrayState {
  return {
    filter: "all",
    order: [],
    stackAt: { x: 0, y: STACK_Y },
    windowBot: null,
    geo: null,
    busy: false,
    g: null,
    target: null,
    dwell: 0,
    drop: null,
    shutTimer: 0,
    relaxTimer: 0,
    landing: new Set(),
    spreadOpen: false,
    shown: new Set(),
    pulled: null,
    model,
    fit: PHONE_FIT,
    sheetH: SHEET.h,
    onShow: false,
    stale: false,
    orderedFor: 0,
    imagesOn: false,
    destroyed: false,
  };
}

/** The model's reads, and its packing and dealing, over the tray's state. */
export function createTrayModel(
  ui: TrayState,
  seen: ReadonlySet<string>,
  problem: (problem: TrayProblem) => void,
) {
  /** Stickers whose unreadable cut line the board has been told of, once each. */
  const toldCuts = new Set<string>();
  const newIds = () => newSlots(ui.model.slots, { today: dayOf(Date.now()), dayOf, seen });
  const matches = (s: Slot) => matchesFilter(s, ui.filter);
  const sheetItems = (f: number) => ui.model.slots.filter((s) => s.sheet === f);
  const sheetMatches = (f: number) =>
    ui.filter === "all" || sheetItems(f).some((s) => s.state !== "given" && matches(s));
  const itemOf = (id: string) => ui.model.slots.find((s) => s.id === id) ?? null;
  const topF = () => ui.order[0] ?? ui.model.count - 1;
  /** How many sheets the filter deals: the stack, and a sheet pulled out of it. */
  const sheetsMatching = () =>
    Array.from({ length: ui.model.count }, (_, f) => f).filter(sheetMatches).length;
  /** The page's height for the stack the filter deals: it fills the room above that stack's foot. */
  const pageHeight = () => sheetHeightFor(ui.fit, Math.max(1, sheetsMatching()));

  /* ---------------------------------------------------------------- where each sticker sits: on its cut line */
  /** The model whose sheets were last packed, and so drawn. */
  let packedModel: TrayState["model"] | null = null;
  /** Given stickers stay in the list, so the blanks they leave on their sheets stay put. */
  function packWith(shapes: readonly Shape[]) {
    const items = ui.model.slots.map((s, i) => ({ id: s.id, shape: shapes[i] }));
    // Packed on the page's least height whatever the board, so a sticker's sheet never changes with the
    // board's height or the stickers after it; the drawn page, taller, spreads them over it.
    const packOn = (page: number) =>
      packSheets(items, { sheet: SHEET, margin: PACK_MARGIN, spread: true, page });
    let packed = packOn(SHEET.h);
    // A sheet pulled out over the board follows its oldest sticker to the sheet it's packed on now.
    const pulled = ui.pulled;
    const followed = pulled && (packedModel ?? ui.model).slots.find((s) => s.sheet === pulled.f);
    for (const s of ui.model.slots) {
      const b = packed.byId.get(s.id);
      if (b) s.sheet = b.f;
    }
    ui.model.count = Math.max(1, packed.sheets.length);
    packedModel = ui.model;
    const f = followed ? itemOf(followed.id)?.sheet : undefined;
    if (pulled && f !== undefined && f !== pulled.f) {
      pulled.f = f;
      resetOrder();
    }
    const sheetH = pageHeight();
    if (sheetH !== SHEET.h) packed = packOn(sheetH);
    for (const s of ui.model.slots) {
      s.pos = packed.byId.get(s.id) ?? s.pos;
      const why = unreadableCut(s.id);
      if (why !== undefined && !toldCuts.has(s.id)) {
        toldCuts.add(s.id);
        problem({ kind: "cut", nos: [s.no], detail: why });
      }
    }
    ui.sheetH = sheetH;
  }
  /** Packs at once when every cut line is known; until then, the stand-in spots stay. */
  function applyPack() {
    const shapes = ui.model.slots.map((s) => knownShape(s));
    if (!shapes.every(isShape)) return false;
    packWith(shapes);
    return true;
  }
  async function relayout() {
    if (applyPack()) return true;
    const m = ui.model;
    const shapes = await Promise.all(m.slots.map((s) => stickerShape(s, s.urls)));
    // A refresh during the wait lays out its own stickers.
    if (ui.destroyed || m !== ui.model) return false;
    packWith(shapes);
    return true;
  }
  /**
   * Sets the stickers out on pages as tall as the stack the filter deals needs, when that changed:
   * packed when every cut line is known, else on stand-in spots from the page's foot. Whether it did.
   */
  function fitPages() {
    if (pageHeight() === ui.sheetH) return false;
    if (!applyPack()) ui.sheetH = pageHeight();
    return true;
  }
  /** The stack as the filter deals it: its sheets, newest in front. */
  function resetOrder() {
    const all = Array.from({ length: ui.model.count }, (_, i) => ui.model.count - 1 - i).filter(
      (f) => f !== ui.pulled?.f,
    );
    const want = all.filter(sheetMatches);
    ui.order = want.length ? want : all.slice(0, 1);
    ui.orderedFor = ui.model.count;
  }
  return {
    newIds,
    matches,
    sheetItems,
    sheetMatches,
    itemOf,
    topF,
    sheetsMatching,
    applyPack,
    fitPages,
    relayout,
    resetOrder,
  };
}

export type TrayModel = ReturnType<typeof createTrayModel>;
