import { Component, lazy, Suspense, type ReactNode } from "react";
import { messageOf } from "../i18n/errorMessage";
import { liffMockActive } from "../line/liff";
import { setPrivyStatus } from "./privy";
import { usePrivyStarted } from "./privyStart";

// Privy's SDK is large, so its code loads only once startPrivy says so: after the board has settled,
// unless something needs a wallet sooner.
const PrivySession = lazy(() => import("./PrivySession"));

/** Privy failing, down to its code not loading, shows on the stat board and never takes the app down. */
class PrivyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Privy stopped", error);
    setPrivyStatus({
      state: "failed",
      reason: `Privy stopped: ${messageOf(error)}`,
    });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Signs the person in to Privy once LINE has and Privy has started (see startPrivy). Not under LIFF
 * Mock: the auth server only takes LINE's own ID tokens, so Privy stays off on the dev server and its
 * SDK never loads.
 */
export function PrivySignIn() {
  const started = usePrivyStarted();
  if (liffMockActive || !started) return null;
  return (
    <PrivyBoundary>
      <Suspense fallback={null}>
        <PrivySession />
      </Suspense>
    </PrivyBoundary>
  );
}
