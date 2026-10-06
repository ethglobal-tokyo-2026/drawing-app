/**
 * The sticker tray's model: the stickers it holds, the sticker sheet each is packed on, and the
 * stack's order; with the types, measures and helpers every part of the tray shares.
 */
import { tokyoTicketDay } from "@drawing-app/api/client";
import type { StickerUrls } from "../../stickers/stickerUrls";
import { packSheets, type PackedItem, type Shape } from "./sheetPacking";
import { knownShape, stickerShape, unreadableCut } from "./stickerShape";
import type { TrayProblem } from "./trayProblem";
import { newSlots, type TraySlot } from "./traySlots";
import type { Zipper } from "./zipper";

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
  /** An NSFW sticker for someone without the NSFW opt-in: its image is the veiled one, so it wears the 18+ mark. */
  veiled: boolean;
  /** Shown in the open tray before, so it isn't NEW. */
  seen: boolean;
  /** Given away and received: who has it, printed. Its spot opens it among the stickers you gave. */
  givenTo?: string;
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
export type Filter = "all" | "mine" | "gifts";
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
  /** The mouth's top and foot, in the column's pixels: a sheet below the foot is behind the fabric. */
  band: { top: number; bot: number } | null;
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
  spreadOpen: boolean;
  /** What's been on show in the open tray: seen once the tray zips shut. */
  shown: Set<string>;
  pulled: Pulled | null;
  /** The stickers the tray holds, and how many sheets they fill. */
  model: ReturnType<typeof modelOf>;
  /**
   * How much the stack is shrunk to fit a short board, from 1 down. The sheets shrink; the edges behind
   * the front one stay their own height on screen, so they stay something to tap.
   */
  shrink: number;
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
  boardView: () => BoardView;
}

/** Each sheet behind the front one sits this much lower, so its dated foot shows. */
export const PEEK = 15;
/** Sheets shown behind the front one; deeper ones become the stack's depth, a button that spreads them. */
export const PEEKS = 3;
/** Under the front sheet: the edges behind it, and the +N button with its gap. */
export const STACK_FOOT = PEEKS * PEEK + 3 + 22;
export const SHEET = { w: 156, h: 364 };
/** Packing keeps clear of the sheet's tear strip at the top and its dated foot. */
const PACK = { sheet: SHEET, margin: { top: 30, right: 10, bottom: 24, left: 10 } };
/** The tray runs from just under the board's header to its foot. */
export const TOP = 64;
/** The tray's column: wide enough for the left row's full travel. */
export const COL = 205;
/** How far the left row travels open: the tray takes about half the screen. */
export const GMAX = 172;
/** The stack's top in the open tray, under its folder tabs. */
export const STACK_Y = 72;
/** How the mouth sags to a crack while something is out over the board. */
export const CRACK = 0.12;
/** Phosphor's Stack and X icons, bold. */
export const ICONS = {
  stack:
    "M234.36,170A12,12,0,0,1,230,186.37l-96,56a12,12,0,0,1-12.1,0l-96-56a12,12,0,0,1,12.09-20.74l90,52.48L218,165.63A12,12,0,0,1,234.36,170ZM218,117.63,128,170.11,38.05,117.63A12,12,0,0,0,26,138.37l96,56a12,12,0,0,0,12.1,0l96-56A12,12,0,0,0,218,117.63ZM20,80a12,12,0,0,1,6-10.37l96-56a12.06,12.06,0,0,1,12.1,0l96,56a12,12,0,0,1,0,20.74l-96,56a12,12,0,0,1-12.1,0l-96-56A12,12,0,0,1,20,80Zm35.82,0L128,122.11,200.18,80,128,37.89Z",
  x: "M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z",
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
export const local = (e: PointerEvent, view: BoardView): Point => ({
  x: (e.clientX - view.left) / view.k,
  y: (e.clientY - view.top) / view.k,
});
export const targetOf = (e: Event) => (e.target instanceof Element ? e.target : null);

export function modelOf(list: readonly TraySticker[], seen: Set<string>) {
  for (const s of list) if (s.seen) seen.add(s.id);
  const slots: Slot[] = list.map((s) => ({ ...s }));
  return { slots, count: Math.max(1, ...slots.map((s) => s.sheet + 1)) };
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

  /* ---------------------------------------------------------------- where each sticker sits: on its cut line */
  function packWith(shapes: readonly Shape[]) {
    const { sheets, byId } = packSheets(
      ui.model.slots.map((s, i) => ({ id: s.id, shape: shapes[i] })),
      PACK,
    );
    for (const s of ui.model.slots) {
      const b = byId.get(s.id);
      if (b) {
        s.sheet = b.f;
        s.pos = b;
      }
      const why = unreadableCut(s.id);
      if (why !== undefined && !toldCuts.has(s.id)) {
        toldCuts.add(s.id);
        problem({ kind: "cut", nos: [s.no], detail: why });
      }
    }
    ui.model.count = Math.max(1, sheets.length);
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
    applyPack,
    relayout,
    resetOrder,
  };
}

export type TrayModel = ReturnType<typeof createTrayModel>;
