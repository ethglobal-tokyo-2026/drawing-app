import { PAID_PACK } from "@drawing-app/api/testing/purchases";
import { FREE_PACK_TICKETS } from "@drawing-app/api/tickets";
import { expect, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { buyPackOnFakeSui } from "./fakeSuiPurchase.ts";
import {
  backToBoardOnceSent,
  boardSticker,
  canvas,
  checkout,
  checkoutPack,
  drawKey,
  drawKeyName,
  giftClaimTokenFrom,
  giveFromBoard,
  gratitudeAsk,
  handleOf,
  openDetail,
  openCheckoutFromShop,
  say,
  sayCount,
  sealFromBoard,
  signIn,
  spendEveryDailyTicket,
  test,
  unpackageAndAccept,
} from "./helpers.ts";

const { gratitude, receiving, stickerBoard, tickets, ui } = strings;
const language = "en";

/** The live TicketCard entry, if one owns the browser's current history entry. */
const cardEntry = (page: Page) =>
  page.evaluate(() => {
    const state: unknown = history.state;
    const marker =
      state !== null && typeof state === "object" && "drawingAppOverlay" in state
        ? state.drawingAppOverlay
        : null;
    return typeof marker === "string" ? marker : null;
  });

/** Press the browser's Back button; the app must handle the resulting popstate. */
const back = (page: Page) => page.evaluate(() => history.back());

test("Back closes a ready Mini-game, then records a played combo before closing its receipt", async ({
  page: alice,
  friend: bob,
}) => {
  const aliceHandle = handleOf(await signIn(alice, "back-gratitude-alice", language));
  const no = await sealFromBoard(alice, language);
  const giftClaimToken = giftClaimTokenFrom(alice);
  await giveFromBoard(alice, language, no);
  await backToBoardOnceSent(alice, language);

  await signIn(bob, "back-gratitude-bob", language);
  await bob.goto(`/g/${await giftClaimToken}`);
  await unpackageAndAccept(bob, language, aliceHandle);
  await gratitudeAsk(bob, language, aliceHandle)
    .getByRole("button", { name: say(receiving.sendGratitude.send, language) })
    .click();
  const game = bob.getByRole("dialog", { name: say(gratitude.title, language) });
  await expect(game).toBeVisible();
  const url = bob.url();
  expect(await cardEntry(bob)).not.toBeNull();

  await back(bob);
  await expect(game).toBeHidden();
  await expect(boardSticker(bob, language, no)).toBeVisible();
  await expect.poll(() => cardEntry(bob)).toBeNull();
  expect(bob.url()).toBe(url);

  const detail = await openDetail(bob, language, no);
  await detail
    .getByRole("button", { name: say(stickerBoard.detail.sendGratitude, language) })
    .click();
  await expect(game).toBeVisible();
  const playingEntry = await cardEntry(bob);
  expect(playingEntry).not.toBeNull();
  const heart = game.getByRole("button", {
    name: say(gratitude.heart, language, { handle: aliceHandle }),
  });
  const box = await heart.boundingBox();
  if (!box) throw new Error("The Mini-game heart is not visible");
  await bob.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(
    game.getByRole("button", { name: say(gratitude.endAndSend, language) }),
  ).toBeVisible();

  const recorded = bob.waitForRequest(
    (request) =>
      request.method() === "POST" && new URL(request.url()).pathname === "/api/gratitude",
  );
  await back(bob);
  expect((await recorded).postData()).toContain('"endReason":"closed"');
  await expect(game).toBeVisible();
  await expect.poll(() => cardEntry(bob)).not.toBe(playingEntry);
  expect(await cardEntry(bob)).not.toBeNull();
  const receipt = game.getByRole("region", { name: say(gratitude.receipt.label, language) });
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText(say(ui.hitCounter.spoken_one, language, { hits: 1 }));

  await back(bob);
  await expect(game).toBeHidden();
  await expect(boardSticker(bob, language, no)).toBeVisible();
  await expect.poll(() => cardEntry(bob)).toBeNull();
  expect(bob.url()).toBe(url);
});
/** A gRPC-Web GetBalance answer with enough JPYC for the simulated paid pack. */
function simulatedJpycBalance() {
  let balance = 1_000_000_000_000n;
  const amount: number[] = [];
  do {
    let byte = Number(balance & 0x7fn);
    balance >>= 7n;
    if (balance > 0n) byte |= 0x80;
    amount.push(byte);
  } while (balance > 0n);
  // GetBalanceResponse.balance = 1; Balance.balance = 3.
  const nested = [0x18, ...amount];
  const message = [0x0a, nested.length, ...nested];
  const trailer = Buffer.from("grpc-status: 0\r\n");
  return Buffer.concat([
    Buffer.from([0, 0, 0, 0, message.length, ...message]),
    Buffer.from([0x80, 0, 0, 0, trailer.length]),
    trailer,
  ]);
}

test("Back closes the checkout to out of tickets, then the out-of-tickets card to the board", async ({
  page,
}) => {
  await signIn(page, "back-out", language);
  await spendEveryDailyTicket(page, language);
  const url = page.url();
  await drawKey(page, language).click();
  const out = page.getByRole("dialog", { name: say(tickets.outOfTickets.title, language) });
  await expect(out).toBeVisible();
  const outEntry = await cardEntry(page);
  expect(outEntry).not.toBeNull();

  await out.getByRole("button", { name: say(tickets.buyReserveTickets, language) }).click();
  const packs = checkout(page, language);
  await expect(packs).toBeVisible();
  await expect.poll(() => cardEntry(page)).not.toBe(outEntry);
  expect(await cardEntry(page)).not.toBeNull();

  const packsEntry = await cardEntry(page);
  await back(page);
  await expect(packs).toBeHidden();
  await expect(out).toBeVisible();
  await expect.poll(() => cardEntry(page)).not.toBe(packsEntry);
  expect(await cardEntry(page)).not.toBeNull();
  expect(page.url()).toBe(url);

  await back(page);
  await expect(out).toBeHidden();
  await expect(
    page.getByRole("region", { name: say(stickerBoard.board.label, language) }),
  ).toBeVisible();
  await expect.poll(() => cardEntry(page)).toBeNull();
  expect(page.url()).toBe(url);
});

test("Back closes StartDrawing's reserve-ticket ask to the board", async ({ page }) => {
  await signIn(page, "back-start", language);
  await spendEveryDailyTicket(page, language);
  const pack = PAID_PACK;
  await buyPackOnFakeSui(page, pack);
  await page.reload();
  await expect(canvas(page, language)).toBeAttached();
  const url = page.url();
  await page.getByRole("button", { name: drawKeyName(language, pack.tickets, "reserve") }).click();
  const ask = page.getByRole("dialog", { name: say(tickets.startDrawing.reserve.title, language) });
  await expect(ask).toBeVisible();
  expect(await cardEntry(page)).not.toBeNull();

  await back(page);
  await expect(ask).toBeHidden();
  await expect(
    page.getByRole("region", { name: say(stickerBoard.board.label, language) }),
  ).toBeVisible();
  await expect.poll(() => cardEntry(page)).toBeNull();
  expect(page.url()).toBe(url);
});

test("Back during StartDrawing's leaving animation stays in Croquis", async ({ page }) => {
  await signIn(page, "back-leaving", language);
  await spendEveryDailyTicket(page, language);
  await buyPackOnFakeSui(page, PAID_PACK);
  await page.reload();
  await expect(canvas(page, language)).toBeAttached();
  const url = page.url();
  const spendRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/tickets/spend") {
      spendRequests.push(request.url());
    }
  });
  await page.addStyleTag({
    content:
      ".out-of-tickets.is-leaving .out-of-tickets__card { animation-duration: 2s !important; animation-delay: 0ms !important; }",
  });
  await page
    .getByRole("button", { name: drawKeyName(language, PAID_PACK.tickets, "reserve") })
    .click();
  const ask = page.getByRole("dialog", { name: say(tickets.startDrawing.reserve.title, language) });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: say(tickets.startDrawing.reserve.use, language) }).click();
  await expect(page.locator(".out-of-tickets.is-leaving")).toHaveCount(1);
  await page.waitForTimeout(350);
  await expect(ask).toBeAttached();
  await back(page);
  await expect.poll(() => cardEntry(page)).not.toBeNull();
  expect(page.url()).toBe(url);
  await expect(ask).toBeHidden();
  await expect(canvas(page, language)).toBeVisible();
  await expect.poll(() => cardEntry(page)).toBeNull();
  expect(spendRequests).toHaveLength(1);
});

test("Back closes TicketsNotLoaded after the ticket request fails", async ({ page }) => {
  await signIn(page, "back-loading", language);
  await page.route("**/api/tickets", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "tickets_unavailable" }),
    }),
  );
  await page.reload();
  const url = page.url();
  await page.getByRole("button", { name: say(stickerBoard.board.drawLabel, language) }).click();
  const card = page.getByRole("dialog", { name: say(tickets.notLoaded.couldntLoad, language) });
  await expect(card).toBeVisible();
  expect(await cardEntry(page)).not.toBeNull();

  await back(page);
  await expect(card).toBeHidden();
  await expect(
    page.getByRole("region", { name: say(stickerBoard.board.label, language) }),
  ).toBeVisible();
  await expect.poll(() => cardEntry(page)).toBeNull();
  expect(page.url()).toBe(url);
});

test("Back during a free-pack request keeps checkout open, and a later Back closes it", async ({
  page,
}) => {
  const freePack = FREE_PACK_TICKETS;
  if (freePack === null) throw new Error("The free reserve pack offer is off");
  await signIn(page, "back-paying", language);
  const card = await openCheckoutFromShop(page, language);
  await checkoutPack(card, language, freePack).click();
  const url = page.url();
  let release = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = () => resolve();
  });
  await page.route("**/api/ticket-purchases/start", async (route) => {
    await waiting;
    await route.continue();
  });

  try {
    await card.getByRole("button", { name: say(tickets.checkout.takeFree, language) }).click();
    await expect(card).toHaveAttribute("aria-busy", "true");
    const payingEntry = await cardEntry(page);
    expect(payingEntry).not.toBeNull();
    await back(page);
    await expect.poll(() => cardEntry(page)).not.toBe(payingEntry);
    expect(await cardEntry(page)).not.toBeNull();
    await expect(card).toBeVisible();
    expect(page.url()).toBe(url);
  } finally {
    release();
  }

  const added = page.getByRole("dialog", {
    name: sayCount(tickets.checkout, "added", language, freePack),
  });
  await expect(added).toBeVisible();
  await back(page);
  await expect(added).toBeHidden();
  await expect.poll(() => cardEntry(page)).toBeNull();
  expect(page.url()).toBe(url);
});

test("Back during a simulated paid purchase keeps checkout open, then closes after its answer", async ({
  page,
}) => {
  await signIn(page, "back-paid", language);
  const card = await openCheckoutFromShop(page, language);
  const url = page.url();
  const wallet = `0x${"1".repeat(64)}`;
  const digest = "D".repeat(44);
  const signature = "c2lnbmVk";
  const purchaseId = 41;
  const ticketResponse = await page.request.get("/api/tickets");
  expect(ticketResponse.ok()).toBe(true);
  const ticketBody: unknown = await ticketResponse.json();
  const held: unknown =
    typeof ticketBody === "object" && ticketBody !== null && "tickets" in ticketBody
      ? ticketBody.tickets
      : null;
  if (
    typeof held !== "object" ||
    held === null ||
    !("reserveLeft" in held) ||
    typeof held.reserveLeft !== "number"
  ) {
    throw new Error(
      `GET /api/tickets did not include a reserve count: ${JSON.stringify(ticketBody)}`,
    );
  }
  const reserveLeft = held.reserveLeft;
  const afterPurchase = { ...held, reserveLeft: reserveLeft + PAID_PACK.tickets };
  const paidRequests: unknown[] = [];
  let release = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = () => resolve();
  });

  // LIFF Mock has no Privy wallet. Use the app's existing status and signer boundaries while
  // the purchase API gives a simulated paid answer; no Sui transaction reaches the server.
  await page.route("https://fullnode.testnet.sui.io/**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "application/grpc-web+proto", "grpc-status": "0" },
      body: simulatedJpycBalance(),
    }),
  );
  await page.route("**/api/ticket-purchases/start", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        purchase: { id: purchaseId, tickets: PAID_PACK.tickets, priceYen: PAID_PACK.priceYen },
        payment: {
          txBytes: "AAAA",
          digest,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      }),
    }),
  );
  await page.route("**/api/ticket-purchases", async (route) => {
    paidRequests.push(route.request().postDataJSON());
    await waiting;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ tickets: afterPurchase }),
    });
  });
  await page.evaluate(
    async ({ wallet, signature }) => {
      const privyPath = "/src/identity/privy.ts";
      const signerPath = "/src/identity/suiSigner.ts";
      const methodOf = (module: unknown, name: string): ((value: unknown) => void) => {
        if (typeof module !== "object" || module === null || !(name in module)) {
          throw new Error(`The ${name} browser test boundary was not available`);
        }
        const method: unknown = Reflect.get(module, name);
        if (typeof method !== "function") {
          throw new Error(`The ${name} browser test boundary was not a function`);
        }
        return (value) => {
          Reflect.apply(method, module, [value]);
        };
      };
      const privy: unknown = await import(privyPath);
      const signer: unknown = await import(signerPath);
      methodOf(
        privy,
        "setPrivyStatus",
      )({
        state: "signed-in",
        userId: "simulated-paid-buyer",
        suiWallet: wallet,
      });
      methodOf(signer, "setSuiSigner")({ signTransaction: async () => ({ signature }) });
    },
    { wallet, signature },
  );

  const pack = checkoutPack(card, language, PAID_PACK.tickets);
  await pack.click();
  const price = await pack.locator("strong").textContent();
  const pay = card.getByRole("button", {
    name: say(tickets.checkout.payPrice, language, { price: price ?? "" }),
  });
  await expect(pay).toBeEnabled();
  try {
    await pay.click();
    await expect.poll(() => paidRequests.length).toBe(1);
    await expect(card).toHaveAttribute("aria-busy", "true");
    expect(paidRequests).toEqual([{ purchaseId, digest, signature }]);
    const payingEntry = await cardEntry(page);
    expect(payingEntry).not.toBeNull();
    await back(page);
    await expect.poll(() => cardEntry(page)).not.toBe(payingEntry);
    expect(await cardEntry(page)).not.toBeNull();
    await expect(card).toBeVisible();
    expect(page.url()).toBe(url);
  } finally {
    release();
  }

  const added = page.getByRole("dialog", {
    name: sayCount(tickets.checkout, "added", language, PAID_PACK.tickets),
  });
  await expect(added).toBeVisible();
  await back(page);
  await expect(added).toBeHidden();
  await expect.poll(() => cardEntry(page)).toBeNull();
  expect(page.url()).toBe(url);
});
