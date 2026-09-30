/**
 * The sticker tray's presses, one at a time, on the stack and on the sticker sheet pulled out over
 * the board: the first move decides whether a press pages, peels, pulls the sheet out or moves it,
 * and a tap sticks a sticker on or shows where it is.
 */
import { EASE_OUT, EASE_PEEL, clamp, lerp } from "../../ui/easing";
import { edgeAt } from "./edgeBands";
import {
  CRACK,
  ICONS,
  SHEET,
  TOP,
  ended,
  local,
  px,
  targetOf,
  type Gesture,
  type Point,
  type Pulled,
  type Tray,
  type TrayModel,
} from "./trayModel";
import type { TrayPaging } from "./trayPaging";
import type { TrayPeel } from "./trayPeel";
import type { TraySheets } from "./traySheets";

/** A pulled-out sheet turns and scales about this point, as the CSS sets it. */
const PULLED_ORIGIN = { x: SHEET.w / 2, y: SHEET.h * 0.4 };
/** The first move of a press on the stack decides what it does. */
const DECIDE = 10;
/** A page turn commits past this lift or this speed, up to the back of the stack or down to the front. */
const PAGE_UP = { px: -36, speed: -0.35 };
const PAGE_DOWN = { px: 30, speed: 0.35 };
/** Dragged this far toward the board, a sheet comes free of the tray. */
const PULL_FREE = 60;

/**
 * `openSpread` lays every sheet out, from the stack's depth button; `cancelTugs` stops the Zipper's
 * idle tug once a sheet is pulled out.
 */
export function createTrayPresses(
  tray: Tray,
  trayModel: TrayModel,
  traySheets: TraySheets,
  trayPaging: TrayPaging,
  trayPeel: TrayPeel,
  {
    openSpread,
    cancelTugs,
  }: { openSpread: (options: { focus: boolean }) => void; cancelTugs: () => void },
) {
  const { win, reduced, listen, make, icon, words, zip, api, fly, stack, ui } = tray;
  const { Wb, Hb, colLeft, boardView } = tray;
  const { topF } = trayModel;
  const { restAt, sheetEl, renderStack, holdsFocus, keepFocus, catchUp, sheetOf } = traySheets;
  const { page, bringToFront, settle, topSheet, sheetEls, depthOf } = trayPaging;
  const { startPeel, movePeel, dropPeel, putBack, lieDown, quickAdd, showOnBoard } = trayPeel;

  /** A pulled-out sheet at `x`, `y` (its top left) and this scale: growing from the stack's size. */
  const pulledFrom = (x: number, y: number, scale: number, turn = 0) =>
    `translate(${px(x - PULLED_ORIGIN.x * (1 - scale))},${px(y - PULLED_ORIGIN.y * (1 - scale))}) rotate(${turn.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

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

  return { sendHome };
}

export type TrayPresses = ReturnType<typeof createTrayPresses>;
