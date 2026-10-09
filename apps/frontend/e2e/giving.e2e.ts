import { expect, type Locator } from "@playwright/test";
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
  const other = await sealFromBoard(alice, language);
  await (
    await openDetail(alice, language, other)
  )
    .getByRole("navigation", { name: say(stickerBoard.detail.yourStickers, language) })
    .getByRole("button", { name: no, exact: true })
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
  /** Where a part sits in the page's layout, apart from any rise it's making. */
  const span = (part: Locator) =>
    part.evaluate((el: HTMLElement) => ({
      top: el.offsetTop,
      foot: el.offsetTop + el.offsetHeight,
    }));
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
