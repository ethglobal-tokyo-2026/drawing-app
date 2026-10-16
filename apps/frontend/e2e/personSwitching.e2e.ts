import { recordBody, tapReplay } from "@drawing-app/api/testing/replays";
import type { LiffMockApi } from "@line/liff-mock";
import { openDb } from "../../../packages/db/src/index.ts";
import { expect, type Locator, type Page } from "@playwright/test";
import { GAME_CONFIG } from "../src/gratitude/gameConfig.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { E2E_DATABASE } from "./dataDir.ts";
import {
  E2E_BIGWHEEL_ID,
  E2E_BIGWHEEL_LINE_ID,
  E2E_HANA_ID,
  holdPersonPair,
} from "./personPair.ts";
import {
  actorHeaders,
  boardSticker,
  drawKey,
  drawStroke,
  envelope,
  gratitudeAsk,
  isRecord,
  openDetail,
  openExplore,
  openSettings,
  openTheirBoard,
  playCombo,
  say,
  sealFromBoard,
  signIn,
  startsWith,
  test as browserTest,
  unpackageAndAccept,
} from "./helpers.ts";
import { sealStoredSticker } from "./storedStickers.ts";

const { app, explore, giving, personSwitch, receiving, stickerBoard, stickerCreation, ui } =
  strings;
const language = "en";

const test = browserTest.extend<{ personPairLock: void }>({
  personPairLock: [holdPersonPair, { auto: true }],
});
test.describe.configure({ mode: "serial", timeout: 120_000 });

async function expectActor(page: Page, id: string) {
  await expect.poll(async () => (await envelope(page)).me.id).toBe(id);
  const session = await envelope(page);
  expect(session.authenticated).toMatchObject({
    id: E2E_BIGWHEEL_ID,
    lineUserId: E2E_BIGWHEEL_LINE_ID,
  });
  expect(await page.evaluate(() => sessionStorage.getItem("draw.liffMockAs"))).toBe("bigwheel");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        return (await import("../src/line/liff.ts")).lineUserId();
      }),
    )
    .toBe(E2E_BIGWHEEL_LINE_ID);
  return session;
}
async function operator(page: Page) {
  await page.goto("/?as=bigwheel");
  await expect(drawKey(page, language)).toBeVisible();
  return expectActor(page, E2E_BIGWHEEL_ID);
}
/**
 * Proves the closed developer slip keeps the switch to `name` out of reach: inert and flat, it takes
 * no focus or click, and Tab from `reveal`, the key that opens the slip, skips it.
 */
async function expectSwitchOutOfReach(page: Page, reveal: Locator, name: string) {
  const selection = page.getByRole("button", {
    name: say(stickerBoard.developer.personSwitch.switchTo, language, { name }),
    exact: true,
  });
  // Role locators include inert descendants; prove the browser keeps this control out of reach.
  await expect
    .poll(() => selection.evaluate((button) => button.closest(".dev-slip")?.hasAttribute("inert")))
    .toBe(true);
  await expect
    .poll(() => page.locator(".dev-slip").evaluate((slip) => slip.getBoundingClientRect().height))
    .toBe(0);
  expect(
    await selection.evaluate((button) => {
      button.focus();
      return document.activeElement === button;
    }),
  ).toBe(false);
  await expect(selection.click({ trial: true, timeout: 500 })).rejects.toThrow(/Timeout/);
  await reveal.focus();
  await page.keyboard.press("Tab");
  expect(await selection.evaluate((button) => document.activeElement === button)).toBe(false);
}
/**
 * Pages that have proven the closed slip out of reach. Every load closes the slip, so each test, on
 * its own page, proves it on its first switch only.
 */
const slipProven = new WeakSet<Page>();
async function selectionButton(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: say(app.tabs.sections, language) })
    .getByRole("button", { name: say(app.tabs.myBoard, language), exact: true })
    .click();
  await openSettings(page, language);
  const reveal = page.getByRole("button", {
    name: say(stickerBoard.developer.label, language),
    exact: true,
  });
  if (!slipProven.has(page)) {
    await expectSwitchOutOfReach(page, reveal, name);
    slipProven.add(page);
  }
  await reveal.press("Enter");
  const slip = page.getByRole("region", {
    name: say(stickerBoard.developer.label, language),
    exact: true,
  });
  const button = slip.getByRole("button", {
    name: say(stickerBoard.developer.personSwitch.switchTo, language, { name }),
    exact: true,
  });
  await expect(button).toBeVisible();
  return button;
}
async function switchTo(page: Page, id: string, name: string, showsBoard = true) {
  const oldDocument = await page.evaluate(() => performance.timeOrigin);
  const button = await selectionButton(page, name);
  const navigation = page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame());
  await button.click();
  await navigation;
  await page.waitForLoadState("domcontentloaded");
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(oldDocument);
  await expectActor(page, id);
  if (showsBoard) await expect(drawKey(page, language)).toBeVisible();
}
async function givePrivately(page: Page, no: string, handle: string) {
  // Reload resets LIFF Mock; install this boundary trap before each direction of the gift.
  await page.evaluate(() => {
    const testWindow: Window & { liffMock?: LiffMockApi } = window;
    const mock = testWindow.liffMock;
    if (!mock) throw new Error("LIFF Mock is absent");
    mock.set((data) => ({
      ...data,
      get shareTargetPicker() {
        throw new Error("The private gift opened LINE's picker");
      },
    }));
  });
  await openTheirBoard(page, language, handle);
  await page
    .getByRole("button", { name: say(stickerBoard.artistBoard.give, language), exact: true })
    .click();
  const sheet = page.getByRole("dialog", {
    name: say(giving.giveSheet.title, language, { name: handle }),
  });
  await sheet.getByRole("radio", { name: no }).click();
  await sheet.getByRole("button", { name: say(giving.give, language, { no }) }).click();
  const sent = page.getByRole("dialog", { name: say(giving.sent.title, language) });
  await expect(sent).toContainText(say(giving.personDelivery.sentLead, language));
  await expect(sent.getByRole("button", { name: /^Switch to / })).toHaveCount(0);
  return sent;
}
async function closeReceivedNotice(page: Page, receiver: string) {
  const notice = page.getByRole("dialog", {
    name: say(giving.receivedNotice.title, language, { name: receiver }),
  });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(notice).toBeHidden();
}
async function waiting(page: Page, from: string) {
  const button = page.getByRole("button", {
    name: say(receiving.giftsForYou.label_one, language, { name: from }),
  });
  await expect(button).toBeVisible();
  await button.click();
  await unpackageAndAccept(page, language, from);
}
/**
 * Records the signed-in receiver's thanks for `giftId` through the API: a tap combo of as many hits
 * as Hana's played one, each at ×1, under the app's game config, which its replay looks up.
 */
async function recordThanks(page: Page, giftId: string) {
  const recorded = await page.request.post("/api/gratitude", {
    headers: actorHeaders(await envelope(page)),
    data: recordBody(giftId, {
      hits: GAME_CONFIG.burst,
      total: GAME_CONFIG.burst * GAME_CONFIG.gratitudePerHit,
      gameConfigVersion: GAME_CONFIG.version,
      replay: tapReplay(GAME_CONFIG.burst),
    }),
  });
  expect(recorded.status(), `POST /api/gratitude: ${await recorded.text()}`).toBe(201);
}
async function moveSticker(page: Page, no: string, expectedStatus = 200) {
  const sticker = boardSticker(page, language, no);
  await sticker.hover();
  const box = await sticker.boundingBox();
  if (!box) throw new Error("The sticker has no board placement");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" && response.url().includes("/sticker-placements/"),
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 18, { steps: 12 });
  await page.mouse.up();
  expect((await saved).status()).toBe(expectedStatus);
}
async function placeFromTray(page: Page, no: string) {
  const zipper = page.getByRole("button", {
    name: startsWith(say(stickerBoard.tray.zipper, language)),
  });
  await zipper.press("ArrowDown");
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  const id = stickerSnapshot(no).sticker.id;
  const slot = page.locator(`.tray__sheet.is-top .tray__slot[data-id="${id}"]`);
  await expect(slot).toHaveAttribute("data-state", "here");
  await expect.poll(() => slot.evaluate((el) => el.closest("[inert]") === null)).toBe(true);
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" && response.url().includes("/sticker-placements/"),
  );
  await slot.press("Enter");
  expect((await saved).ok()).toBe(true);
  await zipper.press("ArrowUp");
  await expect(zipper).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => slot.evaluate((el) => el.closest("[inert]") !== null)).toBe(true);
  await expect(boardSticker(page, language, no)).toBeVisible();
}
function stickerSnapshot(no: string) {
  const db = openDb(E2E_DATABASE);
  try {
    const sticker = db.$client
      .prepare<[number], { id: string; owner_id: string }>(
        "select id, owner_id from stickers where number = ?",
      )
      .get(Number(no.replace(/\D/g, "")));
    if (
      !sticker ||
      typeof sticker !== "object" ||
      !("id" in sticker) ||
      typeof sticker.id !== "string"
    )
      throw new Error(`Sticker ${no} is absent from the isolated database`);
    return {
      sticker,
      placements: db.$client
        .prepare(
          "select user_id, on_board, x, y, scale, rotation, z, large_on_board, large_x, large_y, large_scale, large_rotation, large_z from sticker_placements where sticker_id = ? order by user_id",
        )
        .all(sticker.id),
      gifts: db.$client
        .prepare<
          [string],
          { id: string; status: string; giver_id: string; receiver_id: string | null }
        >(
          "select id, status, giver_id, receiver_id from gifts where sticker_id = ? order by created_at",
        )
        .all(sticker.id),
      gratitude: db.$client
        .prepare(
          "select gift_id, total, hits from gratitude where gift_id in (select id from gifts where sticker_id = ?) order by gift_id",
        )
        .all(sticker.id),
    };
  } finally {
    db.$client.close();
  }
}

test("same_tab_sticker_round_trip", async ({ page }) => {
  await operator(page);
  const { no } = await sealStoredSticker(page, "oneStroke");
  // The board places a sticker sealed through the API when it next loads.
  await page.reload();
  await expect(boardSticker(page, language, no)).toBeVisible();
  await moveSticker(page, no);
  await page.setViewportSize({ width: 1024, height: 900 });
  await moveSticker(page, no);
  const original = stickerSnapshot(no).placements;
  await page.setViewportSize({ width: 390, height: 844 });
  let pickerRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/shared")) pickerRequests++;
  });
  const sent = await givePrivately(page, no, "@Hana");
  await sent.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await switchTo(page, E2E_HANA_ID, "Hana");
  await waiting(page, "@BIGWHEEL");
  await expect(boardSticker(page, language, no)).toBeVisible();
  await page.route("**/api/gratitude", (route) => route.abort("failed"));
  const outward = await playCombo(page, language, "@BIGWHEEL", GAME_CONFIG.burst, "kept");
  expect(outward.combo.hits).toBe(GAME_CONFIG.burst);
  expect(outward.combo.total).toBeGreaterThan(0);
  const outboxKey = `draw.gratitude.pending.${E2E_HANA_ID}`;
  const hanaOutbox = await page.evaluate((key) => localStorage.getItem(key), outboxKey);
  expect(hanaOutbox).not.toBeNull();
  await outward.receipt.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await moveSticker(page, no);
  const back = await givePrivately(page, no, "@BIGWHEEL");
  await back.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await switchTo(page, E2E_BIGWHEEL_ID, "Bigwheel");
  expect(await page.evaluate((key) => localStorage.getItem(key), outboxKey)).toBe(hanaOutbox);
  await closeReceivedNotice(page, "@Hana");
  await page.unroute("**/api/gratitude");
  await waiting(page, "@Hana");
  // The Mini-game is under test in Hana's combo, so BIGWHEEL's thanks go through the API.
  const ask = gratitudeAsk(page, language, "@Hana");
  await ask.getByRole("button", { name: say(receiving.sendGratitude.later, language) }).click();
  await expect(ask).toBeHidden();
  const returnGift = stickerSnapshot(no).gifts.find((gift) => gift.giver_id === E2E_HANA_ID);
  if (!returnGift) throw new Error(`Hana's gift of ${no} back to BIGWHEEL is absent`);
  await recordThanks(page, returnGift.id);
  // Receiving a sticker again puts it in the tray while retaining both arrangements.
  await expect(boardSticker(page, language, no)).toHaveCount(0);
  expect(stickerSnapshot(no).placements).toEqual(
    expect.arrayContaining(
      original.map((placement) => {
        if (!placement || typeof placement !== "object")
          throw new Error("Invalid placement fixture");
        return { ...placement, on_board: 0, large_on_board: 0 };
      }),
    ),
  );
  await placeFromTray(page, no);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator(".board-head")).toBeVisible();
  await placeFromTray(page, no);
  await page.setViewportSize({ width: 390, height: 844 });
  // BIGWHEEL must leave Hana's outbox alone; returning to Hana sends her original combo once.
  expect(await page.evaluate((key) => localStorage.getItem(key), outboxKey)).toBe(hanaOutbox);
  await switchTo(page, E2E_HANA_ID, "Hana");
  await closeReceivedNotice(page, "@BIGWHEEL");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), outboxKey)).toBeNull();
  await switchTo(page, E2E_BIGWHEEL_ID, "Bigwheel");
  const final = stickerSnapshot(no);
  expect(final.sticker).toMatchObject({ owner_id: E2E_BIGWHEEL_ID });
  expect(final.gifts).toHaveLength(2);
  expect(final.gifts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: "received",
        giver_id: E2E_BIGWHEEL_ID,
        receiver_id: E2E_HANA_ID,
      }),
      expect.objectContaining({
        status: "received",
        giver_id: E2E_HANA_ID,
        receiver_id: E2E_BIGWHEEL_ID,
      }),
    ]),
  );
  expect(final.gratitude).toHaveLength(2);
  expect(final.placements).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ user_id: E2E_BIGWHEEL_ID, on_board: 1, large_on_board: 1 }),
    ]),
  );
  expect(pickerRequests).toBe(0);
  const detail = await openDetail(page, language, no);
  const trail = detail.getByRole("region", {
    name: say(stickerBoard.transferTrail.label, language),
  });
  const fold = trail.locator(".transfer-trail__row--fold button");
  if (await fold.count()) await fold.click();
  const rows = trail.locator(".transfer-trail__row[data-gift-id]");
  await expect(rows).toHaveCount(2);
  await expect(
    detail.getByRole("button", { name: say(stickerBoard.detail.sendGratitude, language) }),
  ).toHaveCount(0);
  for (const row of [rows.nth(0), rows.nth(1)]) {
    const head = row.locator(".transfer-trail__head");
    if ((await head.getAttribute("aria-expanded")) === "false") await head.click();
    await row.locator(".transfer-trail__replay").click();
    const stop = row.getByRole("button", {
      name: say(stickerBoard.transferTrail.replaying.stopLabel, language),
    });
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(stop).toHaveCount(0);
  }
  await detail.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await openExplore(page, language);
  await page.getByRole("tab", { name: say(explore.views.thisWeek, language) }).click();
  await page.getByRole("tab", { name: say(explore.leaderboards.bestCombo, language) }).click();
  await expect(
    page.getByRole("tabpanel", { name: say(explore.leaderboards.bestCombo, language) }),
  ).toContainText("@Hana");
  await page
    .getByRole("navigation", { name: say(app.tabs.sections, language) })
    .getByRole("button", { name: say(app.tabs.myBoard, language), exact: true })
    .click();
  await openExplore(page, language);
  await expect(
    page.getByRole("tabpanel", { name: say(explore.leaderboards.bestCombo, language) }),
  ).toContainText("@BIGWHEEL");
  expect(stickerSnapshot(no).gratitude).toHaveLength(2);
});

test("refresh_and_lost_selection_response", async ({ page }) => {
  await operator(page);
  await page.route(
    "**/api/session/person",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );
  // A lost response still loads the person the server chose, so this waits for that navigation.
  await switchTo(page, E2E_HANA_ID, "Hana");
  await page.reload();
  await expect(drawKey(page, language)).toBeVisible();
  await expectActor(page, E2E_HANA_ID);
  await page.route(
    "**/api/session/person",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "person_switch_busy",
          detail: "The isolated switch request failed",
        }),
      }),
    { times: 1 },
  );
  await (await selectionButton(page, "Bigwheel")).click();
  await expect(page.getByRole("alert")).toContainText("Couldn’t switch people.");
  await expectActor(page, E2E_HANA_ID);
  await page.reload();
  await expect(drawKey(page, language)).toBeVisible();
  await switchTo(page, E2E_BIGWHEEL_ID, "Bigwheel");
});

test("old_bigwheel_tab_stays_stale_after_return", async ({ page }) => {
  const original = await operator(page);
  const db = openDb(E2E_DATABASE);
  const latest = db.$client
    .prepare<[], { number: number }>(
      "select number from stickers where owner_id = 'd5984df6-db28-44f2-801c-2f2f5b565463' order by number desc limit 1",
    )
    .get();
  db.$client.close();
  const no = latest
    ? `No.${String(latest.number).padStart(4, "0")}`
    : await sealFromBoard(page, language);
  const oldBigwheel = await page.context().newPage();
  try {
    await oldBigwheel.goto("/?as=bigwheel");
    await expect(drawKey(oldBigwheel, language)).toBeVisible();
    await oldBigwheel.route("**/api/sticker-boards/me/sticker-placements/*", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "test_placement_unavailable",
          detail: "The isolated placement save failed",
        }),
      }),
    );
    await moveSticker(oldBigwheel, no, 503);
    const journalKey = `croquis.board-placement-saves.${E2E_BIGWHEEL_ID}`;
    const journal = await oldBigwheel.evaluate((key) => sessionStorage.getItem(key), journalKey);
    expect(journal).not.toBeNull();
    await drawKey(oldBigwheel, language).click();
    await drawStroke(oldBigwheel, language);
    const key = `draw.session.${E2E_BIGWHEEL_ID}`;
    await expect
      .poll(() => oldBigwheel.evaluate((key) => localStorage.getItem(key), key))
      .not.toBeNull();
    const draft = await oldBigwheel.evaluate((key) => localStorage.getItem(key), key);
    await switchTo(page, E2E_HANA_ID, "Hana");
    await expect(
      oldBigwheel.getByRole("button", { name: say(personSwitch.reload, language), exact: true }),
    ).toBeVisible();
    await switchTo(page, E2E_BIGWHEEL_ID, "Bigwheel", false);
    await expect(
      page.getByRole("button", { name: say(stickerCreation.history.undo, language) }),
    ).toBeEnabled();
    expect((await envelope(page)).selectionVersion).not.toBe(original.selectionVersion);
    await expect(
      oldBigwheel.getByRole("button", { name: say(personSwitch.reload, language), exact: true }),
    ).toBeVisible();
    expect(await oldBigwheel.evaluate((key) => localStorage.getItem(key), key)).toBe(draft);
    expect(await oldBigwheel.evaluate((key) => sessionStorage.getItem(key), journalKey)).toBe(
      journal,
    );
    expect(await page.evaluate((key) => sessionStorage.getItem(key), journalKey)).toBeNull();
    const stale = await oldBigwheel.request.post("/api/session/person", {
      headers: actorHeaders(original),
      data: { userId: E2E_HANA_ID },
    });
    expect(stale.status()).toBe(409);
    expect(await stale.json()).toMatchObject({ error: "session_account_changed" });
    await oldBigwheel.unroute("**/api/sticker-boards/me/sticker-placements/*");
    const recovered = oldBigwheel.waitForEvent(
      "framenavigated",
      (frame) => frame === oldBigwheel.mainFrame(),
    );
    await oldBigwheel
      .getByRole("button", { name: say(personSwitch.reload, language), exact: true })
      .click();
    await recovered;
    await oldBigwheel.waitForLoadState("domcontentloaded");
    await expectActor(oldBigwheel, E2E_BIGWHEEL_ID);
    await expect(
      oldBigwheel.getByRole("button", { name: say(stickerCreation.history.undo, language) }),
    ).toBeEnabled();
    await oldBigwheel
      .getByRole("navigation", { name: say(app.tabs.sections, language) })
      .getByRole("button", { name: say(app.tabs.myBoard, language), exact: true })
      .click();
    await expect
      .poll(() => oldBigwheel.evaluate((key) => localStorage.getItem(key), key))
      .not.toBeNull();
    expect(await oldBigwheel.evaluate((key) => sessionStorage.getItem(key), journalKey)).toBe(
      journal,
    );
    const unsaved = oldBigwheel.getByRole("alert").filter({ hasText: no });
    await expect(unsaved).toBeVisible();
    const saved = oldBigwheel.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" && response.url().includes("/sticker-placements/"),
    );
    await unsaved
      .locator("..")
      .getByRole("button", { name: say(ui.errorLine.tryAgain, language) })
      .click();
    expect((await saved).ok()).toBe(true);
    await expect
      .poll(() => oldBigwheel.evaluate((key) => sessionStorage.getItem(key), journalKey))
      .toBeNull();
  } finally {
    await oldBigwheel.close();
    // The abandoned sheet is fixture cleanup only; sealed stickers and their ownership are untouched.
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

test("persisted_gift_blocks_switch_without_giving_modal", async ({ page }) => {
  const original = await operator(page);
  // Reuse a held fixture sticker so both projects fit the same three daily tickets.
  // A fresh isolated selection still seals one through the normal drawing screen.
  const db = openDb(E2E_DATABASE);
  let existing: { number: number } | undefined;
  try {
    existing = db.$client
      .prepare<[string], { number: number }>(
        "select number from stickers where owner_id = ? order by number desc limit 1",
      )
      .get(E2E_BIGWHEEL_ID);
  } finally {
    db.$client.close();
  }
  const no = existing
    ? `No.${String(existing.number).padStart(4, "0")}`
    : await sealFromBoard(page, language);
  const sticker = stickerSnapshot(no).sticker;
  let giftId: string | null = null;
  try {
    // Persist an unfinished gift without opening Giving, as if another device packed it earlier.
    const packed = await page.request.post("/api/gifts", {
      headers: actorHeaders(original),
      data: { stickerId: sticker.id, forUserId: E2E_HANA_ID },
    });
    expect(packed.status()).toBe(201);
    const body: unknown = await packed.json();
    if (!isRecord(body) || !isRecord(body.gift) || typeof body.gift.id !== "string")
      throw new Error("The isolated API returned no packed gift ID");
    giftId = body.gift.id;
    await expect(page.locator(".giving")).toHaveCount(0);
    const refusal = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().endsWith("/api/session/person"),
    );
    await (await selectionButton(page, "Hana")).click();
    const response = await refusal;
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "person_switch_busy",
      pendingOwnership: {
        kind: "delivery",
        giftId,
        stickerId: sticker.id,
        stickerNo: Number(no.replace(/\D/g, "")),
      },
    });
    const failure = page.getByRole("alert");
    await expect(failure).toContainText(
      `Finish or recover giving sticker ${Number(no.replace(/\D/g, ""))} before switching.`,
    );
    await expect(failure).toContainText("Couldn’t switch people.");
    await expectActor(page, E2E_BIGWHEEL_ID);
    expect((await envelope(page)).selectionVersion).toBe(original.selectionVersion);
    // Leaving Settings does not dismiss the failure or silently select Hana.
    await page
      .getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) })
      .click();
    await expect(failure).toBeVisible();
    await expect(page.locator(".giving")).toHaveCount(0);
  } finally {
    if (giftId) {
      const db = openDb(E2E_DATABASE);
      try {
        db.$client.prepare("delete from gifts where id = ? and status = 'packed'").run(giftId);
      } finally {
        db.$client.close();
      }
    }
  }
});

test("ordinary_user_cannot_select_hana", async ({ page }) => {
  await signIn(page, "ordinary-person", language);
  const ordinary = await envelope(page);
  expect(ordinary.personSwitchMode).toBe("off");
  expect(ordinary.allowedSelections).toEqual([]);
  await openSettings(page, language);
  await page
    .getByRole("button", { name: say(stickerBoard.developer.label, language), exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: say(stickerBoard.developer.personSwitch.title, language) }),
  ).toHaveCount(0);
  const denied = await page.request.post("/api/session/person", {
    headers: actorHeaders(ordinary),
    data: { userId: E2E_HANA_ID },
  });
  expect(denied.status()).toBe(403);
  expect(await denied.json()).toMatchObject({ error: "person_switch_forbidden" });
  expect((await envelope(page)).me.id).toBe(ordinary.me.id);
});
