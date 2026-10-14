import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeBitmap, summarize } from "../bitmap.mjs";
import { fillSourceSha256, manifest, sha256, sourceFor } from "./soft_baselines.mjs";

const captureNames = [
  "soft-alpha064-g10-20261013T162719.835423Z-91f4c404",
  "soft-alpha128-g10-20261013T162914.759873Z-e4db0cf6",
  "soft-alpha192-g10-20261013T163058.854046Z-d84f8e05",
  "soft-alpha255-g10-20261013T163221.566197Z-752abf9c",
  "soft-aa-outer-g10-20261013T163328.027396Z-9cc73c8e",
];

const runs = captureNames.map((name) => {
  const directory = new URL(`../evidence/captures/${name}/`, import.meta.url);
  const reportBytes = readFileSync(new URL("soft-comparison.json", directory));
  const report = JSON.parse(reportBytes);
  if (
    report.failures.length ||
    report.results.length !== 1 ||
    report.fillSourceSha256 !== fillSourceSha256
  )
    throw new Error(`Unexpected comparison result for ${name}`);
  const result = report.results[0];
  const fixture = manifest.fixtures.find((f) => f.id === result.fixtureId);
  if (!fixture || result.sourceRgbaSha256 !== fixture.sourceRgbaSha256)
    throw new Error(`Fixture mismatch for ${name}`);
  const source = sourceFor(fixture);
  const captureBytes = readFileSync(new URL("fill.jsonl", directory));
  if (sha256(captureBytes) !== report.captureSha256) throw new Error(`Capture changed for ${name}`);
  const boundaries = captureBytes
    .toString("utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((r) => r.kind === "boundary");
  if (
    boundaries.map((r) => r.phase).join(",") !== "entry,initial,return" ||
    boundaries.some((r) => r.snapshot?.complete !== true || r.snapshot.errors?.length)
  )
    throw new Error(`Incomplete boundary sequence for ${name}`);
  const final = boundaries.find((r) => r.phase === "return");
  if (
    !final?.success ||
    result.gapWidth !== 10 ||
    result.narrowFlag !== 1024 ||
    result.nativeSelectedOutsideDocument !== 0
  )
    throw new Error(`Unexpected native control or result for ${name}`);
  if (
    result.seedMapping.documentOffset.some((v) => v !== 0) ||
    result.seedMapping.mappedDocumentSeed.x !== 319 ||
    result.seedMapping.mappedDocumentSeed.y !== 208
  )
    throw new Error(`Unexpected mapped seed for ${name}`);
  if (result.sourceSeedRgba.some((v) => v !== 0))
    throw new Error(`Captured seed is not transparent black for ${name}`);
  const outcome = JSON.parse(readFileSync(new URL("launcher-result.json", directory)));
  if (
    outcome.captureComplete !== true ||
    outcome.recordingSucceeded !== true ||
    outcome.resumeIndependentlyVerified !== true ||
    outcome.errors?.length ||
    outcome.summary?.allFillsSucceeded !== true ||
    outcome.summary?.cleanupErrors?.length ||
    outcome.summary?.detachedStateObserved !== true
  )
    throw new Error(`Unsuccessful capture outcome for ${name}`);
  const contextBytes = readFileSync(new URL("soft-fixture-context.json", directory));
  const context = JSON.parse(contextBytes);
  if (
    context.fixtureId !== fixture.id ||
    context.capturedSeedDocument.x !== 319 ||
    context.capturedSeedDocument.y !== 208
  )
    throw new Error(`Context mismatch for ${name}`);
  const nativeA = decodeBitmap(result.masks.native).mask;
  const nativeC = decodeBitmap(result.masks.nativeC).mask;
  if (nativeA.length !== 640 * 480 || nativeC.length !== nativeA.length)
    throw new Error(`Unexpected full-mask dimensions for ${name}`);
  return {
    directory,
    fixture,
    source,
    result,
    nativeA,
    nativeC,
    summary: {
      fixtureId: fixture.id,
      captureDirectory: fileURLToPath(directory),
      comparisonSha256: sha256(reportBytes),
      captureSha256: sha256(captureBytes),
      observedContextSha256: sha256(contextBytes),
      sourcePngSha256: fixture.sourcePngSha256,
      sourceRgbaSha256: fixture.sourceRgbaSha256,
      actualSeedDocument: result.seedMapping.mappedDocumentSeed,
      nativeA: result.nativeSelection,
      croquisIN: result.croquisSelection,
      croquisTUCKED: result.croquisTuck,
      nativeOnly: result.classificationDifferences.nativeOnly,
      croquisOnly: result.classificationDifferences.croquisOnly,
      bySourceAlpha: result.bySourceAlpha,
      nativeOutputRect: result.nativeOutputRect,
      selectedOutsideOutputRectExclusive: result.selectedOutsideOutputRectExclusiveOnDocument,
      decodedNativeASha256: sha256(nativeA),
      decodedNativeCSha256: sha256(nativeC),
      nativeFinalRgba: "not-measured",
      launcherOutcome: outcome,
    },
  };
});

const same = (left, right) => Buffer.from(left).equals(Buffer.from(right));
const equality = (key) => runs.map((left) => runs.map((right) => same(left[key], right[key])));
function difference(left, right) {
  const mask = Uint8Array.from(left, (value, p) => Number(value && !right[p]));
  return { mask, summary: summarize(mask, 640, 480) };
}
const opaque = runs[3],
  aa = runs[4];
const aaOnlyA = difference(aa.nativeA, opaque.nativeA),
  opaqueOnlyA = difference(opaque.nativeA, aa.nativeA);
const aaOnlyC = difference(aa.nativeC, opaque.nativeC),
  opaqueOnlyC = difference(opaque.nativeC, aa.nativeC);
const removedCByAaSourceAlpha = {};
for (let p = 0; p < opaqueOnlyC.mask.length; p++) {
  if (opaqueOnlyC.mask[p]) {
    const alpha = aa.source.data[p * 4 + 3];
    removedCByAaSourceAlpha[alpha] = (removedCByAaSourceAlpha[alpha] ?? 0) + 1;
  }
}
const output = {
  schema: "native-soft-gap10-summary/v1",
  fillSourceSha256,
  sourceManifestSha256: sha256(readFileSync(new URL("manifest.json", import.meta.url))),
  sourceControls:
    "All five exact PNG/RGBA sources match manifest hashes; intended-source correspondence and native UI controls are operator observations retained in context, not a native raw-source export.",
  nativeControls: {
    ...manifest.requiredNativeSettings,
    gap: 10,
    narrowArgument: 1024,
    actualSeedDocument: { x: 319, y: 208 },
  },
  completeBoundariesVerified: 15,
  successfulCalls: 5,
  nativeGap20Captured: false,
  nativeFinalRgbaMeasured: false,
  decodedMaskLayout:
    "640*480 row-major bytes, exactly 0 or 1 per pixel; these are complete native mask domains at zero offset.",
  fixtureOrder: runs.map((r) => r.fixture.id),
  nativeAEqualityMatrix: equality("nativeA"),
  nativeCEqualityMatrix: equality("nativeC"),
  uniformFourNativeAIdentical: runs.slice(0, 4).every((r) => same(r.nativeA, opaque.nativeA)),
  uniformFourNativeCIdentical: runs.slice(0, 4).every((r) => same(r.nativeC, opaque.nativeC)),
  aaVersusOpaque: {
    aaOnlyA: aaOnlyA.summary,
    opaqueOnlyA: opaqueOnlyA.summary,
    aaOnlyC: aaOnlyC.summary,
    opaqueOnlyC: opaqueOnlyC.summary,
    removedCByAaSourceAlpha,
  },
  candidateEvidenceLimit:
    "All four source alpha16 corner pixels are positively present in native C. Zero C bits remain subject to lazy preparation; no complete native alpha/color-margin predicate is inferred.",
  results: runs.map((r) => r.summary),
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error("This fixed evidence verifier takes no arguments");
  const path = new URL("native-g10-summary.json", import.meta.url);
  const bytes = JSON.stringify(output, null, 2) + "\n";
  try {
    writeFileSync(path, bytes, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST" || readFileSync(path, "utf8") !== bytes) throw error;
  }
  process.stdout.write(
    JSON.stringify({
      successfulCalls: output.successfulCalls,
      completeBoundariesVerified: output.completeBoundariesVerified,
      uniformFourNativeAIdentical: output.uniformFourNativeAIdentical,
      uniformFourNativeCIdentical: output.uniformFourNativeCIdentical,
      aaVersusOpaque: output.aaVersusOpaque,
      output: fileURLToPath(path),
    }) + "\n",
  );
}
