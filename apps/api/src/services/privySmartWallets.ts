import { users, type Db } from "@drawing-app/db";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { APIError, NotFoundError, PrivyClient, type User } from "@privy-io/node";
import { eq } from "drizzle-orm";
import { isAddress } from "viem";
import type { SmartWallets } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";

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
      if (!user?.lineUserId) {
        logInfo("wallet.lookup.completed", {
          userId,
          cached: false,
          status: "missing_line_identity",
        });
        return null;
      }
      if (user.smartAccountAddress) {
        logInfo("wallet.lookup.completed", {
          userId,
          cached: true,
          status: "found",
          address: user.smartAccountAddress,
        });
        return user.smartAccountAddress;
      }
      const started = performance.now();
      logInfo("wallet.lookup.started", { userId, cached: false });
      let privyUser: User;
      try {
        privyUser = await privy.users().getByCustomAuthID({
          custom_user_id: privySubject(lineChannelId, user.lineUserId),
        });
      } catch (error) {
        const fields = {
          userId,
          cached: false,
          elapsedMs: Math.round(performance.now() - started),
        };
        if (error instanceof NotFoundError) {
          logInfo("wallet.lookup.completed", { ...fields, status: "not_found" });
          return null;
        }
        logFailure("wallet.lookup.failed", error, {
          ...fields,
          status:
            error instanceof APIError && typeof error.status === "number"
              ? error.status
              : undefined,
        });
        if (error instanceof APIError && error.status !== undefined) {
          throw new Error(`Privy user lookup failed with HTTP ${error.status}`);
        }
        throw error;
      }
      const address = smartWalletAddress(privyUser);
      logInfo("wallet.lookup.completed", {
        userId,
        cached: false,
        status: address ? "found" : "missing_smart_wallet",
        address: address ?? undefined,
        elapsedMs: Math.round(performance.now() - started),
      });
      if (!address) return null;
      db.update(users).set({ smartAccountAddress: address }).where(eq(users.id, userId)).run();
      return address;
    },
  };
}
