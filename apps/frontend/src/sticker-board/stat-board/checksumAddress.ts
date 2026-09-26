/**
 * Ethereum's mixed-case address checksum (EIP-55), the same answer as viem's `getAddress`, without
 * the stat board's chunk pulling in viem: viem is shared with the gift code, so importing any of it
 * downloaded about 60 KB gzipped behind the board as it opened.
 */

const MASK_64 = (1n << 64n) - 1n;

/** Keccak-f[1600]'s round constants. */
const ROUND = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
];

/** Each lane's rotation, by its index x + 5y. */
const ROTATION = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
];

/** 136 bytes: what Keccak-256 absorbs per permutation. */
const RATE = 136;

const rotl = (lane: bigint, by: number) =>
  by === 0 ? lane : ((lane << BigInt(by)) | (lane >> BigInt(64 - by))) & MASK_64;

/** Keccak-f[1600] on the state's 25 lanes, in place. */
function permute(a: bigint[]) {
  const c: bigint[] = Array.from({ length: 5 }, () => 0n);
  const b: bigint[] = Array.from({ length: 25 }, () => 0n);
  for (const constant of ROUND) {
    for (let x = 0; x < 5; x++) c[x] = a[x] ^ a[x + 5] ^ a[x + 10] ^ a[x + 15] ^ a[x + 20];
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) a[x + y] ^= d;
    }
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++)
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(a[x + 5 * y], ROTATION[x + 5 * y]);
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 25; y += 5)
        a[x + y] = b[x + y] ^ (~b[((x + 1) % 5) + y] & b[((x + 2) % 5) + y]);
    a[0] ^= constant;
  }
}

/** Keccak-256, the hash Ethereum uses (Keccak's own padding, not SHA-3's), as 64 hex digits. */
export function keccak256Hex(message: Uint8Array): string {
  const blocks = Math.floor(message.length / RATE) + 1;
  const padded = new Uint8Array(blocks * RATE);
  padded.set(message);
  padded[message.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;
  const state: bigint[] = Array.from({ length: 25 }, () => 0n);
  for (let at = 0; at < padded.length; at += RATE) {
    for (let lane = 0; lane < RATE / 8; lane++) {
      let value = 0n;
      for (let byte = 7; byte >= 0; byte--)
        value = (value << 8n) | BigInt(padded[at + lane * 8 + byte]);
      state[lane] ^= value;
    }
    permute(state);
  }
  let hex = "";
  for (let lane = 0; lane < 4; lane++)
    for (let byte = 0; byte < 8; byte++)
      hex += Number((state[lane] >> BigInt(8 * byte)) & 0xffn)
        .toString(16)
        .padStart(2, "0");
  return hex;
}

/**
 * An address as 0x and 40 hex digits in EIP-55's mixed case, which wallets check when it's pasted.
 * Like viem's `getAddress`, it throws for anything that isn't an address, and fixes a wrong case.
 */
export function checksumAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`"${address}" isn't an Ethereum address`);
  }
  const digits = address.slice(2).toLowerCase();
  const hash = keccak256Hex(new TextEncoder().encode(digits));
  let out = "0x";
  for (let i = 0; i < digits.length; i++) {
    out += Number.parseInt(hash[i], 16) >= 8 ? digits[i].toUpperCase() : digits[i];
  }
  return out;
}
