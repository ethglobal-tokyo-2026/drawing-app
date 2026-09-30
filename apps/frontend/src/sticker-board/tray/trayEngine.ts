/**
 * The sticker tray: zipped down the Sticker Board's right edge, opened by its Zipper.
 * Inside, a stack of loose sticker sheets holds every sticker you've had, in arrival order, each in
 * its packed spot: a used sticker silhouette where one is out on the board, a blank where one was
 * given, which opens it among the stickers you gave. You page the stack, pull a sheet out over the board, spread every sheet out, peel stickers
 * onto the board and put them back. Everything is in board pixels, in the board's stacking context.
 */
import { i18next } from "../../i18n/i18n";
import { whenBoardQuiet } from "../boardComplete";
import { EASE_OUT, EASE_PEEL, clamp, lerp } from "../../ui/easing";
import { edgeAt } from "./edgeBands";
import { inertBesides } from "./inertBesides";
import type { TrayProblem } from "./trayProblem";
import { countVisit, visitsSoFar } from "./traySeen";
import { createTrayPaging } from "./trayPaging";
import { createTrayPeel, flyerAt } from "./trayPeel";
import { createTraySheets } from "./traySheets";
import {
  COL,
  CRACK,
  GMAX,
  ICONS,
  PEEK,
  PEEKS,
  SHEET,
  STACK_Y,
  TOP,
  createTrayModel,
  ended,
  local,
  modelOf,
  px,
  targetOf,
  type BoardView,
  type Geometry,
  type Gesture,
  type Point,
  type Pulled,
  type Slot,
  type Tray,
  type TrayBoard,
  type TrayDrag,
  type TraySticker,
  type TrayState,
} from "./trayModel";
import { createZipper, mouthRange, showsFrom } from "./zipper";
import "../../stickers/sticker-foil.css";
import "./sticker-tray.css";

// The tray's callers take its types and icons from here.
export type { TrayBoard, TrayDrag, TraySticker } from "./trayModel";
export { ICONS } from "./trayModel";

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
  destroy: () => void;
}

/** Under the front sheet: the edges behind it, and the +N button with its gap. */
const STACK_FOOT = PEEKS * PEEK + 3 + 22;
/** However short the tray, the stack is shrunk to no less than this. */
const MIN_SHRINK = 0.6;
/** A pulled-out sheet turns and scales about this point, as the CSS sets it. */
const PULLED_ORIGIN = { x: SHEET.w / 2, y: SHEET.h * 0.4 };
/** The stack's foot (dates, NEW, +N) is hidden below this share of the mouth's open width, whole above the other. */
const FOOT_FADE = { hidden: 0.35, whole: 0.7 };
/** The pull tugs itself on this many visits to the tray. */
const TUG_VISITS = 3;
/** The first move of a press on the stack decides what it does. */
const DECIDE = 10;
/** A page turn commits past this lift or this speed, up to the back of the stack or down to the front. */
const PAGE_UP = { px: -36, speed: -0.35 };
const PAGE_DOWN = { px: 30, speed: 0.35 };
/** Dragged this far toward the board, a sheet comes free of the tray. */
const PULL_FREE = 60;
/** Near its used sticker silhouette, a returning sticker is drawn in from this far. */
const SNAP = 120;
/** Where the spread lays each sheet down: a slight turn apiece. */
const SPREAD_TURNS = [-1.2, 0.8, -0.5, 1.1, -0.9, 0.6, 1.3, -0.7];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SVG_NS = "http://www.w3.org/2000/svg";

/** Trays made so far, which keeps each one's ids its own. */
let trays = 0;

/** Where the spread lays out `n` sheets on a board this big. */
function spreadCells(n: number, W: number, H: number) {
  const margin = 18;
  const gap = 14;
  const cols = n <= 1 ? 1 : n <= 2 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const k = Math.min(
    n <= 2 ? 0.95 : 0.8,
    (W - margin * 2 - gap * (cols - 1)) / cols / SHEET.w,
    (H - TOP - 30 - (rows - 1) * 18) / (rows * SHEET.h),
  );
  const cw = SHEET.w * k;
  const ch = SHEET.h * k;
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
    problem,
  }: {
    slots: () => readonly TraySticker[];
    api: TrayBoard;
    /** Stickers the open tray showed that it hadn't before, once it zips shut. */
    markSeen: (ids: readonly string[]) => void;
    /** Something the tray couldn't do, for the board to say. */
    problem: (problem: TrayProblem) => void;
  },
): TrayEngine {
  const doc = board.ownerDocument;
  const win = windowOf(doc);
  const reducedMotion = win.matchMedia(REDUCED_MOTION);
  const reduced = () => reducedMotion.matches;
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
    slotHint: i18next.t(($) => $.stickerBoard.tray.slotHint),
    spread: i18next.t(($) => $.stickerBoard.tray.spread),
    empty: i18next.t(($) => $.stickerBoard.tray.empty),
  };
  // The spread covers the board, which goes inert behind it. It isn't aria-modal: the tab bar, which
  // it doesn't cover, stays reachable by every means.
  spreadLayer.setAttribute("role", "dialog");
  spreadLayer.setAttribute("aria-label", words.spread);
  /** What the sheet in front's stickers do, said once for the sheet instead of on every sticker. */
  const hint = make("p", "visually-hidden", words.slotHint);
  hint.id = `tray-hint-${++trays}`;
  /** What the tray tells screen readers as it changes: one polite status line. */
  const status = make("p", "visually-hidden");
  status.setAttribute("role", "status");
  root.append(hint, status);
  const say = (text: string) => {
    status.textContent = text;
  };
  const stack = make("div", "tray__stack");
  stack.setAttribute("role", "group");
  stack.setAttribute("aria-label", words.sheets);
  // It holds focus when paging leaves nothing else to hold it.
  stack.tabIndex = -1;
  const tabsEl = make("div", "tray__tabs");
  tabsEl.setAttribute("role", "group");
  tabsEl.setAttribute("aria-label", words.tabs);
  const deepTop = make("i", "tray__deep tray__deep--top");
  const deepBot = make("i", "tray__deep tray__deep--bot");
  // The stack shows through a window clipped to the mouth: w1 and c1 cut its top, w2 and c2 its foot.
  // The tabs come first, so Tab and screen readers meet them before the sheets they filter.
  const c2 = make("div", "tray__c2", make("i", "tray__fabric"), tabsEl, stack);
  const w2 = make("div", "tray__w2", c2, deepBot);
  const c1 = make("div", "tray__c1", w2);
  const w1 = make("div", "tray__w1", c1, deepTop);
  zip.slot.append(w1);

  /** A pulled-out sheet at `x`, `y` (its top left) and this scale: growing from the stack's size. */
  const pulledFrom = (x: number, y: number, scale: number, turn = 0) =>
    `translate(${px(x - PULLED_ORIGIN.x * (1 - scale))},${px(y - PULLED_ORIGIN.y * (1 - scale))}) rotate(${turn.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

  /** Shown in the open tray: the stickers' own marks, and this visit's. */
  const seen = new Set<string>();
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
    model: modelOf(read(), seen),
    shrink: 1,
    onShow: false,
    stale: false,
    orderedFor: 0,
    imagesOn: false,
    destroyed: false,
  };
  const trayModel = createTrayModel(ui, seen, problem);
  const { newIds, itemOf, topF, applyPack, relayout, resetOrder } = trayModel;

  const Wb = () => board.clientWidth || 390;
  const Hb = () => board.clientHeight || 657;
  const colLeft = () => Wb() - COL;
  const boardView = (): BoardView => {
    const r = board.getBoundingClientRect();
    return { left: r.left, top: r.top, k: r.width / (board.offsetWidth || r.width || 1) };
  };
  const tray: Tray = {
    board,
    api,
    problem,
    doc,
    win,
    reduced,
    listen,
    later,
    cancel,
    make,
    decorative,
    icon,
    zip,
    words,
    root,
    land,
    fly,
    mat,
    spreadLayer,
    stack,
    tabsEl,
    hint,
    say,
    ui,
    Wb,
    Hb,
    colLeft,
    boardView,
  };
  const traySheets = createTraySheets(tray, trayModel);
  const {
    restAt,
    shrunkInset,
    sheetEl,
    sheetLabel,
    renderStack,
    holdsFocus,
    keepFocus,
    redraw,
    catchUp,
    sheetOf,
    markShown,
    rerenderPulled,
    loadImages,
    sayFront,
    sayReturned,
  } = traySheets;

  const trayPaging = createTrayPaging(tray, trayModel, traySheets);
  const { tabs, syncTabsShown, topSheet, sheetEls, depthOf, settle, page, bringToFront } =
    trayPaging;

  /* ---------------------------------------------------------------- the mouth: the stack's window, every frame */
  let shut = false;
  /** A shut mouth's stack isn't drawn, and nothing in it takes focus or is read out. */
  function setShut(now: boolean) {
    if (now === shut) return;
    shut = now;
    w1.classList.toggle("is-shut", now);
    w1.toggleAttribute("inert", now);
  }
  let footShown = "1.00";
  let shrunkFor = 0;
  /**
   * Shrinks the stack until its sheets, the edges behind them and the +N button all fit the open mouth:
   * on a short board the mouth's window ends above where the stack would.
   */
  function shrinkStack(height: number) {
    if (!height || height === shrunkFor) return;
    shrunkFor = height;
    const room = zip.openWindow();
    const next = room ? clamp((room.bot - 2 - STACK_Y - STACK_FOOT) / SHEET.h, MIN_SHRINK, 1) : 1;
    if (Math.abs(next - ui.shrink) < 0.001) return;
    ui.shrink = next;
    stack.style.setProperty("--shrink", ui.shrink.toFixed(4));
    if (ui.model && ui.order.length) renderStack();
  }
  function onFrame(g: Geometry) {
    ui.geo = g;
    const G = g.G;
    const k = showsFrom(g.spread);
    const open = clamp(G / (0.97 * GMAX), 0, 1);
    shrinkStack(g.H);
    const range = G > 3 ? mouthRange(g, G, k) : null;
    const show = range !== null;
    // A mouth sagged to a crack rings through shut for a few frames: the stack stays as it was, so it
    // doesn't blink and the sticker that was focused keeps its focus. A pull dragged up shuts it.
    const holding = !show && ui.onShow && zip.isOpen && g.mode !== "drag";
    if (!holding) {
      setShut(!show);
      const showing = show && !ui.onShow;
      ui.onShow = show;
      if (showing) {
        loadImages();
        if (ui.stale) redraw();
      }
    }
    if (range) {
      const xw = g.chainX - k * G + 3;
      const yTop = Math.min(g.yOf(range.to), g.yOf(range.from));
      const yBot = Math.max(g.yOf(range.to), g.yOf(range.from));
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
      // A mouth sagged to a crack shows a sliver of the stack: its foot fades so no cut-off dates, NEW
      // or +N show in it.
      const foot = clamp(
        (open - FOOT_FADE.hidden) / (FOOT_FADE.whole - FOOT_FADE.hidden),
        0,
        1,
      ).toFixed(2);
      if (foot !== footShown) {
        footShown = foot;
        stack.style.setProperty("--foot", foot);
      }
      tabsEl.style.transform = `translate(${bx.toFixed(2)}px,${by.toFixed(2)}px)`;
      stack.style.transform = `translate(${(bx + shrunkInset()).toFixed(2)}px,${by.toFixed(2)}px) scale(${ui.shrink.toFixed(4)})`;
      ui.stackAt = { x: xw + bx + shrunkInset(), y: by };
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
      if (!visitCounted) {
        visitCounted = true;
        countVisit();
      }
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

  /* ---------------------------------------------------------------- gestures on the stack. The first move decides:
   * up or down pages, from anywhere; toward the board on a sticker peels it, on the paper pulls the sheet out. */
  /** A press begins on `on`, the stack or `pulled`'s sheet, which holds its pointer until it ends. */
  function pressOn(
    on: HTMLElement,
    e: PointerEvent,
    pulled: Pulled | null,
    slotEl: HTMLElement | null,
    depth: number,
  ) {
    const view = boardView();
    const p0 = local(e, view);
    ui.g = {
      id: e.pointerId,
      view,
      pulled,
      p0,
      mode: "maybe",
      slotEl,
      depth,
      last: p0,
      lt: win.performance.now(),
      vx: 0,
      vy: 0,
      dy: 0,
      peel: null,
      at: null,
    };
    try {
      on.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events have no active pointer to capture; the gesture still works.
    }
    e.preventDefault();
  }
  /** The press this pointer holds on `pulled`'s sheet, or on the stack when null. */
  const pressOf = (e: PointerEvent, pulled: Pulled | null) => {
    const g = ui.g;
    return g && g.id === e.pointerId && g.pulled === pulled ? g : null;
  };
  /** Let go: the press ends as its first move decided, and the sheets catch up once it's played out. */
  const upOn = (pulled: Pulled | null) => (e: PointerEvent) => {
    const g = pressOf(e, pulled);
    if (!g) return;
    ui.g = null;
    freePress(g.slotEl);
    void letGo(g, local(e, g.view)).then(catchUp);
  };
  /** Its pointer cancelled, or the capture it took lost: the press is called off. */
  const cancelOn = (on: HTMLElement, pulled: Pulled | null) => (e: PointerEvent) => {
    const g = pressOf(e, pulled);
    // Capture handed to `on` from the part touched isn't lost; only its own is.
    if (!g || (e.type === "lostpointercapture" && e.target !== on)) return;
    void callOff(g).then(catchUp);
  };
  async function letGo(g: Gesture, pt: Point) {
    if (g.mode === "maybe") {
      if (g.depth === 0) tapSlot(g.slotEl);
      else {
        const f = ui.order[g.depth];
        if (f !== undefined) await bringToFront(f);
      }
    } else if (g.mode === "page") {
      if (g.dy < PAGE_UP.px || g.vy < PAGE_UP.speed) await page(1, { fromY: g.dy });
      else if (g.dy > PAGE_DOWN.px || g.vy > PAGE_DOWN.speed) {
        const el = topSheet();
        if (el) el.style.transform = restAt(0);
        await page(-1);
      } else {
        const el = topSheet();
        if (el) await settle(el);
      }
    } else if (g.mode === "peel") await dropPeel(g, pt);
    else if (g.mode === "pull") await releasePull(g, pt);
    else if (g.mode === "move" && g.pulled) settlePulled(g.pulled);
  }
  /**
   * Ends a press that wasn't let go, when its pointer is cancelled or its pulled-out sheet goes home:
   * nothing is tapped, paged or stuck on, and a sticker in hand goes back to its slot.
   */
  async function callOff(g: Gesture) {
    if (ui.g === g) ui.g = null;
    freePress(g.slotEl);
    const pk = g.peel;
    if (g.mode === "peel" && pk) {
      // Its sheet is on its way home: the sticker lies straight back down on it and goes too.
      if (g.pulled && g.pulled !== ui.pulled) lieDown(pk, g.pulled);
      else await putBack(pk);
    } else if (g.mode === "page") {
      const el = topSheet();
      if (el) await settle(el);
    } else if (g.mode === "pull") await sendHome({ quick: true });
    else if (g.mode === "move" && g.pulled && g.pulled === ui.pulled) settlePulled(g.pulled);
  }
  /** The dated edge, as its depth in the stack, that a press at this screen height is for. */
  function edgeUnder(clientY: number) {
    const feet = sheetEls().map((el) => el.querySelector<HTMLElement>(".tray__foot"));
    const [front, ...edges] = feet.map((foot) => foot?.getBoundingClientRect());
    if (!front || edges.some((r) => !r)) return null;
    const behind = edges.flatMap((r) => (r ? [r] : []));
    const i = edgeAt(clientY, front, behind);
    return i === null ? null : i + 1;
  }
  listen(stack, "pointerdown", (e) => {
    if (e.button > 0 || ui.busy || ui.g || !zip.isOpen) return;
    const target = targetOf(e);
    if (target?.closest(".tray__depth")) return;
    const sheet = target?.closest<HTMLElement>(".tray__sheet");
    const slot = target?.closest<HTMLElement>(".tray__sheet.is-top .tray__slot") ?? null;
    const edge = slot ? null : edgeUnder(e.clientY);
    pressOn(stack, e, null, slot, edge ?? (sheet ? depthOf(sheet) : 0));
  });
  listen(stack, "pointermove", (e) => {
    const g = pressOf(e, null);
    if (!g) return;
    const pt = local(e, g.view);
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
      holdPress(g.slotEl);
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
  listen(stack, "pointerup", upOn(null));
  const cancelOnStack = cancelOn(stack, null);
  listen(stack, "pointercancel", cancelOnStack);
  listen(stack, "lostpointercapture", cancelOnStack);
  listen(stack, "click", (e) => {
    if (targetOf(e)?.closest(".tray__depth")) openSpread({ focus: e.detail === 0 });
    else openGivenAt(e);
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
    // A given sticker's spot opens on its click, which the press sends as it pops.
    const slot = target?.closest<HTMLElement>(".tray__slot");
    if (slot && slot.dataset.state !== "given") {
      e.preventDefault();
      tapSlot(slot);
    }
  });
  /** A click on a given sticker's blank spot opens it among the stickers you gave. */
  function openGivenAt(e: Event) {
    const id = targetOf(e)?.closest<HTMLElement>('.tray__slot[data-state="given"]')?.dataset.id;
    if (id !== undefined) api.openGiven(id);
  }
  /**
   * A press on a given sticker's spot that turned into a drag isn't a tap: its shared press lets go
   * without the click that opens it, and presses again after.
   */
  function holdPress(el: HTMLElement | null) {
    if (el?.dataset.state === "given") el.dataset.press = "off";
  }
  function freePress(el: HTMLElement | null) {
    if (el?.dataset.press === "off") el.dataset.press = "";
  }
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
    const { left, top, k } = g.view;
    const x0 = (r.left - left) / k;
    const y0 = (r.top - top) / k;
    // One sheet out at a time: the first goes back on top of the stack.
    if (ui.pulled) void sendHome({ instant: true });
    const x = make("button", "tray__x", icon(ICONS.x));
    x.type = "button";
    x.setAttribute("aria-label", words.putBack);
    const wrap = make("div", "tray__pulled", sheetEl(f, "is-top is-pulled", 0), x);
    wrap.style.transform = pulledFrom(x0, y0, ui.shrink);
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
    // Full size by the time it comes free.
    const grown = p.out ? 1 : lerp(ui.shrink, 1, clamp(-dx / PULL_FREE, 0, 1));
    const bump = 0.02 * (p.out ? 1 : k);
    p.el.style.transform = pulledFrom(p.x, p.y, grown + bump, p.out ? -1.5 : -2.5 * k);
  }
  const pulledAt = (x: number, y: number, scale = 1.02) => pulledFrom(x, y, scale, -1.5);
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
    on("click", (e) => {
      if (targetOf(e)?.closest(".tray__x")) void sendHome();
      else openGivenAt(e);
    });
    on("pointerdown", (e) => {
      const target = targetOf(e);
      // The tray takes one press at a time: a second finger is ignored.
      if (e.button > 0 || ui.g || !wrap.classList.contains("is-out") || target?.closest(".tray__x"))
        return;
      pressOn(wrap, e, p, target?.closest<HTMLElement>(".tray__slot") ?? null, 0);
    });
    on("pointermove", (e) => {
      const g = pressOf(e, p);
      if (!g) return;
      const pt = local(e, g.view);
      const dx = pt.x - g.p0.x;
      const dy = pt.y - g.p0.y;
      if (g.mode === "maybe") {
        if (Math.hypot(dx, dy) < DECIDE) return;
        g.mode = g.slotEl?.dataset.state === "here" ? "peel" : "move";
        holdPress(g.slotEl);
        if (g.mode === "peel") startPeel(g);
        else g.at = { x: p.x, y: p.y };
      }
      if (g.mode === "peel") movePeel(g, pt);
      else if (g.mode === "move" && g.at) {
        p.x = g.at.x + dx;
        p.y = g.at.y + dy;
        wrap.style.transform = pulledAt(p.x, p.y, 1.03);
      }
    });
    on("pointerup", upOn(p));
    const cancelOnSheet = cancelOn(wrap, p);
    on("pointercancel", cancelOnSheet);
    on("lostpointercapture", cancelOnSheet);
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
    // A press on it can't outlive its listeners: it's called off, and its sticker goes home on it.
    if (ui.g?.pulled === p) void callOff(ui.g);
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
            { transform: pulledFrom(home.x, home.y, ui.shrink) },
          ],
          { duration: quick ? 180 : 320, easing: EASE_PEEL, fill: "forwards" },
        ),
      );
    p.el.remove();
    renderStack();
    if (focused && zip.isOpen) keepFocus(undefined);
  }

  const trayPeel = createTrayPeel(tray, trayModel, traySheets, cancelTugs);
  const {
    rectOfFit,
    makeFlyer,
    setSlotState,
    startPeel,
    movePeel,
    dropPeel,
    putBack,
    lieDown,
    slotHome,
    pressIn,
    quickAdd,
    showOnBoard,
  } = trayPeel;

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
  function pulledFor(s: Slot, pt: Point, view: BoardView) {
    const p = ui.pulled;
    if (!p || p.f !== s.sheet || !p.el.classList.contains("is-out")) return null;
    const sheet = p.el.querySelector(".tray__sheet");
    if (!sheet) return null;
    const r = sheet.getBoundingClientRect();
    const { k } = view;
    const x0 = (r.left - view.left) / k;
    const y0 = (r.top - view.top) / k;
    const x1 = x0 + r.width / k;
    const y1 = y0 + r.height / k;
    return { over: pt.x > x0 - 10 && pt.x < x1 + 10 && pt.y > y0 - 10 && pt.y < y1 + 10 };
  }
  function boardDrag(id: string, pt: Point): TrayDrag | null {
    const s = itemOf(id);
    if (!s || ui.destroyed) return null;
    // The tray remembers whether it was open when this drag began: that decides how it ends.
    let drop = ui.drop;
    if (drop?.id !== id) {
      cancel(ui.shutTimer);
      drop = ui.drop = { id, wasOpen: zip.isOpen, view: boardView() };
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
    return snapFor(s, pt, drop.view);
  }
  /** Near its used sticker silhouette in the open tray, a sticker is drawn in like a magnet. */
  function snapFor(s: Slot, pt: Point, view: BoardView): TrayDrag {
    const onPulled = pulledFor(s, pt, view);
    const host = onPulled && ui.pulled ? ui.pulled.el : stack;
    const el = host.querySelector<HTMLElement>(`.tray__slot[data-id="${CSS.escape(s.id)}"]`);
    if (el && !el.classList.contains("is-target")) el.classList.add("is-target");
    if (!el || !ui.geo) return { over: false, snap: null };
    const silhouette = rectOfFit(el, view);
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
    if (!s || ui.destroyed) return false;
    const lip = ui.geo ? colLeft() + ui.geo.chainX - ui.geo.G : Wb() - 30;
    const onPulled = pulledFor(s, pt, boardView())?.over === true;
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
    if (ui.destroyed) return false;
    const from = api.stickerRect(id);
    const size = api.sizeFor(id);
    const snap = snapFor(s, pt, boardView()).snap;
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
    sayReturned(s);
    return true;
  }

  /* ---------------------------------------------------------------- the spread: the stack's depth button lays every sheet out */
  const stackOnBoard = () => ({ x: colLeft() + ui.stackAt.x, y: TOP + ui.stackAt.y });
  const stackOnBoardOpen = () => ({
    x: colLeft() + (ui.geo ? ui.geo.chainX : COL - 15) - 0.97 * GMAX + 3 + 3 + shrunkInset(),
    y: TOP + STACK_Y,
  });
  /** Undoes the inert board behind the open spread. */
  let endAside: (() => void) | null = null;
  function openSpread({ focus = false } = {}) {
    // Every sheet spreads out, the pulled-out one too, in front.
    if (ui.pulled) void sendHome({ instant: true });
    // What had focus goes inert below, so focus follows into the spread.
    const hadFocus = holdsFocus(stack);
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
        sheetEl(f, "is-top", 0, news, "picture"),
      );
      c.type = "button";
      c.dataset.f = String(f);
      c.setAttribute("aria-label", sheetLabel(f, d === 0 ? "spreadFront" : "back"));
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
            {
              transform: `translate(${px(from.x)},${px(from.y)}) rotate(0deg) scale(${ui.shrink})`,
            },
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
    endAside?.();
    endAside = inertBesides(spreadLayer, board);
    if (focus || hadFocus) els[0]?.focus({ preventScroll: true });
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
              {
                transform: `translate(${px(home.x)},${px(home.y)}) scale(${(0.92 * ui.shrink).toFixed(4)})`,
                opacity: 0,
              },
            ],
            { duration: 300, easing: EASE_PEEL, fill: "forwards" },
          );
      if (pick)
        await ended(
          pick.animate(
            [
              { transform: pick.style.transform },
              {
                transform: `translate(${px(home.x)},${px(home.y)}) rotate(-2deg) scale(${(1.03 * ui.shrink).toFixed(4)})`,
                offset: 0.78,
              },
              {
                transform: `translate(${px(home.x)},${px(home.y)}) rotate(0deg) scale(${ui.shrink})`,
              },
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
    endAside?.();
    endAside = null;
    for (const a of mat.getAnimations()) a.cancel();
    mat.style.opacity = "0";
    ui.spreadOpen = false;
    for (const c of cells) c.remove();
    if (focused && zip.isOpen) keepFocus(undefined);
    sayFront();
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
  /** The pull tugs on a person's first few visits to the tray, which opening it counts, not the board showing. */
  const tugVisits = visitsSoFar();
  let visitCounted = false;
  function scheduleTug(ms: number) {
    cancel(tugTimer);
    if (reduced() || tugs >= 2) return;
    tugTimer = later(() => {
      // An empty tray has nothing to invite anyone to open.
      if (ui.model.slots.length === 0) return;
      if (!(tugVisits < TUG_VISITS || hasNew())) return;
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
    if (ui.destroyed) return;
    ui.model = modelOf(read(), seen);
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
  void whenBoardQuiet().then(loadImages);

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
    destroy() {
      if (ui.destroyed) return;
      ui.destroyed = true;
      for (const t of timers) win.clearTimeout(t);
      timers.clear();
      const peel = ui.g?.peel;
      if (peel) win.cancelAnimationFrame(peel.raf);
      ui.pulled?.listening.abort();
      endAside?.();
      listening.abort();
      zip.destroy();
      root.remove();
    },
  };
}
