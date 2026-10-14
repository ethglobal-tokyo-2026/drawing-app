import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fillSourceHash, manifest, researchDirectory, sourceFor } from "./croquis-baselines.mjs";

const cases = [
  ["edge-gap-2", 10, "Compare the physical-canvas edge case before the large-gap branch."],
  [
    "edge-gap-2",
    20,
    "Determine whether native A leaks when Croquis selects the complete exterior at gap 20.",
  ],
  ["axis-gap-10", 10, "Test an opening equal to the configured ten-pixel gap."],
  ["axis-gap-20", 10, "Use a twenty-column opening as a wide-opening control at gap 10."],
  ["axis-gap-20", 20, "Test an opening equal to the configured twenty-pixel gap."],
  ["axis-gap-21", 20, "Test the first opening wider than the twenty-pixel gap."],
  [
    "narrow-pocket",
    10,
    "Test whether the existing roughly 500-pixel pocket is recovered at an 800-pixel limit.",
  ],
  ["narrow-pocket", 20, "Compare pocket recovery with Croquis's changed classification at gap 20."],
  [
    "axis-near-line",
    10,
    "Test the seed exemption with the intended seed adjacent to the upper outline.",
  ],
  [
    "axis-near-line",
    20,
    "Test the same near-line seed in the native branch for gaps greater than 10.",
  ],
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (name) => resolve(researchDirectory, name);
const baselinesPath = relative("fixtures/croquis-baselines.json");
const baselinesBytes = readFileSync(baselinesPath);
const baselines = JSON.parse(baselinesBytes);
if (baselines.fillSourceSha256 !== fillSourceHash) {
  throw new Error("Recorded Croquis baselines do not match the current fill implementation");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3)
    throw new Error("Usage: node prepare_larger_gap_matrix.mjs NEW_OUTPUT_DIRECTORY");
  const outputDirectory = resolve(process.argv[2]);
  const sourceControls = manifest.fixtures.map((fixture) => {
    const pngPath = relative(`fixtures/${fixture.sourcePng}`);
    const rgbaGzipPath = relative(`fixtures/${fixture.sourceRgbaGzip}`);
    const pngBytes = readFileSync(pngPath);
    if (sha256(pngBytes) !== fixture.sourcePngSha256)
      throw new Error(`PNG hash mismatch for ${fixture.id}`);
    const source = sourceFor(fixture);
    return {
      fixtureId: fixture.id,
      pngPath,
      rgbaGzipPath,
      sourcePngSha256: sha256(pngBytes),
      sourceRgbaGzipSha256: sha256(readFileSync(rgbaGzipPath)),
      sourceRgbaSha256: sha256(source.data),
    };
  });
  const matrix = cases.map(([fixtureId, gap, question], index) => {
    const fixture = manifest.fixtures.find((f) => f.id === fixtureId);
    const baseline = baselines.results.find(
      (result) => result.fixtureId === fixtureId && result.gap === gap,
    );
    if (!baseline)
      throw new Error(`Missing recorded Croquis baseline for ${fixtureId} at gap ${gap}`);
    const source = sourceFor(fixture);
    const at = (fixture.seed.y * fixture.width + fixture.seed.x) * 4;
    if (source.data[at + 3] !== 0)
      throw new Error(`Intended seed is not transparent for ${fixtureId}`);
    const indicator = manifest.nativePresetValues.indexOf(gap) + 1;
    const caseId = `${fixtureId}-level${indicator}-larger-gap`;
    const metadataPath = resolve(outputDirectory, `${caseId}-metadata.json`);
    const metadata = {
      fixtureId,
      caseId,
      source: relative(`fixtures/${fixture.sourcePng}`),
      sourcePngSha256: fixture.sourcePngSha256,
      sourceRgbaSha256: fixture.sourceRgbaSha256,
      documentPixels: [fixture.width, fixture.height],
      intendedSeedDocument: fixture.seed,
      gapSelectorLevel: indicator,
      configuredGap: gap,
      question,
      settingStatus:
        "Intended capture settings; confirm the native gap and actual seed from each boundary record.",
      requiredNativeSettings: {
        reference: "Refer only to editing layer",
        multipleReference: false,
        areaScaling: false,
        colorMargin: 10,
        antialiasing: true,
        fillNarrowAreas: true,
        paint: "#ff0000",
      },
      seedControl:
        fixtureId === "axis-near-line"
          ? "The native seed must be adjacent to the upper outline; an ordinary interior seed does not test the near-line condition."
          : "The captured seed must be a transparent source pixel in the intended main room. Use the captured seed explicitly when it differs from the fixture seed.",
      comparison:
        "Final A classification only; visible RGBA and the native returned rectangle are separate measurements.",
      recoveredOmittedComponentLimit: 8 * gap * gap,
    };
    return {
      priority: index + 1,
      caseId,
      fixtureId,
      gap,
      gapSelectorLevel: indicator,
      metadataPath,
      question,
      intendedSeedDocument: fixture.seed,
      probes: fixture.probes,
      recordedCroquisAtFixtureSeed: baseline.interior,
      metadata,
    };
  });
  // This directory must be new so existing source inputs and reports cannot be replaced.
  mkdirSync(outputDirectory, { recursive: false });
  for (const item of matrix) {
    writeFileSync(item.metadataPath, JSON.stringify(item.metadata, null, 2) + "\n", { flag: "wx" });
    delete item.metadata;
  }
  const controls = {
    schema: "larger-gap-source-controls/v1",
    sourceControls,
    manifestPath: relative("fixtures/manifest.json"),
    manifestSha256: sha256(readFileSync(relative("fixtures/manifest.json"))),
    baselinesPath,
    baselinesSha256: sha256(baselinesBytes),
    fillSourceSha256: fillSourceHash,
    guarantee:
      "Preparation only read original inputs; all generated files were created exclusively in a new directory.",
  };
  writeFileSync(
    resolve(outputDirectory, "source-controls.json"),
    JSON.stringify(controls, null, 2) + "\n",
    { flag: "wx" },
  );
  writeFileSync(
    resolve(outputDirectory, "matrix.json"),
    JSON.stringify({ schema: "larger-gap-matrix/v1", cases: matrix }, null, 2) + "\n",
    { flag: "wx" },
  );
  process.stdout.write(
    JSON.stringify({
      outputDirectory,
      cases: matrix.length,
      unchangedSourceFixtures: sourceControls.length,
    }) + "\n",
  );
}
