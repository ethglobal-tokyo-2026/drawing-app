import { useCreateWallet } from "@privy-io/react-auth/extended-chains";
import { useEffect } from "react";
import { usePrivyStatus } from "./privy";
import { setSuiWalletFailure, useSuiWalletAttempt } from "./suiWallet";

// The attempt last asked for, so a refusal waits for a fresh try instead of repeating with each sign-in.
let askedFor: number | null = null;

/**
 * Makes the person's Sui wallet once Privy has signed them in, since Privy's make-a-wallet-at-sign-in
 * setting covers only Ethereum and Solana. After a refusal, it asks again only when something that
 * needs the wallet asks for its fresh try (askForSuiWalletAgain).
 */
export function MakeSuiWallet() {
  const privy = usePrivyStatus();
  const attempt = useSuiWalletAttempt();
  const { createWallet } = useCreateWallet();
  const needed = privy.state === "signed-in" && !privy.suiWallet;
  useEffect(() => {
    if (!needed || askedFor === attempt) return;
    askedFor = attempt;
    // Privy then refreshes the user, which brings the new address to the status.
    createWallet({ chainType: "sui" }).catch((error: unknown) => {
      console.error("Privy couldn't make the Sui wallet", error);
      setSuiWalletFailure(error instanceof Error ? error.message : String(error));
    });
  }, [needed, attempt, createWallet]);
  return null;
}
