import { users } from "@drawing-app/db";
import { createTestDb, insertUser } from "@drawing-app/db/testing";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { APIConnectionTimeoutError } from "@privy-io/node";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privySmartWallet, privyUser } from "../testing/privy.ts";
import { createPrivySmartWallets } from "./privySmartWallets.ts";

const APP_ID = "privy-app";
const APP_SECRET = "privy-secret";
const CHANNEL_ID = "line-channel";
const ADDRESS = `0x${"a".repeat(40)}`;
const diagnostics: unknown[] = [];

function captureDiagnostic(line: unknown) {
  if (typeof line !== "string") throw new Error("Expected a structured diagnostic");
  const entry: unknown = JSON.parse(line);
  diagnostics.push(entry);
}

beforeEach(() => {
  diagnostics.length = 0;
  vi.spyOn(console, "info").mockImplementation(captureDiagnostic);
  vi.spyOn(console, "error").mockImplementation(captureDiagnostic);
});

afterEach(() => vi.restoreAllMocks());

async function setup(fetchImpl: typeof fetch) {
  const { db, sqlite } = await createTestDb();
  const userId = insertUser(db, { lineUserId: "line-alice" });
  const wallets = createPrivySmartWallets({
    db,
    lineChannelId: CHANNEL_ID,
    privyAppId: APP_ID,
    privyAppSecret: APP_SECRET,
    fetchImpl,
  });
  return {
    userId,
    wallets,
    close: () => sqlite.close(),
    cached: () => db.select().from(users).where(eq(users.id, userId)).get()?.smartAccountAddress,
  };
}

describe("Privy smart-wallet lookup", () => {
  it("uses the SDK custom-auth lookup and caches only the smart-wallet address", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json(privyUser([privySmartWallet(ADDRESS)])),
    );
    const test = await setup(fetchImpl);
    try {
      await expect(test.wallets.addressFor(test.userId)).resolves.toBe(ADDRESS);
      await expect(test.wallets.addressFor(test.userId)).resolves.toBe(ADDRESS);
      expect(fetchImpl).toHaveBeenCalledOnce();
      const [input, init] = fetchImpl.mock.calls[0];
      expect(await new Request(input, init).json()).toEqual({
        custom_user_id: privySubject(CHANNEL_ID, "line-alice"),
      });
      expect(test.cached()).toBe(ADDRESS);
      expect(diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "wallet.lookup.started",
            userId: test.userId,
            cached: false,
          }),
          expect.objectContaining({
            event: "wallet.lookup.completed",
            userId: test.userId,
            cached: false,
            status: "found",
            address: ADDRESS,
          }),
          expect.objectContaining({
            event: "wallet.lookup.completed",
            userId: test.userId,
            cached: true,
            status: "found",
            address: ADDRESS,
          }),
        ]),
      );
      const output = JSON.stringify(diagnostics);
      expect(output).not.toContain(APP_SECRET);
      expect(output).not.toContain("line-alice");
      expect(output).not.toContain("https://api.privy.io");
    } finally {
      test.close();
    }
  });

  it("waits for a smart wallet rather than using the sign-in wallet", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          privyUser([
            {
              type: "wallet",
              address: ADDRESS,
              chain_type: "ethereum",
              wallet_client: "unknown",
              verified_at: 1,
              first_verified_at: null,
              latest_verified_at: null,
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(Response.json(privyUser([privySmartWallet(ADDRESS)])));
    const test = await setup(fetchImpl);
    try {
      await expect(test.wallets.addressFor(test.userId)).resolves.toBeNull();
      expect(test.cached()).toBeNull();
      expect(diagnostics).toContainEqual(
        expect.objectContaining({
          event: "wallet.lookup.completed",
          userId: test.userId,
          cached: false,
          status: "missing_smart_wallet",
        }),
      );
      await expect(test.wallets.addressFor(test.userId)).resolves.toBe(ADDRESS);
    } finally {
      test.close();
    }
  });

  it("returns null for SDK not-found errors and tries again after onboarding", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: "User not found" }, { status: 404 }))
      .mockResolvedValueOnce(Response.json(privyUser([privySmartWallet(ADDRESS)])));
    const test = await setup(fetchImpl);
    try {
      await expect(test.wallets.addressFor(test.userId)).resolves.toBeNull();
      expect(test.cached()).toBeNull();
      expect(diagnostics).toContainEqual(
        expect.objectContaining({
          event: "wallet.lookup.completed",
          userId: test.userId,
          cached: false,
          status: "not_found",
        }),
      );
      await expect(test.wallets.addressFor(test.userId)).resolves.toBe(ADDRESS);
    } finally {
      test.close();
    }
  });

  it.each([401, 429, 500])(
    "surfaces HTTP %i without hidden retries or caching an address",
    async (status) => {
      const fetchImpl = vi.fn<typeof fetch>(async () =>
        Response.json({ error: "Lookup refused" }, { status }),
      );
      const test = await setup(fetchImpl);
      try {
        await expect(test.wallets.addressFor(test.userId)).rejects.toThrow(
          `Privy user lookup failed with HTTP ${status}`,
        );
        expect(test.cached()).toBeNull();
        expect(fetchImpl).toHaveBeenCalledOnce();
        expect(diagnostics).toContainEqual(
          expect.objectContaining({
            event: "wallet.lookup.failed",
            userId: test.userId,
            cached: false,
            status,
          }),
        );
      } finally {
        test.close();
      }
    },
  );

  it("does not cache an invalid smart-wallet address", async () => {
    const test = await setup(async () =>
      Response.json(privyUser([privySmartWallet("invalid-address")])),
    );
    try {
      await expect(test.wallets.addressFor(test.userId)).resolves.toBeNull();
      expect(test.cached()).toBeNull();
    } finally {
      test.close();
    }
  });

  it("aborts a stalled SDK lookup without retrying or caching it", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const test = await setup(fetchImpl);
    vi.useFakeTimers();
    try {
      const failed = expect(test.wallets.addressFor(test.userId)).rejects.toBeInstanceOf(
        APIConnectionTimeoutError,
      );
      await vi.runAllTimersAsync();
      await failed;
      expect(fetchImpl).toHaveBeenCalledOnce();
      expect(test.cached()).toBeNull();
      expect(diagnostics).toContainEqual(
        expect.objectContaining({
          event: "wallet.lookup.failed",
          userId: test.userId,
          cached: false,
        }),
      );
      expect(JSON.stringify(diagnostics)).toContain('"message":"Request timed out."');
    } finally {
      vi.useRealTimers();
      test.close();
    }
  });
});
