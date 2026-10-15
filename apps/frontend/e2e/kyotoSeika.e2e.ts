import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { PEEK } from "../src/kyoto-seika/dealMotion.ts";
import { eraseTestLine, readKeptHistory } from "./emptySeal.ts";
import {
  boardSticker,
  canvas,
  drawAndSeal,
  drawKeyName,
  openDetail,
  openSettings,
  say,
  signIn,
  signedInUserId,
  ticketSnapshot,
} from "./helpers.ts";
import { along, inkAt, inkedPixels, middle, pencil, penStroke } from "./pen.ts";

const { kyotoSeika, stickerBoard, stickerCreation, ui } = strings;
const evidence = fileURLToPath(
  new URL("../../../data/verification/empty-seal-preview-2026-10-11/", import.meta.url),
);
const language = "ja";
test.use({ locale: "ja-JP" });

/** The deal's clouds, a group named for screen readers. */
const subjectGroup = (page: Page) =>
  page.getByRole("group", { name: say(kyotoSeika.balloons.label, language) });

/** Each cloud is a toggle, named by its word: in Japanese the word alone. */
const toggles = (page: Page) => subjectGroup(page).locator("[aria-pressed]");
const toggle = (page: Page, word: string) =>
  subjectGroup(page).getByRole("button", { name: word, exact: true });

/**
 * A point near the edge of the cloud named `word`, on the screen: the point of its white farthest
 * from its middle, stepped in past the cloud's drift. Where a tap meant for the cloud is likeliest to
 * miss it.
 */
async function cloudEdge(page: Page, word: string) {
  return toggle(page, word).evaluate((key) => {
    const STEP_IN_PX = 6;
    const fill = key.closest(".subject-balloon")?.querySelector<SVGPathElement>(".shape-fill");
    const toUser = fill?.getScreenCTM()?.inverse();
    if (!fill || !toUser) throw new Error("The cloud has no white");
    const box = fill.getBoundingClientRect();
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const reach = (p: { x: number; y: number }) => Math.hypot(p.x - middle.x, p.y - middle.y);
    let edge = middle;
    for (let i = 0; i <= 40; i++)
      for (let j = 0; j <= 40; j++) {
        const at = { x: box.left + (box.width * i) / 40, y: box.top + (box.height * j) / 40 };
        const inside = fill.isPointInFill(new DOMPoint(at.x, at.y).matrixTransform(toUser));
        if (inside && reach(at) > reach(edge)) edge = at;
      }
    const step = STEP_IN_PX / reach(edge);
    return { x: edge.x + (middle.x - edge.x) * step, y: edge.y + (middle.y - edge.y) * step };
  });
}

interface Dealt {
  word: string;
  picked: boolean;
}

/**
 * The subjects dealt, in their places, each with whether it's picked. The clouds all come at once, so
 * the first one showing means they all are.
 */
async function dealt(page: Page): Promise<Dealt[]> {
  await expect(toggles(page).first()).toBeAttached();
  return toggles(page).evaluateAll((keys) =>
    keys.map((key) => ({ word: key.ariaLabel ?? "", picked: key.ariaPressed === "true" })),
  );
}

/**
 * Rolls the die and waits until every place not picked was dealt another word, and every picked one
 * kept its word and its pick. Resolves with the new deal.
 */
async function roll(page: Page) {
  const before = await dealt(page);
  await page
    .getByRole("button", { name: say(kyotoSeika.balloons.reroll, language), exact: true })
    .click();
  await expect
    .poll(async () =>
      (await dealt(page)).every(({ word, picked }, place) =>
        before[place].picked
          ? picked && word === before[place].word
          : !picked && word !== before[place].word,
      ),
    )
    .toBe(true);
  return dealt(page);
}

const runningClock = new RegExp(
  `^${say(stickerCreation.timer.status.running, language, { time: "TIME" }).replace("TIME", "(\\d+):(\\d\\d)")}$`,
);

/** The seconds left on the timer dot while its clock runs, or null while it waits or is paused. */
async function secondsLeft(page: Page) {
  const timer = page.getByRole("button", {
    name: say(stickerCreation.timer.label, language),
    exact: true,
  });
  const said = await timer.evaluate((dot) => {
    const id = dot.getAttribute("aria-describedby");
    return id ? (document.getElementById(id)?.textContent ?? "") : "";
  });
  const match = said.match(runningClock);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

test("Kyoto Seika Begin keeps time running after an empty eraser", async ({ page }) => {
  await signIn(page, "kyoto-empty-eraser", language);
  const on = await page.request.post("/api/me/kyoto-seika-practice", {
    headers: { "x-croquis-user-id": await signedInUserId(page) },
    data: { kyotoSeikaPractice: true },
  });
  expect(on.ok()).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
    .click();
  const [first, second] = await dealt(page);
  await toggle(page, first.word).click();
  await toggle(page, second.word).click();
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  await expect.poll(() => secondsLeft(page)).toBeGreaterThan(KYOTO_SEIKA_TIME_USED_S - 60);
  const before = await ticketSnapshot(page);
  const atBegin = await secondsLeft(page);
  await page
    .getByRole("button", { name: say(stickerCreation.tools.eraser, language), exact: true })
    .click();
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The drawing sheet is not visible");
  const points = along(box, 0.5, 0.3, 0.7, 12);
  await penStroke(page, await pencil(page), points, () => 0.5, 8);
  expect(atBegin).toBeGreaterThan(KYOTO_SEIKA_TIME_USED_S - 60);
  await expect.poll(() => secondsLeft(page)).toBeLessThan(atBegin ?? 0);
  await expect(
    page.getByRole("button", { name: say(stickerCreation.history.undo, language), exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: say(stickerCreation.seal.label, language), exact: true }),
  ).toBeHidden();
  await expect.poll(() => inkAt(page, middle(points))).toBe(0);
  expect(await ticketSnapshot(page)).toEqual(before);
});

test("empty Kyoto Seika time-up retains its pair on reload", async ({ page }) => {
  await page.clock.install();
  const sealRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/stickers")
      sealRequests.push(request.url());
  });
  await signIn(page, "kyoto-empty-seal", language);
  const settings = await openSettings(page, language);
  await settings
    .getByRole("switch", { name: say(stickerBoard.settings.kyotoSeika.spokenName, language) })
    .click();
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await page
    .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
    .click();
  const [first, second] = await dealt(page);
  await toggle(page, first.word).click();
  await toggle(page, second.word).click();
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The drawing sheet is not visible");
  await expect(async () => {
    await penStroke(page, await pencil(page), along(box, 0.5, 0.45, 0.55, 12), () => 0.5, 8);
    await expect.poll(() => inkedPixels(page, ".ink-sheet"), { timeout: 2_000 }).toBeGreaterThan(0);
  }).toPass();
  await expect(
    page.getByRole("button", { name: say(stickerCreation.history.undo, language) }),
  ).toBeEnabled();
  await eraseTestLine(page, language);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await expect.poll(() => secondsLeft(page)).toBeGreaterThan(0);
  const before = await ticketSnapshot(page);
  await expect
    .poll(async () => (await readKeptHistory(page)).steps)
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tool: "brush",
          pts: expect.arrayContaining([expect.any(Number)]),
        }),
        expect.objectContaining({
          tool: "eraser",
          pts: expect.arrayContaining([expect.any(Number)]),
        }),
      ]),
    );
  const keptBefore = await readKeptHistory(page);
  expect(keptBefore.count).toBe(keptBefore.steps.length);
  expect(keptBefore.identity).toEqual(
    expect.objectContaining({ ticket: expect.any(Number), generation: expect.any(String) }),
  );
  expect(keptBefore.frame).toEqual(
    expect.objectContaining({
      w: expect.any(Number),
      h: expect.any(Number),
      density: expect.any(Number),
    }),
  );
  for (let ms = 0; ms < KYOTO_SEIKA_TIME_USED_S * 1000; ms += 5000)
    await page.clock.fastForward(5000);
  for (const reload of [false, true]) {
    if (reload) {
      await page.reload();
      await page
        .getByRole("button", { name: say(stickerBoard.board.continueDrawing, language) })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: say(stickerCreation.sealSheet.pencilsDown, language) }),
    ).toBeVisible();
    await expect(
      page.getByText(say(stickerCreation.sealSheet.empty, language), { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".seal-sheet__pair")).toContainText(first.word);
    await expect(page.locator(".seal-sheet__pair")).toContainText(second.word);
    await expect(page.locator(".seal-sheet__preview-status")).toBeFocused();
    expect(await ticketSnapshot(page)).toEqual(before);
    expect(await readKeptHistory(page)).toEqual(keptBefore);
    expect(sealRequests).toHaveLength(0);
    if (reload) {
      await mkdir(evidence, { recursive: true });
      await page.screenshot({
        path: `${evidence}/time-up-kyoto-seika-${test.info().project.name}.png`,
        animations: "disabled",
      });
    }
  }
  await page.getByRole("button", { name: say(stickerCreation.seal.startOver, language) }).click();
  await expect(page.locator(".seal-sheet:not(.is-leaving)")).toHaveCount(0);
  await expect.poll(async () => (await readKeptHistory(page)).steps).toEqual([]);
});

test("Kyoto Seika Practice Mode: switched on in Settings, dealt, picked, timed and sealed with its pair", async ({
  page,
}) => {
  await page.clock.install();
  await signIn(page, "kyoto", language);
  const settings = await openSettings(page, language);
  const mode = settings.getByRole("switch", {
    name: say(stickerBoard.settings.kyotoSeika.spokenName, language),
  });

  // The censor bar is a sight gag over the name: a tap peels on its label and leaves the switch alone.
  // It's hidden from screen readers, so it's found by the character it hides.
  const bar = settings
    .getByText(say(stickerBoard.settings.kyotoSeika.hidden, language), { exact: true })
    .locator("xpath=..");
  await bar.tap();
  await expect(settings.getByText(say(kyotoSeika.censor.why, language))).toBeVisible();
  await expect(mode).not.toBeChecked();

  await mode.click();
  await expect(mode).toBeChecked();
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await page
    .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
    .click();

  // No two subjects alike, none picked, and Begin waits for two picks.
  const pickTwo = page.getByRole("button", {
    name: say(kyotoSeika.begin.pick, language),
    exact: true,
  });
  const begin = page.getByRole("button", {
    name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
  });
  const first = await dealt(page);
  expect(first.some(({ picked }) => picked)).toBe(false);
  expect(new Set(first.map(({ word }) => word)).size).toBe(first.length);
  await expect(pickTwo).toBeDisabled();

  // With nothing picked, a roll deals every place again.
  const rolled = await roll(page);

  // Picked in this order, so the pair keeps it rather than the places'.
  const [firstPick, secondPick] = [rolled[3].word, rolled[0].word];
  await toggle(page, firstPick).click();
  await expect(toggle(page, firstPick)).toHaveAttribute("aria-pressed", "true");
  await expect(pickTwo).toBeDisabled();
  await toggle(page, secondPick).click();
  await expect(toggle(page, secondPick)).toHaveAttribute("aria-pressed", "true");
  await expect(begin).toBeEnabled();

  // With two picked, the rest refuse a tap until one is unpicked.
  const rest = rolled.map(({ word }) => word).filter((w) => w !== firstPick && w !== secondPick);
  for (const word of rest)
    await expect(toggle(page, word)).toHaveAttribute("aria-disabled", "true");
  await toggle(page, rest[0]).click({ force: true });
  await expect(toggle(page, rest[0])).toHaveAttribute("aria-pressed", "false");
  await toggle(page, secondPick).click();
  await expect(toggle(page, secondPick)).toHaveAttribute("aria-pressed", "false");
  await expect(toggle(page, rest[0])).not.toHaveAttribute("aria-disabled", "true");
  await expect(pickTwo).toBeDisabled();
  await toggle(page, secondPick).click();
  await expect(begin).toBeEnabled();

  // With two picked, a tap at the edge of a picked cloud's white unpicks it, and another can be picked.
  const edge = await cloudEdge(page, secondPick);
  await page.mouse.click(edge.x, edge.y);
  await expect(toggle(page, secondPick)).toHaveAttribute("aria-pressed", "false");
  await expect(pickTwo).toBeDisabled();
  await page.mouse.click(edge.x, edge.y);
  await expect(toggle(page, secondPick)).toHaveAttribute("aria-pressed", "true");
  await expect(begin).toBeEnabled();

  // A roll deals the rest again and never touches a pick.
  const kept = await roll(page);

  // A reload lands on the board, whose Draw key now continues the waiting sheet, with the same five
  // and the same picks.
  await page.reload();
  await page
    .getByRole("button", { name: say(stickerBoard.board.continueDrawing, language) })
    .click();
  expect(await dealt(page)).toEqual(kept);

  // Begin starts the full clock at once; tool sheets pause it during recording.
  await begin.click();
  await expect.poll(() => secondsLeft(page)).toBeGreaterThan(KYOTO_SEIKA_TIME_USED_S - 60);
  await page
    .getByRole("button", { name: say(stickerCreation.tools.color, language), exact: true })
    .click();
  const colorSheet = page.getByRole("dialog", {
    name: say(stickerCreation.colorSheet.title, language),
  });
  await expect(colorSheet).toBeVisible();
  const clockFace = page.locator(".timer-time");
  const atOpen = await clockFace.textContent();
  expect(atOpen).not.toBeNull();
  await expect.poll(() => secondsLeft(page)).toBeNull();
  await page.clock.fastForward(2000);
  await expect(clockFace).toHaveText(atOpen ?? "");
  await expect(colorSheet).toBeVisible();
  await colorSheet
    .getByRole("button", {
      name: say(ui.sheet.close, language, {
        label: say(stickerCreation.colorSheet.title, language),
      }),
    })
    .click();
  await expect(colorSheet).toBeHidden();
  await expect.poll(() => secondsLeft(page)).not.toBeNull();
  const atClose = await secondsLeft(page);
  await page.clock.fastForward(2000);
  await expect.poll(() => secondsLeft(page)).toBeLessThan(atClose ?? 0);

  // The begun canvas carries the picked pair in the order picked, and so does the sealed sticker's
  // detail.
  const pair = { first: firstPick, second: secondPick };
  await expect(canvas(page, language)).toHaveAccessibleName(
    say(kyotoSeika.print.canvas, language, pair),
  );
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const detail = await openDetail(page, language, no);
  await expect(detail.getByText(say(kyotoSeika.thought.spoken, language, pair))).toBeAttached();
});

/** A sticker drawn in Kyoto Seika Practice Mode, sealed from a fresh deal's first two subjects. */
async function sealKyotoSeikaSticker(page: Page) {
  const on = await page.request.post("/api/me/kyoto-seika-practice", {
    headers: { "x-croquis-user-id": await signedInUserId(page) },
    data: { kyotoSeikaPractice: true },
  });
  expect(on.ok()).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
    .click();
  const [first, second] = await dealt(page);
  await toggle(page, first.word).click();
  await toggle(page, second.word).click();
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const sticker = boardSticker(page, language, no);
  await expect(sticker).toBeVisible();
  return { sticker, words: [first.word, second.word] };
}

/** How long a peek plays, from the tap to the end of its fade. */
const PEEK_MS = PEEK.wordAfterMs + PEEK.cloudStaggerMs + PEEK.wordMs + PEEK.holdMs + PEEK.fadeMs;

test("Kyoto Seika Practice Mode: a tap that selects its sticker peeks at the pair, and a drag doesn't", async ({
  page,
}, testInfo) => {
  await signIn(page, "peek", language);
  const { sticker, words } = await sealKyotoSeikaSticker(page);
  // Hidden from screen readers, so found by its class; the sticker's name says the pair instead.
  const thought = page.locator(".thought-layer .subject-thought");
  await expect(sticker).toHaveAccessibleName(
    new RegExp(say(kyotoSeika.thought.spoken, language, { first: words[0], second: words[1] })),
  );

  await sticker.click();
  await expect(sticker).toHaveAttribute("aria-pressed", "true");
  await expect(thought).toBeVisible();
  for (const word of words) await expect(thought).toContainText(word);
  const gaps = await sticker.evaluate(async (selected) => {
    // Where the trails meet the sticker once their bubbles have popped in, however late that began.
    await Promise.all(
      [...document.querySelectorAll(".thought-layer .subject-trail g")].flatMap((bead) =>
        bead.getAnimations().map((motion) => motion.finished),
      ),
    );
    const stage = selected.parentElement?.getBoundingClientRect();
    if (!stage) throw new Error("The selected sticker has no board stage");
    const style = getComputedStyle(selected);
    const [ox, oy] = style.transformOrigin.split(" ").map(parseFloat);
    const toSticker = new DOMMatrix()
      .translate(stage.left + ox, stage.top + oy)
      .multiply(new DOMMatrix(style.transform))
      .translate(-ox, -oy)
      .inverse();
    const w = parseFloat(style.width);
    const h = parseFloat(style.height);
    const image = selected.querySelector<HTMLImageElement>(".sticker-figure__img");
    if (!image?.complete) throw new Error("The sticker image has not loaded");
    const cut = document.createElement("canvas");
    cut.width = Math.ceil(w);
    cut.height = Math.ceil(h);
    const ink = cut.getContext("2d");
    if (!ink) throw new Error("The sticker's cut could not be measured");
    ink.drawImage(image, 0, 0, w, h);
    const pixels = ink.getImageData(0, 0, cut.width, cut.height).data;
    return [...document.querySelectorAll<SVGSVGElement>(".thought-layer .subject-trail")].map(
      (trail) => {
        const last = trail.lastElementChild;
        const transform = last instanceof SVGGraphicsElement ? last.getScreenCTM() : null;
        if (!transform) throw new Error("The thought trail has no last bubble");
        const point = new DOMPoint().matrixTransform(transform).matrixTransform(toSticker);
        let distance = Infinity;
        for (
          let y = Math.max(0, Math.floor(point.y - 7));
          y < Math.min(cut.height, point.y + 7);
          y++
        )
          for (
            let x = Math.max(0, Math.floor(point.x - 7));
            x < Math.min(cut.width, point.x + 7);
            x++
          )
            if (pixels[(y * cut.width + x) * 4 + 3] > 0)
              distance = Math.min(distance, Math.hypot(x + 0.5 - point.x, y + 0.5 - point.y));
        return distance;
      },
    );
  });
  expect(gaps).toHaveLength(2);
  for (const gap of gaps) expect(gap).toBeLessThanOrEqual(6);
  await page.screenshot({ path: testInfo.outputPath("subject-thought-phone.png") });
  await expect(thought).toHaveCount(0, { timeout: PEEK_MS * 2 });

  // Let go of, then picked up by a drag: selected, with no peek.
  await page.keyboard.press("Escape");
  await expect(sticker).toHaveAttribute("aria-pressed", "false");
  const box = await sticker.boundingBox();
  if (!box) throw new Error("The sticker has no box");
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 40, { steps: 8 });
  await expect(sticker).toHaveAttribute("aria-pressed", "true");
  // Counted once each, after a peek would have arrived: a retried count would pass once one faded.
  const arrived = PEEK.wordAfterMs + PEEK.cloudStaggerMs + PEEK.wordMs;
  await page.waitForTimeout(arrived);
  expect(await thought.count()).toBe(0);
  await page.mouse.up();
  await page.waitForTimeout(arrived);
  expect(await thought.count()).toBe(0);

  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1024, height: 900 });
  await sticker.click();
  await expect(thought).toBeVisible();
  await page.waitForTimeout(arrived);
  await page.screenshot({ path: testInfo.outputPath("subject-thought-large.png") });
});
