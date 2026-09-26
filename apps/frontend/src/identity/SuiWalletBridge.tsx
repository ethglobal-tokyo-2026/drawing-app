import { usePrivy, type WalletWithMetadata } from "@privy-io/react-auth";
import { useSignRawHash } from "@privy-io/react-auth/extended-chains";
import { useEffect } from "react";
import { PrivySuiSigner, setSuiSigner, suiPublicKeyFor } from "./suiSigner";
import { setSuiWalletFailure } from "./suiWallet";

/** Shares a signer for the person's Privy Sui wallet with the ticket shop, outside Privy's provider. */
export function SuiWalletBridge() {
  const { user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const wallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === "wallet" &&
      (a.walletClientType === "privy" || a.walletClientType === "privy-v2") &&
      a.chainType === "sui",
  );
  const address = wallet?.address;
  const publicKey = wallet?.publicKey;

  useEffect(() => {
    setSuiSigner(null);
    if (!address) return;
    if (!publicKey) {
      const reason = `Privy reported no public key for the Sui wallet ${address}`;
      console.error(reason);
      setSuiWalletFailure(reason);
      return;
    }
    try {
      const key = suiPublicKeyFor(address, publicKey);
      setSuiSigner(
        new PrivySuiSigner(address, key, async (hash) => {
          const { signature } = await signRawHash({ address, chainType: "sui", hash });
          return signature;
        }),
      );
    } catch (error) {
      console.error("The Sui wallet's signer failed to start", error);
      setSuiWalletFailure(error instanceof Error ? error.message : String(error));
    }
    return () => setSuiSigner(null);
  }, [address, publicKey, signRawHash]);
  return null;
}
