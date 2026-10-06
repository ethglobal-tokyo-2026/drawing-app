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

const SUI = `0x${"34".repeat(32)}`;

let host: HTMLDivElement;
let root: Root;
let setStatus: (status: PrivyStatus) => void;
let suiWallet: typeof import("./suiWallet");

// Each test starts with nothing asked yet, so each gets its own copy of the modules.
beforeEach(async () => {
  vi.resetModules();
  const privy = await import("./privy");
  const { MakeSuiWallet } = await import("./MakeSuiWallet");
  suiWallet = await import("./suiWallet");
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

const signedIn = (suiWallet?: string) =>
  setStatus({ state: "signed-in", userId: "did:privy:someone", suiWallet });

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

  it("leaves someone who has one alone", () => {
    signedIn(SUI);
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("asks once, even when Privy refuses and the sign-in starts again", async () => {
    await refusedOnce();
    // The developer slip shows why, since LINE's browser has no console.
    expect(suiWallet.suiWalletFailure()).toBe("Privy refused");

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
