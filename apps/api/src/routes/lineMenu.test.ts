import { inspect } from "node:util";
import { DAILY_TICKETS_PER_DAY, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { chatMenuFor, chatMenuLinkSchema, type ChatMenuIds } from "../chatMenu/menus.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import {
  chatMenuThrough,
  createFakeLine,
  TEST_CHANNEL,
  TEST_CHAT_MENU_IDS,
  type FakeLine,
} from "../testing/fakeLine.ts";
import { fakeSuiWallets } from "../testing/fakes.ts";
import { fakeSui } from "../testing/fakeSui.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { payPurchase, signedBy, startedPurchase } from "../tickets/testPurchases.ts";
import { spendBody } from "../tickets/testSpends.ts";
import { TICKET_PACKS, type TicketKind } from "../tickets/tickets.ts";

const linkBodySchema = z.object({ chatMenu: chatMenuLinkSchema });

/** A LINE user ID as LINE writes them: U and 32 hex digits. */
const LINE_USER_ID = `U${"0123456789abcdef".repeat(2)}`;
const [ONE_TICKET] = TICKET_PACKS;

let test: TestApp;
/** The fake Privy Sui wallets, whose keys sign the person's payments. */
let wallets: ReturnType<typeof fakeSuiWallets>;
let line: FakeLine;
let userId: string;
let logged: unknown[][];

/** A fresh app whose chat menu links through a fake LINE, and a person signed in to it. */
async function start({
  ids = TEST_CHAT_MENU_IDS,
  language = "en",
}: { ids?: ChatMenuIds; language?: "en" | "ja" } = {}) {
  line = createFakeLine();
  test = await createTestApp((base) => {
    const chain = fakeSui(base.clock);
    wallets = fakeSuiWallets(base.db);
    return {
      ...chatMenuThrough(line, ids)(base),
      sui: chain.sui,
      gasStation: chain.gasStation,
      suiWallets: wallets,
    };
  });
  userId = insertUser(test.db, { lineUserId: LINE_USER_ID, language });
}

beforeEach(async () => {
  logged = [];
  for (const method of ["info", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logged.push(args);
    });
  }
  await start();
});

afterEach(() => {
  // The log never shows the channel's secret, its access tokens or anyone's LINE user ID.
  const log = inspect(logged, { depth: null });
  for (const secret of [TEST_CHANNEL.channelSecret, "fake-channel-token", LINE_USER_ID]) {
    expect(log).not.toContain(secret);
  }
  vi.restoreAllMocks();
});

const linkMenu = () => test.send("POST", "/api/line-menu", { as: userId });

/** Asks for the chat menu, which must answer 200, and returns what LINE shows. */
const linkedMenu = async () => (await bodyOf(await linkMenu(), linkBodySchema)).chatMenu;

const post = (path: string, body: object) => test.send("POST", path, { as: userId, body });

const spend = (kind: TicketKind) => post("/api/tickets/spend", spendBody(kind));

/** Spends a ticket of `kind`, which must be granted. */
async function spendTicket(kind: TicketKind) {
  expect((await spend(kind)).status).toBe(201);
}

/** The menu LINE shows the person once every link asked for so far has landed. */
async function menuAfterLinks() {
  await test.deps.lineChatMenu.idle();
  return line.links.get(LINE_USER_ID);
}

describe("POST /api/line-menu", () => {
  it("links the menu for your language and tickets, and says LINE shows it", async () => {
    expect(await linkedMenu()).toEqual({ status: "linked", menu: "3" });
    expect(line.links.get(LINE_USER_ID)).toBe(TEST_CHAT_MENU_IDS.en["3"]);
    expect(line.calls).toEqual([
      "token",
      `link ${LINE_USER_ID} ${TEST_CHAT_MENU_IDS.en["3"]}`,
      `read ${LINE_USER_ID}`,
    ]);
  });

  it("links the Japanese menus for someone whose language is Japanese", async () => {
    await start({ language: "ja" });
    expect(await linkedMenu()).toEqual({ status: "linked", menu: "3" });
    expect(line.links.get(LINE_USER_ID)).toBe(TEST_CHAT_MENU_IDS.ja["3"]);
  });

  it("links the menu for the tickets left today, which heals a count that went stale", async () => {
    await spendTicket("daily");
    await test.deps.lineChatMenu.idle();
    line.links.set(LINE_USER_ID, TEST_CHAT_MENU_IDS.en["3"]);
    expect(await linkedMenu()).toEqual({ status: "linked", menu: "2" });
    expect(line.links.get(LINE_USER_ID)).toBe(TEST_CHAT_MENU_IDS.en["2"]);
  });

  it("says not_a_friend when LINE takes the link but shows the default menu", async () => {
    line.strangers.add(LINE_USER_ID);
    expect(await linkedMenu()).toEqual({ status: "not_a_friend", menu: "3" });
    expect(line.links.has(LINE_USER_ID)).toBe(false);
  });

  it("falls back to the language's plain menu, and links nothing without one", async () => {
    await start({ ids: { en: { plain: TEST_CHAT_MENU_IDS.en.plain } } });
    expect(await linkedMenu()).toEqual({ status: "linked", menu: "plain" });
    expect(line.links.get(LINE_USER_ID)).toBe(TEST_CHAT_MENU_IDS.en.plain);

    await start({ ids: { ja: TEST_CHAT_MENU_IDS.ja } });
    expect(await linkedMenu()).toEqual({ status: "off", reason: "no_menu" });
    expect(line.calls).toEqual([]);
  });

  it("answers 502 line_unavailable when LINE fails or doesn't answer", async () => {
    for (const failure of [
      Response.json({ message: "Internal server error" }, { status: 500 }),
      new TypeError("fetch failed"),
    ]) {
      line.failNext("link", failure);
      expect(await refusalOf(await linkMenu())).toMatchObject({
        status: 502,
        error: "line_unavailable",
      });
    }
    expect(await linkedMenu()).toEqual({ status: "linked", menu: "3" });
  });

  it("says the chat menu is off when the server has no Messaging API channel", async () => {
    test = await createTestApp();
    userId = insertUser(test.db, { lineUserId: LINE_USER_ID });
    expect(await linkedMenu()).toEqual({ status: "off", reason: "not_configured" });
  });

  it("reuses the channel access token", async () => {
    await linkedMenu();
    await linkedMenu();
    expect(line.calls.filter((call) => call === "token")).toHaveLength(1);
  });
});

describe("the chat menu after a spend or a purchase", () => {
  it("follows each spend: 2 and 1 daily tickets left, then none", async () => {
    const shown = [];
    for (let spent = 0; spent < DAILY_TICKETS_PER_DAY; spent++) {
      await spendTicket("daily");
      shown.push(await menuAfterLinks());
    }
    const { en } = TEST_CHAT_MENU_IDS;
    expect(shown).toEqual([en["2"], en["1"], en.none]);
  });

  it("shows reserve tickets only once the daily ones are gone, after a purchase", async () => {
    for (let spent = 0; spent < DAILY_TICKETS_PER_DAY; spent++) await spendTicket("daily");
    const { purchase, payment } = await startedPurchase(test, userId, ONE_TICKET);
    const signed = await signedBy(wallets.keyOf(userId), payment);
    expect((await payPurchase(test, userId, purchase.id, signed)).status).toBe(201);
    expect(await menuAfterLinks()).toBe(TEST_CHAT_MENU_IDS.en.reserve);

    await spendTicket("reserve");
    expect(await menuAfterLinks()).toBe(TEST_CHAT_MENU_IDS.en.none);
  });

  it("links nothing after a refused spend", async () => {
    expect((await spend("reserve")).status).toBe(409);
    await test.deps.lineChatMenu.idle();
    expect(line.calls).toEqual([]);
  });

  it("never fails a spend when LINE does", async () => {
    line.failNext("token", Response.json({ error: "server_error" }, { status: 500 }));
    await spendTicket("daily");
    await test.deps.lineChatMenu.idle();
    expect(line.links.has(LINE_USER_ID)).toBe(false);
    expect(inspect(logged)).toContain("chat_menu.relink_failed");

    await spendTicket("daily");
    expect(await menuAfterLinks()).toBe(TEST_CHAT_MENU_IDS.en["1"]);
  });

  it("links one person's counts in turn, so an older count can't land after a newer one", async () => {
    const releaseFirstLink = line.holdNext("link");
    await spendTicket("daily");
    await spendTicket("daily");
    releaseFirstLink();
    expect(await menuAfterLinks()).toBe(TEST_CHAT_MENU_IDS.en["1"]);
    expect(line.calls.filter((call) => call.startsWith("link"))).toEqual([
      `link ${LINE_USER_ID} ${TEST_CHAT_MENU_IDS.en["2"]}`,
      `link ${LINE_USER_ID} ${TEST_CHAT_MENU_IDS.en["1"]}`,
    ]);
  });
});

describe("the chat menu in Kyoto Seika Manga Expression Practice Mode", () => {
  const setKyotoSeikaPractice = async (kyotoSeikaPractice: boolean) =>
    expect((await post("/api/me/kyoto-seika-practice", { kyotoSeikaPractice })).status).toBe(200);
  const menuFor = (dailyLeft: number, kyotoSeika: boolean) =>
    TEST_CHAT_MENU_IDS.en[chatMenuFor({ dailyLeft, reserveLeft: 0 }, kyotoSeika)];

  it("moves to the mode's menus as it turns on, follows its spends, and moves back as it turns off", async () => {
    await spendTicket("daily");
    await setKyotoSeikaPractice(true);
    expect(await menuAfterLinks()).toBe(menuFor(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY - 1, true));
    await spendTicket("daily");
    expect(await menuAfterLinks()).toBe(menuFor(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY - 2, true));
    await setKyotoSeikaPractice(false);
    expect(await menuAfterLinks()).toBe(menuFor(DAILY_TICKETS_PER_DAY - 2, false));
  });
});

describe("POST /api/me/language-choice", () => {
  it("moves the chat menu to the chosen language at once, and keeps it there", async () => {
    expect((await post("/api/me/language-choice", { language: "ja" })).status).toBe(200);
    expect(await menuAfterLinks()).toBe(TEST_CHAT_MENU_IDS.ja["3"]);
    expect(await linkedMenu()).toEqual({ status: "linked", menu: "3" });
    expect(line.links.get(LINE_USER_ID)).toBe(TEST_CHAT_MENU_IDS.ja["3"]);
  });
});

describe("DELETE /api/me", () => {
  it("unlinks the chat menu, so LINE shows the default one", async () => {
    await linkedMenu();
    const response = await test.send("DELETE", "/api/me", { as: userId });
    expect(response.status).toBe(204);
    await test.deps.lineChatMenu.idle();
    expect(line.links.has(LINE_USER_ID)).toBe(false);
    expect(line.calls.at(-1)).toBe(`unlink ${LINE_USER_ID}`);
  });
});
