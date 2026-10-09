import { expect, type Page } from "@playwright/test";
import { GAME_CONFIG } from "../src/gratitude/gameConfig.ts";
import { strings } from "../src/i18n/strings/index.ts";
import {
  backToBoardOnceSent,
  giftClaimTokenFrom,
  giveFromBoard,
  handleOf,
  openExplore,
  openTheirBoard,
  playCombo,
  say,
  sealFromBoard,
  signIn,
  startsWith,
  test,
  unpackageAndAccept,
} from "./helpers.ts";

const { explore, stickerBoard, ui } = strings;
const language = "en";

/** Your own board's Draw key and Zipper, which someone else's board leaves out. */
const drawKey = (page: Page) =>
  page.getByRole("button", { name: startsWith(say(stickerBoard.board.drawLabel, language)) });
const zipper = (page: Page) =>
  page.getByRole("button", { name: startsWith(say(stickerBoard.tray.zipper, language)) });

/** Someone else's sticker board is open, read only: Give in Draw's place, and no sticker tray. */
async function expectTheirBoard(page: Page, handle: string) {
  await expect(
    page.getByRole("region", {
      name: say(stickerBoard.artistBoard.title, language, { name: handle }),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: say(stickerBoard.artistBoard.give, language), exact: true }),
  ).toBeVisible();
  await expect(drawKey(page)).toHaveCount(0);
  await expect(zipper(page)).toHaveCount(0);
}

test("Pile and board: Bob finds Alice's sticker on today's pile, lifts it, and goes on to her sticker board", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const no = await sealFromBoard(alice, language);
  // On her own board, Alice has both; the Zipper is drawn over the board's edge, unseen by Playwright.
  await expect(drawKey(alice)).toBeVisible();
  await expect(zipper(alice)).toBeAttached();

  await signIn(bob, "bob", language);
  await openExplore(bob, language);
  const sticker = bob
    .getByRole("region", { name: say(explore.pile.today, language), exact: true })
    .getByRole("button", {
      name: startsWith(
        say(explore.pile.sticker, language, { number: no, artist: aliceHandle, ago: "" }),
      ),
    });
  await expect(sticker).toBeVisible();
  // The pile's stickers overlap, so a tap on its spot could land on another: the keyboard lifts it.
  await sticker.focus();
  await bob.keyboard.press("Enter");
  await bob
    .getByRole("dialog", { name: say(explore.lifted.label, language, { no, artist: aliceHandle }) })
    .getByRole("button", {
      name: say(explore.lifted.goToBoard, language, { artist: aliceHandle }),
    })
    .click();
  await expectTheirBoard(bob, aliceHandle);
});

test("Search: Bob finds Alice by her handle and opens her sticker board", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  await signIn(bob, "bob", language);
  await openTheirBoard(bob, language, aliceHandle);
  await expectTheirBoard(bob, aliceHandle);
});

test("This week: Bob's combo puts Alice on Most gratitude and him on Best combo, and Alice, who sealed today, is on Streak", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "alice", language));
  const no = await sealFromBoard(alice, language);
  const giftClaimToken = giftClaimTokenFrom(alice);
  await giveFromBoard(alice, language, no);
  await backToBoardOnceSent(alice, language);

  const bobHandle = handleOf(await signIn(bob, "bob", language));
  await bob.goto(`/g/${await giftClaimToken}`);
  await unpackageAndAccept(bob, language, aliceHandle);
  // Longer than the suite's other combos, so these two stay on the leaderboards beside the other
  // browser's run of this spec, which shares this week's leaderboards: rows are found by handle, not place.
  const { combo, receipt } = await playCombo(bob, language, aliceHandle, 3 * GAME_CONFIG.burst);
  await receipt.getByRole("button", { name: say(ui.backToBoard, language) }).click();

  await openExplore(bob, language);
  await bob.getByRole("tab", { name: say(explore.views.thisWeek, language) }).click();
  const rows = async (board: keyof typeof explore.leaderboards) => {
    const name = say(explore.leaderboards[board], language);
    await bob.getByRole("tab", { name }).click();
    return bob.getByRole("tabpanel", { name }).getByRole("listitem");
  };

  // She gave a sticker she drew, so the whole combo is hers.
  const mostGratitude = (await rows("mostGratitude")).filter({ hasText: aliceHandle });
  await expect(
    mostGratitude.getByText(
      say(explore.figure.gratitude, language, { amount: combo.total.toLocaleString(language) }),
      { exact: true },
    ),
  ).toBeVisible();

  const bestCombo = (await rows("bestCombo")).filter({ hasText: bobHandle });
  await expect(
    bestCombo.getByText(
      say(ui.hitCounter.spoken_other, language, { hits: combo.hits.toLocaleString(language) }),
      { exact: true },
    ),
  ).toBeAttached();

  // Her first seal, today, starts a streak of one day.
  const aliceStreak = (await rows("longestStreak")).filter({ hasText: aliceHandle });
  await expect(
    aliceStreak.getByText(say(explore.figure.streakSpoken_one, language, { count: 1 }), {
      exact: true,
    }),
  ).toBeAttached();
});
