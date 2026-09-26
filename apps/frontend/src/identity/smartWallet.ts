import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useEffect } from "react";
import { createPublicClient, http, type Address, type Hash, type Hex } from "viem";
import { sepolia } from "viem/chains";

interface SmartWalletClient {
  address: Address;
  sendTransaction: (transaction: { to: Address; data?: Hex; value?: bigint }) => Promise<Hash>;
}

let active: SmartWalletClient | null = null;
const publicClient = createPublicClient({ chain: sepolia, transport: http() });

export function requireSmartWallet(): SmartWalletClient {
  if (!active) throw new Error("Your sticker wallet is still getting ready. Please try again.");
  return active;
}

export async function sendSmartWalletTransaction(transaction: {
  to: Address;
  data?: Hex;
  value?: bigint;
}): Promise<Hash> {
  const wallet = requireSmartWallet();
  const hash = await wallet.sendTransaction(transaction);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("The sticker wallet transaction reverted");
  return hash;
}

/** Makes Privy's Sepolia smart-account client available to non-React chain workflows. */
export function SmartWalletBridge() {
  const { client, getClientForChain } = useSmartWallets();

  useEffect(() => {
    let current = true;
    if (!client) {
      active = null;
      return;
    }
    void getClientForChain({ id: sepolia.id }).then(
      (wallet) => {
        if (!current || !wallet?.account) return;
        active = {
          address: wallet.account.address,
          sendTransaction: (transaction) => wallet.sendTransaction(transaction),
        };
      },
      (error: unknown) => {
        if (!current) return;
        active = null;
        console.error("The sticker wallet client failed to start", error);
      },
    );
    return () => {
      current = false;
      active = null;
    };
  }, [client, getClientForChain]);

  return null;
}
