import { PrivyProvider, useSubscribeToJwtAuthWithFlag, useWallets } from "@privy-io/react-auth";
import {
  fetchPrivyJwt,
  onPrivyError,
  PRIVY_APP_ID,
  privyStatus,
  setPrivyStatus,
  usePrivyStatus,
} from "./privy";

const onAuthenticated = ({ user }: { user: { id: string } }) =>
  setPrivyStatus({ state: "signed-in", userId: user.id });

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
    // After a failure the SDK re-syncs over and over on its own, so syncing waits for Try again.
    enabled: !failed,
    // Rendered only inside LineGate, so LINE has always logged the person in by now.
    isAuthenticated: true,
    // Privy makes the wallet right after sign-in, and signs out again if its wallet frame isn't up yet.
    isLoading: !walletsReady,
    getExternalJwt: fetchPrivyJwt,
    onAuthenticated,
    onUnauthenticated,
    onError: onPrivyError,
  });
  return null;
}

/** Signs the LINE user in to Privy, with no screen of its own. */
export default function PrivySession() {
  return (
    <PrivyProvider appId={PRIVY_APP_ID}>
      <SyncLineToPrivy />
    </PrivyProvider>
  );
}
