import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/**
 * Ethereum's keccak256, which names a sticker's images and commits to a Gift Claim Token. A hex
 * value is hashed as its bytes, as viem and the contracts do. Not SHA3-256, which pads differently.
 */
export function keccak256(data: Uint8Array | `0x${string}`): `0x${string}` {
  const bytes = typeof data === "string" ? hexToBytes(data.slice(2)) : data;
  return `0x${bytesToHex(keccak_256(bytes))}`;
}
