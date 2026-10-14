import assert from "node:assert/strict";
import { test } from "node:test";
import { manifest, croquisFill } from "./croquis-baselines.mjs";
import { compareReturn } from "./compare_native.mjs";
import { packMask } from "./bitmap.mjs";

const fixture = manifest.fixtures.find((value) => value.id === "edge-gap-2");

function capture(
  mask,
  offset = [0, 0],
  bitmapWidth = fixture.width,
  bitmapHeight = fixture.height,
) {
  const encoded = packMask(mask, bitmapWidth, bitmapHeight);
  return {
    kind: "boundary",
    phase: "return",
    callId: "synthetic-check",
    success: true,
    arguments: {
      seed: { x: fixture.seed.x - offset[0], y: fixture.seed.y - offset[1] },
      narrowFlag: 0,
    },
    seedDocument: fixture.seed,
    outputRect: { values: [20, 20, 221, 181] },
    snapshot: {
      complete: true,
      errors: [],
      header: {
        gapWidth: 3,
        documentOffset: offset,
        sourceTileOffset: [0, 0],
        domain: [0, 0, bitmapWidth, bitmapHeight],
      },
      bitmaps: {
        A: {
          ...encoded,
          state: "present",
          complete: true,
          errors: [],
          header: { width: bitmapWidth, height: bitmapHeight, strideBytes: encoded.strideBytes },
        },
        C: { state: "null" },
        T: { state: "null" },
      },
    },
  };
}

test("a padded native crop with a signed offset matches document classification", () => {
  const baseline = croquisFill(fixture, 3).interior;
  const nativeWidth = fixture.width + 16,
    nativeHeight = fixture.height + 16;
  const shifted = new Uint8Array(nativeWidth * nativeHeight);
  for (let y = 0; y < fixture.height; y++) {
    for (let x = 0; x < fixture.width; x++)
      shifted[(y + 8) * nativeWidth + x + 8] = baseline[y * fixture.width + x];
  }
  const compared = compareReturn(capture(shifted, [-8, -8], nativeWidth, nativeHeight), fixture);
  assert.equal(compared.result.identicalOnDocument, true);
  assert.equal(compared.result.nativeSelectedOutsideDocument, 0);
  assert.equal(compared.result.nativeSelection.selectedPixels, 30229);
});

test("a single extra exterior pixel produces a lossless classified difference", () => {
  const baseline = croquisFill(fixture, 3).interior;
  baseline[5 * fixture.width + 5] = 1;
  const compared = compareReturn(capture(baseline), fixture);
  assert.equal(compared.result.identicalOnDocument, false);
  assert.equal(compared.result.classificationDifferences.nativeOnly.selectedPixels, 1);
  assert.deepEqual(
    compared.result.classificationDifferences.nativeOnly.boundsExclusive,
    [5, 5, 6, 6],
  );
  assert.equal(compared.result.classificationDifferences.croquisOnly.selectedPixels, 0);
});

test("failed fills and contradictory document coordinates cannot become comparison results", () => {
  const record = capture(croquisFill(fixture, 3).interior);
  assert.throws(() => compareReturn({ ...record, success: false }, fixture), /did not succeed/);
  assert.throws(
    () => compareReturn({ ...record, seedDocument: { x: 121, y: 100 } }, fixture),
    /contradicts/,
  );
  assert.throws(
    () =>
      compareReturn(
        {
          ...record,
          seedDocument: undefined,
          arguments: { ...record.arguments, seed: { x: 121, y: 100 } },
        },
        fixture,
      ),
    /differs from fixture/,
  );
});
