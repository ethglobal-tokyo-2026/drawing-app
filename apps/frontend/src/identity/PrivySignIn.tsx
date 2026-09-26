import { Component, lazy, Suspense, type ReactNode } from "react";
import { liffMockActive } from "../line/liff";
import { setPrivyStatus } from "./privy";

// Privy's SDK is large, so it loads on its own once the board is up and never delays it.
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
      reason: `Privy stopped: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Signs the person in to Privy once LINE has. Not under LIFF Mock: the auth server only takes LINE's own
 * ID tokens, so Privy stays off on the dev server and its SDK never loads.
 */
export function PrivySignIn() {
  if (liffMockActive) return null;
  return (
    <PrivyBoundary>
      <Suspense fallback={null}>
        <PrivySession />
      </Suspense>
    </PrivyBoundary>
  );
}
