/**
 * Paging the sticker tray's stack, a deck from front to back and round again; and its folder tabs,
 * whose filter deals the stack anew in a shuffle.
 */
import { i18next } from "../../i18n/i18n";
import { EASE_OUT } from "../../ui/easing";
import {
  FILTERS,
  PEEKS,
  ended,
  matchesFilter,
  targetOf,
  type Filter,
  type Tray,
  type TrayModel,
} from "./trayModel";
import { shadeOf, type TraySheets } from "./traySheets";

/** A page turn lifts the front sheet this far out of the stack's top, turned this many degrees. */
const LIFT = { dy: -118, r: 2.2 };
/** A folder tab gathers the stack: it dips this far into the mouth, its levels this much as far apart. */
const GATHER = { dip: 30, apart: 0.15 };
/**
 * A sheet a folder tab puts back drops behind the fabric: `past` px past the window's foot, at least
 * `least`; before the window has shown, a phone's stands in, `fallback` px below the stack's top.
 */
const DROP = { past: 12, least: 320, fallback: 470 };

export function createTrayPaging(tray: Tray, trayModel: TrayModel, traySheets: TraySheets) {
  const { zip, reduced, listen, make, stack, tabsEl, ui } = tray;
  const { itemOf, resetOrder, fitPages } = trayModel;
  const { restAt, renderStack, rerenderPulled, catchUp, sayFront, sayFilter } = traySheets;
  /** Deals the stack anew for the filter, on pages as tall as the stack it deals needs. */
  function deal() {
    resetOrder();
    if (fitPages()) rerenderPulled();
  }

  /* ---------------------------------------------------------------- the folder tabs: the stack's dividers */
  const tabs = FILTERS.map((f) => {
    const name = i18next.t(($) => $.stickerBoard.tray.filters[f]);
    const t = make("button", "tray__tab", make("span", "", name));
    t.type = "button";
    t.dataset.filter = f;
    t.dataset.press = "";
    t.setAttribute("aria-pressed", String(ui.filter === f));
    return t;
  });
  tabsEl.append(...tabs);
  // Until the tray holds a gift, Mine is All and Gifts is empty.
  const syncTabsShown = () => {
    tabsEl.hidden = !ui.model.slots.some((s) => s.gift);
  };
  listen(tabsEl, "click", (e) => {
    const f = targetOf(e)?.closest<HTMLElement>(".tray__tab")?.dataset.filter;
    const filter = FILTERS.find((id) => id === f);
    if (filter) void setFilter(filter);
  });

  /* ---------------------------------------------------------------- paging: a deck, front to back and round again */
  const topSheet = () => stack.querySelector<HTMLElement>(".tray__sheet.is-top");
  const sheetEls = () => [...stack.querySelectorAll<HTMLElement>(".tray__sheet")];
  const depthOf = (el: HTMLElement) => Number(el.dataset.depth);
  /** A sheet a finger moved eases back to its place in the stack, and stays there. */
  const settle = (el: HTMLElement, ms = 200) => {
    const from = el.style.transform;
    el.style.transform = restAt(depthOf(el));
    return ended(
      el.animate([{ transform: from }, { transform: el.style.transform }], {
        duration: ms,
        easing: EASE_OUT,
      }),
    );
  };
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
  /** Resolves once the stack is still: no turn or shuffle under way. */
  let still = Promise.resolve();
  let letGoOf = () => {};
  /** A turn or a shuffle takes the stack: nothing else turns it until it lets go. */
  function hold() {
    ui.busy = true;
    still = new Promise<void>((resolve) => {
      letGoOf = resolve;
    });
  }
  function letGo() {
    ui.busy = false;
    letGoOf();
  }
  /** One step: +1 sends the front sheet to the back, -1 brings the back one to the front. */
  async function page(dir: 1 | -1, { fromY = 0, quick = false, silent = false } = {}) {
    // One turn at a time: a key held down, or pressed mid-shuffle, doesn't start another.
    if (ui.busy) return;
    const order = ui.order;
    const n = order.length;
    const front = topSheet();
    if (n < 2) {
      if (front && fromY) await settle(front);
      return;
    }
    const k = Math.min(PEEKS, n - 1);
    const T = quick ? 0.6 : 1;
    const turned = dir > 0 ? [...order.slice(1), order[0]] : [order[n - 1], ...order.slice(0, -1)];
    if (reduced() || !front) {
      ui.order = turned;
      renderStack();
      if (reduced()) stack.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 150 });
      if (!silent) sayFront();
      return;
    }
    hold();
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
        front.animate(
          [{ transform: restAt(0, fromY) }, { transform: restAt(0, LIFT.dy, -LIFT.r) }],
          {
            duration: 150 * T,
            easing: EASE_OUT,
            fill: "forwards",
          },
        ),
      );
      front.style.zIndex = "-1";
      shade(front, 0, k, 200 * T);
      await ended(
        front.animate([{ transform: restAt(0, LIFT.dy, -LIFT.r) }, { transform: restAt(k) }], {
          duration: 200 * T,
          easing: "cubic-bezier(.45,0,.55,1)",
          fill: "forwards",
        }),
      );
      // A tab, or a sheet sent home, that dealt the stack anew mid-turn keeps its order.
      if (ui.order === order) {
        ui.order = turned;
        renderStack();
      }
    } else {
      // The back sheet comes up from behind the stack and settles in front; the rest step back.
      ui.order = turned;
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
          t.animate([{ transform: restAt(k) }, { transform: restAt(0, LIFT.dy, LIFT.r) }], {
            duration: 170 * T,
            easing: EASE_OUT,
            fill: "forwards",
          }),
        );
        t.style.zIndex = "";
        await ended(
          t.animate([{ transform: restAt(0, LIFT.dy, LIFT.r) }, { transform: restAt(0) }], {
            duration: 200 * T,
            easing: EASE_OUT,
          }),
        );
        for (const a of t.getAnimations()) a.cancel();
      }
    }
    letGo();
    catchUp();
    if (!silent) sayFront();
  }
  /** How many times a folder tab has dealt the stack anew, so a riffle can tell it's out of date. */
  let deals = 0;
  /** Brings a sheet to the front: a quick riffle through the ones before it. */
  async function bringToFront(f: number, { instant = false } = {}) {
    if (!ui.order.includes(f)) {
      ui.filter = "all";
      syncTabs();
      deal();
      if (!ui.order.includes(f)) return;
    }
    const i = ui.order.indexOf(f);
    if (!i) return;
    if (instant || !zip.isOpen || reduced()) {
      ui.order = [...ui.order.slice(i), ...ui.order.slice(0, i)];
      renderStack();
      if (!instant) sayFront();
      return;
    }
    // A tab chosen mid-riffle deals the newest match to the front: the rest of the riffle would turn
    // that stack, so it stops.
    const dealt = deals;
    // Each hop waits out a turn or shuffle under way, then turns from where the sheet is by then.
    for (;;) {
      while (ui.busy) await still;
      const at = ui.order.indexOf(f);
      if (deals !== dealt || at <= 0) break;
      await page(at <= ui.order.length / 2 ? 1 : -1, { quick: true, silent: true });
    }
    if (deals === dealt) sayFront();
  }

  /* ---------------------------------------------------------------- a folder tab: the filter chooses sheets and never moves a sticker.
   * The stack dips into the mouth and squares up; the front sheet, then each without a match, slides down
   * behind the fabric; the rest riffle; and the newest match is dealt onto the front. */
  function syncTabs() {
    for (const t of tabs) t.setAttribute("aria-pressed", String(t.dataset.filter === ui.filter));
  }
  /** Each sticker the filter leaves out fades on the sheets `els`, with its dot badge. */
  const fadeSlots = (els: readonly HTMLElement[], f: Filter) => {
    for (const el of els)
      for (const sl of el.querySelectorAll<HTMLElement>(".tray__slot, .tray__dot-spot")) {
        const s = sl.dataset.id === undefined ? null : itemOf(sl.dataset.id);
        if (s) sl.classList.toggle("is-out", !matchesFilter(s, f));
      }
  };
  let shuffling: object | null = null;
  async function setFilter(f: Filter) {
    const prev = ui.filter;
    ui.filter = f;
    deals++;
    syncTabs();
    deal();
    // A tab change already on its way: this one lands at once.
    const again = shuffling !== null;
    if (!zip.isOpen || reduced() || again || ui.busy) {
      if (again) {
        shuffling = null;
        letGo();
      }
      renderStack();
      if (reduced() && zip.isOpen)
        stack.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160 });
      if (again) catchUp();
      sayFilter();
      return;
    }
    const token = {};
    shuffling = token;
    hold();
    const before = sheetEls();
    const shown = new Set(ui.order.slice(0, Math.min(PEEKS, ui.order.length - 1) + 1));
    // The front, and every sheet without a match.
    const drop = before.filter((el, i) => i === 0 || !shown.has(Number(el.dataset.f)));
    const pile = (d: number, dy = 0, r = 0) => restAt(d * GATHER.apart, GATHER.dip + dy, r);
    // Far enough below the pile that a sheet's top is behind the fabric.
    const below = ui.windowBot === null ? DROP.fallback : ui.windowBot - ui.stackAt.y;
    const dropBy = Math.max(DROP.least, (below + DROP.past) / ui.fit.scale) - GATHER.dip;
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
              { transform: pile(depthOf(el), dropBy, (i % 2 ? 1 : -1) * 2.5) },
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
              { transform: pile(d, dropBy), offset: 0, easing: EASE_OUT },
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
      const from = d0 === undefined ? pile(0, dropBy) : pile(d0);
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
    // Commits the old filter's fade, so the new one transitions from it.
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
      letGo();
      catchUp();
      sayFilter();
    }
  }

  return {
    tabs,
    syncTabsShown,
    topSheet,
    sheetEls,
    depthOf,
    settle,
    page,
    bringToFront,
  };
}

export type TrayPaging = ReturnType<typeof createTrayPaging>;
