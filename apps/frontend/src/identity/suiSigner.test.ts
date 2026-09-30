import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex, toBase64, toHex } from "@mysten/sui/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivySuiSigner, suiPublicKeyFor } from "./suiSigner";

const keypair = Ed25519Keypair.generate();
const address = keypair.toSuiAddress();
const raw = keypair.getPublicKey().toRawBytes();

describe("suiPublicKeyFor", () => {
  it("reads the key in hex or base64, bare or behind Sui's flag byte", () => {
    const flagged = new Uint8Array([0, ...raw]);
    for (const encoded of [toHex(raw), `0x${toHex(raw)}`, toBase64(raw), toBase64(flagged)]) {
      expect(suiPublicKeyFor(address, encoded).toSuiAddress()).toBe(address);
    }
  });

  it("refuses a key that isn't the address's", () => {
    const other = Ed25519Keypair.generate().getPublicKey().toRawBytes();
    expect(() => suiPublicKeyFor(address, toHex(other))).toThrow(/doesn't match/);
  });
});

describe("PrivySuiSigner", () => {
  it("signs a transaction so Sui's own check accepts it", async () => {
    // Privy signs the raw digest it's handed, as the keypair itself does.
    const signer = new PrivySuiSigner(
      address,
      suiPublicKeyFor(address, toHex(raw)),
      async (hash) => {
        const signature = await keypair.sign(fromHex(hash.slice(2)));
        return `0x${toHex(signature)}`;
      },
    );
    const bytes = new TextEncoder().encode("transaction bytes");
    const { signature } = await signer.signTransaction(bytes);
    expect(await keypair.getPublicKey().verifyTransaction(bytes, signature)).toBe(true);
  });
});

describe("paying waiting for the Sui signer", () => {
  // The Sui wallet's failure lasts the visit, so each test opens the modules as a fresh page would.
  const freshPage = async () => {
    vi.resetModules();
    const [privy, suiWallet, suiSigner] = await Promise.all([
      import("./privy"),
      import("./suiWallet"),
      import("./suiSigner"),
    ]);
    privy.setPrivyStatus({ state: "signing-in" });
    return { ...privy, ...suiWallet, ...suiSigner };
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks for LINE at once when Privy failed on LINE's expired sign-in", async () => {
    const page = await freshPage();
    page.setPrivyStatus({
      state: "failed",
      reason: "LINE’s ID token has expired",
      reconnectLine: true,
    });
    await expect(page.waitForSuiSigner()).rejects.toMatchObject({ code: "line_token_expired" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops at once, in the catalog's words and with the reason, when there's no Sui wallet to sign", async () => {
    const page = await freshPage();
    page.setPrivyStatus({ state: "signed-in", userId: "did:privy:1" });
    page.setSuiWalletFailure("Privy couldn't make the wallet");
    await expect(page.waitForSuiSigner()).rejects.toMatchObject({
      code: "sui_wallet_not_ready",
      detail: "Privy couldn't make the wallet",
    });
  });
});
