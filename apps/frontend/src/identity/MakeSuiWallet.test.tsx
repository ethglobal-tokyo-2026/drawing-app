// @vitest-environment happy-dom
import type { User, WalletWithMetadata } from "@privy-io/react-auth";
import { TEST_ME } from "../api/testing";
import { sessionEnvelope } from "../api/sessionTestFixtures";
const sdk = vi.hoisted(() => ({ ready: true, authenticated: false, user: null as User | null }));
vi.mock("@privy-io/react-auth", () => ({ usePrivy: () => sdk }));
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrivyStatus } from "./privy";

const createWallet = vi.hoisted(() => vi.fn<(input: { chainType: string }) => Promise<object>>());
vi.mock("@privy-io/react-auth/extended-chains", () => ({
  useCreateWallet: () => ({ createWallet }),
}));
vi.mock("@line/liff", () => ({ default: {} }));

const SUI = `0x${"34".repeat(32)}`;

let host: HTMLDivElement;
let root: Root;
let setStatus: (status: PrivyStatus) => void;
let suiWallet: typeof import("./suiWallet");
let SessionEnvelopeContext: (typeof import("../api/sessionContext"))["SessionEnvelopeContext"];
let MakeSuiWallet: (typeof import("./MakeSuiWallet"))["MakeSuiWallet"];

// Each test starts with nothing asked yet, so each gets its own copy of the modules.
beforeEach(async () => {
  vi.resetModules();
  const context = await import("../api/sessionContext");
  SessionEnvelopeContext = context.SessionEnvelopeContext;
  context.acceptSession(sessionEnvelope(TEST_ME));
  sdk.authenticated = false;
  sdk.user = null;
  const privy = await import("./privy");
  ({ MakeSuiWallet } = await import("./MakeSuiWallet"));
  suiWallet = await import("./suiWallet");
  setStatus = (status) => act(() => privy.setPrivyStatus(status));
  createWallet.mockImplementation(async () => ({
    user: {
      ...sdk.user,
      linkedAccounts: [
        ...(sdk.user?.linkedAccounts ?? []),
        { type: "wallet", chainType: "sui", walletClientType: "privy", address: SUI },
      ],
    },
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <SessionEnvelopeContext value={sessionEnvelope(TEST_ME)}>
        <MakeSuiWallet />
      </SessionEnvelopeContext>,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  createWallet.mockReset();
  vi.restoreAllMocks();
});

const signedIn = (suiWallet?: string) => {
  sdk.authenticated = true;
  sdk.user = {
    createdAt: new Date(0),
    mfaMethods: [],
    hasAcceptedTerms: true,
    isGuest: false,
    id: "did:privy:someone",
    linkedAccounts: [
      { type: "custom_auth", customUserId: "U-you", firstVerifiedAt: null, latestVerifiedAt: null },
      ...(suiWallet
        ? [
            {
              type: "wallet",
              chainType: "sui",
              address: suiWallet,
              walletClientType: "privy",
              firstVerifiedAt: null,
              latestVerifiedAt: null,
              imported: false,
              delegated: false,
              walletIndex: 0,
            } satisfies WalletWithMetadata,
          ]
        : []),
    ],
  };
  setStatus({ state: "signed-in", userId: "did:privy:someone", suiWallet });
};

/** Privy refuses the first wallet it's asked for. */
async function refusedOnce() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  createWallet.mockRejectedValueOnce(new Error("Privy refused"));
  signedIn();
  await act(async () => {});
}

describe("making the person's Sui wallet", () => {
  it("asks for a Sui wallet as soon as Privy signs the person in", () => {
    setStatus({ state: "signing-in" });
    expect(createWallet).not.toHaveBeenCalled();

    signedIn();
    expect(createWallet).toHaveBeenCalledExactlyOnceWith({ chainType: "sui" });
  });

  it("keeps one wallet creation in flight across repeated renders", async () => {
    let finish: ((wallet: object) => void) | undefined;
    createWallet.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    signedIn();
    for (let render = 0; render < 3; render++) {
      act(() =>
        root.render(
          <SessionEnvelopeContext value={sessionEnvelope(TEST_ME)}>
            <MakeSuiWallet />
          </SessionEnvelopeContext>,
        ),
      );
      signedIn();
    }
    expect(createWallet).toHaveBeenCalledExactlyOnceWith({ chainType: "sui" });
    await act(async () => finish?.({ user: sdk.user }));
  });

  it("leaves someone who has one alone", () => {
    signedIn(SUI);
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("asks once, even when Privy refuses and the sign-in starts again", async () => {
    await refusedOnce();
    // The developer slip shows why, since LINE's browser has no console.
    expect(suiWallet.suiWalletFailure()).toBe(
      "The selected account's Sui wallet could not be prepared. Try again.",
    );

    setStatus({ state: "signing-in" });
    signedIn();
    expect(createWallet).toHaveBeenCalledTimes(1);
  });

  it("asks again after a refusal when something that needs the wallet asks for its fresh try", async () => {
    await refusedOnce();
    act(() => suiWallet.askForSuiWalletAgain());
    expect(createWallet).toHaveBeenCalledTimes(2);
    expect(suiWallet.suiWalletFailure()).toBeUndefined();
  });
});

it("never creates a wallet for a persisted wrong subject", () => {
  sdk.authenticated = true;
  sdk.user = {
    id: "did:privy:wrong",
    linkedAccounts: [],
    createdAt: new Date(0),
    mfaMethods: [],
    hasAcceptedTerms: true,
    isGuest: false,
  };
  setStatus({ state: "signed-in", userId: "did:privy:wrong" });
  expect(createWallet).not.toHaveBeenCalled();
});
