// @vitest-environment happy-dom
import { SessionEnvelopeContext, acceptSession, suspendSession } from "../api/sessionContext";
import { sessionEnvelope } from "../api/sessionTestFixtures";
import { TEST_ME } from "../api/testing";
let envelope = sessionEnvelope(TEST_ME);
import type { User, WalletWithMetadata, useSubscribeToJwtAuthWithFlag } from "@privy-io/react-auth";
import { act, StrictMode, useEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type JwtAuthInput = Parameters<typeof useSubscribeToJwtAuthWithFlag>[0];
const sdk = vi.hoisted(() => ({
  walletsReady: false,
  ready: true,
  logout: vi.fn<() => Promise<void>>(),
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
        sdk.user = user;
        sdk.authenticated = true;
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
  usePrivy: () => ({
    ready: sdk.ready,
    logout: sdk.logout,
    authenticated: sdk.authenticated,
    user: sdk.user,
  }),
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

const person: User = {
  id: "did:privy:artist",
  createdAt: new Date("2026-01-01"),
  linkedAccounts: [
    { type: "custom_auth", customUserId: "U-you", firstVerifiedAt: null, latestVerifiedAt: null },
  ],
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
        <SessionEnvelopeContext value={envelope}>
          <PrivySession />
        </SessionEnvelopeContext>
      </StrictMode>,
    ),
  );
const walletsReady = async (ready: boolean) => {
  sdk.walletsReady = ready;
  await render();
};

beforeEach(() => {
  envelope = sessionEnvelope(TEST_ME);
  acceptSession(envelope);
  sdk.ready = true;
  sdk.logout.mockReset().mockImplementation(async () => {
    sdk.user = null;
    sdk.authenticated = false;
  });
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
  suspendSession();
});

describe("LINE sign-in to Privy", () => {
  it("waits for the wallet frame before asking for a JWT, then signs in", async () => {
    await render();
    expect(sdk.fetchJwt).not.toHaveBeenCalled();
    expect(sdk.authenticate).not.toHaveBeenCalled();

    await walletsReady(true);
    expect(sdk.authenticate).toHaveBeenCalledExactlyOnceWith("privy-jwt");
    expect(privyStatus().state).toBe("signing-in");
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
    expect(privyStatus().state).toBe("signing-in");
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
    expect(privyStatus().state).toBe("signing-in");
  });

  it("waits for the selected user and Sui wallet before publishing readiness", async () => {
    await walletsReady(true);
    expect(privyStatus()).toEqual({ state: "signing-in" });

    // An Ethereum wallet from before Croquis was Sui only is no Sui address.
    const sui = `0x${"34".repeat(32)}`;
    sdk.authenticated = true;
    sdk.user = {
      ...person,
      linkedAccounts: [
        ...person.linkedAccounts,
        wallet("ethereum", `0x${"12".repeat(20)}`),
        wallet("sui", sui),
      ],
    };
    await render();
    expect(privyStatus()).toEqual({ state: "signed-in", userId: person.id, suiWallet: sui });
    expect(sdk.authenticate).toHaveBeenCalledOnce();
  });
});

it("does not accept a persisted user of another custom subject", async () => {
  sdk.authenticated = true;
  sdk.user = { ...person, id: "did:privy:wrong", linkedAccounts: [] };
  await render();
  expect(privyStatus().state).not.toBe("signed-in");
});

it("waits for persisted wrong-subject logout before authenticating the selected subject", async () => {
  let finish!: () => void;
  sdk.authenticated = true;
  sdk.user = { ...person, linkedAccounts: [] };
  sdk.logout.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = () => {
          sdk.user = null;
          sdk.authenticated = false;
          resolve();
        };
      }),
  );
  await walletsReady(true);
  expect(sdk.logout).toHaveBeenCalledOnce();
  expect(sdk.authenticate).not.toHaveBeenCalled();
  await act(async () => finish());
  await render();
  expect(sdk.logout).toHaveBeenCalledBefore(sdk.authenticate);
});
it("does not publish a known-address mismatch", async () => {
  envelope = sessionEnvelope(TEST_ME, { expectedSuiAddress: `0x${"11".repeat(32)}` });
  acceptSession(envelope);
  sdk.authenticated = true;
  sdk.user = {
    ...person,
    linkedAccounts: [...person.linkedAccounts, wallet("sui", `0x${"22".repeat(32)}`)],
  };
  await render();
  expect(privyStatus().state).toBe("failed");
});
it("ignores an old authentication callback after the same account changes version", async () => {
  let finish!: (user: User) => void;
  sdk.authenticate.mockImplementation(
    () =>
      new Promise<User>((resolve) => {
        finish = resolve;
      }),
  );
  await walletsReady(true);
  act(() => {
    suspendSession();
    acceptSession({ ...envelope, selectionVersion: "later" });
  });
  await act(async () =>
    finish({
      ...person,
      linkedAccounts: [...person.linkedAccounts, wallet("sui", `0x${"22".repeat(32)}`)],
    }),
  );
  await render();
  expect(privyStatus().state).not.toBe("signed-in");
});

it("keeps later SDK subject drift unavailable until reload", async () => {
  sdk.authenticated = true;
  sdk.user = {
    ...person,
    linkedAccounts: [...person.linkedAccounts, wallet("sui", `0x${"22".repeat(32)}`)],
  };
  await render();
  expect(privyStatus().state).toBe("signed-in");
  sdk.user = { ...person, linkedAccounts: [] };
  await render();
  expect(sdk.logout).toHaveBeenCalledOnce();
  expect(privyStatus()).toMatchObject({ state: "failed", reloadRequired: true });
});

it("withdraws wallet readiness when the authenticated user's wallet disappears", async () => {
  sdk.authenticated = true;
  sdk.user = {
    ...person,
    linkedAccounts: [...person.linkedAccounts, wallet("sui", `0x${"22".repeat(32)}`)],
  };
  await render();
  expect(privyStatus().state).toBe("signed-in");
  sdk.user = person;
  await render();
  expect(privyStatus()).toEqual({ state: "signing-in" });
});
