import { Signer } from "@mysten/sui/cryptography";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromBase58, fromBase64, fromHex, normalizeSuiAddress, toHex } from "@mysten/sui/utils";
import { onSuiWalletFailure, suiWalletFailure } from "./suiWallet";
import { waitForPrivy } from "./waitForPrivy";

let signer: Signer | null = null;
const signerListeners = new Set<() => void>();

/** Privy loads after the board, so its Sui signer is shared from inside PrivySession. */
export function setSuiSigner(next: Signer | null) {
  signer = next;
  signerListeners.forEach((l) => l());
}

/**
 * Paying for reserve tickets waits here, as chain actions wait for the Sepolia client. A Sui wallet
 * that Privy couldn't make, or whose signer didn't start, ends the wait: it's asked for once a visit.
 */
export const waitForSuiSigner = (): Promise<Signer> =>
  waitForPrivy({
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
    notReady: "sui_wallet_not_ready",
  });

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
