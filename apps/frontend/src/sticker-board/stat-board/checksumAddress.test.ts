import { getAddress, keccak256, toBytes } from "viem";
import { describe, expect, it } from "vitest";
import { checksumAddress, keccak256Hex } from "./checksumAddress";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("keccak256Hex", () => {
  it("gives Keccak-256's known hashes", () => {
    expect(keccak256Hex(bytes(""))).toBe(
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
    expect(keccak256Hex(bytes("abc"))).toBe(
      "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
    );
  });

  it("agrees with viem at every length around a block's edge, and over several blocks", () => {
    for (const length of [1, 55, 134, 135, 136, 137, 271, 272, 273, 500]) {
      const message = Uint8Array.from({ length }, (_, i) => (i * 37 + length) % 256);
      expect(keccak256Hex(message), `${length} bytes`).toBe(keccak256(message).slice(2));
    }
  });
});

describe("checksumAddress", () => {
  it("gives EIP-55's own examples", () => {
    for (const address of [
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
      "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
      "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
      "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
    ]) {
      expect(checksumAddress(address.toLowerCase())).toBe(address);
      expect(checksumAddress(address.toUpperCase().replace("0X", "0x"))).toBe(address);
    }
  });

  it("agrees with viem's getAddress", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const hex = keccak256(toBytes(`address ${seed}`)).slice(-40);
      const address = `0x${hex}`;
      expect(checksumAddress(address)).toBe(getAddress(address));
    }
  });

  it("refuses what isn't an address", () => {
    for (const bad of [
      "",
      "0x",
      "0x1234",
      `0x${"g".repeat(40)}`,
      "5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    ]) {
      expect(() => checksumAddress(bad)).toThrow("isn't an Ethereum address");
    }
  });
});
