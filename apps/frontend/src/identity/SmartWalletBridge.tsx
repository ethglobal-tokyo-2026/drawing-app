import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useEffect, useEffectEvent } from "react";
import { sepolia } from "viem/chains";
import { setSmartWallet, smartWalletFailed, useSmartWalletAttempt } from "./smartWallet";

/** Shares the lazy Privy client with the REST API and Giving actions outside its provider. */
export function SmartWalletBridge() {
  const { client, getClientForChain } = useSmartWallets();
  // A chain action waiting on a client that failed to start asks for it again.
  const attempt = useSmartWalletAttempt();
  // Privy's provider hands out a new client wrapper and getClientForChain on every render, so the
  // client is asked for again only when the account changes: a render keeps the working one.
  const account = client?.account.address;
  const sepoliaClient = useEffectEvent(() => getClientForChain({ id: sepolia.id }));
  useEffect(() => {
    let current = true;
    setSmartWallet(null);
    if (!account) return;
    void sepoliaClient().then(
      (wallet) => {
        if (!current) return;
        if (!wallet?.account) {
          smartWalletFailed("Privy gave no Sepolia account");
          return;
        }
        setSmartWallet({
          address: wallet.account.address,
          sendTransaction: (transaction) => wallet.sendTransaction(transaction),
        });
      },
      (error: unknown) => {
        console.error("The sticker wallet client failed to start", error);
        if (current) smartWalletFailed(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      current = false;
      setSmartWallet(null);
    };
  }, [account, attempt]);
  return null;
}
