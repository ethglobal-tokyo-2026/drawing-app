import { PrivyProvider, useSubscribeToJwtAuthWithFlag } from "@privy-io/react-auth";
import { fetchPrivyJwt, PRIVY_APP_ID, privyStatus, setPrivyStatus, usePrivyStatus } from "./privy";

const onAuthenticated = ({ user }: { user: { id: string } }) =>
  setPrivyStatus({ state: "signed-in", userId: user.id });

// A failed exchange has already put its reason in the status, which beats a generic one.
const onUnauthenticated = () => {
  if (privyStatus().state !== "failed") {
    setPrivyStatus({ state: "failed", reason: "Privy signed you out" });
  }
};

const onError = (error: Error) =>
  setPrivyStatus({ state: "failed", reason: `Privy refused the sign-in: ${error.message}` });

function SyncLineToPrivy() {
  const failed = usePrivyStatus().state === "failed";
  useSubscribeToJwtAuthWithFlag({
    // After a failure the SDK re-syncs over and over on its own, so syncing waits for Try again.
    enabled: !failed,
    // Rendered only inside LineGate, so LINE has always logged the person in by now.
    isAuthenticated: true,
    isLoading: false,
    getExternalJwt: fetchPrivyJwt,
    onAuthenticated,
    onUnauthenticated,
    onError,
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
