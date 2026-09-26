import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useEffect } from "react";
import { sepolia } from "viem/chains";
import { setSmartWallet } from "./smartWallet";

/** Shares the lazy Privy client with the REST API and Giving actions outside its provider. */
export function SmartWalletBridge() {
  const { client, getClientForChain } = useSmartWallets();
  useEffect(() => {
    let current = true;
    setSmartWallet(null);
    if (!client) return;
    void getClientForChain({ id: sepolia.id }).then(
      (wallet) => {
        if (!current || !wallet?.account) return;
        setSmartWallet({
          address: wallet.account.address,
          sendTransaction: (transaction) => wallet.sendTransaction(transaction),
        });
      },
      (error: unknown) => console.error("The sticker wallet client failed to start", error),
    );
    return () => {
      current = false;
      setSmartWallet(null);
    };
  }, [client, getClientForChain]);
  return null;
}
