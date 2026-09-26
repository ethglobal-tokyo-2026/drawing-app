import { useEffect, useState } from "react";
import { retryPrivySignIn, usePrivyStatus } from "../../identity/privy";
import { useSuiWalletFailure } from "../../identity/suiWallet";
import { checksumAddress } from "./checksumAddress";

/** How long Privy may take to make an address after its sign-in before it counts as failed. */
const ARRIVE_MS = 15_000;

export type Chain = "ethereum" | "sui";

export type ChainAddress =
  | { state: "loading" }
  /** `retry` is there when signing in to Privy again can bring the address. */
  | { state: "failed"; retry?: () => void }
  | { state: "ready"; address: string };

/** True once `waiting` has held for ARRIVE_MS, which it logs, since nothing else would. */
function useLate(waiting: boolean, what: string) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      console.error(`${what} didn't arrive within ${ARRIVE_MS / 1000}s of the Privy sign-in`);
      setLate(true);
    }, ARRIVE_MS);
    return () => {
      clearTimeout(timer);
      setLate(false);
    };
  }, [waiting, what]);
  return waiting && late;
}

/**
 * Your board address: the Privy smart account on Ethereum Sepolia that your stickers are minted and
 * given to. Privy signs in after the board shows, and makes the address just after that.
 */
export function useBoardAddress(): ChainAddress {
  const privy = usePrivyStatus();
  const address = privy.state === "signed-in" ? privy.smartAccount : undefined;
  const late = useLate(privy.state === "signed-in" && !address, "The board address");
  if (privy.state === "failed" || late) return { state: "failed", retry: () => retryPrivySignIn() };
  if (address) return { state: "ready", address: checksumAddress(address) };
  return { state: "loading" };
}

/** Your Sui address, which Privy makes once your Ethereum one exists. */
export function useSuiAddress(): ChainAddress {
  const privy = usePrivyStatus();
  const refused = useSuiWalletFailure() !== undefined;
  const address = privy.state === "signed-in" ? privy.suiWallet : undefined;
  const late = useLate(privy.state === "signed-in" && !address && !refused, "The Sui address");
  if (privy.state === "failed") return { state: "failed", retry: () => retryPrivySignIn() };
  if (address) return { state: "ready", address };
  // Privy is asked for it once per page load, so only a reload asks again.
  if (refused || late) return { state: "failed" };
  return { state: "loading" };
}

/** 0x3F2a…9c1B: enough of each end to tell two addresses apart. */
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** The hex digits after 0x in fours, for checking an address by eye. */
export const addressGroups = (address: string) => address.slice(2).match(/.{4}/g) ?? [];
