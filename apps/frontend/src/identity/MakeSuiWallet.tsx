import { usePrivy } from "@privy-io/react-auth";
import { useCreateWallet } from "@privy-io/react-auth/extended-chains";
import { useEffect, useRef } from "react";
import { currentSelection, isAccountSelectionCurrent, selectionKey } from "../api/sessionContext";
import { i18next } from "../i18n/i18n";
import { privySuiWallet, usePrivyStatus } from "./privy";
import { matchesPrivyAccount, matchesPrivySubject, usePrivyAccount } from "./privyAccount";
import { setSuiWalletFailure, useSuiWalletAttempt } from "./suiWallet";

/** Makes only the selected subject's missing Sui wallet; a failed attempt waits for an explicit retry. */
export function MakeSuiWallet() {
  const account = usePrivyAccount();
  const { ready, authenticated, user } = usePrivy();
  const status = usePrivyStatus();
  const attempt = useSuiWalletAttempt();
  const askedFor = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { createWallet } = useCreateWallet();
  useEffect(() => {
    const key = `${selectionKey(account)}:${attempt}`;
    if (
      !ready ||
      !authenticated ||
      !matchesPrivySubject(user, account.expectedSubject) ||
      privySuiWallet(user) ||
      status.state === "failed" ||
      !isAccountSelectionCurrent(account) ||
      askedFor.current === key
    )
      return;
    askedFor.current = key;
    const lifetime = currentSelection();
    const current = () =>
      lifetime === currentSelection() &&
      mounted.current &&
      isAccountSelectionCurrent(account) &&
      askedFor.current === key;
    let timer: ReturnType<typeof setTimeout>;
    // Match the existing cold wallet-readiness deadline in waitForPrivy.
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Privy Sui wallet creation timed out")), 30_000);
    });
    void Promise.race([createWallet({ chainType: "sui" }), deadline])
      .then((result) => {
        if (current() && !matchesPrivyAccount(result.user, account)) {
          setSuiWalletFailure(i18next.t(($) => $.identity.selection.walletMismatch));
        }
      })
      .catch((error: unknown) => {
        if (!current()) return;
        console.error("Privy couldn't make the selected Sui wallet", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        setSuiWalletFailure(i18next.t(($) => $.identity.selection.walletFailed));
      })
      .finally(() => clearTimeout(timer));
  }, [account, ready, authenticated, user, status.state, attempt, createWallet]);
  return null;
}
