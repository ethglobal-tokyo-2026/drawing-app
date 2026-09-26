import { users } from "@drawing-app/db";
import { createTestDb, insertUser } from "@drawing-app/db/testing";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createPrivySmartWallets } from "./privySmartWallets.ts";

const APP_ID = "privy-app";
const APP_SECRET = "privy-secret";
const CHANNEL_ID = "line-channel";
const ADDRESS = `0x${"a".repeat(40)}`;

describe("Privy smart-wallet lookup", () => {
  it("finds a custom-auth user's smart wallet and caches it on the person", async () => {
    const { db } = await createTestDb();
    const userId = insertUser(db, { lineUserId: "line-alice" });
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.headers).toMatchObject({
        "privy-app-id": APP_ID,
        authorization: `Basic ${Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64")}`,
      });
      if (typeof init?.body !== "string") throw new Error("Expected a JSON request body");
      expect(JSON.parse(init.body)).toEqual({
        custom_user_id: privySubject(CHANNEL_ID, "line-alice"),
      });
      return Response.json({ linked_accounts: [{ type: "smart_wallet", address: ADDRESS }] });
    });
    const wallets = createPrivySmartWallets({
      db,
      lineChannelId: CHANNEL_ID,
      privyAppId: APP_ID,
      privyAppSecret: APP_SECRET,
      fetchImpl,
    });

    await expect(wallets.addressFor(userId)).resolves.toBe(ADDRESS);
    await expect(wallets.addressFor(userId)).resolves.toBe(ADDRESS);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(
      db
        .select({ address: users.smartAccountAddress })
        .from(users)
        .where(eq(users.id, userId))
        .get(),
    ).toEqual({ address: ADDRESS });
  });

  it("returns null until Privy has made the smart wallet", async () => {
    const { db } = await createTestDb();
    const userId = insertUser(db);
    const wallets = createPrivySmartWallets({
      db,
      lineChannelId: CHANNEL_ID,
      privyAppId: APP_ID,
      privyAppSecret: APP_SECRET,
      fetchImpl: async () => Response.json({ linked_accounts: [] }),
    });

    await expect(wallets.addressFor(userId)).resolves.toBeNull();
  });
});
