import { users, type Db } from "@drawing-app/db";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { APIError, NotFoundError, PrivyClient, type User } from "@privy-io/node";
import { eq } from "drizzle-orm";
import { isAddress } from "viem";
import type { SmartWallets } from "../deps.ts";

function smartWalletAddress(user: User): string | null {
  const wallet = user.linked_accounts.find(
    (account) => account.type === "smart_wallet" && isAddress(account.address),
  );
  return wallet?.type === "smart_wallet" ? wallet.address.toLowerCase() : null;
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
  const privy = new PrivyClient({
    appId: privyAppId,
    appSecret: privyAppSecret,
    fetch: fetchImpl,
    timeout: 5_000,
    // Let the next Sealing/Receiving attempt retry without extending the API's lookup deadline.
    maxRetries: 0,
  });
  return {
    addressFor: async (userId) => {
      const user = db
        .select({ lineUserId: users.lineUserId, smartAccountAddress: users.smartAccountAddress })
        .from(users)
        .where(eq(users.id, userId))
        .get();
      if (!user?.lineUserId) return null;
      if (user.smartAccountAddress) return user.smartAccountAddress;
      let privyUser: User;
      try {
        privyUser = await privy.users().getByCustomAuthID({
          custom_user_id: privySubject(lineChannelId, user.lineUserId),
        });
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        if (error instanceof APIError && error.status !== undefined) {
          throw new Error(`Privy user lookup failed with HTTP ${error.status}`);
        }
        throw error;
      }
      const address = smartWalletAddress(privyUser);
      if (!address) return null;
      db.update(users).set({ smartAccountAddress: address }).where(eq(users.id, userId)).run();
      return address;
    },
  };
}
