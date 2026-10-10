/**
 * The sticker tray's sticker sheets, drawn: each with its stickers on their cut lines and its dated
 * foot, and the stack of them, kept in step with the stickers and read out as they change.
 */
import { i18next } from "../../i18n/i18n";
import { formatMonthDay, formatNo } from "../../stickers/format";
import { lightUp } from "../../stickers/light";
import { clamp } from "../../ui/easing";
import { STICKER_FIT } from "./sheetPacking";
import { dotSpot, knownShape } from "./stickerShape";
import {
  DEPTH_BUTTON_H,
  DEPTH_GAP,
  GMAX,
  ICONS,
  PEEK,
  PEEKS,
  SHEET,
  STACK_X,
  STACK_Y,
  SVG_NS,
  chainAtFor,
  cssUrl,
  dayOf,
  px,
  stackFootFor,
  windowLeft,
  type Box,
  type Point,
  type Size,
  type Slot,
  type Tray,
  type TrayModel,
} from "./trayModel";
import { STAND_IN } from "./traySlots";

/**
 * How a sheet's stickers take a press: on the sheet in front, inert behind it, or as pictures inside
 * a spread cell, which is one button.
 */
type SlotUse = "live" | "behind" | "picture";
/** How a sheet is named: a button behind the front one, or the sheet in front or pulled out. */
type SheetName = "back" | "spreadFront" | "front" | "pulled";

/** Each level back is this much narrower. */
const INSET = 0.025;
/** How dark a sheet's shade is at each level back; a sheet changing level eases between them. */
export const shadeOf = (depth: number) => clamp(depth * 0.3, 0, 0.9);

export function createTraySheets(tray: Tray, trayModel: TrayModel) {
  const { doc, zip, make, decorative, icon, words, hint, say, stack, ui, colLeft, trayTop } = tray;
  const { newIds, matches, sheetItems, sheetMatches, topF, resetOrder } = trayModel;
  // The CSS draws every sheet, edge and +N button to these sizes.
  tray.root.style.setProperty("--sheet-w", px(SHEET.w));
  tray.root.style.setProperty("--peek", px(PEEK));
  tray.root.style.setProperty("--depth-h", px(DEPTH_BUTTON_H));

  /** A sheet's transform at a depth in the stack: lower, and narrower from its foot, the further back. */
  const restAt = (depth: number, dy = 0, r = 0) =>
    `translateY(${((depth * PEEK) / ui.fit.scale + dy).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(1 - INSET * depth).toFixed(4)})`;
  /** The stack's left inset when it's shrunk narrower than the column was made for: it stays centered in the mouth. */
  const stackInset = () => (SHEET.w * (ui.fit.grow - ui.fit.scale)) / 2;
  /** The stack's top left with the tray wide open, in board pixels. */
  function stackHome(): Point {
    const { grow } = ui.fit;
    const chainX = ui.geo ? ui.geo.chainX : chainAtFor(grow);
    const x = colLeft() + windowLeft(chainX, GMAX * grow, 1) + STACK_X + stackInset();
    return { x, y: trayTop() + STACK_Y };
  }
  /** The stack's top left where it stands now, in board pixels. */
  const stackOnBoard = (): Point => ({ x: colLeft() + ui.stackAt.x, y: trayTop() + ui.stackAt.y });

  function loadImages() {
    if (ui.imagesOn || ui.destroyed) return;
    ui.imagesOn = true;
    if (ui.g || ui.busy) ui.stale = true;
    else {
      rerenderPulled();
      renderStack();
    }
  }

  function fitOf(s: Slot): Size {
    const ar = s.width / s.height;
    const { w, h } = STICKER_FIT;
    return ar >= w / h ? { w, h: w / ar } : { w: h * ar, h };
  }
  function placeOf(s: Slot): Box {
    if (s.pos) return { x: s.pos.x, y: s.pos.y, r: s.pos.r, w: s.pos.w, h: s.pos.h };
    const [x, y, r] = STAND_IN[s.slot];
    // From the foot of a page grown taller.
    return { x, y: y + ui.sheetH - SHEET.h, r, ...fitOf(s) };
  }
  let drawnH = 0;
  /** Every sheet in the tray, stacked, pulled out or spread, is drawn as tall as its stickers were packed for. */
  function sizePages() {
    if (ui.sheetH === drawnH) return;
    drawnH = ui.sheetH;
    tray.root.style.setProperty("--sheet-h", px(drawnH));
  }
  /**
   * The cut line on a given sticker's spot, or one on its way, the one its sheet was packed by. A cut
   * line that couldn't be read packs as a box, which isn't the sticker's, so nothing is traced.
   */
  function cutLineEl(s: Slot, q: Size) {
    const shape = knownShape(s);
    if (!shape || shape.poly.length < 3) return null;
    const path = doc.createElementNS(SVG_NS, "path");
    const points = shape.poly.map(
      ([u, v], i) => `${i ? "L" : "M"}${(u * q.w).toFixed(1)} ${(v * q.h).toFixed(1)}`,
    );
    path.setAttribute("d", `${points.join("")}Z`);
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "tray__given-outline");
    svg.append(path);
    return decorative(svg);
  }
  /** Puts `el` where a sticker sits on its sheet: centered on its place, its size, and turned with it. */
  function placeAt(el: HTMLElement, q: Box) {
    el.style.setProperty("--x", px(q.x));
    el.style.setProperty("--y", px(q.y));
    el.style.setProperty("--r", `${q.r.toFixed(2)}deg`);
    el.style.width = px(q.w);
    el.style.height = px(q.h);
    el.style.margin = `${px(-q.h / 2)} 0 0 ${px(-q.w / 2)}`;
  }
  function slotEl(s: Slot, isNew: boolean, use: SlotUse) {
    const q = placeOf(s);
    const el: HTMLElement = make(
      use === "picture" ? "span" : "button",
      `tray__slot${matches(s) ? "" : " is-out"}`,
    );
    if (el instanceof HTMLButtonElement) el.type = "button";
    if (use === "picture") decorative(el);
    // Behind the front sheet a sticker can't be reached, so nothing visits it.
    else if (use === "behind") el.setAttribute("inert", "");
    el.dataset.id = s.id;
    el.dataset.state = s.state;
    placeAt(el, q);
    const no = { no: formatNo(s.no) };
    // A given sticker's spot shows only its cut line, faint, and takes the shared press.
    if (s.givenTo !== undefined) {
      if (use !== "picture") {
        el.dataset.press = "";
        el.setAttribute(
          "aria-label",
          i18next.t(($) => $.stickerBoard.tray.slot.given, { ...no, recipient: s.givenTo }),
        );
      }
      const cut = cutLineEl(s, q);
      if (cut) el.append(cut);
      return el;
    }
    const inAGift = s.state === "inTheBag" || s.state === "onItsWay";
    if (use !== "picture") {
      const name =
        s.state === "inTheBag"
          ? i18next.t(($) => $.stickerBoard.tray.slot.inTheBag, no)
          : s.state === "onItsWay"
            ? s.onItsWayTo === undefined
              ? i18next.t(($) => $.stickerBoard.tray.slot.onItsWay, no)
              : i18next.t(($) => $.stickerBoard.tray.slot.onItsWayTo, {
                  ...no,
                  recipient: s.onItsWayTo,
                })
            : s.state === "used"
              ? isNew
                ? i18next.t(($) => $.stickerBoard.tray.slot.usedNew, no)
                : i18next.t(($) => $.stickerBoard.tray.slot.used, no)
              : isNew
                ? i18next.t(($) => $.stickerBoard.tray.slot.newOnSheet, no)
                : i18next.t(($) => $.stickerBoard.tray.slot.onSheet, no);
      // A sticker in a gift opens, as a given one's spot does: it takes the shared press.
      if (inAGift) el.dataset.press = "";
      // A used sticker silhouette shows no sticker, so nothing on it is blurred.
      const blurred = s.veiled && s.state !== "used";
      el.setAttribute(
        "aria-label",
        blurred ? `${name}, ${i18next.t(($) => $.stickers.nsfw.veiled)}` : name,
      );
    }
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
    // A used sticker silhouette shows no sticker, so it loads none; nor does any slot before its
    // images are let load.
    if (s.state !== "used" && ui.imagesOn) {
      // Drawn by someone else, NSFW, or drawn in Kyoto Seika Practice Mode, it wears the sheet's foil
      // under its image, in the tone StickerFigure picks: pink, then Kyoto Seika, then holo.
      if (s.gift || s.nsfw || s.kyotoSeika) {
        const tone = s.nsfw ? "pink" : s.kyotoSeika ? "kyoto-seika" : "holo";
        const foil = decorative(
          make(
            "span",
            `sticker-foil sticker-foil--sheet sticker-foil--${tone}${s.urls.foil ? " sticker-foil--baked" : ""}`,
            make("span", "sticker-foil__cast"),
            make(
              "span",
              "sticker-foil__band",
              make("i", "sticker-foil__sheen"),
              make("i", "sticker-foil__glint"),
            ),
          ),
        );
        if (s.urls.foil) foil.style.setProperty("--foil-mask", cssUrl(s.urls.foil));
        lightUp(foil);
        fit.append(foil);
      }
      const img = make("img", "tray__img");
      img.decoding = "async";
      img.src = s.urls.png;
      img.alt = "";
      img.draggable = false;
      fit.append(img);
      // In a gift, it lies under the sleeve's frost.
      if (inAGift) fit.append(decorative(make("i", "tray__frost")));
      // Its image is the veiled one: the mark says why it's blurred, as on the board.
      if (s.veiled) {
        fit.append(
          decorative(
            make(
              "b",
              "nsfw-mark tray__mark",
              i18next.t(($) => $.stickers.nsfw.mark),
            ),
          ),
        );
      }
    }
    fit.style.width = px(q.w);
    fit.style.height = px(q.h);
    if (ui.imagesOn) fit.style.setProperty("--m", cssUrl(s.urls.mask));
    el.append(fit);
    if (inAGift) {
      const cut = cutLineEl(s, q);
      if (cut) el.append(cut);
    }
    return el;
  }
  /**
   * A sticker's dot badge, turned with its spot: NEW on its corner, or where its gift is (its spot's
   * name says so too) on its cut line, as on its detail; null when it wears none.
   */
  function dotOf(s: Slot, isNew: boolean) {
    let dot: HTMLElement | null = null;
    if (s.state === "inTheBag" || s.state === "onItsWay") {
      dot = make(
        "span",
        "tray__gift-dot",
        icon(s.state === "inTheBag" ? ICONS.inTheBag : ICONS.onItsWay),
      );
      const at = dotSpot(s);
      dot.style.setProperty("--spot-x", at.x.toFixed(4));
      dot.style.setProperty("--spot-y", at.y.toFixed(4));
    } else if (isNew) dot = make("span", "tray__new", words.new);
    if (!dot) return null;
    const spot = make("span", `tray__dot-spot${matches(s) ? "" : " is-out"}`, dot);
    spot.dataset.id = s.id;
    placeAt(spot, placeOf(s));
    return spot;
  }
  function rangeOf(f: number) {
    const ats = sheetItems(f).map((s) => s.arrivedAt);
    if (!ats.length) return "";
    const lo = Math.min(...ats);
    const hi = Math.max(...ats);
    return dayOf(lo) === dayOf(hi)
      ? formatMonthDay(lo)
      : `${formatMonthDay(lo)}–${formatMonthDay(hi)}`;
  }
  /** A sheet's name: as a button that brings it to the front, or as the sheet that is in front or out. */
  const sheetLabel = (f: number, name: SheetName = "back") => {
    const dates = rangeOf(f);
    const sheet = { number: f + 1, dates };
    // An empty tray's one blank sheet has no dates to name it by; it's only ever in front or pulled out.
    const context = dates === "" ? ("noDates" as const) : undefined;
    switch (name) {
      case "back":
        return i18next.t(($) => $.stickerBoard.tray.sheet, sheet);
      case "spreadFront":
        return i18next.t(($) => $.stickerBoard.tray.sheetInFront, sheet);
      case "front":
        return i18next.t(($) => $.stickerBoard.tray.frontSheet, { ...sheet, context });
      case "pulled":
        return i18next.t(($) => $.stickerBoard.tray.pulledSheet, { ...sheet, context });
    }
  };
  /** Says which sheet is in front. */
  const sayFront = () => say(sheetLabel(topF(), "front"));
  /** Says a sticker went from its sheet onto the board, or from the board back into the tray. */
  const sayStuckOn = (s: Slot) =>
    say(i18next.t(($) => $.stickerBoard.tray.status.stuckOn, { no: formatNo(s.no) }));
  const sayReturned = (s: Slot) =>
    say(i18next.t(($) => $.stickerBoard.tray.status.returned, { no: formatNo(s.no) }));
  /** Says how many sheets a folder tab shows, or that a filter shows none. */
  const sayFilter = () =>
    say(
      i18next.t(($) => $.stickerBoard.tray.status.filtered, {
        filter: i18next.t(($) => $.stickerBoard.tray.filters[ui.filter]),
        count: Array.from({ length: ui.model.count }, (_, f) => f).filter(sheetMatches).length,
      }),
    );
  /** A sticker's slot in `host`; by default on the pulled-out sheet, else in the stack. */
  function slotFor(id: string, host?: Element) {
    const sel = `.tray__slot[data-id="${CSS.escape(id)}"]`;
    if (host) return host.querySelector<HTMLElement>(sel);
    return ui.pulled?.el.querySelector<HTMLElement>(sel) ?? stack.querySelector<HTMLElement>(sel);
  }
  /**
   * A loose sheet: a tear strip to grip at its top, stickers on their cut lines, its dates on its foot.
   * Behind the front sheet only its foot is a stop; in the spread the whole sheet is one button, so
   * its stickers are pictures.
   */
  function sheetEl(
    f: number,
    depth: number,
    {
      news = newIds(),
      use = depth > 0 ? "behind" : "live",
      pulled = false,
    }: { news?: ReadonlySet<string>; use?: SlotUse; pulled?: boolean } = {},
  ) {
    sizePages();
    const paper = make("div", "tray__paper", decorative(make("i", "tray__tear")));
    // The dot badges lie over every sticker on the sheet: in its own spot, a dot would be covered by
    // any later sticker beside it.
    const dots = decorative(make("span", "tray__dots"));
    // A sticker received leaves its spot, which opens it, when the board says who has it.
    for (const s of sheetItems(f))
      if (s.state !== "given" || s.givenTo !== undefined) {
        paper.append(slotEl(s, news.has(s.id), use));
        const dot = dotOf(s, news.has(s.id));
        if (dot) dots.append(dot);
      }
    paper.append(dots);
    // Nothing to put on the only sheet yet: it says what will be.
    if (ui.model.slots.length === 0)
      paper.append(make("p", "fine tray__empty keep-phrases", words.empty));
    const foot = make(
      "div",
      "tray__foot",
      make("span", "fine", rangeOf(f)),
      make("span", "fine", String(f + 1).padStart(2, "0")),
    );
    if (use === "behind") {
      foot.setAttribute("role", "button");
      foot.tabIndex = 0;
      foot.setAttribute("aria-label", sheetLabel(f));
    }
    paper.append(foot, make("i", "tray__shade"));
    const el = make(
      "div",
      `tray__sheet${depth === 0 ? " is-top" : ""}${pulled ? " is-pulled" : ""}`,
      paper,
    );
    if (use === "live") {
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", sheetLabel(f, pulled ? "pulled" : "front"));
      // The hint is about the stickers on the sheet; a blank sheet has none.
      if (ui.model.slots.length > 0) el.setAttribute("aria-describedby", hint.id);
    }
    el.dataset.f = String(f);
    el.dataset.depth = String(depth);
    // Its level back: what it stacks under, how dark its shade, and how narrow, which its dates make up for.
    el.style.setProperty("--depth", String(depth));
    el.style.setProperty("--shade", shadeOf(depth).toFixed(2));
    el.style.setProperty("--narrow", (1 - INSET * depth).toFixed(4));
    el.style.transform = restAt(depth);
    return el;
  }
  /**
   * The stack: the front sheet whole, the next ones a strip apart below it, the rest as a button. The
   * front sheet comes first in the page, so Tab and screen readers take its stickers before the
   * edges of the sheets behind it; the CSS stacks them the other way.
   */
  function renderStack() {
    const active = doc.activeElement;
    const focused = active instanceof HTMLElement && stack.contains(active) ? active : null;
    const focusedId = focused?.closest<HTMLElement>(".tray__slot")?.dataset.id;
    if (!ui.order.length) resetOrder();
    // Its press area ends where its foot does: the edges it shows, and the +N button once sheets hide.
    stack.style.setProperty("--stack-foot", px(stackFootFor(ui.order.length)));
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
    for (let i = 0; i <= k; i++) kids.push(sheetEl(order[i], i, { news }));
    if (hidden > 0) {
      const more = make("button", "tray__depth", icon(ICONS.stack), make("span", "", `+${hidden}`));
      more.type = "button";
      more.style.transform = `translateY(${(ui.sheetH + (k * PEEK + DEPTH_GAP) / ui.fit.scale).toFixed(1)}px) scale(${(1 / ui.fit.scale).toFixed(4)})`;
      const spread = i18next.t(($) => $.stickerBoard.tray.moreSheets, { count: hidden });
      more.setAttribute("aria-label", spread);
      kids.push(more);
    }
    stack.replaceChildren(...kids);
    if (focused) keepFocus(focusedId);
    markShown();
  }
  const holdsFocus = (el: Element | undefined) => el?.contains(doc.activeElement) === true;
  /** Redrawn under a keyboard, the stack keeps focus: on the same sticker if it's still in front. */
  function keepFocus(id: string | undefined) {
    const front = stack.querySelector(".tray__sheet.is-top");
    const same = id && front ? slotFor(id, front) : null;
    (same ?? front?.querySelector<HTMLElement>(".tray__slot") ?? stack).focus({
      preventScroll: true,
    });
  }
  /**
   * Rebuilds the sheets for the stickers as they are now. Out of sight, under a hand, mid-turn or
   * while a sticker flies into its slot, they wait: a sheet redrawn there would drop what's being
   * done to it.
   */
  function redraw() {
    if (!ui.onShow) {
      ui.stale = true;
      return;
    }
    if (ui.model.count !== ui.orderedFor || ui.order.some((f) => f >= ui.model.count)) resetOrder();
    if (ui.g || ui.busy || ui.landing.size > 0) {
      ui.stale = true;
      return;
    }
    ui.stale = false;
    rerenderPulled();
    renderStack();
  }
  /** A press or a turn is over: the sheets catch up with what changed during it. */
  const catchUp = () => {
    if (ui.stale) redraw();
  };
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
    p?.el.querySelector(".tray__sheet")?.replaceWith(sheetEl(p.f, 0, { pulled: true }));
  }

  return {
    restAt,
    stackInset,
    stackHome,
    stackOnBoard,
    placeOf,
    slotFor,
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
    sayStuckOn,
    sayReturned,
    sayFilter,
  };
}

export type TraySheets = ReturnType<typeof createTraySheets>;
