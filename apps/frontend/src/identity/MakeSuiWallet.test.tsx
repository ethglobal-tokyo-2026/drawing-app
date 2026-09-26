// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrivyStatus } from "./privy";

const createWallet = vi.hoisted(() => vi.fn<(input: { chainType: string }) => Promise<object>>());
vi.mock("@privy-io/react-auth/extended-chains", () => ({
  useCreateWallet: () => ({ createWallet }),
}));
vi.mock("@line/liff", () => ({ default: {} }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ETHEREUM = `0x${"12".repeat(20)}`;
const SUI = `0x${"34".repeat(32)}`;

let host: HTMLDivElement;
let root: Root;
let setStatus: (status: PrivyStatus) => void;
let failure: () => string | undefined;

// Each test needs the one ask unspent, so each gets its own copy of the modules.
beforeEach(async () => {
  vi.resetModules();
  const privy = await import("./privy");
  const { MakeSuiWallet } = await import("./MakeSuiWallet");
  ({ suiWalletFailure: failure } = await import("./suiWallet"));
  setStatus = (status) => act(() => privy.setPrivyStatus(status));
  createWallet.mockResolvedValue({});
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<MakeSuiWallet />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  createWallet.mockReset();
  vi.restoreAllMocks();
});

const signedIn = (wallets: { wallet?: string; suiWallet?: string }) =>
  setStatus({ state: "signed-in", userId: "did:privy:someone", ...wallets });

describe("making the person's Sui wallet", () => {
  it("waits for Privy's Ethereum wallet, then asks for a Sui one", () => {
    signedIn({});
    expect(createWallet).not.toHaveBeenCalled();

    signedIn({ wallet: ETHEREUM });
    expect(createWallet).toHaveBeenCalledExactlyOnceWith({ chainType: "sui" });
  });

  it("leaves someone who has one alone", () => {
    signedIn({ wallet: ETHEREUM, suiWallet: SUI });
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("asks once per page load, even when Privy refuses and the sign-in starts again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createWallet.mockRejectedValueOnce(new Error("Privy refused"));
    signedIn({ wallet: ETHEREUM });
    await act(async () => {});
    // The developer slip shows why, since LINE's browser has no console.
    expect(failure()).toBe("Privy refused");

    setStatus({ state: "signing-in" });
    signedIn({ wallet: ETHEREUM });
    expect(createWallet).toHaveBeenCalledTimes(1);
  });
});
