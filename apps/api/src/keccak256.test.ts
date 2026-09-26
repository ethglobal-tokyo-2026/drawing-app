import { describe, expect, it } from "vitest";
import { keccak256 } from "./keccak256.ts";

// Ethereum's published keccak256 of empty input: the contracts compute the same, and SHA3-256 doesn't.
const EMPTY_KECCAK256 = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";

describe("keccak256", () => {
  it("is Ethereum's keccak256, and hashes a hex value as its bytes", () => {
    expect(keccak256(new Uint8Array())).toBe(EMPTY_KECCAK256);
    expect(keccak256("0x")).toBe(EMPTY_KECCAK256);
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(keccak256("0xdeadbeef")).toBe(keccak256(bytes));
  });
});
