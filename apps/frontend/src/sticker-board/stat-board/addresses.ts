import { useEffect, useMemo, useState } from "react";
import { retryPrivySignIn, usePrivyStatus } from "../../identity/privy";
import { askForSuiWalletAgain, useSuiWalletFailure } from "../../identity/suiWallet";

/** How long Privy may take to make an address after its sign-in before it counts as failed. */
const ARRIVE_MS = 15_000;

export type ChainAddress =
  | { state: "loading" }
  /** `retry` is there when asking Privy again can bring the address. */
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
 * Your Sui address, which keeps your stickers and pays for reserve tickets. Privy signs in after the
 * board shows, and MakeSuiWallet has it make the address just after that.
 */
export function useSuiAddress(): ChainAddress {
  const privy = usePrivyStatus();
  const refused = useSuiWalletFailure() !== undefined;
  const address = privy.state === "signed-in" ? privy.suiWallet : undefined;
  const late = useLate(privy.state === "signed-in" && !address && !refused, "The Sui address");
  const privyFailed = privy.state === "failed";
  // Under LIFF Mock (the dev server, the demo build) Privy never signs in, so no address is coming.
  const privyOff = privy.state === "off";
  useEffect(() => {
    if (privyOff) console.warn("There's no Sui address: Privy is off under LIFF Mock");
  }, [privyOff]);
  // One object while nothing changes, so the papers showing it skip the renders of a board's turns.
  return useMemo((): ChainAddress => {
    if (privyFailed) return { state: "failed", retry: () => retryPrivySignIn() };
    if (privyOff) return { state: "failed" };
    if (address) return { state: "ready", address };
    if (refused) return { state: "failed", retry: askForSuiWalletAgain };
    // Privy may still answer, and asking it twice at once could make two wallets.
    if (late) return { state: "failed" };
    return { state: "loading" };
  }, [privyFailed, privyOff, address, refused, late]);
}

/** 0x3F2a…9c1B: enough of each end to tell two addresses apart. */
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** The hex digits after 0x in fours, for checking an address by eye. */
export const addressGroups = (address: string) => address.slice(2).match(/.{4}/g) ?? [];
