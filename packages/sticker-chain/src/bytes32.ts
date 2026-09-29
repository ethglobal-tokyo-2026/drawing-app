import { isHex, type Hex } from "viem";

/** "0x" and two hex digits for each of the 32 bytes. */
const BYTES32_HEX_LENGTH = 2 + 32 * 2;

/** `value` as a bytes32 (a gift ID, a claim commitment, a content hash); throws naming `name`. */
export function bytes32(value: string, name: string): Hex {
  if (!isHex(value) || value.length !== BYTES32_HEX_LENGTH) {
    throw new Error(`${name} is not 32 bytes`);
  }
  return value;
}
