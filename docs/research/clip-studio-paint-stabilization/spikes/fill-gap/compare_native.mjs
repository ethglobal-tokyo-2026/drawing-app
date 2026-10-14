import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { croquisFill, fillSourceHash, manifest, sourceFor } from "./croquis-baselines.mjs";
import { encodePng, packMask, reprojectBitmap, summarize } from "./bitmap.mjs";

function integerPair(value, name) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isInteger)) {
    throw new Error(`${name} must contain exactly two integers`);
  }
  return value;
}

function eligibility(source, seed) {
  const at = (seed.y * source.width + seed.x) * 4;
  const rgba = source.data.subarray(at, at + 4);
  const empty = rgba[3] < 128;
  const mask = new Uint8Array(source.width * source.height);
  for (let p = 0; p < mask.length; p++) {
    const q = p * 4;
    mask[p] = Number(
      empty
        ? source.data[q + 3] < 128
        : source.data[q + 3] >= 128 &&
            Math.abs(source.data[q] - rgba[0]) +
              Math.abs(source.data[q + 1] - rgba[1]) +
              Math.abs(source.data[q + 2] - rgba[2]) <
              72,
    );
  }
  return mask;
}

export function compareReturn(record, fixture, { useCapturedSeed = false } = {}) {
  if (record.kind !== "boundary" || record.phase !== "return")
    throw new Error("Expected a return boundary");
  if (record.success !== true) throw new Error(`Native call ${record.callId} did not succeed`);
  const snapshot = record.snapshot;
  if (!snapshot || snapshot.complete !== true || snapshot.errors?.length)
    throw new Error("Final native snapshot is incomplete");
  const header = snapshot.header;
  const offset = integerPair(header.documentOffset, "Document offset");
  const nativeSeed = record.arguments?.seed;
  if (!Number.isInteger(nativeSeed?.x) || !Number.isInteger(nativeSeed?.y))
    throw new Error("Native seed is absent");
  const seed = { x: nativeSeed.x + offset[0], y: nativeSeed.y + offset[1] };
  if (
    record.seedDocument &&
    (record.seedDocument.x !== seed.x || record.seedDocument.y !== seed.y)
  ) {
    throw new Error("Captured document seed contradicts the bitmap seed plus document offset");
  }
  const seedMatches = seed.x === fixture.seed.x && seed.y === fixture.seed.y;
  if (!seedMatches && !useCapturedSeed) {
    throw new Error(
      `Native seed ${seed.x},${seed.y} differs from fixture seed ${fixture.seed.x},${fixture.seed.y}; use --use-captured-seed to compare the actual seed explicitly`,
    );
  }
  if (seed.x < 0 || seed.y < 0 || seed.x >= fixture.width || seed.y >= fixture.height) {
    throw new Error(`Mapped native seed ${seed.x},${seed.y} is outside fixture ${fixture.id}`);
  }
  if (!Number.isInteger(header.gapWidth) || header.gapWidth < 1)
    throw new Error("Native gap width is invalid");
  const native = reprojectBitmap(snapshot.bitmaps.A, fixture.width, fixture.height, offset);
  const outputRectangle = record.outputRect?.values ?? record.outputRect;
  if (
    !Array.isArray(outputRectangle) ||
    outputRectangle.length !== 4 ||
    !outputRectangle.every(Number.isInteger)
  ) {
    throw new Error("Native output rectangle must contain four integers");
  }
  const outsideOutputRect = new Uint8Array(native.mask.length);
  for (let p = 0; p < native.mask.length; p++) {
    const bitmapX = (p % fixture.width) - offset[0];
    const bitmapY = Math.floor(p / fixture.width) - offset[1];
    outsideOutputRect[p] = Number(
      native.mask[p] &&
        (bitmapX < outputRectangle[0] ||
          bitmapY < outputRectangle[1] ||
          bitmapX >= outputRectangle[2] ||
          bitmapY >= outputRectangle[3]),
    );
  }
  const croquis = croquisFill(fixture, header.gapWidth, seed);
  const source = sourceFor(fixture);
  const candidate = eligibility(source, seed);
  const nativeOnly = new Uint8Array(native.mask.length);
  const croquisOnly = new Uint8Array(native.mask.length);
  let both = 0,
    nativeSelectedIneligible = 0,
    croquisSelectedIneligible = 0;
  for (let p = 0; p < native.mask.length; p++) {
    nativeOnly[p] = Number(native.mask[p] && !croquis.interior[p]);
    croquisOnly[p] = Number(croquis.interior[p] && !native.mask[p]);
    if (native.mask[p] && croquis.interior[p]) both++;
    if (native.mask[p] && !candidate[p]) nativeSelectedIneligible++;
    if (croquis.interior[p] && !candidate[p]) croquisSelectedIneligible++;
  }
  let candidateCapture = { state: snapshot.bitmaps.C?.state ?? "absent" };
  if (snapshot.bitmaps.C?.state === "present") {
    const reference = reprojectBitmap(snapshot.bitmaps.C, fixture.width, fixture.height, offset);
    let positiveEligible = 0,
      positiveIneligible = 0,
      eligibleZeroOrOutsideBitmap = 0;
    for (let p = 0; p < candidate.length; p++) {
      if (reference.mask[p]) {
        if (candidate[p]) positiveEligible++;
        else positiveIneligible++;
      } else if (candidate[p]) eligibleZeroOrOutsideBitmap++;
    }
    candidateCapture = {
      state: "present",
      positiveEligible,
      positiveIneligible,
      eligibleZeroOrOutsideBitmap,
      positiveOutsideDocument: reference.selectedOutsideDocument,
      zeroMeaning:
        "C is prepared lazily; an eligible zero can be unprepared and is not a proven rejection.",
    };
  }
  const nativeOnlySummary = summarize(nativeOnly, fixture.width, fixture.height, fixture.probes);
  const croquisOnlySummary = summarize(croquisOnly, fixture.width, fixture.height, fixture.probes);
  const result = {
    callId: record.callId,
    fixtureId: fixture.id,
    sourceRgbaSha256: fixture.sourceRgbaSha256,
    gapWidth: header.gapWidth,
    narrowFlag: record.arguments?.narrowFlag,
    seedMapping: {
      bitmapSeed: nativeSeed,
      documentOffset: offset,
      mappedDocumentSeed: seed,
      fixtureSeed: fixture.seed,
      exactFixtureSeed: seedMatches,
      usedCapturedSeed: !seedMatches && useCapturedSeed,
    },
    domain: header.domain,
    sourceTileOffset: header.sourceTileOffset,
    nativeOutputRect: record.outputRect,
    selectedOutsideOutputRectExclusiveOnDocument: summarize(
      outsideOutputRect,
      fixture.width,
      fixture.height,
    ),
    nativeBitmapDimensions: [native.bitmapWidth, native.bitmapHeight],
    nativeSelectedOutsideDocument: native.selectedOutsideDocument,
    nativeSelection: summarize(native.mask, fixture.width, fixture.height, fixture.probes),
    croquisSelection: croquis.result.interior,
    bothSelected: both,
    classificationDifferences: {
      nativeOnly: nativeOnlySummary,
      croquisOnly: croquisOnlySummary,
      nativeSelectedIneligible,
      croquisSelectedIneligible,
    },
    identicalOnDocument:
      nativeOnlySummary.selectedPixels === 0 && croquisOnlySummary.selectedPixels === 0,
    candidateKnowledge: {
      source: "Exact binary-alpha fixture RGBA, relative to the captured seed",
      nativeC: candidateCapture,
    },
    masks: {
      native: packMask(native.mask, fixture.width, fixture.height),
      croquis: croquis.result.interiorMask,
      nativeOnly: packMask(nativeOnly, fixture.width, fixture.height),
      croquisOnly: packMask(croquisOnly, fixture.width, fixture.height),
    },
  };
  const overlay = Buffer.alloc(fixture.width * fixture.height * 4);
  for (let p = 0; p < native.mask.length; p++) {
    const color = nativeOnly[p]
      ? [235, 70, 65, 255]
      : croquisOnly[p]
        ? [55, 105, 235, 255]
        : native.mask[p]
          ? [110, 205, 145, 255]
          : source.data[p * 4 + 3]
            ? [source.data[p * 4], source.data[p * 4 + 1], source.data[p * 4 + 2], 255]
            : [245, 245, 245, 255];
    overlay.set(color, p * 4);
  }
  return { result, overlay: encodePng(fixture.width, fixture.height, overlay) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumentsByName = {};
  for (let i = 2; i < process.argv.length; i++) {
    const name = process.argv[i];
    if (name === "--use-captured-seed") argumentsByName[name] = true;
    else if (["--capturefile", "--fixture", "--call-id", "--map", "--output"].includes(name)) {
      argumentsByName[name] = process.argv[++i];
    } else throw new Error(`Unknown argument ${name}`);
  }
  if (
    !argumentsByName["--capturefile"] ||
    !argumentsByName["--output"] ||
    (!argumentsByName["--fixture"] && !argumentsByName["--map"])
  ) {
    throw new Error(
      "Required: --capturefile JSONL --fixture ID (or --map JSON) --output report.json",
    );
  }
  const capturePath = resolve(argumentsByName["--capturefile"]);
  const captures = readFileSync(capturePath);
  const records = captures
    .toString("utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const mappings = argumentsByName["--map"]
    ? JSON.parse(readFileSync(argumentsByName["--map"], "utf8"))
    : [];
  const returns = records.filter(
    (record) =>
      record.kind === "boundary" &&
      record.phase === "return" &&
      (!argumentsByName["--call-id"] || record.callId === argumentsByName["--call-id"]),
  );
  if (!returns.length) throw new Error("No matching final return captures");
  const outputPath = resolve(argumentsByName["--output"]);
  mkdirSync(dirname(outputPath), { recursive: true });
  const results = [],
    failures = [];
  for (const record of returns) {
    const fixtureId =
      argumentsByName["--fixture"] ??
      mappings.find((mapping) => mapping.callId === record.callId)?.fixtureId;
    const fixture = manifest.fixtures.find((candidate) => candidate.id === fixtureId);
    try {
      if (!fixture) throw new Error(`No fixture mapping for native call ${record.callId}`);
      const compared = compareReturn(record, fixture, {
        useCapturedSeed: Boolean(argumentsByName["--use-captured-seed"]),
      });
      const imagePath = `${outputPath.slice(0, -5)}-${String(record.callId).replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
      writeFileSync(imagePath, compared.overlay);
      results.push({ ...compared.result, overlayPng: imagePath });
    } catch (error) {
      failures.push({ callId: record.callId, fixtureId, message: error.message });
    }
  }
  const report = {
    schema: "native-croquis-fill-comparison/v1",
    captureFile: capturePath,
    captureSha256: createHash("sha256").update(captures).digest("hex"),
    fillSourceSha256: fillSourceHash,
    comparison:
      "Final native A selection versus Croquis IN classification; visible RGBA and anti-aliasing are outside this comparison.",
    overlayLegend: { red: "Native only", blue: "Croquis only", green: "Both selected" },
    results,
    failures,
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(
    JSON.stringify({
      comparedCalls: results.length,
      rejectedCalls: failures.length,
      differingCalls: results.filter((result) => !result.identicalOnDocument).length,
      output: outputPath,
      failures,
    }) + "\n",
  );
  if (failures.length) process.exitCode = 1;
}
