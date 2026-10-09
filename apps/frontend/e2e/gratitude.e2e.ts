import { expect, type Page } from "@playwright/test";
import { GAME_CONFIG } from "../src/gratitude/gameConfig.ts";
import { strings } from "../src/i18n/strings/index.ts";
import {
  flipToStatBoard,
  giftClaimTokenFrom,
  giveFromBoard,
  handleOf,
  openDetail,
  playCombo,
  receivedRow,
  say,
  sealFromBoard,
  sendInLineChat,
  signIn,
  test,
  unpackageAndAccept,
} from "./helpers.ts";

const { stickerBoard, ui } = strings;
const language = "en";

/** Your stat board's Gratitude received paper. */
const gratitudeReceived = (page: Page) =>
  page.getByRole("region", { name: say(stickerBoard.statBoard.gratitude.title, language) });

/** The link under your receipt's total that opens your gratitude events. */
const seeWhereItCameFrom = (page: Page) =>
  gratitudeReceived(page).getByRole("button", {
    name: say(stickerBoard.statBoard.gratitude.events.open, language),
  });

test("Gratitude: Bob plays a combo for Alice's gift, its receipt says sent, and it lands on Alice's stat board in her gratitude events, once", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const no = await sealFromBoard(alice, language);
  await giveFromBoard(alice, language, no);
  const giftClaimToken = giftClaimTokenFrom(alice);
  await sendInLineChat(alice, language, no);

  // Alice looks at her stat board while her gift is on its way, then turns back to her stickers. The
  // board stays mounted, so the later turn has to load her User Stats again to show the gratitude.
  await flipToStatBoard(alice, language);
  await expect(gratitudeReceived(alice)).toContainText(
    say(stickerBoard.statBoard.gratitude.noneYetOwn, language),
  );
  await expect(seeWhereItCameFrom(alice)).toHaveCount(0);
  await alice.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();

  const bobHandle = handleOf(await signIn(bob, "bob", language));
  await bob.goto(`/g/${await giftClaimToken}`);
  await unpackageAndAccept(bob, language, aliceHandle);

  // Taps within the speed limit's burst all count, however fast they come: each is one hit.
  const taps = GAME_CONFIG.burst;
  const { combo, receipt } = await playCombo(bob, language, aliceHandle, taps);
  const amount = combo.total.toLocaleString(language);
  await expect(receipt.getByText(amount, { exact: true })).toBeVisible();
  await expect(receipt).toContainText(say(ui.hitCounter.spoken_other, language, { hits: taps }));
  await receipt.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(receipt).toBeHidden();

  // Alice, still in the app, turns her board over again: her receipt's total is the combo. She gave a
  // sticker she drew, so the whole combo is hers, as Direct: her gratitude events list it from Bob,
  // without the Residual tag.
  await flipToStatBoard(alice, language);
  await expect(gratitudeReceived(alice).getByText(amount, { exact: true })).toBeVisible();
  await seeWhereItCameFrom(alice).click();
  const events = alice
    .getByRole("dialog", { name: say(stickerBoard.statBoard.gratitude.title, language) })
    .getByRole("listitem");
  await expect(events).toHaveCount(1);
  await expect(events).toContainText(bobHandle);
  await expect(events.getByText(amount, { exact: true })).toBeVisible();
  await expect(events).not.toContainText(
    say(stickerBoard.statBoard.gratitude.events.residual, language),
  );

  // The gift has its gratitude: once the Transfer Trail has loaded, Send gratitude isn't offered.
  const detail = await openDetail(bob, language, no);
  await expect(receivedRow(detail, language, aliceHandle)).toBeVisible();
  await expect(
    detail.getByRole("button", { name: say(stickerBoard.detail.sendGratitude, language) }),
  ).toHaveCount(0);
});
