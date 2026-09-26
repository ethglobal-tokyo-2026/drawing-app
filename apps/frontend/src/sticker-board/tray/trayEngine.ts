/**
 * The sticker tray: zipped down the Sticker Board's right edge, opened by its Zipper.
 * Inside, a stack of loose sticker sheets holds every sticker you've had, in arrival order, each in
 * its packed spot: a used sticker silhouette where one is out on the board, a blank where one was
 * given. You page the stack, pull a sheet out over the board, spread every sheet out, peel stickers
 * onto the board and put them back. Everything is in board pixels, in the board's stacking context.
 */
import { i18next } from "../../i18n/i18n";
import { timeOurWork } from "../../performance/performanceRecorder";
import { formatNo } from "../../stickers/format";
import type { StickerUrls } from "../../stickers/stickerUrls";
import { ticketDay } from "../../tickets/tickets";
import { packSheets, type PackedItem, type Shape } from "./sheetPacking";
import { knownShape, stickerShape } from "./stickerShape";
import { countVisit } from "./traySeen";
import { newSlots, type TraySlot } from "./traySlots";
import { createZipper, type Zipper } from "./zipper";
import "../../stickers/sticker-foil.css";
import "./sticker-tray.css";

/** A sticker as the sticker tray holds it: its slot, and what it's drawn from. */
export interface TraySticker extends TraySlot {
  no: number;
  /** The image's size. */
  width: number;
  height: number;
  outline?: string;
  urls: Pick<StickerUrls, "png" | "mask">;
  /** Drawn by someone else: a received gift. */
  gift: boolean;
  /** Shown in the open tray before, so it isn't NEW. */
  seen: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Size {
  w: number;
  h: number;
}

/** A sticker's center, size and turn. */
interface Box extends Point, Size {
  r: number;
}

/** What the sticker tray needs from its board, all in board pixels. */
export interface TrayBoard {
  /** Where a sticker sits on the board; null when it isn't there. */
  stickerRect: (id: string) => Box | null;
  /** How big a sticker is on the board. */
  sizeFor: (id: string) => Size;
  /** Sticks a sticker on at `at`, or at a free spot; resolves with its element once it's drawn. */
  place: (id: string, at?: { x: number; y: number; r: number }) => Promise<HTMLElement | null>;
  /** A sticker went back into its used sticker silhouette. */
  remove: (id: string) => void;
  /** Shows where a sticker is on the board. */
  pulse: (id: string) => void;
}

/**
 * A board sticker dragged over the tray: whether it's over it, and where its used sticker silhouette
 * draws it in.
 */
export interface TrayDrag {
  over: boolean;
  snap: { x: number; y: number; scale: number; r: number } | null;
}

export interface TrayEngine {
  readonly isOpen: boolean;
  open: () => Promise<boolean>;
  close: () => Promise<boolean>;
  /** Rereads the stickers, after one is sealed, placed, removed or given. */
  refresh: () => void;
  /** Each move of a board sticker being dragged; null when the tray doesn't hold it. */
  boardDrag: (id: string, at: Point) => TrayDrag | null;
  /**
   * A dragged board sticker let go: true when it went back into its used sticker silhouette, and
   * `remove` was called.
   */
  boardDrop: (id: string, at: Point) => Promise<boolean>;
  /** Closes the spread, else the tray; whether it did anything. */
  escape: () => boolean;
  shake: () => void;
  destroy: () => void;
}

type Geometry = ReturnType<Zipper["geometry"]>;
type Filter = "all" | "mine" | "gifts";
type SlotState = TraySlot["state"] | "peeling";

interface Slot extends TraySticker {
  /** Its packed spot, once every sticker's shape is known. */
  pos?: PackedItem;
}

interface Gesture {
  id: number;
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
interface Peel {
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
interface Pulled {
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

interface TrayState {
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
  drop: { id: string; wasOpen: boolean } | null;
  shutTimer: number;
  relaxTimer: number;
  spreadOpen: boolean;
  /** What's been on show in the open tray: seen once the tray zips shut. */
  shown: Set<string>;
  pulled: Pulled | null;
}

/** Each sheet behind the front one sits this much lower, so its dated foot shows. */
const PEEK = 15;
/** Sheets shown behind the front one; deeper ones become the stack's depth, a button that spreads them. */
const PEEKS = 3;
/** Each level back is this much narrower. */
const INSET = 0.025;
const SHEET = { w: 156, h: 364 };
/** Where stickers sit until every cut line is known: a zigzag from the bottom up, the newest highest. */
const STAND_IN: readonly (readonly [x: number, y: number, r: number])[] = [
  [44, 286, -2.5],
  [110, 306, 2.5],
  [44, 184, 2],
  [110, 204, -2.5],
  [44, 82, -2],
  [110, 102, 3],
];
/** The box a sticker's image is fitted into on a sheet. */
const FIT = { w: 66, h: 76 };
/** Packing keeps clear of the sheet's tear strip at the top and its dated foot. */
const PACK = { sheet: SHEET, margin: { top: 30, right: 10, bottom: 24, left: 10 } };
/** The tray runs from just under the board's header to its foot. */
const TOP = 64;
/** The tray's column: wide enough for the left row's full travel. */
const COL = 205;
/** How far the left row travels open: the tray takes about half the screen. */
const GMAX = 172;
/** The stack's top in the open tray, under its folder tabs. */
const STACK_Y = 72;
/** The first move of a press on the stack decides what it does. */
const DECIDE = 10;
/** A page turn commits past this lift or this speed, up to the back of the stack or down to the front. */
const PAGE_UP = { px: -36, speed: -0.35 };
const PAGE_DOWN = { px: 30, speed: 0.35 };
/** Dragged this far toward the board, a sheet comes free of the tray. */
const PULL_FREE = 60;
/** A sticker in hand comes free of its sheet this far from where it was pressed. */
const PEEL_FREE = 26;
/** Near its used sticker silhouette, a returning sticker is drawn in from this far. */
const SNAP = 120;
/** How the mouth sags to a crack while something is out over the board. */
const CRACK = 0.12;
const FILTERS: readonly Filter[] = ["all", "mine", "gifts"];
/** Where the spread lays each sheet down: a slight turn apiece. */
const SPREAD_TURNS = [-1.2, 0.8, -0.5, 1.1, -0.9, 0.6, 1.3, -0.7];
const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
const EASE_PEEL = "cubic-bezier(.2,.7,.2,1)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SVG_NS = "http://www.w3.org/2000/svg";
/** Phosphor's Stack and X icons, bold. */
const ICONS = {
  stack:
    "M234.36,170A12,12,0,0,1,230,186.37l-96,56a12,12,0,0,1-12.1,0l-96-56a12,12,0,0,1,12.09-20.74l90,52.48L218,165.63A12,12,0,0,1,234.36,170ZM218,117.63,128,170.11,38.05,117.63A12,12,0,0,0,26,138.37l96,56a12,12,0,0,0,12.1,0l96-56A12,12,0,0,0,218,117.63ZM20,80a12,12,0,0,1,6-10.37l96-56a12.06,12.06,0,0,1,12.1,0l96,56a12,12,0,0,1,0,20.74l-96,56a12,12,0,0,1-12.1,0l-96-56A12,12,0,0,1,20,80Zm35.82,0L128,122.11,200.18,80,128,37.89Z",
  x: "M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cssUrl = (url: string) => `url("${url}")`;
const px = (v: number) => `${v.toFixed(1)}px`;
const isShape = (s: Shape | undefined): s is Shape => s !== undefined;
const maskOf = (s: Slot) => s.urls.mask ?? s.urls.png;
const dayOf = (t: number) => ticketDay(new Date(t));
const monthDay = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
const matchesFilter = (s: Slot, f: Filter) => f === "all" || (f === "mine" ? !s.gift : s.gift);

/** Resolves when an animation ends, finished or cancelled along with its element. */
function ended(a: Animation): Promise<void> {
  return a.finished.then(
    () => undefined,
    (error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        console.error("A sticker tray animation failed", error);
    },
  );
}

/** A sheet's transform at a depth in the stack: lower, and narrower from its foot, the further back. */
const restAt = (depth: number, dy = 0, r = 0) =>
  `translateY(${(depth * PEEK + dy).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(1 - INSET * depth).toFixed(4)})`;

/** A sticker in hand's transform: a box this big, centered on `x`, `y`, scaled and turned. */
const flyerAt = (x: number, y: number, size: Size, scale: number, r: number) =>
  `translate(${(x - size.w / 2).toFixed(1)}px,${(y - size.h / 2).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

/** Where the spread lays out `n` sheets on a board this big. */
function spreadCells(n: number, W: number, H: number) {
  const margin = 18;
  const gap = 14;
  const cols = n <= 1 ? 1 : n <= 2 ? 2 : n <= 6 ? 3 : 4;
  const k = Math.min(
    n <= 2 ? 0.95 : 0.8,
    (W - margin * 2 - gap * (cols - 1)) / cols / SHEET.w,
    (H - TOP - 30) / SHEET.h,
  );
  const cw = SHEET.w * k;
  const ch = SHEET.h * k;
  const rows = Math.ceil(n / cols);
  const totalH = rows * ch + (rows - 1) * 18;
  const left0 = (W - (cols * cw + (cols - 1) * gap)) / 2;
  const top0 = Math.max(TOP - 6, (H - totalH) / 2);
  return Array.from({ length: n }, (_, d) => ({
    x: left0 + (d % cols) * (cw + gap),
    y: top0 + Math.floor(d / cols) * (ch + 18),
    k,
    rot: SPREAD_TURNS[d % SPREAD_TURNS.length],
  }));
}

function windowOf(doc: Document): Window & typeof globalThis {
  const win = doc.defaultView;
  if (!win) throw new Error("The sticker tray's board isn't in a document with a window");
  return win;
}

export function createTrayEngine(
  board: HTMLElement,
  {
    slots: read,
    api,
    markSeen,
  }: {
    slots: () => readonly TraySticker[];
    api: TrayBoard;
    /** Stickers the open tray showed that it hadn't before, once it zips shut. */
    markSeen: (ids: readonly string[]) => void;
  },
): TrayEngine {
  const doc = board.ownerDocument;
  const win = windowOf(doc);
  const reducedMotion = win.matchMedia(REDUCED_MOTION);
  const reduced = () => reducedMotion.matches;
  let destroyed = false;
  const listening = new AbortController();
  const listen = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ) => el.addEventListener(type, fn, { signal: listening.signal });
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const t = win.setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const cancel = (t: number) => {
    win.clearTimeout(t);
    timers.delete(t);
  };

  function make<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    ...kids: (Node | string)[]
  ): HTMLElementTagNameMap[K] {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    el.append(...kids);
    return el;
  }
  const decorative = <T extends Element>(el: T) => {
    el.setAttribute("aria-hidden", "true");
    return el;
  };
  function icon(d: string) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    for (const [name, value] of Object.entries({
      class: "tray__ic",
      "aria-hidden": "true",
      focusable: "false",
      viewBox: "0 0 256 256",
      fill: "currentColor",
    }))
      svg.setAttribute(name, value);
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
    return svg;
  }

  /* ---------------------------------------------------------------- the parts */
  const col = make("div", "tray__col");
  const land = decorative(make("div", "tray__land", make("i", "")));
  const fly = decorative(make("div", "tray__fly"));
  const mat = make("div", "tray__mat");
  const spreadLayer = make("div", "tray__spread", mat);
  spreadLayer.hidden = true;
  const root = make(
    "div",
    "tray",
    decorative(make("div", "tray__cover")),
    col,
    land,
    fly,
    spreadLayer,
  );
  board.append(root);

  const zip = createZipper(col, { chainAt: COL - 15, insets: [6, 6], maxGap: GMAX });
  /** The tray's fixed words, in the app's language. */
  const words = {
    sheets: i18next.t(($) => $.stickerBoard.tray.sheets),
    tabs: i18next.t(($) => $.stickerBoard.tray.tabs),
    new: i18next.t(($) => $.stickerBoard.tray.new),
    putBack: i18next.t(($) => $.stickerBoard.tray.putBack),
  };
  const stack = make("div", "tray__stack");
  stack.setAttribute("role", "group");
  stack.setAttribute("aria-label", words.sheets);
  // It holds focus when paging leaves nothing else to hold it.
  stack.tabIndex = -1;
  const tabsEl = make("div", "tray__tabs");
  tabsEl.setAttribute("role", "tablist");
  tabsEl.setAttribute("aria-label", words.tabs);
  const deepTop = make("i", "tray__deep tray__deep--top");
  const deepBot = make("i", "tray__deep tray__deep--bot");
  // The stack shows through a window clipped to the mouth: w1 and c1 cut its top, w2 and c2 its foot.
  const c2 = make("div", "tray__c2", make("i", "tray__fabric"), stack, tabsEl);
  const w2 = make("div", "tray__w2", c2, deepBot);
  const c1 = make("div", "tray__c1", w2);
  const w1 = make("div", "tray__w1", c1, deepTop);
  zip.slot.append(w1);

  const ui: TrayState = {
    filter: "all",
    order: [],
    stackAt: { x: 0, y: STACK_Y },
    band: null,
    geo: null,
    busy: false,
    g: null,
    target: null,
    dwell: 0,
    drop: null,
    shutTimer: 0,
    relaxTimer: 0,
    spreadOpen: false,
    shown: new Set(),
    pulled: null,
  };
  /** Shown in the open tray: the stickers' own marks, and this visit's. */
  const seen = new Set<string>();
  let model = modelOf(read());
  /** The stack's window is on show: the tray open, opening, or pulled to a crack. */
  let onShow = false;
  /** The stickers changed while the stack was out of sight: it's rebuilt when it next shows. */
  let stale = false;
  /** The sheet count the stack's order was dealt for. */
  let orderedFor = 0;

  function modelOf(list: readonly TraySticker[]) {
    for (const s of list) if (s.seen) seen.add(s.id);
    const slots: Slot[] = list.map((s) => ({ ...s }));
    return { slots, count: Math.max(1, ...slots.map((s) => s.sheet + 1)) };
  }
  const newIds = () => newSlots(model.slots, { today: dayOf(Date.now()), dayOf, seen });
  const matches = (s: Slot) => matchesFilter(s, ui.filter);
  const sheetItems = (f: number) => model.slots.filter((s) => s.sheet === f);
  const sheetMatches = (f: number) =>
    ui.filter === "all" || sheetItems(f).some((s) => s.state !== "given" && matches(s));
  const itemOf = (id: string) => model.slots.find((s) => s.id === id) ?? null;
  const topF = () => ui.order[0] ?? model.count - 1;

  const Wb = () => board.clientWidth || 390;
  const Hb = () => board.clientHeight || 657;
  const colLeft = () => Wb() - COL;
  const scaleK = () => {
    const r = board.getBoundingClientRect();
    return r.width / (board.offsetWidth || r.width || 1);
  };
  /** A pointer's place in board pixels: the board may be drawn scaled, mid-turn. */
  const local = (e: PointerEvent): Point => {
    const r = board.getBoundingClientRect();
    const k = scaleK();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  const targetOf = (e: Event) => (e.target instanceof Element ? e.target : null);

  /* ---------------------------------------------------------------- where each sticker sits: on its cut line */
  function packWith(shapes: readonly Shape[]) {
    const { sheets, byId } = packSheets(
      model.slots.map((s, i) => ({ id: s.id, shape: shapes[i] })),
      PACK,
    );
    for (const s of model.slots) {
      const b = byId.get(s.id);
      if (b) {
        s.sheet = b.f;
        s.pos = b;
      }
    }
    model.count = Math.max(1, sheets.length);
  }
  /** Packs at once when every cut line is known; until then, the stand-in spots stay. */
  function applyPack() {
    const shapes = model.slots.map((s) => knownShape(s));
    if (!shapes.every(isShape)) return false;
    packWith(shapes);
    return true;
  }
  async function relayout() {
    if (applyPack()) return true;
    const m = model;
    const shapes = await Promise.all(m.slots.map((s) => stickerShape(s, s.urls)));
    // A refresh during the wait lays out its own stickers.
    if (destroyed || m !== model) return false;
    packWith(shapes);
    return true;
  }
  /** The stack as the filter deals it: its sheets, newest in front. */
  function resetOrder() {
    const all = Array.from({ length: model.count }, (_, i) => model.count - 1 - i).filter(
      (f) => f !== ui.pulled?.f,
    );
    const want = all.filter(sheetMatches);
    ui.order = want.length ? want : all.slice(0, 1);
    orderedFor = model.count;
  }

  /* ---------------------------------------------------------------- drawing a sheet */
  function fitOf(s: Slot): Size {
    const ar = s.width / s.height;
    return ar >= FIT.w / FIT.h ? { w: FIT.w, h: FIT.w / ar } : { w: FIT.h * ar, h: FIT.h };
  }
  function placeOf(s: Slot): Box {
    if (s.pos) return { x: s.pos.x, y: s.pos.y, r: s.pos.r, w: s.pos.w, h: s.pos.h };
    const [x, y, r] = STAND_IN[s.slot];
    return { x, y, r, ...fitOf(s) };
  }
  function slotEl(s: Slot, isNew: boolean) {
    const q = placeOf(s);
    const el = make("button", `tray__slot${matches(s) ? "" : " is-out"}`);
    el.type = "button";
    el.dataset.id = s.id;
    el.dataset.state = s.state;
    el.style.setProperty("--x", px(q.x));
    el.style.setProperty("--y", px(q.y));
    el.style.setProperty("--r", `${q.r.toFixed(2)}deg`);
    el.style.width = px(q.w);
    el.style.height = px(q.h);
    el.style.margin = `${px(-q.h / 2)} 0 0 ${px(-q.w / 2)}`;
    const no = { no: formatNo(s.no) };
    el.setAttribute(
      "aria-label",
      s.state === "used"
        ? i18next.t(($) => $.stickerBoard.tray.slot.used, no)
        : isNew
          ? i18next.t(($) => $.stickerBoard.tray.slot.newOnSheet, no)
          : i18next.t(($) => $.stickerBoard.tray.slot.onSheet, no),
    );
    const silhouette = make("span", "tray__used-sticker-silhouette", make("i", ""));
    const fit = make(
      "span",
      "tray__fit",
      make(
        "span",
        "tray__used-sticker-silhouette-wrap",
        make("span", "tray__used-sticker-silhouette-ring"),
        silhouette,
      ),
    );
    // A used sticker silhouette shows no sticker, so it loads none.
    if (s.state !== "used") {
      // Drawn by someone else, it wears the sheet's foil under its image, as StickerFoil draws it.
      if (s.gift && s.urls.mask) {
        const foil = decorative(
          make(
            "span",
            "sticker-foil sticker-foil--sheet",
            make(
              "span",
              "sticker-foil__band",
              make("i", "sticker-foil__sheen"),
              make("i", "sticker-foil__glint"),
            ),
          ),
        );
        foil.style.setProperty("--foil-i", String(s.no));
        fit.append(foil);
      }
      const img = make("img", "tray__img");
      img.src = s.urls.png;
      img.alt = "";
      img.draggable = false;
      fit.append(img);
    }
    fit.style.width = px(q.w);
    fit.style.height = px(q.h);
    fit.style.setProperty("--m", cssUrl(maskOf(s)));
    el.append(fit);
    if (isNew) el.append(decorative(make("span", "tray__new", words.new)));
    return el;
  }
  function rangeOf(f: number) {
    const ats = sheetItems(f).map((s) => s.arrivedAt);
    if (!ats.length) return "";
    const lo = Math.min(...ats);
    const hi = Math.max(...ats);
    return sameDay(lo, hi) ? monthDay(lo) : `${monthDay(lo)}–${monthDay(hi)}`;
  }
  /** A sheet's name, as a button that brings it to the front. */
  const sheetLabel = (f: number, inFront = false) => {
    const sheet = { number: f + 1, dates: rangeOf(f) };
    return inFront
      ? i18next.t(($) => $.stickerBoard.tray.sheetInFront, sheet)
      : i18next.t(($) => $.stickerBoard.tray.sheet, sheet);
  };
  /** A loose sheet: a tear strip to grip at its top, stickers on their cut lines, its dates on its foot. */
  function sheetEl(f: number, cls: string, depth: number, news: ReadonlySet<string> = newIds()) {
    const paper = make("div", "tray__paper", decorative(make("i", "tray__tear")));
    for (const s of sheetItems(f)) if (s.state !== "given") paper.append(slotEl(s, news.has(s.id)));
    paper.append(
      make(
        "div",
        "tray__foot",
        make("span", "fine", rangeOf(f)),
        make("span", "fine", String(f + 1).padStart(2, "0")),
      ),
      make("i", "tray__shade"),
    );
    const el = make("div", `tray__sheet ${cls}`, paper);
    el.dataset.f = String(f);
    el.dataset.depth = String(depth);
    el.style.transform = restAt(depth);
    return el;
  }
  /** The stack: the front sheet whole, the next ones a strip apart below it, the rest as a button. */
  function renderStack() {
    stale = false;
    const active = doc.activeElement;
    const focused = active instanceof HTMLElement && stack.contains(active) ? active : null;
    const focusedId = focused?.closest<HTMLElement>(".tray__slot")?.dataset.id;
    if (!ui.order.length) resetOrder();
    // The only sheet is out over the board.
    if (!ui.order.length) {
      stack.replaceChildren();
      if (focused) keepFocus(focusedId);
      return;
    }
    const order = ui.order;
    const k = Math.min(PEEKS, order.length - 1);
    const hidden = order.length - 1 - k;
    const news = newIds();
    const kids: HTMLElement[] = [];
    for (let i = k; i >= 1; i--)
      kids.push(sheetEl(order[i], i === 1 ? "is-next" : "is-peek", i, news));
    kids.push(sheetEl(order[0], "is-top", 0, news));
    if (hidden > 0) {
      const more = make("button", "tray__depth", icon(ICONS.stack), make("span", "", `+${hidden}`));
      more.type = "button";
      more.style.transform = `translateY(${SHEET.h + k * PEEK + 3}px)`;
      const spread = i18next.t(($) => $.stickerBoard.tray.moreSheets, { count: hidden });
      more.setAttribute("aria-label", spread);
      kids.push(more);
    }
    stack.replaceChildren(...kids);
    if (focused) keepFocus(focusedId);
    for (const foot of stack.querySelectorAll<HTMLElement>(
      ".tray__sheet:not(.is-top) .tray__foot",
    )) {
      const f = sheetOf(foot);
      foot.setAttribute("role", "button");
      foot.tabIndex = 0;
      if (f !== null) foot.setAttribute("aria-label", sheetLabel(f));
    }
    markShown();
  }
  const holdsFocus = (el: Element | undefined) => el?.contains(doc.activeElement) === true;
  /** Redrawn under a keyboard, the stack keeps focus: on the same sticker if it's still in front. */
  function keepFocus(id: string | undefined) {
    const front = stack.querySelector(".tray__sheet.is-top");
    const same = id
      ? front?.querySelector<HTMLElement>(`.tray__slot[data-id="${CSS.escape(id)}"]`)
      : null;
    (same ?? front?.querySelector<HTMLElement>(".tray__slot") ?? stack).focus({
      preventScroll: true,
    });
  }
  /** Rebuilds the stack for the stickers as they are now; while it's out of sight, when it next shows. */
  function redraw() {
    if (!onShow) {
      stale = true;
      return;
    }
    if (model.count !== orderedFor || ui.order.some((f) => f >= model.count)) resetOrder();
    rerenderPulled();
    if (!ui.g && !ui.busy) renderStack();
  }
  function sheetOf(el: Element | null) {
    const sheet = el?.closest<HTMLElement>(".tray__sheet");
    return sheet ? Number(sheet.dataset.f) : null;
  }
  function markShown() {
    if (!zip.isOpen) return;
    for (const f of [topF(), ui.pulled?.f])
      if (f !== undefined) for (const s of sheetItems(f)) ui.shown.add(s.id);
  }
  function rerenderPulled() {
    const p = ui.pulled;
    p?.el.querySelector(".tray__sheet")?.replaceWith(sheetEl(p.f, "is-top is-pulled", 0));
  }

  /* ---------------------------------------------------------------- the folder tabs: the stack's dividers */
  const tabs = FILTERS.map((f) => {
    const name = i18next.t(($) => $.stickerBoard.tray.filters[f]);
    const t = make("button", "tray__tab", make("span", "", name));
    t.type = "button";
    t.setAttribute("role", "tab");
    t.dataset.filter = f;
    t.setAttribute("aria-selected", String(ui.filter === f));
    return t;
  });
  tabsEl.append(...tabs);
  // Until the tray holds a gift, Mine is All and Gifts is empty.
  const syncTabsShown = () => {
    tabsEl.hidden = !model.slots.some((s) => s.gift);
  };
  listen(tabsEl, "click", (e) => {
    const f = targetOf(e)?.closest<HTMLElement>(".tray__tab")?.dataset.filter;
    const filter = FILTERS.find((id) => id === f);
    if (filter) void setFilter(filter);
  });

  /* ---------------------------------------------------------------- the mouth: the stack's window, every frame */
  function onFrame(g: Geometry) {
    ui.geo = g;
    const G = g.G;
    const k = lerp(0.6, 0.97, g.spread);
    const open = clamp(G / (0.97 * GMAX), 0, 1);
    let aLo = -1;
    let aHi = -1;
    if (G > 3)
      for (let a = 0; a <= g.sM; a += 3)
        if (g.gap(a) >= k * G) {
          if (aLo < 0) aLo = a;
          aHi = a;
        }
    const show = aLo >= 0 && aHi - aLo > 4;
    w1.classList.toggle("is-shut", !show);
    const showing = show && !onShow;
    onShow = show;
    if (showing && stale) redraw();
    if (show) {
      const xw = g.chainX - k * G + 3;
      const yTop = Math.min(g.yOf(aHi), g.yOf(aLo));
      const yBot = Math.max(g.yOf(aHi), g.yOf(aLo));
      w1.style.transform = `translate(${xw.toFixed(2)}px,${yTop.toFixed(2)}px)`;
      c1.style.transform = `translate(0px,${(-yTop).toFixed(2)}px)`;
      w2.style.transform = `translate(0px,${(yBot - g.H).toFixed(2)}px)`;
      c2.style.transform = `translate(0px,${(g.H - yBot).toFixed(2)}px)`;
      // The stack slides out from under the left lip as the mouth opens, and settles a little lower.
      const bx = lerp(-58, 3, Math.pow(open, 0.85));
      const by = lerp(-40, STACK_Y, Math.pow(open, 0.8));
      const deep = ((1 - 0.72 * g.spread) * clamp((yBot - yTop) / 150, 0.35, 1)).toFixed(3);
      deepTop.style.opacity = deep;
      deepBot.style.opacity = deep;
      stack.style.transform =
        tabsEl.style.transform = `translate(${bx.toFixed(2)}px,${by.toFixed(2)}px)`;
      ui.stackAt = { x: xw + bx, y: by };
      ui.band = { top: yTop, bot: yBot };
    }
    const out = ui.spreadOpen
      ? 0
      : clamp((g.spread - 0.55) / 0.45, 0, 1) * clamp((g.relax - 0.85) / 0.15, 0, 1);
    for (const t of tabs) t.tabIndex = out > 0.5 ? 0 : -1;
  }
  zip.on("frame", onFrame);
  // The Zipper drew itself before this listened.
  onFrame(zip.geometry());
  zip.on("commit", ({ open }) => {
    cancelTugs();
    if (open) {
      markShown();
      if (reduced()) stack.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
      return;
    }
    // Shutting on a focused sticker or sheet hands focus back to what opens the tray.
    if (holdsFocus(stack) || holdsFocus(spreadLayer) || holdsFocus(ui.pulled?.el))
      zip.slider.focus({ preventScroll: true });
    if (ui.pulled) void sendHome({ quick: true });
  });
  zip.on("closed", () => {
    // What was on show in the open tray is no longer new.
    const fresh = [...ui.shown].filter((id) => !seen.has(id));
    ui.shown.clear();
    if (fresh.length === 0) return;
    for (const id of fresh) seen.add(id);
    markSeen(fresh);
    renderStack();
    updateBadge();
  });
  // A hand on the pull decides for itself.
  zip.on("grab", () => {
    cancelTugs();
    cancel(ui.shutTimer);
  });
  const hasNew = () => newIds().size > 0;
  const updateBadge = () => zip.badge(hasNew());

  /* ---------------------------------------------------------------- paging: a deck, front to back and round again */
  const topSheet = () => stack.querySelector<HTMLElement>(".tray__sheet.is-top");
  const sheetEls = () => [...stack.querySelectorAll<HTMLElement>(".tray__sheet")];
  const depthOf = (el: HTMLElement) => Number(el.dataset.depth);
  const settle = (el: HTMLElement, ms = 200) =>
    ended(
      el.animate([{ transform: el.style.transform }, { transform: restAt(depthOf(el)) }], {
        duration: ms,
        easing: EASE_OUT,
      }),
    );
  // As the CSS shades each level back; a sheet changing level eases between them.
  const shadeOf = (d: number) => clamp(d * 0.3, 0, 0.9);
  const shade = (
    el: HTMLElement,
    d0: number,
    d1: number,
    ms: number,
    fill: FillMode = "forwards",
  ) =>
    el
      .querySelector(":scope > .tray__paper > .tray__shade")
      ?.animate([{ opacity: shadeOf(d0) }, { opacity: shadeOf(d1) }], {
        duration: ms,
        easing: EASE_OUT,
        fill,
      });
  /** One step: +1 sends the front sheet to the back, -1 brings the back one to the front. */
  async function page(dir: 1 | -1, { fromY = 0, quick = false } = {}) {
    const n = ui.order.length;
    const front = topSheet();
    if (n < 2) {
      if (front && fromY) await settle(front);
      return;
    }
    const k = Math.min(PEEKS, n - 1);
    const T = quick ? 0.6 : 1;
    const turned = () =>
      dir > 0 ? [...ui.order.slice(1), ui.order[0]] : [ui.order[n - 1], ...ui.order.slice(0, -1)];
    if (reduced() || !front) {
      ui.order = turned();
      renderStack();
      if (reduced()) stack.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 150 });
      return;
    }
    ui.busy = true;
    if (dir > 0) {
      // The front sheet slides up out of the stack and tucks in at the back; the rest step forward.
      for (const el of sheetEls()) {
        if (el === front) continue;
        const d = depthOf(el);
        el.animate([{ transform: restAt(d) }, { transform: restAt(d - 1) }], {
          duration: 240 * T,
          easing: EASE_OUT,
          fill: "forwards",
        });
        shade(el, d, d - 1, 240 * T);
      }
      await ended(
        front.animate([{ transform: restAt(0, fromY) }, { transform: restAt(0, -118, -2.2) }], {
          duration: 150 * T,
          easing: EASE_OUT,
          fill: "forwards",
        }),
      );
      front.style.zIndex = "-1";
      shade(front, 0, k, 200 * T);
      await ended(
        front.animate([{ transform: restAt(0, -118, -2.2) }, { transform: restAt(k) }], {
          duration: 200 * T,
          easing: "cubic-bezier(.45,0,.55,1)",
          fill: "forwards",
        }),
      );
      ui.order = turned();
      renderStack();
    } else {
      // The back sheet comes up from behind the stack and settles in front; the rest step back.
      ui.order = turned();
      renderStack();
      const t = topSheet();
      for (const el of sheetEls()) {
        if (el === t) continue;
        const d = depthOf(el);
        el.animate([{ transform: restAt(d - 1) }, { transform: restAt(d) }], {
          duration: 260 * T,
          easing: EASE_OUT,
        });
        shade(el, d - 1, d, 260 * T, "none");
      }
      if (t) {
        shade(t, k, 0, 370 * T, "none");
        t.style.zIndex = "-1";
        await ended(
          t.animate([{ transform: restAt(k) }, { transform: restAt(0, -118, 2.2) }], {
            duration: 170 * T,
            easing: EASE_OUT,
            fill: "forwards",
          }),
        );
        t.style.zIndex = "";
        await ended(
          t.animate([{ transform: restAt(0, -118, 2.2) }, { transform: restAt(0) }], {
            duration: 200 * T,
            easing: EASE_OUT,
          }),
        );
        for (const a of t.getAnimations()) a.cancel();
      }
    }
    ui.busy = false;
  }
  /** Brings a sheet to the front: a quick riffle through the ones before it. */
  async function bringToFront(f: number, { instant = false } = {}) {
    if (!ui.order.includes(f)) {
      ui.filter = "all";
      syncTabs();
      resetOrder();
      if (!ui.order.includes(f)) return;
    }
    const i = ui.order.indexOf(f);
    if (!i) return;
    if (instant || !zip.isOpen || reduced()) {
      ui.order = [...ui.order.slice(i), ...ui.order.slice(0, i)];
      renderStack();
      return;
    }
    if (i <= ui.order.length / 2) for (let s = 0; s < i; s++) await page(1, { quick: true });
    else for (let s = 0; s < ui.order.length - i; s++) await page(-1, { quick: true });
  }

  /* ---------------------------------------------------------------- gestures on the stack. The first move decides:
   * up or down pages, from anywhere; toward the board on a sticker peels it, on the paper pulls the sheet out. */
  listen(stack, "pointerdown", (e) => {
    if (e.button > 0 || ui.busy || ui.g || !zip.isOpen) return;
    const target = targetOf(e);
    if (target?.closest(".tray__depth")) return;
    const sheet = target?.closest<HTMLElement>(".tray__sheet");
    const p0 = local(e);
    ui.g = {
      id: e.pointerId,
      p0,
      mode: "maybe",
      slotEl: target?.closest<HTMLElement>(".tray__sheet.is-top .tray__slot") ?? null,
      depth: sheet ? depthOf(sheet) : 0,
      last: p0,
      lt: win.performance.now(),
      vx: 0,
      vy: 0,
      dy: 0,
      peel: null,
      at: null,
    };
    try {
      stack.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events have no active pointer to capture; the gesture still works.
    }
    e.preventDefault();
  });
  listen(stack, "pointermove", (e) => {
    const g = ui.g;
    if (!g || g.id !== e.pointerId) return;
    const pt = local(e);
    const t = win.performance.now();
    const dt = Math.max(1, t - g.lt);
    g.vx = lerp(g.vx, (pt.x - g.last.x) / dt, 0.4);
    g.vy = lerp(g.vy, (pt.y - g.last.y) / dt, 0.4);
    g.last = pt;
    g.lt = t;
    const dx = pt.x - g.p0.x;
    const dy = pt.y - g.p0.y;
    if (g.mode === "maybe") {
      if (Math.hypot(dx, dy) < DECIDE) return;
      if (Math.abs(dy) >= Math.abs(dx)) g.mode = "page";
      else if (dx < 0) g.mode = g.slotEl?.dataset.state === "here" ? "peel" : "pull";
      else g.mode = "none";
      if (g.mode === "peel") startPeel(g);
      else if (g.mode === "pull") startPull(g);
    }
    if (g.mode === "page") {
      const el = topSheet();
      if (el) {
        g.dy = dy < 0 ? dy * 0.9 : dy * 0.45;
        el.style.transform = restAt(0, g.dy, clamp(g.dy / -60, -1, 1) * -1.6);
      }
    } else if (g.mode === "peel") movePeel(g, pt);
    else if (g.mode === "pull") movePull(g, pt);
  });
  const stackUp = (e: PointerEvent) => {
    const g = ui.g;
    if (!g || g.id !== e.pointerId) return;
    ui.g = null;
    if (g.mode === "maybe") {
      if (g.depth > 0) {
        const f = ui.order[g.depth];
        if (f !== undefined) void bringToFront(f);
        return;
      }
      tapSlot(g.slotEl);
      return;
    }
    if (g.mode === "page") {
      if (g.dy < PAGE_UP.px || g.vy < PAGE_UP.speed) void page(1, { fromY: g.dy });
      else if (g.dy > PAGE_DOWN.px || g.vy > PAGE_DOWN.speed) {
        const el = topSheet();
        if (el) el.style.transform = restAt(0);
        void page(-1);
      } else {
        const el = topSheet();
        if (el) void settle(el);
      }
    } else if (g.mode === "peel") void dropPeel(g, local(e));
    else if (g.mode === "pull") void releasePull(g, local(e));
  };
  listen(stack, "pointerup", stackUp);
  listen(stack, "pointercancel", stackUp);
  listen(stack, "click", (e) => {
    if (targetOf(e)?.closest(".tray__depth")) openSpread({ focus: e.detail === 0 });
  });
  listen(stack, "keydown", (e) => {
    if (e.key === "PageDown") {
      e.preventDefault();
      void page(1);
      return;
    }
    if (e.key === "PageUp") {
      e.preventDefault();
      void page(-1);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const target = targetOf(e);
    const foot = target?.closest(".tray__foot");
    const f = sheetOf(foot ?? null);
    if (foot && f !== null) {
      e.preventDefault();
      void bringToFront(f);
      return;
    }
    const slot = target?.closest<HTMLElement>(".tray__slot");
    if (slot) {
      e.preventDefault();
      tapSlot(slot);
    }
  });
  /**
   * A tap on a sticker sticks it on the board; a tap on a used sticker silhouette shows its sticker
   * there.
   */
  function tapSlot(el: HTMLElement | null) {
    const id = el?.dataset.id;
    if (id === undefined) return;
    if (el?.dataset.state === "here") void quickAdd(id);
    else if (el?.dataset.state === "used") showOnBoard(id);
  }

  /* ---------------------------------------------------------------- a folder tab: the filter chooses sheets and never moves a sticker.
   * The stack dips into the mouth and squares up; the front sheet, then each without a match, slides down
   * behind the fabric; the rest riffle; and the newest match is dealt onto the front. */
  function syncTabs() {
    for (const t of tabs) t.setAttribute("aria-selected", String(t.dataset.filter === ui.filter));
  }
  const fadeSlots = (els: readonly HTMLElement[], f: Filter) => {
    for (const el of els)
      for (const sl of el.querySelectorAll<HTMLElement>(".tray__slot")) {
        const s = sl.dataset.id === undefined ? null : itemOf(sl.dataset.id);
        if (s) sl.classList.toggle("is-out", !matchesFilter(s, f));
      }
  };
  let shuffling: object | null = null;
  async function setFilter(f: Filter) {
    const prev = ui.filter;
    ui.filter = f;
    syncTabs();
    resetOrder();
    // A tab change already on its way: this one lands at once.
    const again = shuffling !== null;
    if (!zip.isOpen || reduced() || again || ui.busy) {
      if (again) {
        shuffling = null;
        ui.busy = false;
      }
      renderStack();
      if (reduced() && zip.isOpen)
        stack.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160 });
      return;
    }
    const token = {};
    shuffling = token;
    ui.busy = true;
    const before = sheetEls().reverse();
    const shown = new Set(ui.order.slice(0, Math.min(PEEKS, ui.order.length - 1) + 1));
    // The front, and every sheet without a match.
    const drop = before.filter((el, i) => i === 0 || !shown.has(Number(el.dataset.f)));
    const pile = (d: number, dy = 0, r = 0) => restAt(d * 0.15, 30 + dy, r);
    // Far enough that a sheet's top is behind the fabric.
    const DROP = Math.max(320, (ui.band ? ui.band.bot - ui.stackAt.y : 470) + 12);
    stack
      .querySelector(".tray__depth")
      ?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: "forwards" });
    // Gather: the whole stack dips into the mouth and squares up.
    await Promise.all(
      before.map((el) =>
        ended(
          el.animate([{ transform: el.style.transform }, { transform: pile(depthOf(el)) }], {
            duration: 100,
            easing: EASE_OUT,
            fill: "forwards",
          }),
        ),
      ),
    );
    if (shuffling !== token) return;
    // Put back: the front, then each sheet without a match, slides down behind the fabric.
    await Promise.all(
      drop.map((el, i) =>
        ended(
          el.animate(
            [
              { transform: pile(depthOf(el)) },
              { transform: pile(depthOf(el), DROP - 30, (i % 2 ? 1 : -1) * 2.5) },
            ],
            { duration: 180, delay: i * 60, easing: "cubic-bezier(.55,0,.8,.3)", fill: "forwards" },
          ),
        ),
      ),
    );
    if (shuffling !== token) return;
    // Riffle and deal: what's left flicks its edges, and the newest match rises onto the front.
    const inPile = new Map(
      before.filter((el) => !drop.includes(el)).map((el) => [Number(el.dataset.f), depthOf(el)]),
    );
    renderStack();
    const els = sheetEls();
    const front = topSheet();
    const D = 330;
    const o = (ms: number) => ms / D;
    const anims: Animation[] = [];
    els.forEach((el, i) => {
      if (el === front) return;
      const d = depthOf(el);
      const d0 = inPile.get(Number(el.dataset.f));
      const s = i % 2 ? -1 : 1;
      const k: Keyframe[] =
        d0 === undefined
          ? [
              { transform: pile(d, DROP - 30), offset: 0, easing: EASE_OUT },
              { transform: pile(d), offset: o(130) },
            ]
          : [
              { transform: pile(d0), offset: 0 },
              { transform: pile(d0, -2, 1.8 * s), offset: o(35) },
              { transform: pile(d0, 1, -1.4 * s), offset: o(70) },
              { transform: pile(d0, -1, 0.9 * s), offset: o(100) },
              { transform: pile(d0), offset: o(130) },
            ];
      const last = k[k.length - 1].transform;
      anims.push(
        el.animate(
          [
            ...k,
            { transform: last, offset: o(190), easing: EASE_OUT },
            { transform: restAt(d), offset: 1 },
          ],
          { duration: D, fill: "backwards" },
        ),
      );
    });
    if (front) {
      const d0 = inPile.get(Number(front.dataset.f));
      const from = d0 === undefined ? pile(0, DROP - 30) : pile(d0);
      anims.push(
        front.animate(
          [
            { transform: from, offset: 0 },
            { transform: from, offset: o(90), easing: "cubic-bezier(.2,.75,.35,1)" },
            { transform: restAt(0, -7), offset: o(255), easing: "cubic-bezier(.45,0,.55,1)" },
            { transform: restAt(0, 1.5), offset: o(300), easing: "ease-out" },
            { transform: restAt(0), offset: 1 },
          ],
          { duration: D, fill: "backwards" },
        ),
      );
    }
    // On the sheets that stayed, stickers that stop or start matching fade rather than jump.
    const kept = els.filter((el) => inPile.has(Number(el.dataset.f)));
    fadeSlots(kept, prev);
    void stack.offsetWidth;
    fadeSlots(kept, f);
    const more = stack.querySelector(".tray__depth");
    if (more)
      anims.push(
        more.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], {
          duration: D,
        }),
      );
    await Promise.all(anims.map(ended));
    if (shuffling === token) {
      shuffling = null;
      ui.busy = false;
    }
  }

  /* ---------------------------------------------------------------- one sheet pulled out over the board: peel from it, move it, send it home.
   * While it's out it isn't in the tray: the sheet behind it steps up, and paging works on what's left. */
  function startPull(g: Gesture) {
    const f = topF();
    const el = topSheet();
    if (!el) {
      g.mode = "none";
      return;
    }
    const r = el.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    const k = scaleK();
    const x0 = (r.left - b.left) / k;
    const y0 = (r.top - b.top) / k;
    // One sheet out at a time: the first goes back on top of the stack.
    if (ui.pulled) void sendHome({ instant: true });
    const x = make("button", "tray__x", icon(ICONS.x));
    x.type = "button";
    x.setAttribute("aria-label", words.putBack);
    const wrap = make("div", "tray__pulled", sheetEl(f, "is-top is-pulled", 0), x);
    wrap.style.transform = `translate(${px(x0)},${px(y0)})`;
    fly.append(wrap);
    const pulled: Pulled = {
      f,
      el: wrap,
      x: x0,
      y: y0,
      g0: { x: x0, y: y0 },
      out: false,
      listening: new AbortController(),
    };
    ui.pulled = pulled;
    ui.order = ui.order.filter((o) => o !== f);
    renderStack();
    cancelTugs();
    bindPulled(pulled);
  }
  /** A sheet came free: the mouth sags to a crack, out of its way. */
  const stepAside = () => zip.relax(CRACK);
  function movePull(g: Gesture, pt: Point) {
    const p = ui.pulled;
    if (!p) return;
    const dx = pt.x - g.p0.x;
    const dy = pt.y - g.p0.y;
    const k = clamp(-dx / 90, 0, 1);
    p.x = p.g0.x + dx;
    p.y = p.g0.y + dy * (p.out ? 1 : 0.35);
    if (!p.out && -dx > PULL_FREE) {
      p.out = true;
      stepAside();
    }
    p.el.style.transform = `translate(${px(p.x)},${px(p.y)}) rotate(${(p.out ? -1.5 : -2.5 * k).toFixed(2)}deg) scale(${(1 + 0.02 * (p.out ? 1 : k)).toFixed(3)})`;
  }
  const pulledAt = (x: number, y: number, scale = 1.02) =>
    `translate(${px(x)},${px(y)}) rotate(-1.5deg) scale(${scale})`;
  async function releasePull(g: Gesture, pt: Point) {
    const p = ui.pulled;
    if (!p) return;
    if (!p.out && pt.x - g.p0.x > -PULL_FREE && g.vx > -0.5) {
      void sendHome({ quick: true });
      return;
    }
    p.out = true;
    stepAside();
    // It settles over the board, wholly on screen, hovering.
    const x = clamp(p.x, 8, Wb() - SHEET.w - 40);
    const y = clamp(p.y, TOP - 6, Hb() - SHEET.h - 10);
    await ended(
      p.el.animate([{ transform: p.el.style.transform }, { transform: pulledAt(x, y) }], {
        duration: 240,
        easing: EASE_OUT,
        fill: "forwards",
      }),
    );
    for (const a of p.el.getAnimations()) a.cancel();
    p.x = x;
    p.y = y;
    p.el.style.transform = pulledAt(x, y);
    p.el.classList.add("is-out");
  }
  /** The pulled-out sheet's own gestures: its X, moving it by the paper, and peeling from it. */
  function bindPulled(p: Pulled) {
    const wrap = p.el;
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
    ) => wrap.addEventListener(type, fn, { signal: p.listening.signal });
    /** A press on this sheet, and the sticker it started on. */
    let g: Gesture | null = null;
    let slot: HTMLElement | null = null;
    on("click", (e) => {
      if (targetOf(e)?.closest(".tray__x")) void sendHome();
    });
    on("pointerdown", (e) => {
      const target = targetOf(e);
      if (e.button > 0 || g || !p.el.classList.contains("is-out") || target?.closest(".tray__x"))
        return;
      const p0 = local(e);
      slot = target?.closest<HTMLElement>(".tray__slot") ?? null;
      g = {
        id: e.pointerId,
        p0,
        mode: "maybe",
        slotEl: slot,
        depth: 0,
        last: p0,
        lt: win.performance.now(),
        vx: 0,
        vy: 0,
        dy: 0,
        peel: null,
        at: null,
      };
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointer events have no active pointer to capture; the gesture still works.
      }
      e.preventDefault();
    });
    on("pointermove", (e) => {
      if (!g || e.pointerId !== g.id) return;
      const pt = local(e);
      const dx = pt.x - g.p0.x;
      const dy = pt.y - g.p0.y;
      if (g.mode === "maybe") {
        if (Math.hypot(dx, dy) < DECIDE) return;
        g.mode = slot?.dataset.state === "here" ? "peel" : "move";
        if (g.mode === "peel") {
          ui.g = g;
          startPeel(g);
        } else g.at = { x: p.x, y: p.y };
      }
      if (g.mode === "peel") movePeel(g, pt);
      else if (g.mode === "move" && g.at) {
        p.x = g.at.x + dx;
        p.y = g.at.y + dy;
        wrap.style.transform = pulledAt(p.x, p.y, 1.03);
      }
    });
    const up = (e: PointerEvent) => {
      const done = g;
      if (!done || e.pointerId !== done.id) return;
      g = null;
      ui.g = null;
      if (done.mode === "maybe") tapSlot(slot);
      else if (done.mode === "peel") void dropPeel(done, local(e));
      else if (done.mode === "move") settlePulled(p);
    };
    on("pointerup", up);
    on("pointercancel", up);
  }
  /** Let go after moving it: back over the tray it goes home, else it settles where it's wholly in reach. */
  function settlePulled(p: Pulled) {
    if (p.x + SHEET.w * 0.5 > Wb() - 60) {
      void sendHome();
      return;
    }
    p.x = clamp(p.x, 8 - SHEET.w * 0.4, Wb() - SHEET.w * 0.6);
    p.y = clamp(p.y, TOP - 20, Hb() - SHEET.h * 0.5);
    const to = pulledAt(p.x, p.y);
    void ended(
      p.el.animate([{ transform: p.el.style.transform }, { transform: to }], {
        duration: 180,
        easing: EASE_OUT,
        fill: "forwards",
      }),
    ).then(() => {
      for (const a of p.el.getAnimations()) a.cancel();
      p.el.style.transform = to;
    });
  }
  /** Home: the sheet slides back into the mouth, in front of the stack, and the tray opens up again. */
  async function sendHome({ quick = false, instant = false } = {}) {
    const p = ui.pulled;
    if (!p) return;
    ui.pulled = null;
    p.listening.abort();
    const focused = holdsFocus(p.el);
    ui.order = [p.f, ...ui.order.filter((o) => o !== p.f)];
    zip.relax(1);
    const home = { x: colLeft() + ui.stackAt.x, y: TOP + ui.stackAt.y };
    if (!reduced() && !instant)
      await ended(
        p.el.animate(
          [
            { transform: p.el.style.transform },
            { transform: `translate(${px(home.x)},${px(home.y)})` },
          ],
          { duration: quick ? 180 : 320, easing: EASE_PEEL, fill: "forwards" },
        ),
      );
    p.el.remove();
    renderStack();
    if (focused && zip.isOpen) keepFocus(undefined);
  }

  /* ---------------------------------------------------------------- peeling: a sticker from its sheet onto the board */
  /** A slot's sticker, in board pixels: its center, its fitted size, and its turn. */
  function rectOfFit(el: HTMLElement): Box {
    const fit = el.querySelector<HTMLElement>(".tray__fit") ?? el;
    const r = fit.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    const k = scaleK();
    return {
      x: (r.left + r.width / 2 - b.left) / k,
      y: (r.top + r.height / 2 - b.top) / k,
      w: parseFloat(fit.style.width),
      h: parseFloat(fit.style.height),
      r: parseFloat(el.style.getPropertyValue("--r")) || 0,
    };
  }
  function makeFlyer(s: Slot, size: Size) {
    const img = make("img", "");
    img.src = s.urls.png;
    img.alt = "";
    img.draggable = false;
    const curl = make("div", "tray__curl", img);
    curl.style.setProperty("--m", cssUrl(maskOf(s)));
    const el = make("div", "tray__flyer", curl);
    el.style.width = px(size.w);
    el.style.height = px(size.h);
    fly.append(el);
    return { el, curl };
  }
  function setSlotState(id: string, state: SlotState) {
    const sel = `.tray__slot[data-id="${CSS.escape(id)}"]`;
    const el =
      ui.pulled?.el.querySelector<HTMLElement>(sel) ?? stack.querySelector<HTMLElement>(sel);
    if (el) el.dataset.state = state;
    return el;
  }
  function startPeel(g: Gesture) {
    const id = g.slotEl?.dataset.id;
    const s = id === undefined ? null : itemOf(id);
    if (!s || !g.slotEl) {
      g.mode = "none";
      return;
    }
    const r = rectOfFit(g.slotEl);
    const size = api.sizeFor(s.id);
    const { el, curl } = makeFlyer(s, size);
    el.classList.add("is-flat");
    const pk: Peel = {
      s,
      r,
      size,
      el,
      curl,
      phase: "curl",
      x: r.x,
      y: r.y,
      vx: 0,
      scale: r.w / size.w,
      rot: r.r,
      raf: 0,
      target: null,
      startX: r.x,
    };
    g.mode = "peel";
    g.peel = pk;
    setSlotState(s.id, "peeling");
    cancelTugs();
    placeFlyer(pk, g.p0);
  }
  function placeFlyer(pk: Peel, pt: Point) {
    const d = { x: pt.x - pk.r.x, y: pt.y - pk.r.y };
    if (pk.phase === "curl") {
      // Held by one edge: the far edge stays stuck and the sticker tilts up toward your thumb.
      const dist = Math.hypot(d.x, d.y);
      const k = clamp(dist / PEEL_FREE, 0, 1);
      const ux = dist ? d.x / dist : 1;
      const uy = dist ? d.y / dist : 0;
      const ang = reduced() ? 0 : k * 38;
      pk.curl.style.transformOrigin = `${(50 - ux * 50).toFixed(1)}% ${(50 - uy * 50).toFixed(1)}%`;
      pk.curl.style.transform = `rotate3d(${(-uy).toFixed(3)},${ux.toFixed(3)},0,${ang.toFixed(1)}deg)`;
      pk.el.style.transform = flyerAt(
        pk.r.x + d.x * 0.18,
        pk.r.y + d.y * 0.18,
        pk.size,
        pk.scale * (1 + 0.05 * k),
        pk.r.r,
      );
      if (dist >= PEEL_FREE) freePeel(pk);
      return;
    }
    pk.target = pt;
  }
  function freePeel(pk: Peel) {
    pk.phase = "free";
    pk.el.classList.remove("is-flat");
    pk.curl.style.transformOrigin = "0 0";
    // The world's peel: lifted and tilted.
    pk.curl.style.transform = reduced() ? "" : "rotate3d(1,-1,0,11deg)";
    pk.x = pk.r.x;
    pk.y = pk.r.y;
    // The tray gets out of the way: its mouth sags to a crack, still unzipped.
    zip.relax(CRACK);
    pk.startX = pk.r.x;
    // Made once for the peel, so no frame makes a closure.
    const follow = () => {
      if (pk.target) {
        const was = pk.x;
        pk.x = lerp(pk.x, pk.target.x, 0.34);
        pk.y = lerp(pk.y, pk.target.y, 0.34);
        pk.vx = lerp(pk.vx, pk.x - was, 0.3);
        const out = clamp((pk.startX - pk.x) / 80, 0, 1);
        const ez = 1 - Math.pow(1 - out, 2);
        pk.scale = lerp(pk.r.w / pk.size.w, 1.04, ez);
        pk.rot = lerp(pk.r.r, clamp(pk.vx * 1.4, -12, 12), ez * 0.9);
        pk.el.style.transform = flyerAt(pk.x, pk.y, pk.size, pk.scale, pk.rot);
        showLanding(overBoard(pk.target) ? pk : null);
      }
      pk.raf = win.requestAnimationFrame(loop);
    };
    const loop = () => timeOurWork("sticker tray", follow);
    pk.raf = win.requestAnimationFrame(loop);
  }
  function movePeel(g: Gesture, pt: Point) {
    if (g.peel) placeFlyer(g.peel, pt);
  }
  const overBoard = (pt: Point) => pt.x < Wb() - 46 && pt.y > 8;
  const landMark = land.firstElementChild;
  function showLanding(pk: Peel | null) {
    if (!pk?.target) {
      land.style.opacity = "0";
      return;
    }
    land.style.width = px(pk.size.w);
    land.style.height = px(pk.size.h);
    if (landMark instanceof HTMLElement) landMark.style.setProperty("--m", cssUrl(maskOf(pk.s)));
    land.style.transform = `translate(${px(pk.target.x - pk.size.w / 2 + 3)},${px(pk.target.y - pk.size.h / 2 + 6)}) rotate(${pk.rot.toFixed(2)}deg)`;
    land.style.opacity = "1";
  }
  async function dropPeel(g: Gesture, pt: Point) {
    const pk = g.peel;
    if (!pk) return;
    win.cancelAnimationFrame(pk.raf);
    showLanding(null);
    if (pk.phase === "curl") {
      // Not free yet: it lays back down.
      await ended(
        pk.el.animate(
          [
            { transform: pk.el.style.transform },
            { transform: flyerAt(pk.r.x, pk.r.y, pk.size, pk.scale, pk.r.r) },
          ],
          { duration: 160, easing: EASE_OUT },
        ),
      );
      pk.el.remove();
      setSlotState(pk.s.id, "here");
      return;
    }
    if (overBoard(pt)) {
      const rot = Math.round(clamp(pk.rot, -8, 8) * 10) / 10;
      ui.shown.add(pk.s.id);
      if (!ui.pulled) holdOpen(420);
      // In hand until the board has drawn it where it lands.
      api.place(pk.s.id, { x: pk.x, y: pk.y, r: rot }).then(
        () => pk.el.remove(),
        (error: unknown) => {
          reportPlace(pk.s, error);
          pk.el.remove();
          pressIn(pk.s.id);
        },
      );
      return;
    }
    // Back into its used sticker silhouette as the mouth opens again, or onto the pulled-out sheet
    // it came from.
    if (!ui.pulled) zip.relax(1);
    const silhouetteEl = setSlotState(pk.s.id, "peeling");
    const to = silhouetteEl && ui.pulled ? rectOfFit(silhouetteEl) : slotHome(pk.s);
    await ended(
      pk.el.animate(
        [
          { transform: pk.el.style.transform },
          { transform: flyerAt(to.x, to.y, pk.size, to.w / pk.size.w, to.r) },
        ],
        { duration: 300, easing: EASE_PEEL, fill: "forwards" },
      ),
    );
    pk.el.remove();
    pressIn(pk.s.id);
  }
  /** Its placing failed, so it stays in the tray. */
  const reportPlace = (s: Slot, error: unknown) =>
    console.error(`Sticking ${formatNo(s.no)} on the board failed; it's back in its sheet`, error);
  const holdOpen = (ms: number) => later(() => zip.relax(1), ms);
  /** Where a slot's sticker sits with the tray wide open, in board pixels. */
  function slotHome(s: Slot): Box {
    const q = placeOf(s);
    const xw = (ui.geo ? ui.geo.chainX : COL - 15) - 0.97 * GMAX + 3;
    return { x: colLeft() + xw + 3 + q.x, y: TOP + STACK_Y + q.y, w: q.w, h: q.h, r: q.r };
  }
  function pressIn(id: string) {
    const el = setSlotState(id, "here");
    if (el && !reduced())
      el.querySelector(".tray__fit")?.animate(
        [
          { transform: "translate(-50%,-50%) scale(1.07)" },
          { transform: "translate(-50%,-50%) scale(.98)", offset: 0.6 },
          { transform: "translate(-50%,-50%) scale(1)" },
        ],
        { duration: 260, easing: EASE_OUT },
      );
  }
  /** A tap on a sticker: it peels off and sticks itself onto a free spot. */
  async function quickAdd(id: string) {
    const sel = `.tray__slot[data-id="${CSS.escape(id)}"]`;
    const s = itemOf(id);
    const el =
      ui.pulled?.el.querySelector<HTMLElement>(sel) ?? stack.querySelector<HTMLElement>(sel);
    if (!s || !el) return;
    const r = rectOfFit(el);
    const size = api.sizeFor(id);
    setSlotState(id, "peeling");
    const { el: flyer } = makeFlyer(s, size);
    flyer.style.transform = flyerAt(r.x, r.y, size, r.w / size.w, r.r);
    if (!ui.pulled) zip.relax(CRACK);
    ui.shown.add(id);
    let onBoard: HTMLElement | null;
    try {
      onBoard = await api.place(id);
    } catch (error) {
      reportPlace(s, error);
      flyer.remove();
      pressIn(id);
      if (!ui.pulled) holdOpen(160);
      return;
    }
    if (destroyed) return;
    const to = api.stickerRect(id) ?? { x: Wb() * 0.4, y: Hb() * 0.5, r: 0 };
    if (onBoard) onBoard.style.opacity = "0";
    if (!reduced())
      await ended(
        flyer.animate(
          [
            { transform: flyerAt(r.x, r.y, size, r.w / size.w, r.r) },
            {
              transform: flyerAt(
                lerp(r.x, to.x, 0.45),
                Math.min(r.y, to.y) - 40,
                size,
                1.1,
                to.r - 6,
              ),
              offset: 0.55,
            },
            { transform: flyerAt(to.x, to.y, size, 1.04, to.r) },
          ],
          { duration: 460, easing: EASE_PEEL, fill: "forwards" },
        ),
      );
    flyer.remove();
    if (onBoard) {
      onBoard.style.opacity = "";
      if (!reduced())
        onBoard.animate(
          [
            { transform: `${onBoard.style.transform} scale(1.06)` },
            { transform: onBoard.style.transform },
          ],
          { duration: 220, easing: EASE_PEEL },
        );
    }
    if (!ui.pulled) holdOpen(160);
  }
  /**
   * A used sticker silhouette: its sticker is out on the board; show it there, from behind the tray
   * if need be.
   */
  function showOnBoard(id: string) {
    const r = api.stickerRect(id);
    const hidden =
      !ui.pulled && r && ui.geo && r.x + r.w * 0.2 > colLeft() + ui.geo.chainX - ui.geo.G - 15;
    if (hidden) {
      zip.relax(CRACK);
      cancel(ui.relaxTimer);
      ui.relaxTimer = later(() => zip.relax(1), 1100);
    }
    later(() => api.pulse(id), hidden ? 220 : 0);
  }

  /* ---------------------------------------------------------------- putting a board sticker back */
  function clearTarget() {
    for (const el of root.querySelectorAll(".tray__slot.is-target"))
      el.classList.remove("is-target");
    ui.target = null;
  }
  /**
   * Whether the pulled-out sheet holds this sticker's used sticker silhouette, and whether a point is
   * over that sheet.
   */
  function pulledFor(s: Slot, pt: Point) {
    const p = ui.pulled;
    if (!p || p.f !== s.sheet || !p.el.classList.contains("is-out")) return null;
    const sheet = p.el.querySelector(".tray__sheet");
    if (!sheet) return null;
    const r = sheet.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    const k = scaleK();
    const x0 = (r.left - b.left) / k;
    const y0 = (r.top - b.top) / k;
    const x1 = x0 + r.width / k;
    const y1 = y0 + r.height / k;
    return { over: pt.x > x0 - 10 && pt.x < x1 + 10 && pt.y > y0 - 10 && pt.y < y1 + 10 };
  }
  function boardDrag(id: string, pt: Point): TrayDrag | null {
    const s = itemOf(id);
    if (!s || destroyed) return null;
    // The tray remembers whether it was open when this drag began: that decides how it ends.
    if (ui.drop?.id !== id) {
      cancel(ui.shutTimer);
      ui.drop = { id, wasOpen: zip.isOpen };
    }
    const nearEdge = pt.x > Wb() - 74 && pt.y > TOP - 20;
    if (!zip.isOpen) {
      if (nearEdge && !ui.dwell)
        ui.dwell = later(() => {
          ui.dwell = 0;
          void bringToFront(s.sheet, { instant: true });
          void zip.open();
        }, 180);
      if (!nearEdge && ui.dwell) {
        cancel(ui.dwell);
        ui.dwell = 0;
      }
      return { over: nearEdge, snap: null };
    }
    if (topF() !== s.sheet && !ui.busy && !ui.pulled) void bringToFront(s.sheet);
    if (ui.target !== id) {
      clearTarget();
      ui.target = id;
    }
    return snapFor(s, pt);
  }
  /** Near its used sticker silhouette in the open tray, a sticker is drawn in like a magnet. */
  function snapFor(s: Slot, pt: Point): TrayDrag {
    const onPulled = pulledFor(s, pt);
    const host = onPulled && ui.pulled ? ui.pulled.el : stack;
    const el = host.querySelector<HTMLElement>(`.tray__slot[data-id="${CSS.escape(s.id)}"]`);
    if (el && !el.classList.contains("is-target")) el.classList.add("is-target");
    if (!el || !ui.geo) return { over: false, snap: null };
    const silhouette = rectOfFit(el);
    const size = api.sizeFor(s.id);
    const lip = colLeft() + ui.geo.chainX - ui.geo.G;
    const dist = Math.hypot(pt.x - silhouette.x, pt.y - silhouette.y);
    const over = onPulled ? onPulled.over : pt.x > lip - 12;
    if (dist < SNAP && over) {
      const k = Math.pow(1 - dist / SNAP, 1.6) * 0.92;
      const from = api.stickerRect(s.id)?.r ?? 0;
      return {
        over,
        snap: {
          x: lerp(pt.x, silhouette.x, k),
          y: lerp(pt.y, silhouette.y, k),
          scale: lerp(1, silhouette.w / size.w, Math.min(1, k * 1.25)),
          r: lerp(from, silhouette.r, k),
        },
      };
    }
    return { over, snap: null };
  }
  /** Board stickers on their way into their used sticker silhouettes. */
  const landing = new Set<string>();
  /**
   * A board sticker let go: over the tray it goes back into its used sticker silhouette. Whether the
   * tray was open when the drag, or Remove, began decides the ending: it stays open if it was, else it
   * zips shut once the sticker has visibly landed.
   */
  async function boardDrop(id: string, pt: Point) {
    // On its way into its used sticker silhouette already: it isn't the board's to drop again until
    // it lands.
    if (landing.has(id)) return false;
    const s = itemOf(id);
    if (ui.dwell) {
      cancel(ui.dwell);
      ui.dwell = 0;
    }
    // Remove calls this without a drag.
    const wasOpen = ui.drop?.id === id ? ui.drop.wasOpen : zip.isOpen;
    ui.drop = null;
    if (!s || destroyed) return false;
    const lip = ui.geo ? colLeft() + ui.geo.chainX - ui.geo.G : Wb() - 30;
    const onPulled = pulledFor(s, pt)?.over === true;
    const into = onPulled || (zip.isOpen ? pt.x > lip - 12 : pt.x > Wb() - 74);
    if (!into) {
      clearTarget();
      // It opened for this sticker, which went elsewhere.
      if (!wasOpen && zip.isOpen) void zip.close();
      return false;
    }
    landing.add(id);
    try {
      return await takeHome(s, pt, wasOpen, onPulled);
    } finally {
      landing.delete(id);
    }
  }
  /**
   * Into its used sticker silhouette: the tray opens on its sheet if need be, the board lets go of it,
   * and it flies in.
   */
  async function takeHome(s: Slot, pt: Point, wasOpen: boolean, onPulled: boolean) {
    const id = s.id;
    if (ui.pulled && !onPulled) await sendHome({ quick: true });
    if (!zip.isOpen) {
      void bringToFront(s.sheet, { instant: true });
      await zip.open();
    }
    if (!ui.pulled && topF() !== s.sheet) await bringToFront(s.sheet);
    if (destroyed) return false;
    const from = api.stickerRect(id);
    const size = api.sizeFor(id);
    const snap = snapFor(s, pt).snap;
    api.remove(id);
    // The board rereads its stickers on its own time; the used sticker silhouette fills now.
    s.state = "here";
    if (ui.pulled) rerenderPulled();
    else renderStack();
    const el = setSlotState(id, "peeling");
    clearTarget();
    const silhouette = el ? rectOfFit(el) : slotHome(s);
    const start = snap ?? { x: pt.x, y: pt.y, scale: 1, r: from?.r ?? 0 };
    const { el: flyer } = makeFlyer(s, size);
    flyer.style.transform = flyerAt(start.x, start.y, size, start.scale, start.r);
    if (!reduced())
      await ended(
        flyer.animate(
          [
            { transform: flyer.style.transform },
            {
              transform: flyerAt(
                silhouette.x,
                silhouette.y,
                size,
                silhouette.w / size.w,
                silhouette.r,
              ),
            },
          ],
          { duration: 230, easing: EASE_OUT, fill: "forwards" },
        ),
      );
    flyer.remove();
    pressIn(id);
    // Shown home, then shut: unless a hand is back on the tray or another sticker is on its way.
    if (!wasOpen) {
      cancel(ui.shutTimer);
      ui.shutTimer = later(
        () => {
          if (!ui.g && !ui.drop && !ui.spreadOpen && zip.isOpen) void zip.close();
        },
        reduced() ? 500 : 900,
      );
    }
    return true;
  }

  /* ---------------------------------------------------------------- the spread: the stack's depth button lays every sheet out */
  const stackOnBoard = () => ({ x: colLeft() + ui.stackAt.x, y: TOP + ui.stackAt.y });
  const stackOnBoardOpen = () => ({
    x: colLeft() + (ui.geo ? ui.geo.chainX : COL - 15) - 0.97 * GMAX + 3 + 3,
    y: TOP + STACK_Y,
  });
  function openSpread({ focus = false } = {}) {
    // Every sheet spreads out, the pulled-out one too, in front.
    if (ui.pulled) void sendHome({ instant: true });
    ui.spreadOpen = true;
    spreadLayer.hidden = false;
    spreadLayer.classList.add("is-on");
    const list = ui.order.length ? ui.order : [topF()];
    const cells = spreadCells(list.length, Wb(), Hb());
    for (const c of spreadLayer.querySelectorAll(".tray__cell")) c.remove();
    const from = stackOnBoard();
    const news = newIds();
    const els = list.map((f, d) => {
      const cell = cells[d];
      const c = make(
        "button",
        `tray__cell${d === 0 ? " is-here" : ""}`,
        sheetEl(f, "is-top", 0, news),
      );
      c.type = "button";
      c.dataset.f = String(f);
      c.setAttribute("aria-label", sheetLabel(f, d === 0));
      c.style.transform = `translate(${px(cell.x)},${px(cell.y)}) rotate(${cell.rot}deg) scale(${cell.k.toFixed(4)})`;
      // The CSS keeps a spread sheet's dates at the fine-print floor at this scale.
      c.style.setProperty("--k", cell.k.toFixed(4));
      spreadLayer.append(c);
      return c;
    });
    if (reduced()) spreadLayer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    else {
      mat.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 300,
        easing: EASE_OUT,
        fill: "forwards",
      });
      // Dealt out of the stack, the front sheet first.
      els.forEach((c, d) =>
        c.animate(
          [
            { transform: `translate(${px(from.x)},${px(from.y)})` },
            { transform: c.style.transform },
          ],
          {
            duration: 440,
            delay: d * 42,
            easing: EASE_OUT,
            fill: "backwards",
          },
        ),
      );
    }
    mat.style.opacity = "1";
    zip.relax(0.55);
    if (focus) els[0]?.focus({ preventScroll: true });
  }
  /** Back into the tray, with sheet `f`, the one tapped, in front. */
  async function closeSpread(f = topF()) {
    if (!ui.spreadOpen) return;
    const focused = holdsFocus(spreadLayer);
    const cells = [...spreadLayer.querySelectorAll<HTMLElement>(".tray__cell")];
    const pick = cells.find((c) => Number(c.dataset.f) === f);
    zip.relax(1);
    const home = stackOnBoardOpen();
    if (!reduced()) {
      mat.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 320,
        easing: "linear",
        fill: "forwards",
      });
      for (const c of cells)
        if (c !== pick)
          c.animate(
            [
              { transform: c.style.transform, opacity: 1 },
              { transform: `translate(${px(home.x)},${px(home.y)}) scale(.92)`, opacity: 0 },
            ],
            { duration: 300, easing: EASE_PEEL, fill: "forwards" },
          );
      if (pick)
        await ended(
          pick.animate(
            [
              { transform: pick.style.transform },
              {
                transform: `translate(${px(home.x)},${px(home.y)}) rotate(-2deg) scale(1.03)`,
                offset: 0.78,
              },
              { transform: `translate(${px(home.x)},${px(home.y)})` },
            ],
            { duration: 440, easing: EASE_PEEL, fill: "forwards" },
          ),
        );
    }
    const i = ui.order.indexOf(f);
    if (i > 0) ui.order = [...ui.order.slice(i), ...ui.order.slice(0, i)];
    renderStack();
    spreadLayer.classList.remove("is-on");
    spreadLayer.hidden = true;
    for (const a of mat.getAnimations()) a.cancel();
    mat.style.opacity = "0";
    ui.spreadOpen = false;
    for (const c of cells) c.remove();
    if (focused && zip.isOpen) keepFocus(undefined);
  }
  // A sheet tapped comes to the front; the lining puts them all back as they were.
  listen(spreadLayer, "click", (e) => {
    const cell = targetOf(e)?.closest<HTMLElement>(".tray__cell");
    void closeSpread(cell ? Number(cell.dataset.f) : topF());
  });
  function escape() {
    if (ui.spreadOpen) {
      void closeSpread();
      return true;
    }
    if (zip.isOpen) {
      void zip.close();
      return true;
    }
    return false;
  }
  listen(root, "keydown", (e) => {
    if (e.key !== "Escape" || !escape()) return;
    e.preventDefault();
    e.stopPropagation();
  });

  /* ---------------------------------------------------------------- the idle tug: on the first few visits, or while something is NEW; twice a visit at most */
  let tugs = 0;
  let tugTimer = 0;
  const visits = countVisit();
  function scheduleTug(ms: number) {
    cancel(tugTimer);
    if (reduced() || tugs >= 2) return;
    tugTimer = later(() => {
      if (!(visits <= 3 || hasNew())) return;
      if (zip.isOpen || ui.g || doc.hidden) {
        scheduleTug(4000);
        return;
      }
      if (zip.hint()) tugs++;
      if (tugs < 2) scheduleTug(7000);
    }, ms);
  }
  function cancelTugs() {
    tugs = 2;
    cancel(tugTimer);
  }

  /* ---------------------------------------------------------------- the stickers change under it */
  function refresh() {
    if (destroyed) return;
    model = modelOf(read());
    syncTabsShown();
    const apply = () => {
      updateBadge();
      redraw();
    };
    if (applyPack()) apply();
    else
      relayout().then(
        (ok) => {
          if (ok) apply();
        },
        (error: unknown) => console.error("Laying out the sticker sheets failed", error),
      );
  }

  /* ---------------------------------------------------------------- start: the stand-in spots at once, packed as soon as every cut line is known */
  syncTabsShown();
  updateBadge();
  // Packed at once when every cut line is known; else on stand-in spots until they are.
  const packed = applyPack();
  resetOrder();
  renderStack();
  if (!packed)
    relayout().then(
      (ok) => {
        if (!ok) return;
        resetOrder();
        redraw();
      },
      (error: unknown) => console.error("Laying out the sticker sheets failed", error),
    );
  scheduleTug(2400);

  return {
    get isOpen() {
      return zip.isOpen;
    },
    open: () => zip.open(),
    close: () => zip.close(),
    refresh,
    boardDrag,
    boardDrop,
    escape,
    shake: () => zip.shake(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const t of timers) win.clearTimeout(t);
      timers.clear();
      const peel = ui.g?.peel;
      if (peel) win.cancelAnimationFrame(peel.raf);
      ui.pulled?.listening.abort();
      listening.abort();
      zip.destroy();
      root.remove();
    },
  };
}
