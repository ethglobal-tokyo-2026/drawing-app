import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { manifest, sha256, fillSourceSha256, sourceFor } from "./soft_baselines.mjs";

const nativeDirectory = new URL("native-cases/", import.meta.url);
const questions = {
  "soft-axis-gap10-alpha064":
    "Does native classification contain the ten-column opening when black alpha64 is paper under Croquis's alpha<128 rule?",
  "soft-axis-gap10-alpha128":
    "Does native classification agree with the source-alpha boundary at 128, separately from Croquis's edge tuck?",
  "soft-axis-gap10-alpha192":
    "Compare the alpha192 boundary with alpha128 and opaque black, preserving C positives by exact source alpha.",
  "soft-axis-gap10-alpha255":
    "Use the opaque source as the source-geometry control for the partial-alpha comparison.",
  "soft-axis-gap10-aa-outer":
    "Test native candidate preparation on true area-coverage alpha16/64 outer fringe beside an opaque black core.",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(nativeDirectory, { recursive: false });
  const cases = [];
  for (const gap of manifest.comparisonGaps) {
    for (const fixture of manifest.fixtures) {
      sourceFor(fixture);
      const caseId = `${fixture.id}-g${gap}`;
      const metadata = {
        schema: "native-soft-fill-case/v1",
        caseId,
        fixtureId: fixture.id,
        source: fileURLToPath(new URL(fixture.sourcePng, import.meta.url)),
        sourcePngSha256: fixture.sourcePngSha256,
        sourceRgbaSha256: fixture.sourceRgbaSha256,
        documentPixels: [fixture.width, fixture.height],
        intendedSeedDocument: fixture.seed,
        configuredGap: gap,
        gapSelectorLevel: gap === 10 ? 4 : 5,
        requiredNativeSettings: manifest.requiredNativeSettings,
        settingStatus:
          "Intended controls only; retain observed native UI settings and source identity separately before the fill.",
        question: questions[fixture.id],
        seedControl:
          "Prefer the fixture seed [320,230]. If AX center input produces a different seed, retain the native seed and compare with --use-captured-seed explicitly; verify its exact source RGBA and intended main-room position. Never substitute the intended seed for the captured seed.",
        allowedComparisonSeedPolicy:
          "Exact fixture seed by default; honest captured-seed recomputation is permitted only through the explicit comparer option and is recorded in the report.",
        comparison:
          "Native A versus Croquis IN classification and native C positives against exact source RGBA. Croquis TUCKED and final RGBA remain separate; no native final RGBA equivalence is assumed.",
        sourceReset:
          "Open this exact source PNG for a fresh call. Do not fill a previous call's modified layer.",
        probes: fixture.probes,
        probeSourceRgba: fixture.probeSourceRgba,
      };
      const metadataUrl = new URL(`${caseId}-metadata.json`, nativeDirectory);
      writeFileSync(metadataUrl, JSON.stringify(metadata, null, 2) + "\n", { flag: "wx" });
      cases.push({
        priority: cases.length + 1,
        caseId,
        fixtureId: fixture.id,
        gap,
        metadataPath: fileURLToPath(metadataUrl),
        source: metadata.source,
        intendedSeedDocument: fixture.seed,
      });
    }
  }
  const report = {
    schema: "native-soft-fill-matrix/v1",
    fillSourceSha256,
    manifestSha256: sha256(readFileSync(new URL("manifest.json", import.meta.url))),
    priority:
      "First five cases are individual g10 calls. The next five g20 cases are prepared for later verified input controls.",
    cases,
  };
  writeFileSync(new URL("matrix.json", nativeDirectory), JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  process.stdout.write(
    JSON.stringify({
      cases: cases.length,
      directory: fileURLToPath(nativeDirectory),
      g10Metadata: cases.filter((c) => c.gap === 10).map((c) => c.metadataPath),
    }) + "\n",
  );
}
