/**
 * The sticker tray: zipped down the Sticker Board's right edge, opened by its Zipper.
 * Inside, a stack of loose sticker sheets holds every sticker you've had, in arrival order, each in
 * its packed spot: a used sticker silhouette where one is out on the board, the sticker under frost
 * while it's on its way, its faint cut line where one was given, which opens it among the stickers
 * you gave. You page the stack, pull a sheet out over the board, spread every sheet out, peel
 * stickers onto the board and put them back.
 * Everything is in board pixels, in the board's stacking context.
 */
import { i18next } from "../../i18n/i18n";
import { whenBoardQuiet } from "../boardComplete";
import { clamp, lerp } from "../../ui/easing";
import { LARGE_SCREEN } from "../../ui/largeScreen";
import type { TrayProblem } from "./trayProblem";
import { createTrayBoardDrop } from "./trayBoardDrop";
import { countVisit, visitsSoFar } from "./traySeen";
import { createTrayNudge } from "./trayNudge";
import { createTrayPaging } from "./trayPaging";
import { createTrayPeel } from "./trayPeel";
import { createTrayPresses } from "./trayPresses";
import { createTraySheets } from "./traySheets";
import { createTraySpread } from "./traySpread";
import {
  COL,
  GMAX,
  PHONE_FIT,
  SHEET,
  STACK_Y,
  SVG_NS,
  trayTopFor,
  createTrayModel,
  modelOf,
  mouthShortFor,
  sheetHeightFor,
  trayFitFor,
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
import "../../stickers/nsfw-mark.css";
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
  /** A dragged board sticker that won't be let go over the tray: it became a pinch, or the system took it. */
  boardDragEnd: (id: string) => void;
  /** Closes the spread, else the tray; whether it did anything. */
  escape: () => boolean;
  /** Puts focus on the Zipper's pull. */
  focusZipper: () => void;
  /** Where the pouch ends, as the board's y: its foot, or higher where a tall board shortens it. */
  pouchFoot: () => number;
  destroy: () => void;
}

/** The stack's foot (dates, NEW, +N) is hidden below this share of the mouth's open width, whole above the other. */
const FOOT_FADE = { hidden: 0.35, whole: 0.7 };
/** The pull tugs itself, and the front sheet's grip nudges, on this many visits to the tray. */
export const TUG_VISITS = 3;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Trays made so far, which keeps each one's ids its own. */
let trays = 0;

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
    seen = new Set<string>(),
  }: {
    slots: () => readonly TraySticker[];
    api: TrayBoard;
    /** Stickers the open tray showed that it hadn't before, once it zips shut or is torn down. */
    markSeen: (ids: readonly string[]) => void;
    /** Something the tray couldn't do, for the board to say. */
    problem: (problem: TrayProblem) => void;
    /**
     * Shown in the open tray: the stickers' own marks, and what this visit's trays have shown,
     * carried across a rebuilt engine.
     */
    seen?: Set<string>;
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
    fit: PHONE_FIT,
    sheetH: SHEET.h,
    onShow: false,
    stale: false,
    orderedFor: 0,
    imagesOn: false,
    destroyed: false,
  };
  const trayModel = createTrayModel(ui, seen, problem);
  const { newIds, applyPack, relayout, resetOrder } = trayModel;

  /**
   * The board's size and place on screen, measured as they change: a drag reading them would lay the
   * page out before the board's own changes are drawn, and the frame would lay out twice.
   */
  const placed = { w: 0, h: 0, view: { left: 0, top: 0, k: 1 } as BoardView };
  const measure = () => {
    const r = board.getBoundingClientRect();
    placed.w = board.clientWidth;
    placed.h = board.clientHeight;
    placed.view = { left: r.left, top: r.top, k: r.width / (board.offsetWidth || r.width || 1) };
  };
  measure();
  const resizes = new win.ResizeObserver(measure);
  resizes.observe(board);
  // The board moves without resizing as the screen turns or scales it, and as anything above it scrolls.
  win.addEventListener("resize", measure, { signal: listening.signal });
  win.addEventListener("scroll", measure, {
    capture: true,
    passive: true,
    signal: listening.signal,
  });
  // And measured as each gesture begins, ahead of the gesture's own handlers changing anything: the
  // layout is still clean, and whatever else moved the board, it can't have moved since.
  board.addEventListener("pointerdown", measure, { capture: true, signal: listening.signal });
  const Wb = () => placed.w || 390;
  const Hb = () => placed.h || 657;
  const colLeft = () => Wb() - COL * ui.fit.grow;
  // One query for the tray's life: a board drag reads it on every move.
  const large = win.matchMedia(LARGE_SCREEN);
  const trayTop = () => trayTopFor(large.matches);
  /** Where the open pouch ends, as the board's y: where its mouth closes in. */
  let openFoot = 0;
  const pouchFoot = () => openFoot || Hb();
  const boardView = () => placed.view;
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
    trayTop,
    pouchFoot,
    boardView,
  };
  const traySheets = createTraySheets(tray, trayModel);
  const { stackInset, renderStack, holdsFocus, redraw, markShown, loadImages } = traySheets;

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
  /** The board height and screen the tray was last fitted for. */
  let fittedFor = "";
  /** How far short of the bottom stop the Zipper's open mouth was last shaped to close in. */
  let mouthShort = 0;
  /**
   * Fits the tray to its board: the stack shrunk until its sheets, the edges behind them and the +N
   * button all fit a short board's mouth, and on a large screen grown to fill it, the column and the
   * mouth's travel with it; the pages grow taller to fill the pouch down to the bottom stop, and the
   * stickers are packed again onto them. True when that reshaped the Zipper, which has drawn this
   * frame already.
   */
  function fitTray(height: number) {
    if (!height) return false;
    const was = ui.fit;
    const fitting = `${height} ${large.matches}`;
    if (fitting !== fittedFor) {
      fittedFor = fitting;
      const fit = trayFitFor(large.matches, (short) => zip.openWindow(short)?.bot ?? null);
      ui.fit = fit;
      if (fit.grow !== was.grow) {
        // The open stack isn't sized for the column a pulled-out sheet came from.
        if (ui.pulled) void sendHome({ instant: true });
        root.style.setProperty("--tray-col", `${(COL * fit.grow).toFixed(1)}px`);
      }
      if (Math.abs(fit.scale - was.scale) >= 0.001)
        stack.style.setProperty("--scale", fit.scale.toFixed(4));
      if (fit.room !== was.room || fit.scale !== was.scale) {
        // Until every cut line is known, the stand-in spots sit on pages that fill it all the same.
        if (!applyPack()) ui.sheetH = sheetHeightFor(fit, ui.model.count);
        if (ui.order.length) redraw();
      }
    }
    // The mouth closes in under the stack there is, whose sheets a refresh changes too.
    const short = mouthShortFor(ui.fit, ui.model.count, ui.sheetH);
    const moved = ui.fit.grow !== was.grow || short !== mouthShort;
    if (moved) {
      mouthShort = short;
      zip.reshape({
        chainAt: COL * ui.fit.grow - 15,
        maxGap: GMAX * ui.fit.grow,
        mouthShort,
      });
    }
    if (moved || ui.fit !== was) {
      const open = zip.openWindow();
      openFoot = open ? trayTop() + open.foot : 0;
    }
    return moved;
  }
  function onFrame(g: Geometry) {
    if (fitTray(g.H)) return;
    ui.geo = g;
    const G = g.G;
    const k = showsFrom(g.spread);
    const { scale, grow } = ui.fit;
    const open = clamp(G / (0.97 * GMAX * grow), 0, 1);
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
      const bx = lerp(-58 * grow, 3, Math.pow(open, 0.85));
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
      stack.style.transform = `translate(${(bx + stackInset()).toFixed(2)}px,${by.toFixed(2)}px) scale(${scale.toFixed(4)})`;
      ui.stackAt = { x: xw + bx + stackInset(), y: by };
      ui.band = { top: yTop, bot: yBot };
    }
    const out = ui.spreadOpen
      ? 0
      : clamp((g.spread - 0.55) / 0.45, 0, 1) * clamp((g.relax - 0.85) / 0.15, 0, 1);
    const tabStop = out > 0.5 ? 0 : -1;
    for (const t of tabs) if (t.tabIndex !== tabStop) t.tabIndex = tabStop;
  }
  zip.on("frame", onFrame);
  // The Zipper drew itself before this listened.
  onFrame(zip.geometry());
  // The board resizing redraws the Zipper, which fits the tray again; so does the screen turning large.
  const fitForScreen = () => onFrame(zip.geometry());
  large.addEventListener("change", fitForScreen);
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
  /** What was on show in the open tray is no longer new: whether any of it was. */
  function seeShown(): boolean {
    const fresh = [...ui.shown].filter((id) => !seen.has(id));
    ui.shown.clear();
    if (fresh.length === 0) return false;
    for (const id of fresh) seen.add(id);
    markSeen(fresh);
    return true;
  }
  zip.on("closed", () => {
    if (seeShown()) renderStack();
  });
  // A hand on the pull decides for itself.
  zip.on("grab", () => {
    cancelTugs();
    cancel(ui.shutTimer);
  });
  const hasNew = () => newIds().size > 0;

  const trayPeel = createTrayPeel(tray, trayModel, traySheets, cancelTugs);
  const trayPresses = createTrayPresses(tray, trayModel, traySheets, trayPaging, trayPeel, {
    openSpread: (options) => traySpread.openSpread(options),
    cancelTugs,
  });
  const { sendHome } = trayPresses;

  const { boardDrag, boardDrop, boardDragEnd } = createTrayBoardDrop(
    tray,
    trayModel,
    traySheets,
    trayPaging,
    trayPeel,
    trayPresses,
  );

  const traySpread = createTraySpread(tray, trayModel, traySheets, trayPresses);

  function escape() {
    if (ui.spreadOpen) {
      void traySpread.closeSpread();
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

  /* ---------------------------------------------------------------- the hints: the pull's idle tug on the first few visits, or while something is NEW, twice a visit at most; the front sheet's grip nudges on the first few, once a visit */
  let tugs = 0;
  let tugTimer = 0;
  /** The hints are for a person's first few visits to the tray, which opening it counts, not the board showing. */
  const tugVisits = visitsSoFar();
  let visitCounted = false;
  createTrayNudge(tray, traySheets, trayPaging, { early: tugVisits < TUG_VISITS });
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
    if (applyPack()) redraw();
    else
      relayout().then(
        (ok) => {
          if (ok) redraw();
        },
        (error: unknown) => console.error("Laying out the sticker sheets failed", error),
      );
  }

  /* ---------------------------------------------------------------- start: the stand-in spots at once, packed as soon as every cut line is known */
  syncTabsShown();
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
    boardDragEnd,
    escape,
    focusZipper: () => zip.slider.focus(),
    pouchFoot,
    destroy() {
      if (ui.destroyed) return;
      ui.destroyed = true;
      // Torn down open, as for a new language, it was seen all the same: it never shuts to say so.
      seeShown();
      for (const t of timers) win.clearTimeout(t);
      timers.clear();
      const peel = ui.g?.peel;
      if (peel) win.cancelAnimationFrame(peel.raf);
      ui.pulled?.listening.abort();
      traySpread.destroy();
      large.removeEventListener("change", fitForScreen);
      resizes.disconnect();
      listening.abort();
      zip.destroy();
      root.remove();
    },
  };
}
