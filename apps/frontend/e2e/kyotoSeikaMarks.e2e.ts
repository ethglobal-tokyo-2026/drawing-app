import { expect, type Locator, type Page } from "@playwright/test";
import { openDb } from "../../../packages/db/src/index.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { HOLD_MS } from "../src/kyoto-seika/useHold.ts";
import { E2E_DATABASE } from "./dataDir.ts";
import {
  actorHeaders,
  drawKey,
  envelope,
  isRecord,
  say,
  signIn,
  test as browserTest,
} from "./helpers.ts";
import { E2E_BIGWHEEL_ID, holdPersonPair } from "./personPair.ts";

const { kyotoSeika, stickerBoard } = strings;
const language = "en";
const MARKS = "/api/kyoto-seika/subjects-marked-for-deletion";

const test = browserTest.extend<{ personPairLock: void }>({
  personPairLock: [holdPersonPair, { auto: true }],
});

/** The deal's cloud at `place`: its pick button, which keeps its place across a reload. */
const cloud = (page: Page, place: number) =>
  page
    .getByRole("group", { name: say(kyotoSeika.balloons.label, language) })
    .locator(".subject-balloon__pick")
    .nth(place);

/** The 「トル」 tags on the deal: hidden from screen readers, so found by their class. */
const tags = (page: Page) => page.locator(".subject-balloon__cut");

/** Switches Kyoto Seika Practice Mode for whoever `page` acts as. */
async function setKyotoSeikaPractice(page: Page, on: boolean) {
  const response = await page.request.post("/api/me/kyoto-seika-practice", {
    headers: actorHeaders(await envelope(page)),
    data: { kyotoSeikaPractice: on },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

/** Opens a fresh sheet in Kyoto Seika Practice Mode from the board, and waits for its deal. */
async function openDeal(page: Page) {
  await setKyotoSeikaPractice(page, true);
  await page.reload();
  await drawKey(page, language).click();
  await expect(cloud(page, 0)).toBeVisible();
}

/**
 * Presses `target` at its middle for longer than a hold: a finger's long press in Chromium, which
 * Playwright's touchscreen can't hold down, and a mouse's elsewhere.
 */
async function longPress(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("The cloud isn't on screen");
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const ms = HOLD_MS + 500;
  if (page.context().browser()?.browserType().name() === "chromium") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.synthesizeTapGesture", {
      ...at,
      duration: ms,
      gestureSourceType: "touch",
    });
    await cdp.detach();
    return;
  }
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Long-presses `target` and waits for the mark or unmark it sends. */
async function holdTo(page: Page, target: Locator, method: "PUT" | "DELETE") {
  const sent = page.waitForResponse(
    (response) =>
      response.request().method() === method && new URL(response.url()).pathname.startsWith(MARKS),
  );
  await longPress(page, target);
  expect((await sent).status()).toBe(204);
}

test("BIGWHEEL holds a cloud to mark its word for deletion, and again to unmark it", async ({
  page,
}, testInfo) => {
  await page.goto("/?as=bigwheel");
  await expect(drawKey(page, language)).toBeVisible();
  try {
    await openDeal(page);
    const target = cloud(page, 0);
    const name = (await target.getAttribute("aria-label")) ?? "";
    const markedName = say(kyotoSeika.marks.spoken, language, { subject: name });
    await expect(tags(page)).toHaveCount(0);

    // A hold marks the word and never picks it.
    await holdTo(page, target, "PUT");
    await expect(target).toHaveAccessibleName(markedName);
    await expect(target).toHaveAttribute("aria-pressed", "false");
    await expect(tags(page)).toHaveCount(1);
    await expect(tags(page)).toHaveText(say(kyotoSeika.marks.tag, language));

    // The mark is the server's: the sheet comes back after a reload with the word still tagged.
    await page.reload();
    await page
      .getByRole("button", { name: say(stickerBoard.board.continueDrawing, language) })
      .click();
    await expect(target).toHaveAccessibleName(markedName);
    await expect(tags(page)).toHaveCount(1);
    // The clouds as they settle, their arrival played out.
    await page.screenshot({ path: testInfo.outputPath("marked-deal.png"), animations: "disabled" });

    // Holding it again takes the mark off.
    await holdTo(page, target, "DELETE");
    await expect(target).toHaveAccessibleName(name);
    await expect(target).toHaveAttribute("aria-pressed", "false");
    await expect(tags(page)).toHaveCount(0);
  } finally {
    // Only BIGWHEEL marks words, so any word left marked is this test's, whatever failed first.
    const headers = actorHeaders(await envelope(page));
    const listed: unknown = await (await page.request.get(MARKS, { headers })).json();
    const left = isRecord(listed) && Array.isArray(listed.words) ? listed.words : [];
    for (const word of left)
      await page.request.delete(`${MARKS}/${encodeURIComponent(String(word))}`, { headers });
    await setKyotoSeikaPractice(page, false);
    // The sheet left waiting is fixture cleanup, so the pair's specs keep their daily tickets.
    const db = openDb(E2E_DATABASE);
    try {
      db.$client
        .prepare("delete from ticket_uses where user_id = ? and sticker_id is null")
        .run(E2E_BIGWHEEL_ID);
    } finally {
      db.$client.close();
    }
  }
});

browserTest(
  "anyone else's long press on a cloud marks nothing and asks the server nothing",
  async ({ page }) => {
    const asked: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/kyoto-seika/"))
        asked.push(request.url());
    });
    await signIn(page, "marks", language);
    await openDeal(page);
    await longPress(page, cloud(page, 0));
    await expect(tags(page)).toHaveCount(0);
    expect(asked).toEqual([]);
  },
);
