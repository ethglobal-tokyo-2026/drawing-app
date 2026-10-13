import type { LiffMockApi } from "@line/liff-mock";
import { packagedGiftSchema, messageAttemptBodySchema } from "../../api/src/gifts/packaging.ts";
import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  backToBoardOnceSent,
  boardSticker,
  giftClaimTokenFrom,
  giveFromBoard,
  gratitudeAsk,
  handleOf,
  openDetail,
  openTheirBoard,
  receivedRow,
  say,
  sealFromBoard,
  signIn,
  startsWith,
  test,
  unpackageAndAccept,
} from "./helpers.ts";

const { giving, receiving, stickerBoard, ui } = strings;
const language = "en";

test("Gift link: Alice gives from her board, and Bob opens the Gift Message's link and accepts", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const no = await sealFromBoard(alice, language);
  const giftClaimToken = giftClaimTokenFrom(alice);
  await giveFromBoard(alice, language, no);
  await backToBoardOnceSent(alice, language);

  // Sent, it leaves Alice's board; its detail says it's on its way.
  await expect(boardSticker(alice, language, no)).toHaveCount(0);
  // Focus goes with it to the Zipper, as no other sticker is left on the board.
  await expect(
    alice.getByRole("button", { name: startsWith(say(stickerBoard.tray.zipper, language)) }),
  ).toBeFocused();
  const other = await sealFromBoard(alice, language);
  await (
    await openDetail(alice, language, other)
  )
    .getByRole("navigation", { name: say(stickerBoard.detail.yourStickers, language) })
    .getByRole("button", { name: startsWith(no) })
    .click();
  // The detail is named for the sticker it shows.
  const onItsWay = alice.getByRole("dialog", { name: no });
  await expect(onItsWay.getByText(say(stickerBoard.detail.onItsWay, language))).toBeVisible();
  await expect(onItsWay.locator('.sticker-detail__slide [data-gift="sent"]')).toBeVisible();
  await onItsWay.getByRole("button", { name: say(ui.backToBoard, language) }).click();

  await signIn(bob, "bob", language);
  await bob.goto(`/g/${await giftClaimToken}`);
  await unpackageAndAccept(bob, language, aliceHandle);
  await expect(boardSticker(bob, language, no)).toBeVisible();

  const ask = gratitudeAsk(bob, language, aliceHandle);
  await expect(
    ask.getByRole("button", { name: say(receiving.sendGratitude.send, language) }),
  ).toBeVisible();
  await ask.getByRole("button", { name: say(receiving.sendGratitude.later, language) }).click();
  await expect(ask).toBeHidden();

  // Its detail's Transfer Trail has the gift, and Send gratitude stays on offer there.
  const detail = await openDetail(bob, language, no);
  await expect(receivedRow(detail, language, aliceHandle)).toBeVisible();
  await expect(
    detail.getByRole("button", { name: say(stickerBoard.detail.sendGratitude, language) }),
  ).toBeVisible();
});

test("In-app gift: Alice gives from Give on Bob's board, and Bob receives it there without the link", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const bobHandle = handleOf(await signIn(bob, "bob", language));
  const no = await sealFromBoard(alice, language);

  await openTheirBoard(alice, language, bobHandle);
  await alice
    .getByRole("button", { name: say(stickerBoard.artistBoard.give, language), exact: true })
    .click();
  const giveSheet = alice.getByRole("dialog", {
    name: say(giving.giveSheet.title, language, { name: bobHandle }),
  });
  await giveSheet.getByRole("radio", { name: no }).click();
  await giveSheet.getByRole("button", { name: say(giving.give, language, { no }) }).click();
  await backToBoardOnceSent(alice, language);
  await expect(giveSheet).toBeHidden();

  // The gift waits on Bob's board, from Alice, and opens from there.
  await bob.reload();
  const waiting = bob.getByRole("button", {
    name: say(receiving.giftsForYou.label_one, language, { name: aliceHandle }),
  });
  await expect(waiting).toBeVisible();
  await waiting.click();
  await unpackageAndAccept(bob, language, aliceHandle);
  await expect(boardSticker(bob, language, no)).toBeVisible();
  await expect(gratitudeAsk(bob, language, aliceHandle)).toBeVisible();
});

test("Mark 18+ is the Original Artist's: Alice is offered it, and Bob, who received her sticker, isn't", async ({
  page: alice,
  friend: bob,
}) => {
  const markNsfw = { name: say(stickerBoard.detail.markNsfw.open, language) };
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const no = await sealFromBoard(alice, language);

  const hers = await openDetail(alice, language, no);
  await expect(hers.getByRole("button", markNsfw)).toBeVisible();
  const giftClaimToken = giftClaimTokenFrom(alice);
  await hers
    .getByRole("button", { name: say(stickerBoard.detail.give, language), exact: true })
    .click();
  await backToBoardOnceSent(alice, language);

  await signIn(bob, "bob", language);
  await bob.goto(`/g/${await giftClaimToken}`);
  await unpackageAndAccept(bob, language, aliceHandle);
  const ask = gratitudeAsk(bob, language, aliceHandle);
  await ask.getByRole("button", { name: say(receiving.sendGratitude.later, language) }).click();
  await expect(ask).toBeHidden();

  // The Transfer Trail loads after everything else in the detail, Mark 18+ included, has drawn.
  const received = await openDetail(bob, language, no);
  await expect(receivedRow(received, language, aliceHandle)).toBeVisible();
  await expect(received.getByRole("button", markNsfw)).toHaveCount(0);
});

test("Bob's detail of Alice's gift holds the Transfer Trail's place and Send gratitude's while it's read, and nothing moves as they land", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const no = await sealFromBoard(alice, language);
  const giftClaimToken = giftClaimTokenFrom(alice);
  await giveFromBoard(alice, language, no);
  await backToBoardOnceSent(alice, language);

  await signIn(bob, "bob", language);
  await bob.goto(`/g/${await giftClaimToken}`);
  await unpackageAndAccept(bob, language, aliceHandle);
  const ask = gratitudeAsk(bob, language, aliceHandle);
  await ask.getByRole("button", { name: say(receiving.sendGratitude.later, language) }).click();
  await expect(ask).toBeHidden();

  // Every read of a sticker's detail, the board's read ahead included, waits until it's let go.
  let letGo = () => {};
  const held = new Promise<void>((resolve) => {
    letGo = resolve;
  });
  await bob.route(/\/api\/stickers\/[^/?]+(\?.*)?$/, async (route) => {
    if (route.request().method() === "GET") await held;
    await route.continue();
  });
  await bob.reload();
  const detail = await openDetail(bob, language, no);
  const trail = detail.getByRole("region", {
    name: say(stickerBoard.transferTrail.label, language),
  });
  await expect(trail.getByRole("status")).toHaveText(
    say(stickerBoard.transferTrail.loading, language),
  );
  const give = detail.getByRole("button", {
    name: say(stickerBoard.detail.give, language),
    exact: true,
  });
  /**
   * Where a part sits in the page's layout, apart from any rise it or its parents are making. A part
   * mid-rise is its children's offsetParent, so the whole chain is summed.
   */
  const span = (part: Locator) =>
    part.evaluate((el: HTMLElement) => {
      let top = 0;
      for (let at: Element | null = el; at instanceof HTMLElement; at = at.offsetParent) {
        top += at.offsetTop;
      }
      return { top, foot: top + el.offsetHeight };
    });
  const before = {
    give: await span(give),
    trail: await span(trail),
    rows: await trail.locator("li").count(),
  };

  letGo();
  await expect(receivedRow(detail, language, aliceHandle)).toBeVisible();
  await expect(
    detail.getByRole("button", { name: say(stickerBoard.detail.sendGratitude, language) }),
  ).toBeVisible();
  expect({
    give: await span(give),
    trail: await span(trail),
    rows: await trail.locator("li").count(),
  }).toEqual(before);
});

/** Only the LINE boundary is simulated; gift attempts use the running API and migrated database. */
async function pickerAnswers(page: Page, outcome: "sent" | "cancelled") {
  await page.evaluate((answer) => {
    const testWindow: Window & { liffMock?: LiffMockApi } = window;
    const mock = testWindow.liffMock;
    if (!mock) throw new Error("LIFF Mock was not installed");
    mock.set((data) => ({
      ...data,
      shareTargetPicker: answer === "sent" ? { status: "success" } : undefined,
      getLineVersion: "14.0.0",
    }));
  }, outcome);
}

/** LIFF Mock reads this response inside its picker call, so the getter preserves LINE's failure. */
async function pickerFailsAfterOpening(page: Page) {
  await page.evaluate(() => {
    const testWindow: Window & { liffMock?: LiffMockApi } = window;
    const mock = testWindow.liffMock;
    if (!mock) throw new Error("LIFF Mock was not installed");
    mock.set((data) => ({
      ...data,
      getLineVersion: "14.0.0",
      get shareTargetPicker() {
        throw Object.assign(new Error("LINE's picker stopped before reporting its outcome"), {
          code: "EXCEPTION_IN_SUBWINDOW",
        });
      },
    }));
  });
}

test("A definitive cancellation permits one new attempt using the original gift and token", async ({
  page,
}) => {
  await signIn(page, "cancel-giver", language);
  const no = await sealFromBoard(page, language);
  await pickerAnswers(page, "cancelled");
  const attempts: { giftId: string; attemptId: string }[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/message-attempt"))
      attempts.push({
        giftId: request.url().split("/").at(-2) ?? "",
        attemptId: messageAttemptBodySchema.parse(request.postDataJSON()).attemptId,
      });
  });
  const token = giftClaimTokenFrom(page);
  await giveFromBoard(page, language, no);
  const unsent = page.getByRole("dialog", { name: say(giving.inTheBag.notSent, language) });
  await expect(unsent).toBeVisible();
  await pickerAnswers(page, "sent");
  await unsent
    .getByRole("button", { name: say(giving.inTheBag.send, language), exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: say(giving.sent.title, language) })).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[0]?.giftId).toMatch(/^0x[0-9a-f]{64}$/);
  expect(attempts[1]?.giftId).toBe(attempts[0]?.giftId);
  expect(attempts[1]?.attemptId).not.toBe(attempts[0]?.attemptId);
  expect(await token).toMatch(/^0x[0-9a-f]{64}$/);
});

test("An unconfirmed LINE send stays an error after reload and keeps its recipient until Take it out", async ({
  page: alice,
  friend: bob,
}) => {
  await signIn(alice, "uncertain-giver", language);
  const bobHandle = handleOf(await signIn(bob, "original-recipient", language));
  const no = await sealFromBoard(alice, language);
  await pickerFailsAfterOpening(alice);
  let begins = 0;
  let takeOuts = 0;
  alice.on("request", (request) => {
    if (request.url().endsWith("/message-attempt")) begins++;
    if (request.url().endsWith("/take-out/start")) takeOuts++;
  });
  const packaged = alice.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/gifts" && response.request().method() === "POST",
  );
  await openTheirBoard(alice, language, bobHandle);
  await alice
    .getByRole("button", { name: say(stickerBoard.artistBoard.give, language), exact: true })
    .click();
  const giveSheet = alice.getByRole("dialog", {
    name: say(giving.giveSheet.title, language, { name: bobHandle }),
  });
  await giveSheet.getByRole("radio", { name: no }).click();
  await giveSheet.getByRole("button", { name: say(giving.give, language, { no }) }).click();
  const original = packagedGiftSchema.parse(await (await packaged).json());
  const sendError = alice.getByRole("dialog", {
    name: say(giving.lineSendError.title, language),
  });
  await expect(sendError).toBeVisible();
  const confirmationError = say(giving.lineSendError.message, language, { no });
  await expect(sendError.getByRole("alert").filter({ hasText: confirmationError })).toBeVisible();
  // A fresh page has no in-memory Gift Claim Token; the API's pending attempt controls recovery.
  await alice.goto("/");
  const other = await sealFromBoard(alice, language);
  const detail = await openDetail(alice, language, other);
  await detail
    .getByRole("navigation", { name: say(stickerBoard.detail.yourStickers, language) })
    .getByRole("button", { name: startsWith(no) })
    .click();
  const resumed = alice.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/gifts" && response.request().method() === "POST",
  );
  await alice
    .getByRole("dialog", { name: no, exact: true })
    .getByRole("button", { name: say(stickerBoard.detail.give, language), exact: true })
    .click();
  const recovery = alice.getByRole("dialog", { name: say(giving.lineSendError.title, language) });
  await expect(recovery).toBeVisible();
  await expect(recovery.getByRole("alert").filter({ hasText: confirmationError })).toBeVisible();
  const recovered = packagedGiftSchema.parse(await (await resumed).json());
  expect(recovered.gift.id).toBe(original.gift.id);
  expect(recovered.forUserId).toBe(original.forUserId);
  expect(recovered.forUserId).not.toBeNull();
  expect(recovered.giftClaimToken).toBeNull();
  expect(recovered.messageAttempt?.state).toBe("pending");
  expect(begins).toBe(1);
  expect(takeOuts).toBe(0);
  await expect(
    recovery.getByRole("button", { name: say(giving.inTheBag.send, language), exact: true }),
  ).toHaveCount(0);
  await recovery.getByRole("button", { name: say(giving.inTheBag.takeOut, language) }).click();
  await expect(recovery).toBeHidden();
  expect(takeOuts).toBe(1);
  await expect(boardSticker(alice, language, no)).toBeVisible();
});
