// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "@privy-io/react-auth";
import type { Signer } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toHex } from "@mysten/sui/utils";
import { acceptSession, SessionEnvelopeContext, suspendSession } from "../api/sessionContext";
import { sessionEnvelope } from "../api/sessionTestFixtures";
import { TEST_ME } from "../api/testing";
const sdk = vi.hoisted(() => ({
  user: null as User | null,
  signer: null as Signer | null,
  sign: vi.fn<() => Promise<{ signature: `0x${string}` }>>(),
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated: true, user: sdk.user }),
}));
vi.mock("@privy-io/react-auth/extended-chains", () => ({
  useSignRawHash: () => ({ signRawHash: sdk.sign }),
}));
vi.mock("./suiSigner", async (original) => ({
  ...(await original<typeof import("./suiSigner")>()),
  setSuiSigner: (signer: Signer | null) => {
    sdk.signer = signer;
  },
}));
import { setPrivyStatus } from "./privy";
import { SuiWalletBridge } from "./SuiWalletBridge";
const key = Ed25519Keypair.generate().getPublicKey();
const address = key.toSuiAddress();
const user = (subject: string, walletAddress = address): User => ({
  createdAt: new Date(0),
  mfaMethods: [],
  hasAcceptedTerms: true,
  isGuest: false,
  id: "did:privy:test",
  linkedAccounts: [
    { type: "custom_auth", customUserId: subject, firstVerifiedAt: null, latestVerifiedAt: null },
    {
      firstVerifiedAt: null,
      latestVerifiedAt: null,
      imported: false,
      delegated: false,
      walletIndex: 0,
      type: "wallet",
      chainType: "sui",
      walletClientType: "privy",
      address: walletAddress,
      publicKey: toHex(key.toRawBytes()),
    },
  ],
});
const envelope = sessionEnvelope(TEST_ME, {
  selectionVersion: "first",
  expectedSuiAddress: address,
});
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  acceptSession(envelope);
  setPrivyStatus({ state: "signed-in", userId: "did:privy:test", suiWallet: address });
  root = createRoot(document.createElement("div"));
  sdk.sign.mockReset().mockResolvedValue({ signature: `0x${"00".repeat(64)}` });
});
afterEach(() => {
  act(() => root.unmount());
  suspendSession();
});
const render = () =>
  act(() =>
    root.render(
      <SessionEnvelopeContext value={envelope}>
        <SuiWalletBridge />
      </SessionEnvelopeContext>,
    ),
  );
it.each(["wrong subject", "wrong address"])("never installs a signer for %s", (problem) => {
  sdk.user = user(
    problem === "wrong subject" ? "different" : "U-you",
    problem === "wrong address" ? `0x${"22".repeat(32)}` : address,
  );
  render();
  expect(sdk.signer).toBeNull();
});
it("rejects a retained signer before signing after suspension", async () => {
  sdk.user = user("U-you");
  render();
  const retained = sdk.signer;
  if (!retained) throw new Error("Expected selected signer");
  act(suspendSession);
  await expect(retained.sign(new Uint8Array(32))).rejects.toThrow("session_account_changed");
  expect(sdk.sign).not.toHaveBeenCalled();
});
it.each(["later", "first"])(
  "discards an in-flight signature across suspension and version %s",
  async (version) => {
    sdk.user = user("U-you");
    render();
    let finish!: (result: { signature: `0x${string}` }) => void;
    sdk.sign.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const signer = sdk.signer;
    if (!signer) throw new Error("Expected selected signer");
    const pending = signer.sign(new Uint8Array(32));
    act(() => {
      suspendSession();
      acceptSession({ ...envelope, selectionVersion: version });
    });
    finish({ signature: `0x${"00".repeat(64)}` });
    await expect(pending).rejects.toThrow("session_account_changed");
  },
);
