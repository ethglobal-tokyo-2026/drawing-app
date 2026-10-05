/**
 * Peeling a sticker off its sticker sheet: the sticker in hand, from its press to where it lands, on
 * the board or back in its slot; and a tap's quick peel onto a free spot on the board.
 */
import { timeOurWork } from "../../performance/performanceRecorder";
import { formatNo } from "../../stickers/format";
import { EASE_OUT, EASE_PEEL, clamp, lerp } from "../../ui/easing";
import {
  COL,
  CRACK,
  GMAX,
  STACK_Y,
  TOP,
  cssUrl,
  ended,
  px,
  type BoardView,
  type Box,
  type Gesture,
  type Peel,
  type Point,
  type Pulled,
  type Size,
  type Slot,
  type SlotState,
  type Tray,
  type TrayModel,
} from "./trayModel";
import { BoardNotReady, reasonOf } from "./trayProblem";
import type { TraySheets } from "./traySheets";

/** A sticker in hand comes free of its sheet this far from where it was pressed. */
const PEEL_FREE = 26;

/** A sticker in hand's transform: a box this big, centered on `x`, `y`, scaled and turned. */
export const flyerAt = (x: number, y: number, size: Size, scale: number, r: number) =>
  `translate(${(x - size.w / 2).toFixed(1)}px,${(y - size.h / 2).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

/** `cancelTugs` stops the Zipper's idle tug once a sticker is in hand. */
export function createTrayPeel(
  tray: Tray,
  trayModel: TrayModel,
  traySheets: TraySheets,
  cancelTugs: () => void,
) {
  const { win, reduced, later, cancel, make, zip, api, problem, fly, land, stack, ui } = tray;
  const { Wb, Hb, colLeft, boardView } = tray;
  const { itemOf } = trayModel;
  const { placeOf, shrunkInset, sayStuckOn } = traySheets;

  /* ---------------------------------------------------------------- peeling: a sticker from its sheet onto the board */
  /** A slot's sticker, in board pixels: its center, its fitted size, and its turn. */
  function rectOfFit(el: HTMLElement, view: BoardView = boardView()): Box {
    const fit = el.querySelector<HTMLElement>(".tray__fit") ?? el;
    const r = fit.getBoundingClientRect();
    // A sheet on the stack is drawn shrunk; a pulled-out one is full size.
    const shrunk = el.closest(".tray__stack") ? ui.shrink : 1;
    return {
      x: (r.left + r.width / 2 - view.left) / view.k,
      y: (r.top + r.height / 2 - view.top) / view.k,
      w: parseFloat(fit.style.width) * shrunk,
      h: parseFloat(fit.style.height) * shrunk,
      r: parseFloat(el.style.getPropertyValue("--r")) || 0,
    };
  }
  function makeFlyer(s: Slot, size: Size) {
    const img = make("img", "");
    img.src = s.urls.png;
    img.alt = "";
    img.draggable = false;
    const curl = make("div", "tray__curl", img);
    curl.style.setProperty("--m", cssUrl(s.urls.mask));
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
    const r = rectOfFit(g.slotEl, g.view);
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
    if (landMark instanceof HTMLElement) landMark.style.setProperty("--m", cssUrl(pk.s.urls.mask));
    land.style.transform = `translate(${px(pk.target.x - pk.size.w / 2 + 3)},${px(pk.target.y - pk.size.h / 2 + 6)}) rotate(${pk.rot.toFixed(2)}deg)`;
    land.style.opacity = "1";
  }
  async function dropPeel(g: Gesture, pt: Point) {
    const pk = g.peel;
    if (!pk) return;
    if (pk.phase === "curl" || !overBoard(pt)) return putBack(pk);
    win.cancelAnimationFrame(pk.raf);
    showLanding(null);
    const rot = Math.round(clamp(pk.rot, -8, 8) * 10) / 10;
    ui.shown.add(pk.s.id);
    if (!ui.pulled) holdOpen(420);
    // In hand until the board has drawn it where it lands.
    api
      .place(pk.s.id, { x: pk.x, y: pk.y, r: rot })
      .then(placedOrThrow)
      .then(
        () => {
          pk.el.remove();
          sayStuckOn(pk.s);
        },
        (error: unknown) => {
          reportPlace(pk.s, error);
          pk.el.remove();
          pressIn(pk.s.id);
        },
      );
  }
  /** A sticker in hand that isn't stuck on goes back into its slot. */
  async function putBack(pk: Peel) {
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
  /** A sticker in hand lies straight back down in its slot on `p`'s sheet. */
  function lieDown(pk: Peel, p: Pulled) {
    win.cancelAnimationFrame(pk.raf);
    showLanding(null);
    pk.el.remove();
    const el = p.el.querySelector<HTMLElement>(`.tray__slot[data-id="${CSS.escape(pk.s.id)}"]`);
    if (el) el.dataset.state = "here";
  }
  /** Its placing failed, so it stays in the tray. */
  const reportPlace = (s: Slot, error: unknown) => {
    console.error(`Sticking ${formatNo(s.no)} on the board failed; it's back in its sheet`, error);
    problem({ kind: "place", nos: [s.no], ...reasonOf(error) });
  };
  /** The board answers with nothing when it couldn't take the sticker, such as before it has a size. */
  function placedOrThrow(placed: HTMLElement | null): HTMLElement {
    if (!placed) throw new BoardNotReady();
    return placed;
  }
  const holdOpen = (ms: number) => later(() => zip.relax(1), ms);
  /** Where a slot's sticker sits with the tray wide open, in board pixels. */
  function slotHome(s: Slot): Box {
    const q = placeOf(s);
    const xw = (ui.geo ? ui.geo.chainX : COL - 15) - 0.97 * GMAX + 3;
    return {
      x: colLeft() + xw + 3 + shrunkInset() + q.x * ui.shrink,
      y: TOP + STACK_Y + q.y * ui.shrink,
      w: q.w * ui.shrink,
      h: q.h * ui.shrink,
      r: q.r,
    };
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
    let onBoard: HTMLElement;
    try {
      onBoard = placedOrThrow(await api.place(id));
    } catch (error) {
      reportPlace(s, error);
      flyer.remove();
      pressIn(id);
      if (!ui.pulled) holdOpen(160);
      return;
    }
    if (ui.destroyed) return;
    const to = api.stickerRect(id) ?? { x: Wb() * 0.4, y: Hb() * 0.5, r: 0 };
    onBoard.style.opacity = "0";
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
    onBoard.style.opacity = "";
    if (!reduced())
      onBoard.animate(
        [
          { transform: `${onBoard.style.transform} scale(1.06)` },
          { transform: onBoard.style.transform },
        ],
        { duration: 220, easing: EASE_PEEL },
      );
    sayStuckOn(s);
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

  return {
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
  };
}

export type TrayPeel = ReturnType<typeof createTrayPeel>;
