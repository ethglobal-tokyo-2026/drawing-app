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

/** An Apple Pencil held at an angle: trusted pen events with pressure and tilt, hovering with no buttons. */
export async function pencil(page: Page) {
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
export type Pencil = Awaited<ReturnType<typeof pencil>>;

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

/** A finger or a palm on the glass: its id, where it is, and its contact's radius in CSS px. */
export type Contact = At & { id: number; radius: number };

/**
 * Fingers and palms. A start or a move lists every contact still down, as the protocol asks, and
 * presses what's new; an end lifts the contacts it lists, or with none listed, every contact.
 */
export async function hand(page: Page) {
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
    down: (contacts: Contact[]) => send("touchStart", contacts),
    move: (contacts: Contact[]) => send("touchMove", contacts),
    /** Lifts `contacts`, or every contact still down; a move that leaves one out doesn't lift it. */
    up: (contacts: Contact[] = []) => send("touchEnd", contacts),
  };
}
export type Hand = Awaited<ReturnType<typeof hand>>;

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
