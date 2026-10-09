import type { Page } from "@playwright/test";

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
  /** Where the pen goes next, as the browser would guess it. */
  next?: At;
};

/**
 * Dispatches a pointer event in the page as the browser would: at what's under it, or for a pressed
 * pointer at where it landed, as capture does, with the boundary events of moving between elements.
 * A finger that lifts is gone, so it leaves.
 */
function dispatchPointer(e: PagePointer) {
  const held = window as Window & {
    pointerOver?: Map<number, { over: Element | null; landed: Element | null }>;
  };
  held.pointerOver ??= new Map();
  const state = held.pointerOver.get(e.id) ?? { over: null, landed: null };
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
  const target = state.landed ?? document.elementFromPoint(e.at.x, e.at.y);
  moveTo(target);
  const event = new PointerEvent(e.type, {
    ...init,
    predictedEvents: e.next
      ? [new PointerEvent("pointermove", { ...init, clientX: e.next.x, clientY: e.next.y })]
      : [],
  });
  if (e.time !== undefined)
    Object.defineProperty(event, "timeStamp", { value: e.time - performance.timeOrigin });
  target?.dispatchEvent(event);
  if (e.type === "pointerdown") state.landed = target;
  if (e.type !== "pointerup") return;
  state.landed = null;
  if (e.kind === "touch") moveTo(null);
}

function pagePencil(page: Page): Pencil {
  const id = 2;
  let last: At | null = null;
  const send = (
    type: PagePointer["type"],
    at: At,
    force: number,
    pressed: boolean,
    time?: number,
  ) => {
    // A pressed pen's next point, as far on as it just came.
    const next = pressed && last ? { x: 2 * at.x - last.x, y: 2 * at.y - last.y } : undefined;
    last = pressed ? at : null;
    return page.evaluate(dispatchPointer, {
      type,
      id,
      kind: "pen" as const,
      at,
      pressure: force,
      size: 1,
      pressed,
      primary: true,
      time,
      next: type === "pointermove" ? next : undefined,
    });
  };
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

/**
 * How many CSS px of ink a short vertical line through `point` crosses on the canvas `selector`
 * names: how thick a roughly horizontal stroke there came out.
 */
export function inkAt(page: Page, point: At, selector = ".ink-canvas:not(.ink-prediction)") {
  return page.evaluate(
    ({ selector, x, y, band }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) throw new Error(`No canvas at ${selector}`);
      if (canvas.width === 0) return 0;
      const box = canvas.getBoundingClientRect();
      const k = canvas.width / box.width;
      const top = Math.max(0, Math.round((y - band - box.top) * k));
      const bottom = Math.min(canvas.height, Math.round((y + band - box.top) * k));
      if (bottom <= top) return 0;
      const column = ctx.getImageData(Math.round((x - box.left) * k), top, 1, bottom - top).data;
      let inked = 0;
      for (let i = 3; i < column.length; i += 4) if (column[i] > 128) inked++;
      return inked / k;
    },
    { selector, x: point.x, y: point.y, band: BAND },
  );
}

/** The furthest right, in CSS px, that ink reaches along screen row `y`; null on a blank row. */
export function inkReach(page: Page, y: number, selector = ".ink-canvas:not(.ink-prediction)") {
  return page.evaluate(
    ({ selector, y }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) throw new Error(`No canvas at ${selector}`);
      const box = canvas.getBoundingClientRect();
      const k = canvas.width / box.width;
      const row = ctx.getImageData(0, Math.round((y - box.top) * k), canvas.width, 1).data;
      for (let x = canvas.width - 1; x >= 0; x--) if (row[x * 4 + 3] > 128) return box.left + x / k;
      return null;
    },
    { selector, y },
  );
}

/** Waits out two animation frames, so samples already sent are painted. */
export const nextFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );

/** Pixels holding ink anywhere on the canvas `selector` names. */
export function inkedPixels(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width === 0) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let inked = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
    return inked;
  }, selector);
}

/**
 * From now on, counts the animation frames in which the canvas `selector` names holds ink near
 * screen y; resolves with what reads the count. A frame's guess is gone by the next, so only a
 * watch in every frame can see one.
 */
export async function countInkedFrames(page: Page, selector: string, y: number) {
  await page.evaluate(
    ({ selector, y, band }) => {
      const seen = window as Window & { inkedFrames?: number };
      seen.inkedFrames = 0;
      const look = () => {
        const canvas = document.querySelector<HTMLCanvasElement>(selector);
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx && canvas.width > 0) {
          const box = canvas.getBoundingClientRect();
          const k = canvas.height / box.height;
          const top = Math.max(0, Math.round((y - band - box.top) * k));
          const rows = Math.min(canvas.height - top, Math.round(2 * band * k));
          if (rows > 0) {
            const { data } = ctx.getImageData(0, top, canvas.width, rows);
            for (let i = 3; i < data.length; i += 4)
              if (data[i] > 0) {
                seen.inkedFrames = (seen.inkedFrames ?? 0) + 1;
                break;
              }
          }
        }
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    },
    { selector, y, band: BAND },
  );
  return () => page.evaluate(() => (window as Window & { inkedFrames?: number }).inkedFrames ?? 0);
}
