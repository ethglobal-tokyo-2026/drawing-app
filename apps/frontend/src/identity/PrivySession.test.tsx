// @vitest-environment happy-dom
import type { User, WalletWithMetadata, useSubscribeToJwtAuthWithFlag } from "@privy-io/react-auth";
import { act, StrictMode, useEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type JwtAuthInput = Parameters<typeof useSubscribeToJwtAuthWithFlag>[0];
const sdk = vi.hoisted(() => ({
  walletsReady: false,
  authenticated: false,
  user: null as User | null,
  authenticate: vi.fn<(jwt: string) => Promise<User>>(),
  fetchJwt: vi.fn<() => Promise<string | undefined>>(),
}));

// Privy starts when enabled, independently of isLoading. Its in-flight request survives disabling,
// and its JWT cache prevents a readiness change from authenticating the same token again.
function useJwtSubscription({
  enabled,
  getExternalJwt,
  onAuthenticated,
  onUnauthenticated,
  onError,
}: JwtAuthInput) {
  const busy = useRef(false);
  const previousJwt = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!enabled || busy.current) return;
    busy.current = true;
    void (async () => {
      try {
        const jwt = await getExternalJwt();
        if (!jwt || jwt === previousJwt.current) return;
        const user = await sdk.authenticate(jwt);
        onAuthenticated?.({ user, isNewUser: false });
        previousJwt.current = jwt;
      } catch (error) {
        onUnauthenticated?.();
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        busy.current = false;
      }
    })();
  }, [enabled, getExternalJwt, onAuthenticated, onUnauthenticated, onError]);
}

vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: ({ children }: { children: ReactNode }) => children,
  usePrivy: () => ({ authenticated: sdk.authenticated, user: sdk.user }),
  useWallets: () => ({ ready: sdk.walletsReady }),
  useSubscribeToJwtAuthWithFlag: (input: JwtAuthInput) => useJwtSubscription(input),
}));
vi.mock("@line/liff", () => ({ default: {} }));
vi.mock("./privy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./privy")>()),
  fetchPrivyJwt: sdk.fetchJwt,
}));
vi.mock("./MakeSuiWallet", () => ({ MakeSuiWallet: () => null }));
vi.mock("./SuiWalletBridge", () => ({ SuiWalletBridge: () => null }));

const { privyStatus, retryPrivySignIn, setPrivyStatus } = await import("./privy");
const { default: PrivySession } = await import("./PrivySession");

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const person: User = {
  id: "did:privy:artist",
  createdAt: new Date("2026-01-01"),
  linkedAccounts: [],
  mfaMethods: [],
  hasAcceptedTerms: true,
  isGuest: false,
};
const wallet = (chainType: "ethereum" | "sui", address: string): WalletWithMetadata => ({
  type: "wallet",
  chainType,
  address,
  walletClientType: "privy",
  firstVerifiedAt: null,
  latestVerifiedAt: null,
  imported: false,
  delegated: false,
  walletIndex: 0,
});

let host: HTMLDivElement;
let root: Root;
const render = () =>
  act(async () =>
    root.render(
      <StrictMode>
        <PrivySession />
      </StrictMode>,
    ),
  );
const walletsReady = async (ready: boolean) => {
  sdk.walletsReady = ready;
  await render();
};

beforeEach(() => {
  sdk.walletsReady = false;
  sdk.authenticated = false;
  sdk.user = null;
  sdk.authenticate.mockReset().mockResolvedValue(person);
  sdk.fetchJwt.mockReset().mockResolvedValue("privy-jwt");
  setPrivyStatus({ state: "signing-in" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("LINE sign-in to Privy", () => {
  it("waits for the wallet frame before asking for a JWT, then signs in", async () => {
    await render();
    expect(sdk.fetchJwt).not.toHaveBeenCalled();
    expect(sdk.authenticate).not.toHaveBeenCalled();

    await walletsReady(true);
    expect(sdk.authenticate).toHaveBeenCalledExactlyOnceWith("privy-jwt");
    expect(privyStatus()).toMatchObject({ state: "signed-in", userId: person.id });
  });

  it("finishes an in-flight sign-in across wallet readiness changes without restarting authentication", async () => {
    let resolveJwt: ((jwt: string) => void) | undefined;
    sdk.fetchJwt.mockReturnValue(
      new Promise((resolve) => {
        resolveJwt = resolve;
      }),
    );
    await walletsReady(true);
    await walletsReady(false);
    await walletsReady(true);
    expect(sdk.fetchJwt).toHaveBeenCalledOnce();

    await act(async () => resolveJwt?.("privy-jwt"));
    await walletsReady(false);
    await walletsReady(true);
    expect(sdk.authenticate).toHaveBeenCalledExactlyOnceWith("privy-jwt");
    expect(privyStatus()).toMatchObject({ state: "signed-in" });
  });

  it("keeps a failure disabled until an explicit retry and wallet readiness", async () => {
    sdk.authenticate.mockRejectedValueOnce(new Error("Privy unavailable"));
    await walletsReady(true);
    expect(privyStatus()).toMatchObject({ state: "failed" });
    await walletsReady(false);
    await walletsReady(true);
    expect(sdk.authenticate).toHaveBeenCalledOnce();

    await walletsReady(false);
    await act(async () => retryPrivySignIn());
    expect(sdk.authenticate).toHaveBeenCalledOnce();
    await walletsReady(true);
    expect(sdk.authenticate).toHaveBeenCalledTimes(2);
    expect(privyStatus()).toMatchObject({ state: "signed-in", userId: person.id });
  });

  it("publishes the authenticated user before the Sui wallet arrives, then its address", async () => {
    await walletsReady(true);
    expect(privyStatus()).toEqual({ state: "signed-in", userId: person.id, suiWallet: undefined });

    // An Ethereum wallet from before Croquis was Sui only is no Sui address.
    const sui = `0x${"34".repeat(32)}`;
    sdk.authenticated = true;
    sdk.user = {
      ...person,
      linkedAccounts: [wallet("ethereum", `0x${"12".repeat(20)}`), wallet("sui", sui)],
    };
    await render();
    expect(privyStatus()).toEqual({ state: "signed-in", userId: person.id, suiWallet: sui });
    expect(sdk.authenticate).toHaveBeenCalledOnce();
  });
});
