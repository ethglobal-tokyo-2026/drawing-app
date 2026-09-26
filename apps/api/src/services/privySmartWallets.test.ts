import { users } from "@drawing-app/db";
import { createTestDb, insertUser } from "@drawing-app/db/testing";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { APIConnectionTimeoutError } from "@privy-io/node";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { privySmartWallet, privyUser } from "../testing/privy.ts";
import { createPrivySmartWallets } from "./privySmartWallets.ts";

const APP_ID = "privy-app";
const APP_SECRET = "privy-secret";
const CHANNEL_ID = "line-channel";
const ADDRESS = `0x${"a".repeat(40)}`;

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
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init);
      expect(request.url).toBe("https://api.privy.io/v1/users/custom_auth/id");
      expect(request.method).toBe("POST");
      expect(request.headers.get("privy-app-id")).toBe(APP_ID);
      expect(request.headers.get("authorization")).toBe(
        `Basic ${Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64")}`,
      );
      expect(await request.json()).toEqual({
        custom_user_id: privySubject(CHANNEL_ID, "line-alice"),
      });
      return Response.json(privyUser([privySmartWallet(ADDRESS)]));
    });
    const test = await setup(fetchImpl);
    try {
      await expect(test.wallets.addressFor(test.userId)).resolves.toBe(ADDRESS);
      await expect(test.wallets.addressFor(test.userId)).resolves.toBe(ADDRESS);
      expect(fetchImpl).toHaveBeenCalledOnce();
      expect(test.cached()).toBe(ADDRESS);
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
    } finally {
      vi.useRealTimers();
      test.close();
    }
  });
});
