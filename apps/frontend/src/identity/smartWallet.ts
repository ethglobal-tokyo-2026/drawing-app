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
const SMART_WALLET_READY_TIMEOUT_MS = 15_000;

interface WalletWaiter {
  resolve: (wallet: SmartWalletClient) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const waiters = new Set<WalletWaiter>();

function setActive(wallet: SmartWalletClient | null) {
  active = wallet;
  if (!wallet) return;
  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(wallet);
  }
  waiters.clear();
}

function failWaiters(error: unknown) {
  const reason = error instanceof Error ? error : new Error(String(error));
  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    waiter.reject(reason);
  }
  waiters.clear();
}

function waitForSmartWallet(): Promise<SmartWalletClient> {
  if (active) return Promise.resolve(active);
  return new Promise((resolve, reject) => {
    const waiter: WalletWaiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        waiters.delete(waiter);
        reject(new Error("Your sticker wallet is taking too long to get ready. Please try again."));
      }, SMART_WALLET_READY_TIMEOUT_MS),
    };
    waiters.add(waiter);
  });
}

export function requireSmartWallet(): SmartWalletClient {
  if (!active) throw new Error("Your sticker wallet is still getting ready. Please try again.");
  return active;
}

export async function sendSmartWalletTransaction(transaction: {
  to: Address;
  data?: Hex;
  value?: bigint;
}): Promise<Hash> {
  // LINE and the board are ready before Privy's lazy SDK sometimes is. Keep the crypto startup
  // invisible to the person instead of failing a Give pressed during that short interval.
  const wallet = await waitForSmartWallet();
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
      setActive(null);
      return;
    }
    void getClientForChain({ id: sepolia.id }).then(
      (wallet) => {
        if (!current || !wallet?.account) return;
        setActive({
          address: wallet.account.address,
          sendTransaction: (transaction) => wallet.sendTransaction(transaction),
        });
      },
      (error: unknown) => {
        if (!current) return;
        setActive(null);
        failWaiters(error);
        console.error("The sticker wallet client failed to start", error);
      },
    );
    return () => {
      current = false;
      setActive(null);
    };
  }, [client, getClientForChain]);

  return null;
}
