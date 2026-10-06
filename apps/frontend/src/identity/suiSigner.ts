import { Signer } from "@mysten/sui/cryptography";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromBase58, fromBase64, fromHex, normalizeSuiAddress, toHex } from "@mysten/sui/utils";
import { SigningTimedOut } from "./signingTimedOut";
import { onSuiWalletFailure, suiWalletFailure, waitForSuiAddress } from "./suiWallet";
import { waitForPrivy } from "./waitForPrivy";

/** How long signing a sponsored transaction may take, the wait for the signer included. */
export const SIGNING_TIMEOUT_MS = 60_000;

let signer: Signer | null = null;
const signerListeners = new Set<() => void>();

/** Privy loads after the board, so its Sui signer is shared from inside PrivySession. */
export function setSuiSigner(next: Signer | null) {
  signer = next;
  signerListeners.forEach((l) => l());
}

/**
 * Signing waits here: first for the wallet, which gets a fresh try when Privy couldn't make it, then
 * for its signer, which starts as the wallet arrives. A signer that didn't start ends the wait.
 */
export async function waitForSuiSigner(): Promise<Signer> {
  await waitForSuiAddress();
  return waitForPrivy({
    current: () => signer,
    failure: () => suiWalletFailure() ?? null,
    subscribe: (listener) => {
      signerListeners.add(listener);
      const stopFailures = onSuiWalletFailure(listener);
      return () => {
        signerListeners.delete(listener);
        stopFailures();
      };
    },
  });
}

/** A transaction the server built and Shinami sponsored, for the person's wallet to sign as sender. */
interface Sponsored {
  /** Base64 BCS TransactionData. */
  txBytes: string;
  digest: string;
}

/**
 * The person's signature over a sponsored transaction, which the server checks and submits. Rejects
 * with SigningTimedOut past SIGNING_TIMEOUT_MS: a signature that comes later is never posted.
 */
export async function signSponsored(tx: Sponsored): Promise<{ digest: string; signature: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SigningTimedOut()), SIGNING_TIMEOUT_MS);
  });
  const signing = (async () => {
    const wallet = await waitForSuiSigner();
    const { signature } = await wallet.signTransaction(fromBase64(tx.txBytes));
    return { digest: tx.digest, signature };
  })();
  return Promise.race([signing, timedOut]).finally(() => clearTimeout(timer));
}

/** Privy's public key for a Sui wallet: hex or base64, bare or behind Sui's Ed25519 flag byte. */
function publicKeyCandidates(encoded: string): Uint8Array[] {
  const decoders = [
    () => fromHex(encoded.replace(/^0x/, "")),
    () => fromBase64(encoded),
    () => fromBase58(encoded),
  ];
  return decoders.flatMap((decode) => {
    try {
      const bytes = decode();
      if (bytes.length === Ed25519PublicKey.SIZE) return [bytes];
      if (bytes.length === Ed25519PublicKey.SIZE + 1 && bytes[0] === 0) return [bytes.slice(1)];
    } catch {
      // Not this encoding; the next decoder tries its own.
    }
    return [];
  });
}

/** The Ed25519 key behind `address`, from the encoding Privy reported; throws when none matches. */
export function suiPublicKeyFor(address: string, encoded: string): Ed25519PublicKey {
  const owner = normalizeSuiAddress(address);
  for (const bytes of publicKeyCandidates(encoded)) {
    const key = new Ed25519PublicKey(bytes);
    if (key.toSuiAddress() === owner) return key;
  }
  throw new Error(`Privy's public key for the Sui wallet ${address} doesn't match its address`);
}

/** Signs Sui transactions with the Privy wallet: Privy signs the intent digest Sui asks for. */
export class PrivySuiSigner extends Signer {
  private readonly address: string;
  private readonly publicKey: Ed25519PublicKey;
  private readonly signRawHash: (hash: `0x${string}`) => Promise<`0x${string}`>;

  constructor(
    address: string,
    publicKey: Ed25519PublicKey,
    signRawHash: (hash: `0x${string}`) => Promise<`0x${string}`>,
  ) {
    super();
    this.address = address;
    this.publicKey = publicKey;
    this.signRawHash = signRawHash;
  }

  async sign(digest: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
    const signature = await this.signRawHash(`0x${toHex(digest)}`);
    return Uint8Array.from(fromHex(signature.slice(2)));
  }

  getKeyScheme() {
    return "ED25519" as const;
  }

  getPublicKey() {
    return this.publicKey;
  }

  override toSuiAddress() {
    return normalizeSuiAddress(this.address);
  }
}
