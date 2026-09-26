// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Address, Hash } from "viem";
import { sendSmartWalletTransaction, SmartWalletBridge } from "./smartWallet";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ADDRESS = `0x${"1".repeat(40)}` as Address;
const TARGET = `0x${"2".repeat(40)}` as Address;
const HASH = `0x${"3".repeat(64)}` as Hash;

const mocks = vi.hoisted(() => ({
  getClientForChain: vi.fn(),
  waitForTransactionReceipt: vi.fn(() => Promise.resolve({ status: "success" })),
}));

vi.mock("@privy-io/react-auth/smart-wallets", () => ({
  useSmartWallets: () => ({ client: {}, getClientForChain: mocks.getClientForChain }),
}));
vi.mock("viem", () => ({
  createPublicClient: () => ({ waitForTransactionReceipt: mocks.waitForTransactionReceipt }),
  http: () => ({}),
}));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  mocks.getClientForChain.mockReset();
  mocks.waitForTransactionReceipt.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("smart wallet transactions", () => {
  it("waits for Privy's lazy smart account before sending", async () => {
    let makeReady: ((wallet: object) => void) | undefined;
    mocks.getClientForChain.mockReturnValue(
      new Promise((resolve) => {
        makeReady = resolve;
      }),
    );
    const sendTransaction = vi.fn(() => Promise.resolve(HASH));
    act(() => root.render(<SmartWalletBridge />));

    const sending = sendSmartWalletTransaction({ to: TARGET });
    expect(sendTransaction).not.toHaveBeenCalled();

    await act(async () => {
      makeReady?.({ account: { address: ADDRESS }, sendTransaction });
      await Promise.resolve();
    });

    await expect(sending).resolves.toBe(HASH);
    expect(sendTransaction).toHaveBeenCalledWith({ to: TARGET });
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: HASH });
  });
});
