import { expect, type Locator, type Page } from "@playwright/test";
import { GAME_CONFIG } from "../src/gratitude/gameConfig.ts";
import { strings } from "../src/i18n/strings/index.ts";
import {
  flipToStatBoard,
  giftClaimTokenFrom,
  giveFromBoard,
  gratitudeAsk,
  handleOf,
  openDetail,
  receivedRow,
  say,
  sealFromBoard,
  sendInLineChat,
  signIn,
  test,
  unpackageAndAccept,
} from "./helpers.ts";

const { gratitude, receiving, stickerBoard, ui } = strings;
const language = "en";

/**
 * The combo's gratitude total from the app's own request to record it. Ask before the combo ends, so
 * the request isn't missed.
 */
function gratitudeTotalFrom(page: Page) {
  return page
    .waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/gratitude")
    .then((request) => {
      const body: unknown = request.postDataJSON();
      const total =
        body !== null && typeof body === "object" && "total" in body ? body.total : null;
      if (typeof total !== "number") throw new Error("POST /api/gratitude carried no total");
      return total;
    });
}

/**
 * Taps the heart `taps` times, as a thumb does. The heart breathes and squashes, so it's tapped where
 * it stands rather than waited on to hold still; a tap counts anywhere on its resting area.
 */
async function tapHeart(heart: Locator, taps: number) {
  const box = await heart.boundingBox();
  if (!box) throw new Error("The heart isn't on screen");
  for (let tap = 0; tap < taps; tap++) {
    await heart.page().touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }
}

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
  await gratitudeAsk(bob, language, aliceHandle)
    .getByRole("button", { name: say(receiving.sendGratitude.send, language) })
    .click();

  // Taps within the speed limit's burst all count, however fast they come: each is one hit.
  const taps = GAME_CONFIG.burst;
  const combo = gratitudeTotalFrom(bob);
  await tapHeart(
    bob.getByRole("button", { name: say(gratitude.heart, language, { handle: aliceHandle }) }),
    taps,
  );
  // While the combo runs, the X ends it and sends it, rather than closing the screen.
  await bob.getByRole("button", { name: say(gratitude.endAndSend, language) }).click();

  // Named "Gratitude sent" only once the server has recorded the combo.
  const receipt = bob.getByRole("region", { name: say(gratitude.receipt.label, language) });
  await expect(receipt).toBeVisible();
  const amount = (await combo).toLocaleString(language);
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
