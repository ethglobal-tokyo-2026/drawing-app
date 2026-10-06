import { users, type Db } from "@drawing-app/db";
import { privySubject } from "@drawing-app/line-auth/line-privy-jwt";
import { isValidSuiAddress, normalizeSuiAddress } from "@mysten/sui/utils";
import { APIError, NotFoundError, PrivyClient, type User } from "@privy-io/node";
import { eq } from "drizzle-orm";
import { logFailure, logInfo } from "../diagnostics.ts";
import type { SuiWallets } from "../sui/types.ts";

/** One Privy user lookup's limit: Sealing, Packaging and Receiving wait on it. */
const PRIVY_LOOKUP_TIMEOUT_MS = 5_000;

/** The person's Privy Sui wallet, normalized: the linked embedded wallet on Sui. */
function suiWalletAddress(user: User): string | null {
  const wallet = user.linked_accounts.find(
    (account) =>
      account.type === "wallet" &&
      account.chain_type === "sui" &&
      isValidSuiAddress(account.address),
  );
  return wallet?.type === "wallet" ? normalizeSuiAddress(wallet.address) : null;
}

/** Reads each person's Sui wallet from Privy, by the custom auth ID their LINE sign-in made. */
export function createPrivySuiWallets({
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
}): SuiWallets {
  const privy = new PrivyClient({
    appId: privyAppId,
    appSecret: privyAppSecret,
    fetch: fetchImpl,
    timeout: PRIVY_LOOKUP_TIMEOUT_MS,
    // The person's next attempt retries, without stretching the request that waits on this one.
    maxRetries: 0,
  });
  return {
    addressFor: async (userId) => {
      const user = db
        .select({ lineUserId: users.lineUserId })
        .from(users)
        .where(eq(users.id, userId))
        .get();
      if (!user?.lineUserId) {
        logInfo("wallet.lookup.completed", { userId, status: "missing_line_identity" });
        return null;
      }
      const started = performance.now();
      logInfo("wallet.lookup.started", { userId });
      let privyUser: User;
      try {
        privyUser = await privy.users().getByCustomAuthID({
          custom_user_id: privySubject(lineChannelId, user.lineUserId),
        });
      } catch (error) {
        const elapsedMs = Math.round(performance.now() - started);
        if (error instanceof NotFoundError) {
          logInfo("wallet.lookup.completed", { userId, elapsedMs, status: "not_found" });
          return null;
        }
        const status =
          error instanceof APIError && typeof error.status === "number" ? error.status : undefined;
        logFailure("wallet.lookup.failed", error, { userId, elapsedMs, status });
        if (status !== undefined) throw new Error(`Privy user lookup failed with HTTP ${status}`);
        throw error;
      }
      const address = suiWalletAddress(privyUser);
      logInfo("wallet.lookup.completed", {
        userId,
        elapsedMs: Math.round(performance.now() - started),
        status: address ? "found" : "missing_sui_wallet",
      });
      return address;
    },
  };
}
