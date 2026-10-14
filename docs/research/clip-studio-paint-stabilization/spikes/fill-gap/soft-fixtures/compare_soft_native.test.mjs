import assert from "node:assert/strict";
import { test } from "node:test";
import { packMask } from "../bitmap.mjs";
import { compareSoftReturn } from "./compare_soft_native.mjs";
import { croquisFill, manifest } from "./soft_baselines.mjs";

function capture(fixture, mask, candidate = null) {
  return {
    kind: "boundary",
    phase: "return",
    callId: "synthetic-soft-check",
    success: true,
    arguments: { seed: fixture.seed, narrowFlag: 1024 },
    seedDocument: fixture.seed,
    outputRect: { values: [0, 0, fixture.width, fixture.height] },
    snapshot: {
      complete: true,
      errors: [],
      header: {
        gapWidth: 10,
        documentOffset: [0, 0],
        sourceTileOffset: [0, 0],
        domain: [0, 0, fixture.width, fixture.height],
      },
      bitmaps: {
        A: {
          ...packMask(mask, fixture.width, fixture.height),
          state: "present",
          complete: true,
          errors: [],
        },
        C: candidate
          ? {
              ...packMask(candidate, fixture.width, fixture.height),
              state: "present",
              complete: true,
              errors: [],
            }
          : { state: "null" },
      },
    },
  };
}

test("native C positives retain exact alpha64 source values without a binary-alpha assertion", () => {
  const fixture = manifest.fixtures.find((f) => f.id === "soft-axis-gap10-alpha064");
  const baseline = croquisFill(fixture, 10);
  const c = new Uint8Array(fixture.width * fixture.height);
  c[101 * fixture.width + 320] = 1;
  const result = compareSoftReturn(capture(fixture, baseline.interior, c), fixture).result;
  assert.equal(result.identicalOnDocument, true);
  assert.equal(result.bySourceAlpha[64].nativeCPositive, 1);
  assert.equal(result.bySourceRgba["0,0,0,64"].sourcePixels, 3426);
  assert.equal(result.bySourceRgba["0,0,0,64"].croquisCandidate, 3426);
  assert.equal(result.candidateKnowledge.nativeRuleAssumed, false);
  assert.equal(result.finalRgbaComparison.state, "not-measured");
});

test("an alpha128 native C positive is a candidate difference relative to Croquis, without declaring a native rejection", () => {
  const fixture = manifest.fixtures.find((f) => f.id === "soft-axis-gap10-alpha128");
  const baseline = croquisFill(fixture, 10);
  const c = new Uint8Array(fixture.width * fixture.height);
  c[101 * fixture.width + 320] = 1;
  const result = compareSoftReturn(capture(fixture, baseline.interior, c), fixture).result;
  assert.equal(result.bySourceRgba["0,0,0,128"].croquisCandidate, 0);
  assert.equal(result.bySourceRgba["0,0,0,128"].nativeCPositive, 1);
  assert.equal(result.bySourceAlpha[128].croquisTUCKED, 2280);
  assert.equal(result.bySourceAlpha[128].croquisIN, 0);
  assert.equal(result.bySourceAlpha[128].nativeCZeroInBitmap, 3425);
  assert.match(result.candidateKnowledge.nativeC.zeroMeaning, /prepared lazily/);
});

test("failed, incomplete, contradictory, mismatched, and out-of-document seeds are rejected", () => {
  const fixture = manifest.fixtures.find((f) => f.id === "soft-axis-gap10-alpha255");
  const record = capture(fixture, croquisFill(fixture, 10).interior);
  assert.throws(() => compareSoftReturn({ ...record, success: false }, fixture), /did not succeed/);
  assert.throws(
    () =>
      compareSoftReturn({ ...record, snapshot: { ...record.snapshot, complete: false } }, fixture),
    /incomplete/,
  );
  assert.throws(
    () => compareSoftReturn({ ...record, seedDocument: { x: 321, y: 230 } }, fixture),
    /contradicts/,
  );
  const changedSeed = {
    ...record,
    seedDocument: undefined,
    arguments: { seed: { x: 321, y: 230 }, narrowFlag: 1024 },
  };
  assert.throws(() => compareSoftReturn(changedSeed, fixture), /differs from fixture/);
  assert.equal(
    compareSoftReturn(changedSeed, fixture, { useCapturedSeed: true }).result.seedMapping
      .usedCapturedSeed,
    true,
  );
  assert.throws(
    () =>
      compareSoftReturn({ ...changedSeed, arguments: { seed: { x: -1, y: 230 } } }, fixture, {
        useCapturedSeed: true,
      }),
    /outside fixture/,
  );
});

test("native bits beyond an exclusive output rectangle remain in full classification", () => {
  const fixture = manifest.fixtures.find((f) => f.id === "soft-axis-gap10-aa-outer");
  const baseline = croquisFill(fixture, 10);
  const record = capture(fixture, baseline.interior);
  record.outputRect = { values: [163, 103, 478, 359] };
  const result = compareSoftReturn(record, fixture).result;
  assert.equal(result.nativeSelection.selectedPixels, 80345);
  assert.equal(result.selectedOutsideOutputRectExclusiveOnDocument.selectedPixels, 10);
  assert.equal(result.bySourceAlpha[16].sourcePixels, 4);
  assert.equal(result.bySourceAlpha[64].sourcePixels, 1154);
});
