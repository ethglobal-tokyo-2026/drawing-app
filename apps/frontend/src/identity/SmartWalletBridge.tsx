import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useEffect } from "react";
import { sepolia } from "viem/chains";
import { setSmartWallet, smartWalletFailed, useSmartWalletAttempt } from "./smartWallet";

/** Shares the lazy Privy client with the REST API and Giving actions outside its provider. */
export function SmartWalletBridge() {
  const { client, getClientForChain } = useSmartWallets();
  // A chain action waiting on a client that failed to start asks for it again.
  const attempt = useSmartWalletAttempt();
  useEffect(() => {
    let current = true;
    setSmartWallet(null);
    if (!client) return;
    void getClientForChain({ id: sepolia.id }).then(
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
  }, [client, getClientForChain, attempt]);
  return null;
}
