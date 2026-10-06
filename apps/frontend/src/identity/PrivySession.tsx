import {
  PrivyProvider,
  usePrivy,
  useSubscribeToJwtAuthWithFlag,
  useWallets,
  type User,
} from "@privy-io/react-auth";
import { useEffect } from "react";
import {
  fetchPrivyJwt,
  onPrivyError,
  PRIVY_APP_ID,
  privyStatus,
  privySuiWallet,
  setPrivyStatus,
  usePrivyStatus,
} from "./privy";
import { MakeSuiWallet } from "./MakeSuiWallet";
import { SuiWalletBridge } from "./SuiWalletBridge";

const signedIn = (user: User) => {
  setPrivyStatus({ state: "signed-in", userId: user.id, suiWallet: privySuiWallet(user)?.address });
};

const onAuthenticated = ({ user }: { user: User }) => signedIn(user);

// A failed exchange has already put its reason in the status, which beats a generic one.
const onUnauthenticated = () => {
  if (privyStatus().state !== "failed") {
    setPrivyStatus({ state: "failed", reason: "Privy signed you out" });
  }
};

function SyncLineToPrivy() {
  const failed = usePrivyStatus().state === "failed";
  const walletsReady = useWallets().ready;
  useSubscribeToJwtAuthWithFlag({
    // isLoading only triggers re-syncs; enabled also holds the first sign-in until the wallet frame is up.
    // After a failure, syncing waits for Try again.
    enabled: walletsReady && !failed,
    // Rendered only inside LineGate, so LINE has always logged the person in by now.
    isAuthenticated: true,
    // The wallet is made right after sign-in, and Privy signs out again if its wallet frame isn't up yet.
    isLoading: !walletsReady,
    getExternalJwt: fetchPrivyJwt,
    onAuthenticated,
    onUnauthenticated,
    onError: onPrivyError,
  });

  // The wallet is made just after sign-in, so its address arrives in a later update of the user.
  const { authenticated, user } = usePrivy();
  useEffect(() => {
    if (authenticated && user) signedIn(user);
  }, [authenticated, user]);
  return null;
}

/** Signs the LINE user in to Privy, with no screen of its own. */
export default function PrivySession() {
  return (
    // Croquis holds stickers and pays on Sui only, so Privy makes no Ethereum wallet at sign-in,
    // whatever its dashboard says; MakeSuiWallet makes the Sui one.
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
