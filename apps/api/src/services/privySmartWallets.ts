import { users, type Db } from "@drawing-app/db";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { eq } from "drizzle-orm";
import { isAddress } from "viem";
import type { SmartWallets } from "../deps.ts";

const PRIVY_LOOKUP_URL = "https://api.privy.io/v1/users/custom_auth/id";

const field = (value: unknown, key: string): unknown =>
  value && typeof value === "object" ? Reflect.get(value, key) : undefined;

function smartWalletAddress(body: unknown): string | null {
  const direct = field(field(body, "smart_wallet"), "address");
  if (typeof direct === "string" && isAddress(direct)) return direct.toLowerCase();
  const accounts = field(body, "linked_accounts");
  if (!Array.isArray(accounts)) return null;
  for (const account of accounts) {
    if (field(account, "type") !== "smart_wallet") continue;
    const address = field(account, "address");
    if (typeof address === "string" && isAddress(address)) return address.toLowerCase();
  }
  return null;
}

export function createPrivySmartWallets({
  db,
  lineChannelId,
  privyAppId,
  privyAppSecret,
  fetchImpl = fetch,
}: {
  db: Db;
  lineChannelId: string;
  privyAppId: string;
  privyAppSecret: string;
  fetchImpl?: typeof fetch;
}): SmartWallets {
  if (!lineChannelId || !privyAppId || !privyAppSecret) {
    throw new Error("Privy smart-wallet lookup configuration is incomplete");
  }
  const authorization = `Basic ${Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64")}`;
  return {
    addressFor: async (userId) => {
      const user = db
        .select({ lineUserId: users.lineUserId, smartAccountAddress: users.smartAccountAddress })
        .from(users)
        .where(eq(users.id, userId))
        .get();
      if (!user?.lineUserId) return null;
      if (user.smartAccountAddress) return user.smartAccountAddress;
      const response = await fetchImpl(PRIVY_LOOKUP_URL, {
        method: "POST",
        headers: {
          authorization,
          "privy-app-id": privyAppId,
          "content-type": "application/json",
          "user-agent": "sticker-api/1",
        },
        body: JSON.stringify({
          custom_user_id: privySubject(lineChannelId, user.lineUserId),
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Privy user lookup failed with HTTP ${response.status}`);
      const address = smartWalletAddress(await response.json());
      if (!address) return null;
      db.update(users).set({ smartAccountAddress: address }).where(eq(users.id, userId)).run();
      return address;
    },
  };
}
