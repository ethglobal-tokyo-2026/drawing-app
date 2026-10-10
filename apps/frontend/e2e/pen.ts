import { expect, type Page } from "@playwright/test";
import { PALM_CONTACT_PX } from "../src/sticker-creation/canvas/gestures.ts";

/** A point on screen, in CSS px. */
export type At = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };

/** The point a share of the way across and down `box`. */
export const at = (box: Box, across: number, down: number): At => ({
  x: box.x + box.width * across,
  y: box.y + box.height * down,
});

/** `steps` moves along a row of `box`, `down` of the way down, from `from` to `to` of the way across. */
export const along = (box: Box, down: number, from: number, to: number, steps = 24): At[] =>
  Array.from({ length: steps + 1 }, (_, i) => at(box, from + ((to - from) * i) / steps, down));

/** The middle of a stroke's points. */
export const middle = (points: At[]) => points[Math.floor(points.length / 2)];

/** An Apple Pencil: it hovers with no buttons, or presses with a force; `time` stamps the event. */
export interface Pencil {
  hover: (point: At) => Promise<unknown>;
  /** `time`: when the event happened, in ms since the epoch. */
  down: (point: At, force: number, time?: number) => Promise<unknown>;
  move: (point: At, force: number, time?: number) => Promise<unknown>;
  up: (point: At, time?: number) => Promise<unknown>;
}

/** A finger or a palm on the glass: its id, where it is, and its contact's radius in CSS px. */
export type Contact = At & { id: number; radius: number };

/** A fingertip's contact radius, well under a palm's. */
export const FINGERTIP = PALM_CONTACT_PX / 8;

/**
 * Fingers and palms. A start or a move lists every contact still down, and presses what's new; an
 * end lifts the contacts it lists, or with none listed, every contact.
 */
export interface Hand {
  down: (contacts: Contact[]) => Promise<unknown>;
  move: (contacts: Contact[]) => Promise<unknown>;
  /** Lifts `contacts`, or every contact still down; a move that leaves one out doesn't lift it. */
  up: (contacts?: Contact[]) => Promise<unknown>;
}

// Playwright has no pen or multi-touch input. Chromium takes them, trusted, through its DevTools
// protocol; WebKit, which has nothing of the kind, gets them dispatched in the page.
const inChromium = (page: Page) => page.context().browser()?.browserType().name() === "chromium";

/** An Apple Pencil held at an angle: pen events with pressure and tilt, hovering with no buttons. */
export const pencil = (page: Page): Promise<Pencil> =>
  inChromium(page) ? devToolsPencil(page) : Promise.resolve(pagePencil(page));

/** Fingers and palms on the glass, each contact as wide as its radius says. */
export const hand = (page: Page): Promise<Hand> =>
  inChromium(page) ? devToolsHand(page) : Promise.resolve(pageHand(page));

async function devToolsPencil(page: Page): Promise<Pencil> {
  const cdp = await page.context().newCDPSession(page);
  const send = (
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    { x, y }: At,
    force: number,
    pressed: boolean,
    /** When the event happened, in ms since the epoch; the browser stamps it on the event. */
    time?: number,
  ) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      pointerType: "pen",
      button: type === "mouseMoved" && !pressed ? "none" : "left",
      buttons: pressed ? 1 : 0,
      clickCount: type === "mouseMoved" ? 0 : 1,
      force,
      tiltX: 30,
      ...(time !== undefined && { timestamp: time / 1000 }),
    });
  return {
    hover: (point: At) => send("mouseMoved", point, 0, false),
    down: (point: At, force: number, time?: number) =>
      send("mousePressed", point, force, true, time),
    move: (point: At, force: number, time?: number) => send("mouseMoved", point, force, true, time),
    up: (point: At, time?: number) => send("mouseReleased", point, 0, false, time),
  };
}

async function devToolsHand(page: Page): Promise<Hand> {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: "touchStart" | "touchMove" | "touchEnd", contacts: Contact[]) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: contacts.map(({ x, y, id, radius }) => ({
        x,
        y,
        id,
        radiusX: radius,
        radiusY: radius,
        force: 1,
      })),
    });
  return {
    down: (contacts) => send("touchStart", contacts),
    move: (contacts) => send("touchMove", contacts),
    up: (contacts = []) => send("touchEnd", contacts),
  };
}

/** One pointer event for `dispatchPointer`. */
type PagePointer = {
  type: "pointerdown" | "pointermove" | "pointerup";
  id: number;
  kind: "pen" | "touch";
  at: At;
  pressure: number;
  /** The contact's size across, in CSS px. */
  size: number;
  pressed: boolean;
  primary: boolean;
  /** When it happened, in ms since the epoch. */
  time?: number;
};

/**
 * Dispatches a pointer event in the page as the browser would: at what's under it, or for a pressed
 * pointer at where it landed, as capture does, with the boundary events of moving between elements.
 * A finger that lifts is gone, so it leaves.
 */
function dispatchPointer(e: PagePointer) {
  const held = window as Window & {
    pointerOver?: Map<
      number,
      {
        over: Element | null;
        landed: Element | null;
        captured: Element | null;
        pressed: boolean;
      }
    >;
  };
  if (!held.pointerOver) {
    const pointers = new Map<
      number,
      { over: Element | null; landed: Element | null; captured: Element | null; pressed: boolean }
    >();
    held.pointerOver = pointers;
    const setPointerCapture: unknown = Reflect.get(Element.prototype, "setPointerCapture");
    const hasPointerCapture: unknown = Reflect.get(Element.prototype, "hasPointerCapture");
    const releasePointerCapture: unknown = Reflect.get(Element.prototype, "releasePointerCapture");
    if (
      typeof setPointerCapture !== "function" ||
      typeof hasPointerCapture !== "function" ||
      typeof releasePointerCapture !== "function"
    ) {
      throw new Error("The browser has no pointer capture methods");
    }
    // Dispatched pointers never enter WebKit's native pointer table. Model capture for these test
    // pointers too; real mouse/touch input still uses the browser's original methods.
    Element.prototype.setPointerCapture = function (id) {
      const pointer = pointers.get(id);
      if (!pointer?.pressed) {
        Reflect.apply(setPointerCapture, this, [id]);
        return;
      }
      if (pointer.captured === this) return;
      pointer.captured?.releasePointerCapture(id);
      pointer.captured = this;
      this.dispatchEvent(new PointerEvent("gotpointercapture", { pointerId: id, bubbles: true }));
    };
    Element.prototype.hasPointerCapture = function (id) {
      const pointer = pointers.get(id);
      return pointer?.pressed
        ? pointer.captured === this
        : Reflect.apply(hasPointerCapture, this, [id]) === true;
    };
    Element.prototype.releasePointerCapture = function (id) {
      const pointer = pointers.get(id);
      if (!pointer?.pressed) {
        Reflect.apply(releasePointerCapture, this, [id]);
        return;
      }
      if (pointer.captured !== this) return;
      pointer.captured = null;
      this.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: id, bubbles: true }));
    };
  }
  const state = held.pointerOver.get(e.id) ?? {
    over: null,
    landed: null,
    captured: null,
    pressed: false,
  };
  held.pointerOver.set(e.id, state);
  const init: PointerEventInit = {
    pointerId: e.id,
    pointerType: e.kind,
    isPrimary: e.primary,
    clientX: e.at.x,
    clientY: e.at.y,
    pressure: e.pressure,
    width: e.size,
    height: e.size,
    tiltX: e.kind === "pen" ? 30 : 0,
    button: e.type === "pointermove" ? -1 : 0,
    buttons: e.pressed ? 1 : 0,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  const boundary = { ...init, bubbles: false, cancelable: false };
  const moveTo = (next: Element | null) => {
    const from = state.over;
    if (next === from) return;
    from?.dispatchEvent(new PointerEvent("pointerout", init));
    for (let el = from; el && !el.contains(next); el = el.parentElement)
      el.dispatchEvent(new PointerEvent("pointerleave", boundary));
    next?.dispatchEvent(new PointerEvent("pointerover", init));
    const entered: Element[] = [];
    for (let el = next; el && !el.contains(from); el = el.parentElement) entered.unshift(el);
    for (const el of entered) el.dispatchEvent(new PointerEvent("pointerenter", boundary));
    state.over = next;
  };
  const target = state.captured ?? state.landed ?? document.elementFromPoint(e.at.x, e.at.y);
  moveTo(target);
  const event = new PointerEvent(e.type, init);
  if (e.time !== undefined)
    Object.defineProperty(event, "timeStamp", { value: e.time - performance.timeOrigin });
  if (e.type === "pointerdown") {
    state.landed = target;
    state.pressed = true;
  }
  target?.dispatchEvent(event);
  if (e.type !== "pointerup") return;
  state.captured?.releasePointerCapture(e.id);
  state.pressed = false;
  state.landed = null;
  if (e.kind === "touch") moveTo(null);
}

function pagePencil(page: Page): Pencil {
  const id = 2;
  const send = (
    type: PagePointer["type"],
    at: At,
    force: number,
    pressed: boolean,
    time?: number,
  ) =>
    page.evaluate(dispatchPointer, {
      type,
      id,
      kind: "pen" as const,
      at,
      pressure: force,
      size: 1,
      pressed,
      primary: true,
      time,
    });
  return {
    hover: (point) => send("pointermove", point, 0, false),
    down: (point, force, time) => send("pointerdown", point, force, true, time),
    move: (point, force, time) => send("pointermove", point, force, true, time),
    up: (point, time) => send("pointerup", point, 0, false, time),
  };
}

function pageHand(page: Page): Hand {
  const down = new Map<number, Contact & { primary: boolean }>();
  const send = (type: PagePointer["type"], c: Contact & { primary: boolean }) =>
    page.evaluate(dispatchPointer, {
      type,
      id: 10 + c.id,
      kind: "touch" as const,
      at: { x: c.x, y: c.y },
      pressure: type === "pointerup" ? 0 : 1,
      size: 2 * c.radius,
      pressed: type !== "pointerup",
      primary: c.primary,
    });
  return {
    down: async (contacts) => {
      for (const c of contacts) {
        if (down.has(c.id)) continue;
        const contact = { ...c, primary: down.size === 0 };
        down.set(c.id, contact);
        await send("pointerdown", contact);
      }
    },
    move: async (contacts) => {
      for (const c of contacts) {
        const was = down.get(c.id);
        if (!was) continue;
        const contact = { ...c, primary: was.primary };
        down.set(c.id, contact);
        await send("pointermove", contact);
      }
    },
    up: async (contacts = []) => {
      const ids = contacts.length ? contacts.map((c) => c.id) : [...down.keys()];
      for (const id of ids) {
        const contact = down.get(id);
        if (!contact) continue;
        down.delete(id);
        await send("pointerup", contact);
      }
    },
  };
}

/**
 * A pen stroke through `points`, pressed `force(i)` at each, `ms` between moves. Each event is
 * stamped `ms` after the last, so the stroke's speed, which sets a width, holds on a busy machine.
 */
export async function penStroke(
  page: Page,
  pen: Pencil,
  points: At[],
  force: (i: number) => number,
  ms = 16,
) {
  const t0 = Date.now();
  // The width model takes at least a millisecond between samples.
  const stamp = (i: number) => t0 + i * Math.max(ms, 1);
  await pen.down(points[0], force(0), stamp(0));
  for (let i = 1; i < points.length; i++) {
    await pen.move(points[i], force(i), stamp(i));
    await page.waitForTimeout(ms);
  }
  await pen.up(points[points.length - 1], stamp(points.length));
}

/** One contact drawn through `points`, `radius` CSS px across its half. */
export async function touchStroke(page: Page, fingers: Hand, points: At[], radius: number) {
  const contact = (point: At): Contact => ({ ...point, id: 1, radius });
  await fingers.down([contact(points[0])]);
  for (const point of points.slice(1)) {
    await fingers.move([contact(point)]);
    await page.waitForTimeout(16);
  }
  await fingers.up();
}

/** CSS px each way from a point that ink is looked for in: a stroke's width, never the next row's. */
const BAND = 48;

/** The drawing screen's paper, whose ink the readers read unless told another container. */
const SHEET = ".ink-sheet";

/** What a reader asks of the ink a container shows, in CSS px on screen. */
type InkQuery =
  /** How many CSS px of ink a vertical line through x crosses within `band` of y. */
  | { kind: "across"; x: number; y: number; band: number }
  /** The furthest right ink reaches along row y. */
  | { kind: "reach"; y: number }
  /** How many device px hold any ink. */
  | { kind: "count" };

/**
 * Runs in the page: what `container` shows, every visible `.ink-canvas` in it composited in DOM order
 * at its effective CSS opacity, skipping 0×0 ones, read for `query`. A stroke in progress is on a
 * canvas of its own, so ink read mid-stroke is there too.
 */
function readShownInk({ container, query }: { container: string; query: InkQuery }) {
  const host = document.querySelector(container);
  if (!host) throw new Error(`Nothing at ${container}`);
  const box = host.getBoundingClientRect();
  const shown = [...host.querySelectorAll<HTMLCanvasElement>(".ink-canvas")].filter((canvas) => {
    const at = canvas.getBoundingClientRect();
    return (
      canvas.width > 0 &&
      canvas.height > 0 &&
      at.width > 0 &&
      at.height > 0 &&
      getComputedStyle(canvas).visibility === "visible"
    );
  });
  if (shown.length === 0 || box.width === 0 || box.height === 0) return null;
  // Device px per CSS px: the densest canvas's, so none loses detail.
  const k = Math.max(...shown.map((canvas) => canvas.width / canvas.getBoundingClientRect().width));
  const out = document.createElement("canvas");
  out.width = Math.round(box.width * k);
  out.height = Math.round(box.height * k);
  try {
    const g = out.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("No 2D context to composite the ink on");
    for (const canvas of shown) {
      let opacity = 1;
      for (let el: Element | null = canvas; el; el = el.parentElement)
        opacity *= Number(getComputedStyle(el).opacity);
      const at = canvas.getBoundingClientRect();
      g.globalAlpha = opacity;
      g.drawImage(
        canvas,
        (at.left - box.left) * k,
        (at.top - box.top) * k,
        at.width * k,
        at.height * k,
      );
    }
    if (query.kind === "count") {
      const { data } = g.getImageData(0, 0, out.width, out.height);
      let inked = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
      return inked;
    }
    if (query.kind === "across") {
      const top = Math.max(0, Math.round((query.y - query.band - box.top) * k));
      const bottom = Math.min(out.height, Math.round((query.y + query.band - box.top) * k));
      if (bottom <= top) return null;
      const column = g.getImageData(Math.round((query.x - box.left) * k), top, 1, bottom - top);
      let inked = 0;
      for (let i = 3; i < column.data.length; i += 4) if (column.data[i] > 128) inked++;
      return inked / k;
    }
    const row = g.getImageData(0, Math.round((query.y - box.top) * k), out.width, 1).data;
    for (let x = out.width - 1; x >= 0; x--) if (row[x * 4 + 3] > 128) return box.left + x / k;
    return null;
  } finally {
    // WebKit counts canvas memory against a budget until it's collected.
    out.width = 0;
    out.height = 0;
  }
}

/**
 * How many CSS px of ink a short vertical line through `point` crosses in what `container` shows:
 * how thick a roughly horizontal stroke there came out.
 */
export async function inkAt(page: Page, point: At, container = SHEET) {
  const query: InkQuery = { kind: "across", x: point.x, y: point.y, band: BAND };
  return (await page.evaluate(readShownInk, { container, query })) ?? 0;
}

/** The furthest right, in CSS px, that ink reaches along screen row `y`; null on a blank row. */
export function inkReach(page: Page, y: number, container = SHEET) {
  const query: InkQuery = { kind: "reach", y };
  return page.evaluate(readShownInk, { container, query });
}

/** Waits until the ink shows at every point, so a stroke's width is read once it's painted. */
export async function inkShows(page: Page, ...points: At[]) {
  for (const point of points) await expect.poll(() => inkAt(page, point)).toBeGreaterThan(0);
}

/** Pixels holding ink anywhere in what `container` shows. */
export async function inkedPixels(page: Page, container: string) {
  const query: InkQuery = { kind: "count" };
  return (await page.evaluate(readShownInk, { container, query })) ?? 0;
}
