import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex, toBase64, toHex } from "@mysten/sui/utils";
import { verifyTransactionSignature } from "@mysten/sui/verify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivySuiSigner, suiPublicKeyFor } from "./suiSigner";

const keypair = Ed25519Keypair.generate();
const address = keypair.toSuiAddress();
const raw = keypair.getPublicKey().toRawBytes();

/** Privy's signer for `keypair`'s wallet: Privy signs the raw digest it's handed, as the keypair does. */
const privySigner = (
  signRawHash = async (hash: `0x${string}`) => {
    const signature = await keypair.sign(fromHex(hash.slice(2)));
    return `0x${toHex(signature)}` as const;
  },
) => new PrivySuiSigner(address, suiPublicKeyFor(address, toHex(raw)), signRawHash);

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
    const bytes = new TextEncoder().encode("transaction bytes");
    const { signature } = await privySigner().signTransaction(bytes);
    expect(await keypair.getPublicKey().verifyTransaction(bytes, signature)).toBe(true);
  });
});

describe("signing waits for the Sui wallet and its signer", () => {
  // The Sui wallet's failure and attempt last the visit, so each test opens the modules as a fresh
  // page would.
  const freshPage = async () => {
    vi.resetModules();
    const [privy, suiWallet, suiSigner, timedOut] = await Promise.all([
      import("./privy"),
      import("./suiWallet"),
      import("./suiSigner"),
      import("./signingTimedOut"),
    ]);
    privy.setPrivyStatus({ state: "signing-in" });
    return { ...privy, ...suiWallet, ...suiSigner, ...timedOut };
  };
  type Page = Awaited<ReturnType<typeof freshPage>>;
  const walletReady = (page: Page) =>
    page.setPrivyStatus({ state: "signed-in", userId: "did:privy:1", suiWallet: address });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it("signs in to Privy again after a failed sign-in, with a fresh try at a wallet it couldn't make", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const page = await freshPage();
    page.setSuiWalletFailure("Privy couldn't make the wallet");
    page.setPrivyStatus({ state: "failed", reason: "couldn’t reach the auth server" });
    const pending = page.waitForSuiSigner();
    expect(page.privyStatus()).toEqual({ state: "signing-in" });
    // The wallet's old failure would end the fresh sign-in's try before it starts.
    expect(page.suiWalletFailure()).toBeUndefined();
    const signer = privySigner();
    walletReady(page);
    page.setSuiSigner(signer);
    await expect(pending).resolves.toBe(signer);
  });

  it("asks Privy once more for a wallet it couldn't make, and takes the signer that follows", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const page = await freshPage();
    page.setPrivyStatus({ state: "signed-in", userId: "did:privy:1" });
    page.setSuiWalletFailure("Privy couldn't make the wallet");
    const pending = page.waitForSuiSigner();
    // MakeSuiWallet's cue: the failure goes so the fresh try has its turn.
    expect(page.suiWalletFailure()).toBeUndefined();
    const signer = privySigner();
    walletReady(page);
    page.setSuiSigner(signer);
    await expect(pending).resolves.toBe(signer);
  });

  it("stops at once, in the catalog's words and with the reason, when the fresh try fails too", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const page = await freshPage();
    page.setPrivyStatus({ state: "signed-in", userId: "did:privy:1" });
    page.setSuiWalletFailure("Privy couldn't make the wallet");
    const pending = page.waitForSuiSigner();
    page.setSuiWalletFailure("Privy refused again");
    await expect(pending).rejects.toMatchObject({
      code: "sui_wallet_not_ready",
      detail: "Privy refused again",
    });
  });

  it("stops at once when the wallet is there but its signer didn't start", async () => {
    const page = await freshPage();
    walletReady(page);
    page.setSuiWalletFailure("Privy reported no public key");
    await expect(page.waitForSuiSigner()).rejects.toMatchObject({
      code: "sui_wallet_not_ready",
      detail: "Privy reported no public key",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("says the Sui address isn't ready, in the catalog's words, when it never comes", async () => {
    const page = await freshPage();
    const pending = expect(page.waitForSuiSigner()).rejects.toMatchObject({
      code: "sui_wallet_not_ready",
    });
    await vi.runAllTimersAsync();
    await pending;
  });

  it("doesn't wait under LIFF Mock, where Privy stays off", async () => {
    const page = await freshPage();
    page.setPrivyStatus({ state: "off" });
    const outcome = page.waitForSuiSigner().catch((error: unknown) => error);
    expect(vi.getTimerCount()).toBe(0);
    expect(await outcome).toMatchObject({ code: "sui_wallet_not_ready" });
  });

  it("signs a sponsored transaction as its sender, so the server's check accepts it", async () => {
    const page = await freshPage();
    walletReady(page);
    page.setSuiSigner(privySigner());
    const bytes = new TextEncoder().encode("sponsored transaction bytes");
    const signed = await page.signSponsored({ txBytes: toBase64(bytes), digest: "digest" });
    expect(signed.digest).toBe("digest");
    await expect(verifyTransactionSignature(bytes, signed.signature, { address })).resolves.toEqual(
      keypair.getPublicKey(),
    );
  });

  it("gives up SIGNING_TIMEOUT_MS after it's asked, the wait for the signer included", async () => {
    const page = await freshPage();
    walletReady(page);
    const outcome = page
      .signSponsored({ txBytes: toBase64(new Uint8Array([1])), digest: "d" })
      .then(
        () => "signed",
        (error: unknown) => error,
      );
    const now = () => Promise.race([outcome, Promise.resolve("still signing")]);
    // The signer starts late, then Privy never answers.
    const signerStarts = page.SIGNING_TIMEOUT_MS / 4;
    await vi.advanceTimersByTimeAsync(signerStarts);
    page.setSuiSigner(privySigner(() => new Promise(() => {})));
    await vi.advanceTimersByTimeAsync(page.SIGNING_TIMEOUT_MS - signerStarts - 1);
    expect(await now()).toBe("still signing");
    await vi.advanceTimersByTimeAsync(1);
    expect(await now()).toBeInstanceOf(page.SigningTimedOut);
  });
});
