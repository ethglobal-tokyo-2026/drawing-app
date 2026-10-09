import { users } from "@drawing-app/db";
import { createTestDb, insertUser } from "@drawing-app/db/testing";
import { privySubject } from "@drawing-app/line-auth/line-privy-jwt";
import { APIConnectionTimeoutError, type User } from "@privy-io/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { privyEmbeddedWallet, privySmartWallet, privyUser } from "../testing/privy.ts";
import { createPrivySuiWallets } from "./privySuiWallets.ts";

const APP_SECRET = "privy-secret";
const CHANNEL_ID = "line-channel";
const LINE_USER_ID = "line-alice";
/** As Privy may print it: in capitals. */
const SUI_ADDRESS = `0x${"AB".repeat(32)}`;

let logs: LogLines;
beforeEach(() => {
  logs = captureLogLines();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  const output = logs.raw.join("\n");
  expect(output).not.toContain(APP_SECRET);
  expect(output).not.toContain(LINE_USER_ID);
});

/** A signed-in person, and their wallets read through Privy as `fetchImpl` answers. */
async function setup(fetchImpl: typeof fetch) {
  const { db } = await createTestDb();
  const userId = insertUser(db, { lineUserId: LINE_USER_ID });
  const wallets = createPrivySuiWallets({
    db,
    lineChannelId: CHANNEL_ID,
    privyAppId: "privy-app",
    privyAppSecret: APP_SECRET,
    fetchImpl,
  });
  /** The wallet kept on the person's row. */
  const kept = () => db.select({ suiAddress: users.suiAddress }).from(users).get()?.suiAddress;
  return { userId, wallets, kept };
}

/** Privy answering every lookup with a user who has `accounts`. */
const privyWith = (...accounts: User["linked_accounts"]) =>
  vi.fn<typeof fetch>(async () => Response.json(privyUser(accounts)));

describe("Privy Sui wallets", () => {
  it("finds the person by their LINE sign-in, and answers and keeps their Sui wallet, normalized", async () => {
    const fetchImpl = privyWith(
      privyEmbeddedWallet(`0x${"1".repeat(64)}`, "aptos"),
      privySmartWallet(`0x${"2".repeat(40)}`),
      privyEmbeddedWallet(SUI_ADDRESS),
    );
    const test = await setup(fetchImpl);
    await expect(test.wallets.addressFor(test.userId)).resolves.toBe(SUI_ADDRESS.toLowerCase());
    expect(test.kept()).toBe(SUI_ADDRESS.toLowerCase());
    const [input, init] = fetchImpl.mock.calls[0] ?? [];
    expect(await new Request(input ?? "", init).json()).toEqual({
      custom_user_id: privySubject(CHANNEL_ID, LINE_USER_ID),
    });
    logs.expectLogged("wallet.lookup.completed", { userId: test.userId, status: "found" });
  });

  it("answers null until Privy has made the Sui wallet", async () => {
    const test = await setup(privyWith(privyEmbeddedWallet(`0x${"1".repeat(64)}`, "aptos")));
    await expect(test.wallets.addressFor(test.userId)).resolves.toBeNull();
    logs.expectLogged("wallet.lookup.completed", {
      userId: test.userId,
      status: "missing_sui_wallet",
    });
  });

  it("answers null when Privy has no such user", async () => {
    const test = await setup(async () =>
      Response.json({ error: "User not found" }, { status: 404 }),
    );
    await expect(test.wallets.addressFor(test.userId)).resolves.toBeNull();
    logs.expectLogged("wallet.lookup.completed", { userId: test.userId, status: "not_found" });
  });

  it.each([401, 429, 500])("surfaces HTTP %i at once, without a retry", async (status) => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "Lookup refused" }, { status }),
    );
    const test = await setup(fetchImpl);
    await expect(test.wallets.addressFor(test.userId)).rejects.toThrow(
      `Privy user lookup failed with HTTP ${status}`,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
    logs.expectLogged("wallet.lookup.failed", { userId: test.userId, status });
  });

  it("gives up on a stalled lookup without a retry", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const test = await setup(fetchImpl);
    vi.useFakeTimers();
    const failed = expect(test.wallets.addressFor(test.userId)).rejects.toBeInstanceOf(
      APIConnectionTimeoutError,
    );
    await vi.runAllTimersAsync();
    await failed;
    expect(fetchImpl).toHaveBeenCalledOnce();
    logs.expectLogged("wallet.lookup.failed", { userId: test.userId });
  });
});
