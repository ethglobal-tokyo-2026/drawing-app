import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex, toBase64, toHex } from "@mysten/sui/utils";
import { describe, expect, it } from "vitest";
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
