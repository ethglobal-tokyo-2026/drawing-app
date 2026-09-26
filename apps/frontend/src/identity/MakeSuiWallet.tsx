import { useCreateWallet } from "@privy-io/react-auth/extended-chains";
import { useEffect } from "react";
import { usePrivyStatus } from "./privy";
import { setSuiWalletFailure } from "./suiWallet";

// Spent once per page load, so a refusal waits for the next visit instead of repeating.
let asked = false;

/**
 * Makes the person's Sui wallet, since Privy's make-a-wallet-at-sign-in setting covers only Ethereum and
 * Solana. It waits for the Ethereum wallet, so Privy never makes two at once.
 */
export function MakeSuiWallet() {
  const privy = usePrivyStatus();
  const { createWallet } = useCreateWallet();
  const needed = privy.state === "signed-in" && !!privy.wallet && !privy.suiWallet;
  useEffect(() => {
    if (!needed || asked) return;
    asked = true;
    // Privy then refreshes the user, which brings the new address to the status.
    createWallet({ chainType: "sui" }).catch((error: unknown) => {
      console.error("Privy couldn't make the Sui wallet", error);
      setSuiWalletFailure(error instanceof Error ? error.message : String(error));
    });
  }, [needed, createWallet]);
  return null;
}
