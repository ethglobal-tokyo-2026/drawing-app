import {
  DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { expect, type Page } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { canvas, drawKeyName, say, signIn, signedInUserId } from "./helpers.ts";
import {
  along,
  at,
  FINGERTIP,
  hand,
  inkShows,
  middle,
  pencil,
  penStroke,
  touchStroke,
  type At,
} from "./pen.ts";
import { readKeptHistory } from "./emptySeal.ts";

const creation = strings.stickerCreation;
export const chip = (page: Page, id: number) => page.locator(`[data-layer-chip="${id}"]`);
export const button = (page: Page, name: { en: string; ja?: string }, language: Language = "en") =>
  page.getByRole("button", { name: say(name, language), exact: true });
export const add = (page: Page) => button(page, creation.layers.add);
export const undo = (page: Page) => button(page, creation.history.undo);
export const slider = (page: Page) =>
  page.getByRole("slider", { name: say(creation.opacitySlider.label, "en") });

/** Opens a fresh sheet after its ticket spend and opening motion finish. */
export async function openSheet(
  page: Page,
  who = "layers",
  language: Language = "en",
  kyotoSeika = false,
) {
  await signIn(page, who, language);
  if (kyotoSeika) {
    const changed = await page.request.post("/api/me/kyoto-seika-practice", {
      headers: { "x-croquis-user-id": await signedInUserId(page) },
      data: { kyotoSeikaPractice: true },
    });
    expect(changed.ok()).toBe(true);
    await page.reload();
  }
  const spent = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/tickets/spend",
  );
  await button(page, {
    en: drawKeyName(
      language,
      kyotoSeika ? KYOTO_SEIKA_DAILY_TICKETS_PER_DAY : DAILY_TICKETS_PER_DAY,
    ),
  }).click();
  const response = await spent;
  expect(response.status()).toBe(201);
  await response.finished();
  if (kyotoSeika) {
    const subjects = page
      .getByRole("group", { name: say(strings.kyotoSeika.balloons.label, language) })
      .locator("[aria-pressed]");
    await subjects.nth(0).click();
    await subjects.nth(1).click();
    await button(page, {
      en: say(strings.kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    }).click();
  }
  await canvas(page, language).hover();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".drawing-screen")).not.toHaveClass(
    /is-dealt|is-deal-leaving|is-retrying/,
  );
  if (!kyotoSeika)
    await expect(
      page.getByText(say(creation.timer.note.startsWhenYouDraw, language)).first(),
    ).toBeVisible();
}

export async function sheetBox(page: Page, language: Language = "en") {
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The drawing sheet is not visible");
  return box;
}

/** A horizontal mark inside the sheet, clear of layer controls. */
export async function line(page: Page, down: number, from = 0.3, to = 0.7) {
  const points = along(await sheetBox(page), down, from, to, 12);
  await penStroke(page, await pencil(page), points, () => 0.5, 8);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  return middle(points);
}

/** A closed boundary with clear inside and outside sample positions. */
export async function boundary(page: Page) {
  const box = await sheetBox(page);
  const points = [
    ...along(box, 0.3, 0.3, 0.7, 12),
    ...Array.from({ length: 13 }, (_, i) => at(box, 0.7, 0.3 + (0.4 * i) / 12)),
    ...along(box, 0.7, 0.7, 0.3, 12),
    ...Array.from({ length: 13 }, (_, i) => at(box, 0.3, 0.7 - (0.4 * i) / 12)),
  ];
  await penStroke(page, await pencil(page), points, () => 0.5, 8);
  await inkShows(page, at(box, 0.5, 0.3));
  return box;
}

export async function fillAt(page: Page, point: At) {
  const pen = await pencil(page);
  await pen.down(point, 0.5);
  await pen.up(point);
}

export async function color(page: Page, name: keyof typeof creation.colorSheet.swatchNames) {
  const key = button(page, creation.tools.color);
  await key.click();
  await expect(key).toHaveAttribute("aria-expanded", "true");
  const sheet = page.getByRole("dialog", { name: creation.colorSheet.title.en });
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole("radiogroup", { name: creation.colorSheet.swatches.en })
    .getByRole("radio", { name: creation.colorSheet.swatchNames[name].en, exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
}

/** The visible composite at one CSS point, including each canvas group's opacity. */
export async function shownColor(page: Page, point: At) {
  return page.evaluate(({ x, y }) => {
    const sample = document.createElement("canvas");
    sample.width = sample.height = 1;
    try {
      const g = sample.getContext("2d", { willReadFrequently: true });
      if (!g) throw new Error("No context for the ink color sample");
      for (const ink of document.querySelectorAll<HTMLCanvasElement>(".ink-sheet .ink-canvas")) {
        const box = ink.getBoundingClientRect();
        if (
          !ink.width ||
          !ink.height ||
          !box.width ||
          !box.height ||
          getComputedStyle(ink).visibility !== "visible"
        )
          continue;
        let opacity = 1;
        for (let el: Element | null = ink; el; el = el.parentElement)
          opacity *= Number(getComputedStyle(el).opacity);
        g.globalAlpha = opacity;
        g.drawImage(
          ink,
          ((x - box.left) * ink.width) / box.width,
          ((y - box.top) * ink.height) / box.height,
          1,
          1,
          0,
          0,
          1,
          1,
        );
      }
      return [...g.getImageData(0, 0, 1, 1).data];
    } finally {
      sample.width = sample.height = 0;
    }
  }, point);
}

/** Selecting another chip and opening its options are separate taps. */
export async function options(page: Page, id: number) {
  if ((await chip(page, id).getAttribute("aria-selected")) !== "true") {
    await chip(page, id).click();
    await expect(chip(page, id)).toHaveAttribute("aria-selected", "true");
  }
  if ((await chip(page, id).getAttribute("aria-expanded")) !== "true") await chip(page, id).click();
  await expect(button(page, creation.layers.delete)).toBeVisible();
}

export async function addLayer(page: Page) {
  const ids = await page
    .locator("[data-layer-chip]")
    .evaluateAll((chips) => chips.map((chip) => Number(chip.getAttribute("data-layer-chip"))));
  await add(page).click();
  await expect(page.locator("[data-layer-chip]")).toHaveCount(ids.length + 1);
  await expect(chip(page, Math.max(...ids) + 1)).toHaveAttribute("aria-selected", "true");
  const hint = button(page, creation.layers.dismissOptionsHint);
  if (await hint.isVisible()) await hint.click();
}

export async function selectFillReference(page: Page, reference: "layer" | "visible") {
  await button(page, creation.tools.fill).click();
  const choice = page
    .getByRole("radiogroup", { name: creation.fillReference.label.en })
    .getByRole("radio", { name: creation.fillReference[reference].en, exact: true });
  await choice.click();
  await expect(choice).toBeChecked();
}

/** Four real outlined cells; the second is narrower than a sparse move's reach. */
export async function outlinedCells(page: Page, input: "pen" | "touch" = "pen") {
  await color(page, "blue");
  await button(page, creation.tools.brush).click();
  const box = await sheetBox(page);
  const edges = [0.2, 0.36, 0.43, 0.59, 0.8];
  const pen = input === "pen" ? await pencil(page) : null;
  const fingers = input === "touch" ? await hand(page) : null;
  const draw = async (points: At[]) => {
    if (pen) await penStroke(page, pen, points, () => 0.5, 8);
    else if (fingers) await touchStroke(page, fingers, points, FINGERTIP);
    else throw new Error("Outlined cells have no input device");
  };
  const vertical = (edge: number, from: number, to: number) =>
    Array.from({ length: 13 }, (_, i) => at(box, edge, from + ((to - from) * i) / 12));
  const outline = [
    ...along(box, 0.35, edges[0], edges[4], 24),
    ...vertical(edges[4], 0.35, 0.65),
    ...along(box, 0.65, edges[4], edges[0], 24),
    ...vertical(edges[0], 0.65, 0.35),
  ];
  await draw(outline);
  for (const edge of edges.slice(1, -1)) await draw(vertical(edge, 0.35, 0.65));
  const centers = edges.slice(0, -1).map((edge, i) => at(box, (edge + edges[i + 1]) / 2, 0.5));
  const boundaries = edges.slice(1, -1).map((edge) => at(box, edge, 0.5));
  for (const point of centers)
    await expect.poll(() => shownColor(page, point)).toEqual([0, 0, 0, 0]);
  for (const point of boundaries)
    await expect.poll(() => shownColor(page, point)).toEqual([47, 107, 255, 255]);
  return { box, centers, boundaries };
}

/** One sparse move can cross more than one cell; lift contributes its own endpoint. */
export async function fillSweep(page: Page, points: At[]) {
  const pen = await pencil(page);
  await pen.down(points[0], 0.5);
  for (const point of points.slice(1, -1)) await pen.move(point, 0.5);
  await pen.up(points[points.length - 1]);
}

export async function resumeSheet(page: Page, controlledClock = false) {
  await button(page, strings.stickerBoard.board.continueDrawing).click();
  if (controlledClock)
    await expect
      .poll(async () => {
        await page.clock.runFor(40);
        return canvas(page, "en").isVisible();
      })
      .toBe(true);
  await canvas(page, "en").hover({ force: controlledClock });
  const resume = button(page, creation.timer.resume);
  if (controlledClock)
    await expect
      .poll(async () => {
        await page.clock.runFor(40);
        return resume.isVisible();
      })
      .toBe(true);
  if (await resume.isVisible()) await resume.click();
  if (controlledClock) await expect(button(page, creation.timer.pause)).toBeVisible();
}

export async function fillSteps(page: Page) {
  return (await readKeptHistory(page)).steps.filter(
    (step): step is Record<string, unknown> =>
      typeof step === "object" && step !== null && "tool" in step && step.tool === "fill",
  );
}

interface FillCanvasIdentity {
  raw: HTMLCanvasElement | null;
  wet: HTMLCanvasElement;
  box: { x: number; y: number; width: number; height: number };
}
declare global {
  interface Window {
    fillCanvasIdentity?: FillCanvasIdentity;
  }
}

/** Retains the selected raw canvas and wet canvas before preview changes visibility or clipping. */
export async function captureFillCanvases(page: Page, clipped = false) {
  await page.evaluate((clipped) => {
    const group = document.querySelector(".ink-current");
    const mounted = group ? [...group.querySelectorAll("canvas")] : [];
    // A selected clipped layer appends its display view after raw ink and wet.
    const canvases = clipped ? mounted.slice(0, -1) : mounted;
    const first = canvases[0];
    if (!(first instanceof HTMLCanvasElement))
      throw new Error("The selected layer has no wet canvas");
    const raw = canvases.length > 1 ? first : null;
    const wet = canvases.length > 1 ? canvases[1] : first;
    if (!(wet instanceof HTMLCanvasElement))
      throw new Error("The selected layer has no wet canvas");
    const box = group?.getBoundingClientRect();
    if (!box) throw new Error("The selected layer has no sheet box");
    window.fillCanvasIdentity = {
      raw,
      wet,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  }, clipped);
}

export async function rawFillDigest(page: Page) {
  return page.evaluate(async () => {
    const raw = window.fillCanvasIdentity?.raw;
    if (!raw) return "blank";
    const g = raw.getContext("2d");
    if (!g) throw new Error("Selected raw canvas has no context");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      g.getImageData(0, 0, raw.width, raw.height).data,
    );
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  });
}

export async function wetFillColor(page: Page, point: At) {
  return page.evaluate(({ x, y }) => {
    const identity = window.fillCanvasIdentity;
    if (!identity) throw new Error("Fill canvas identities were not retained");
    const { wet, box } = identity;
    const g = wet.getContext("2d");
    if (!g) throw new Error("Wet canvas has no context");
    return [
      ...g.getImageData(
        Math.floor(((x - box.x) * wet.width) / box.width),
        Math.floor(((y - box.y) * wet.height) / box.height),
        1,
        1,
      ).data,
    ];
  }, point);
}

/** Touch timestamps follow controlled browser time while native hand input and capture remain intact. */
export async function controlTouchTime(page: Page) {
  await page.evaluate(() => {
    for (const type of ["pointerdown", "pointermove", "pointerup"])
      document.addEventListener(
        type,
        (event) => {
          if (event instanceof PointerEvent && event.pointerType === "touch")
            Object.defineProperty(event, "timeStamp", { value: performance.now() });
        },
        true,
      );
  });
}

export async function cancelFillPointer(page: Page, type: "pointercancel" | "lostpointercapture") {
  await page.locator(".ink-sheet").evaluate((sheet, type) => {
    sheet.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 2,
        pointerType: "pen",
        clientX: -1000,
        clientY: -1000,
        bubbles: true,
      }),
    );
  }, type);
}

/** Changes only elapsed time after navigation releases the old session keeper. */
export async function nearTimeUp(page: Page, remainingMs: number) {
  const userId = await signedInUserId(page);
  const href = page.url();
  await page.route("**/e2e-fill-clock", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fill clock</title>" }),
  );
  await page.goto("/e2e-fill-clock");
  await page.evaluate(
    async ({ userId, remainingMs }) => {
      const { loadKeptSession } = await import("../src/sticker-creation/session/keptSession.ts");
      const { sessionMs } = await import("../src/sticker-creation/session/session.ts");
      const found = await loadKeptSession(userId);
      if (found.status !== "found") throw new Error(`Cannot prepare time-up from ${found.status}`);
      const key = `draw.session.${userId}`;
      const raw = localStorage.getItem(key);
      const record: unknown = raw ? JSON.parse(raw) : null;
      if (typeof record !== "object" || record === null || !("elapsedMs" in record))
        throw new Error("Saved clock metadata is missing");
      localStorage.setItem(
        key,
        JSON.stringify({
          ...record,
          elapsedMs: sessionMs(found.kyotoSeika !== null) - remainingMs,
        }),
      );
    },
    { userId, remainingMs },
  );
  await page.goto(href);
  await resumeSheet(page, true);
}
