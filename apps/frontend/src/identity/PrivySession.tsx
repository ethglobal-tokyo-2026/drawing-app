import {
  PrivyProvider,
  usePrivy,
  useSubscribeToJwtAuthWithFlag,
  useWallets,
  type User,
} from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { i18next } from "../i18n/i18n";
import { currentSelection, isAccountSelectionCurrent } from "../api/sessionContext";
import {
  fetchPrivyJwt,
  onPrivyError,
  PRIVY_APP_ID,
  privyStatus,
  privySuiWallet,
  setPrivyStatus,
  usePrivyStatus,
} from "./privy";
import { matchesPrivyAccount, matchesPrivySubject, usePrivyAccount } from "./privyAccount";
import { MakeSuiWallet } from "./MakeSuiWallet";
import { SuiWalletBridge } from "./SuiWalletBridge";

function SyncLineToPrivy() {
  const account = usePrivyAccount();
  const [acceptedLifetime] = useState(currentSelection);
  const { ready, authenticated, user, logout } = usePrivy();
  const failed = usePrivyStatus().state === "failed";
  const walletsReady = useWallets().ready;
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);
  const acceptedUser = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = useCallback(
    () =>
      mounted.current &&
      acceptedLifetime === currentSelection() &&
      isAccountSelectionCurrent(account),
    [account, acceptedLifetime],
  );
  const wrongSubject = user !== null && !matchesPrivySubject(user, account.expectedSubject);
  useEffect(() => {
    if (!ready || !wrongSubject || logoutPending.current || !current() || failed) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setPrivyStatus(
      acceptedUser.current
        ? {
            state: "failed",
            reason: i18next.t(($) => $.identity.selection.subjectMismatch),
            reloadRequired: true,
          }
        : { state: "signing-in" },
    );
    let timer: ReturnType<typeof setTimeout>;
    // Match the bounded authenticated JWT exchange while clearing the cached account.
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Privy logout timed out")), 10_000);
    });
    void Promise.race([logout(), deadline])
      .catch(() => {
        if (current())
          setPrivyStatus({
            state: "failed",
            reason: i18next.t(($) => $.identity.selection.logoutFailed),
          });
      })
      .finally(() => {
        clearTimeout(timer);
        logoutPending.current = false;
        if (mounted.current) setLoggingOut(false);
      });
  }, [ready, wrongSubject, logout, current, failed]);

  const acceptUser = useCallback(
    (candidate: User) => {
      if (!current()) return;
      if (!matchesPrivySubject(candidate, account.expectedSubject)) {
        setPrivyStatus({
          state: "failed",
          reason: i18next.t(($) => $.identity.selection.subjectMismatch),
          reloadRequired: true,
        });
        return;
      }
      const wallet = privySuiWallet(candidate);
      if (wallet && !matchesPrivyAccount(candidate, account)) {
        setPrivyStatus({
          state: "failed",
          reason: i18next.t(($) => $.identity.selection.walletMismatch),
          reloadRequired: true,
        });
        return;
      }
      // A callback arrives before the SDK renders its authenticated user. Readiness waits for that render.
    },
    [account, current],
  );
  const getExternalJwt = useCallback(
    () => (current() ? fetchPrivyJwt(account) : Promise.resolve(undefined)),
    [account, current],
  );
  const onAuthenticated = useCallback(
    ({ user: candidate }: { user: User }) => acceptUser(candidate),
    [acceptUser],
  );
  const onUnauthenticated = useCallback(() => {
    if (current() && !logoutPending.current && privyStatus().state !== "failed") {
      setPrivyStatus({ state: "failed", reason: "Privy signed you out" });
    }
  }, [current]);
  const onError = useCallback(
    (error: Error) => {
      if (current() && !logoutPending.current) onPrivyError(error);
    },
    [current],
  );
  useSubscribeToJwtAuthWithFlag({
    enabled:
      ready &&
      walletsReady &&
      !failed &&
      !wrongSubject &&
      !loggingOut &&
      isAccountSelectionCurrent(account),
    isAuthenticated: true,
    isLoading: !walletsReady || loggingOut || wrongSubject,
    getExternalJwt,
    onAuthenticated,
    onUnauthenticated,
    onError,
  });
  useEffect(() => {
    if (!current() || loggingOut || privyStatus().state === "failed") return;
    if (!ready || !authenticated || !user) {
      if (privyStatus().state === "signed-in") setPrivyStatus({ state: "signing-in" });
      return;
    }
    if (wrongSubject) return;
    acceptedUser.current = true;
    acceptUser(user);
    if (matchesPrivyAccount(user, account)) {
      setPrivyStatus({
        state: "signed-in",
        userId: user.id,
        suiWallet: privySuiWallet(user)?.address,
      });
    } else if (privyStatus().state === "signed-in") {
      setPrivyStatus({ state: "signing-in" });
    }
  }, [account, current, ready, authenticated, user, wrongSubject, loggingOut, acceptUser, failed]);
  return null;
}

/** Keeps Privy's authentication and wallet strictly bound to the accepted selected account. */
export default function PrivySession() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{ embeddedWallets: { ethereum: { createOnLogin: "off" } } }}
    >
      <SyncLineToPrivy />
      <MakeSuiWallet />
      <SuiWalletBridge />
    </PrivyProvider>
  );
}
