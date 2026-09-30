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
import { inertBesides } from "./inertBesides";
import type { TrayProblem } from "./trayProblem";
import { createTrayBoardDrop } from "./trayBoardDrop";
import { countVisit, visitsSoFar } from "./traySeen";
import { createTrayPaging } from "./trayPaging";
import { createTrayPeel } from "./trayPeel";
import { createTrayPresses } from "./trayPresses";
import { createTraySheets } from "./traySheets";
import {
  COL,
  GMAX,
  PEEK,
  PEEKS,
  SHEET,
  STACK_Y,
  TOP,
  createTrayModel,
  ended,
  modelOf,
  px,
  targetOf,
  type BoardView,
  type Geometry,
  type Point,
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
/** The stack's foot (dates, NEW, +N) is hidden below this share of the mouth's open width, whole above the other. */
const FOOT_FADE = { hidden: 0.35, whole: 0.7 };
/** The pull tugs itself on this many visits to the tray. */
const TUG_VISITS = 3;
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
  const { newIds, topF, applyPack, relayout, resetOrder } = trayModel;

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
    shrunkInset,
    sheetEl,
    sheetLabel,
    renderStack,
    holdsFocus,
    keepFocus,
    redraw,
    markShown,
    loadImages,
    sayFront,
  } = traySheets;

  const trayPaging = createTrayPaging(tray, trayModel, traySheets);
  const { tabs, syncTabsShown } = trayPaging;

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

  const trayPeel = createTrayPeel(tray, trayModel, traySheets, cancelTugs);
  const trayPresses = createTrayPresses(tray, trayModel, traySheets, trayPaging, trayPeel, {
    openSpread,
    cancelTugs,
  });
  const { sendHome } = trayPresses;

  const { boardDrag, boardDrop } = createTrayBoardDrop(
    tray,
    trayModel,
    traySheets,
    trayPaging,
    trayPeel,
    trayPresses,
  );

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
