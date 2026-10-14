import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeBitmap, packMask, reprojectBitmap } from "./bitmap.mjs";

test("native bytes use MSB-first pixels and keep row padding separate", () => {
  const { mask } = decodeBitmap({
    header: { width: 9, height: 2, strideBytes: 4 },
    dataHex: "8180ffff0080ffff",
    complete: true,
  });
  assert.deepEqual([...mask], [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
});

test("signed document offsets reproject selected bits and count pixels outside the source", () => {
  const bitmap = {
    header: { width: 9, height: 1, strideBytes: 2 },
    dataHex: "a080",
    complete: true,
  };
  const projected = reprojectBitmap(bitmap, 5, 3, [-2, 1]);
  assert.equal(projected.selectedOutsideDocument, 2);
  assert.deepEqual([...projected.mask], [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test("all non-byte-aligned source pixels survive lossless mask compression", () => {
  const input = Uint8Array.from({ length: 39 }, (_, p) => Number(p % 3 === 0 || p === 38));
  assert.deepEqual(decodeBitmap(packMask(input, 13, 3)).mask, input);
});

test("incomplete captures, malformed bytes, and inconsistent lengths are rejected", () => {
  assert.throws(
    () =>
      decodeBitmap({
        header: { width: 8, height: 1, strideBytes: 1 },
        dataHex: "80",
        complete: false,
      }),
    /incomplete/,
  );
  assert.throws(
    () => decodeBitmap({ header: { width: 9, height: 1, strideBytes: 1 }, dataHex: "80" }),
    /stride/,
  );
  assert.throws(
    () => decodeBitmap({ header: { width: 8, height: 1, strideBytes: 1 }, dataHex: "8g" }),
    /hexadecimal/,
  );
  assert.throws(
    () => decodeBitmap({ header: { width: 8, height: 2, strideBytes: 1 }, dataHex: "80" }),
    /byte count/,
  );
});
