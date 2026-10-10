/**
 * A board sticker dragged over the sticker tray: its used sticker silhouette draws it in, and let go
 * over the tray it goes back into it, the tray opening on its sheet if need be.
 */
import { EASE_OUT, lerp } from "../../ui/easing";
import {
  ended,
  type BoardView,
  type Point,
  type Slot,
  type Tray,
  type TrayDrag,
  type TrayModel,
} from "./trayModel";
import type { TrayPaging } from "./trayPaging";
import { flyerAt, type TrayPeel } from "./trayPeel";
import type { TrayPresses } from "./trayPresses";
import type { TraySheets } from "./traySheets";

/**
 * Near its used sticker silhouette, a returning sticker is drawn in from `reach` px, on this curve: at
 * its slot `most` of the way there, and its scale `shrink` times as fast.
 */
const SNAP = { reach: 120, curve: 1.6, most: 0.92, shrink: 1.25 };
/** A sticker within this of the board's right edge is at the shut tray. */
const SHUT_TRAY_REACH = 74;
/** Over the open pouch: past its left lip by up to `lip`, and down to `foot` under the pouch's foot. */
const POUCH_REACH = { lip: 12, foot: 20 };
/** A pulled-out sheet takes a sticker let go within this of its paper. */
const PULLED_REACH = 10;
/** Held at the shut tray this long, a sticker opens it on its sheet. */
const DWELL_MS = 180;
/** A tray that opened for a sticker shuts this long after it lands home, sooner under reduced motion. */
const SHUT_AFTER = { ms: 900, reduced: 500 };

export function createTrayBoardDrop(
  tray: Tray,
  trayModel: TrayModel,
  traySheets: TraySheets,
  trayPaging: TrayPaging,
  trayPeel: TrayPeel,
  trayPresses: TrayPresses,
) {
  const { reduced, later, cancel, zip, api, root, stack, ui } = tray;
  const { Wb, lipLeft, pouchFoot, boardView } = tray;
  const { itemOf, topF } = trayModel;
  const { renderStack, rerenderPulled, slotFor, sayReturned, catchUp } = traySheets;
  const { bringToFront } = trayPaging;
  const { rectOfFit, makeFlyer, setSlotState, slotHome, pressIn } = trayPeel;
  const { sendHome } = trayPresses;

  /* ---------------------------------------------------------------- putting a board sticker back */
  /** Beside the open mouth, not the meshed teeth below its slider. */
  const besidePouch = (pt: Point) => pt.y < pouchFoot() + POUCH_REACH.foot;
  /** Over the open pouch, whose left lip is at `lip`. */
  const overPouch = (pt: Point, lip: number) => pt.x > lip - POUCH_REACH.lip && besidePouch(pt);
  /** At the shut tray's edge. */
  const nearShutTray = (pt: Point) => pt.x > Wb() - SHUT_TRAY_REACH;
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
    const m = PULLED_REACH;
    return { over: pt.x > x0 - m && pt.x < x1 + m && pt.y > y0 - m && pt.y < y1 + m };
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
    const nearEdge = nearShutTray(pt);
    if (!zip.isOpen) {
      if (nearEdge && !ui.dwell)
        ui.dwell = later(() => {
          ui.dwell = 0;
          void bringToFront(s.sheet, { instant: true });
          void zip.open();
        }, DWELL_MS);
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
    const el = slotFor(s.id, onPulled && ui.pulled ? ui.pulled.el : stack);
    if (el && !el.classList.contains("is-target")) el.classList.add("is-target");
    const lip = lipLeft();
    if (!el || lip === null) return { over: false, snap: null };
    const silhouette = rectOfFit(el, view);
    const size = api.sizeFor(s.id);
    const dist = Math.hypot(pt.x - silhouette.x, pt.y - silhouette.y);
    const over = onPulled ? onPulled.over : overPouch(pt, lip);
    if (dist < SNAP.reach && over) {
      const k = Math.pow(1 - dist / SNAP.reach, SNAP.curve) * SNAP.most;
      const from = api.stickerRect(s.id)?.r ?? 0;
      return {
        over,
        snap: {
          x: lerp(pt.x, silhouette.x, k),
          y: lerp(pt.y, silhouette.y, k),
          scale: lerp(1, silhouette.w / size.w, Math.min(1, k * SNAP.shrink)),
          r: lerp(from, silhouette.r, k),
        },
      };
    }
    return { over, snap: null };
  }
  /**
   * A board sticker's drag ended without a drop: it became a pinch, or the system took the touch. The
   * tray lets it go, and shuts if it opened for it.
   */
  function boardDragEnd(id: string) {
    const drop = ui.drop;
    if (drop?.id !== id) return;
    if (ui.dwell) {
      cancel(ui.dwell);
      ui.dwell = 0;
    }
    ui.drop = null;
    clearTarget();
    if (!drop.wasOpen && zip.isOpen) void zip.close();
  }
  /**
   * A board sticker let go: over the tray it goes back into its used sticker silhouette. Whether the
   * tray was open when the drag, or Remove, began decides the ending: it stays open if it was, else it
   * zips shut once the sticker has visibly landed.
   */
  async function boardDrop(id: string, pt: Point) {
    // On its way into its used sticker silhouette already: it isn't the board's to drop again until
    // it lands.
    if (ui.landing.has(id)) return false;
    const s = itemOf(id);
    if (ui.dwell) {
      cancel(ui.dwell);
      ui.dwell = 0;
    }
    // Remove calls this without a drag.
    const wasOpen = ui.drop?.id === id ? ui.drop.wasOpen : zip.isOpen;
    ui.drop = null;
    if (!s || ui.destroyed) return false;
    // Before the Zipper has drawn, its lip stands in near the board's edge.
    const lip = lipLeft() ?? Wb() - 30;
    const onPulled = pulledFor(s, pt, boardView())?.over === true;
    const into = onPulled || (zip.isOpen ? overPouch(pt, lip) : nearShutTray(pt));
    if (!into) {
      clearTarget();
      // It opened for this sticker, which went elsewhere.
      if (!wasOpen && zip.isOpen) void zip.close();
      return false;
    }
    ui.landing.add(id);
    try {
      return await takeHome(s, pt, wasOpen, onPulled);
    } finally {
      ui.landing.delete(id);
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
    // Landed: the sheets catch up with the board, which let go of it during the flight, before it's
    // pressed in.
    ui.landing.delete(id);
    catchUp();
    pressIn(id);
    // Shown home, then shut: unless a hand is back on the tray or another sticker is on its way.
    if (!wasOpen) {
      cancel(ui.shutTimer);
      ui.shutTimer = later(
        () => {
          if (!ui.g && !ui.drop && !ui.spreadOpen && zip.isOpen) void zip.close();
        },
        reduced() ? SHUT_AFTER.reduced : SHUT_AFTER.ms,
      );
    }
    sayReturned(s);
    return true;
  }

  return { boardDrag, boardDrop, boardDragEnd };
}
