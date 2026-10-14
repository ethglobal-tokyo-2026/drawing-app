import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  croquisFill,
  eligibility,
  fillSourceSha256,
  manifest,
  sha256,
  sourceFor,
} from "./soft_baselines.mjs";
import { encodePng, packMask, reprojectBitmap, summarize } from "../bitmap.mjs";

function integerArray(value, count, name) {
  if (!Array.isArray(value) || value.length !== count || !value.every(Number.isInteger)) {
    throw new Error(`${name} must contain exactly ${count} integers`);
  }
  return value;
}

export function compareSoftReturn(record, fixture, { useCapturedSeed = false } = {}) {
  if (record.kind !== "boundary" || record.phase !== "return")
    throw new Error("Expected a return boundary");
  if (record.success !== true) throw new Error(`Native call ${record.callId} did not succeed`);
  const snapshot = record.snapshot;
  if (!snapshot || snapshot.complete !== true || snapshot.errors?.length)
    throw new Error("Final native snapshot is incomplete");
  const header = snapshot.header;
  const offset = integerArray(header.documentOffset, 2, "Document offset");
  const nativeSeed = record.arguments?.seed;
  if (!Number.isInteger(nativeSeed?.x) || !Number.isInteger(nativeSeed?.y))
    throw new Error("Native seed is absent");
  const seed = { x: nativeSeed.x + offset[0], y: nativeSeed.y + offset[1] };
  if (
    record.seedDocument &&
    (record.seedDocument.x !== seed.x || record.seedDocument.y !== seed.y)
  ) {
    throw new Error("Captured document seed contradicts bitmap seed plus document offset");
  }
  const seedMatches = seed.x === fixture.seed.x && seed.y === fixture.seed.y;
  if (!seedMatches && !useCapturedSeed)
    throw new Error(
      `Native seed ${seed.x},${seed.y} differs from fixture seed; use --use-captured-seed explicitly`,
    );
  if (seed.x < 0 || seed.y < 0 || seed.x >= fixture.width || seed.y >= fixture.height)
    throw new Error("Mapped native seed is outside fixture");
  if (!Number.isInteger(header.gapWidth) || header.gapWidth < 1)
    throw new Error("Native gap width is invalid");
  const outputRect = integerArray(
    record.outputRect?.values ?? record.outputRect,
    4,
    "Native output rectangle",
  );
  if (outputRect[0] > outputRect[2] || outputRect[1] > outputRect[3])
    throw new Error("Native output rectangle has reversed bounds");
  const native = reprojectBitmap(snapshot.bitmaps.A, fixture.width, fixture.height, offset);
  const c =
    snapshot.bitmaps.C?.state === "present"
      ? reprojectBitmap(snapshot.bitmaps.C, fixture.width, fixture.height, offset)
      : null;
  const source = sourceFor(fixture);
  const candidate = eligibility(source, seed);
  const croquis = croquisFill(fixture, header.gapWidth, seed);
  const nativeOnly = new Uint8Array(native.mask.length),
    croquisOnly = new Uint8Array(native.mask.length);
  const outsideOutput = new Uint8Array(native.mask.length);
  const bySourceRgba = {},
    bySourceAlpha = {};
  let both = 0,
    nativeSelectedOutsideCroquisCandidate = 0,
    croquisSelectedOutsideCroquisCandidate = 0;
  for (let p = 0; p < native.mask.length; p++) {
    const x = p % fixture.width,
      y = Math.floor(p / fixture.width),
      at = p * 4;
    const rgba = [...source.data.subarray(at, at + 4)],
      alpha = rgba[3];
    const rgbaKey = rgba.join(",");
    const entry = (bySourceRgba[rgbaKey] ??= {
      sourceRgba: rgba,
      sourcePixels: 0,
      croquisCandidate: 0,
      nativeA: 0,
      croquisIN: 0,
      croquisTUCKED: 0,
      nativeOnly: 0,
      croquisOnly: 0,
      nativeCPositive: 0,
      nativeCZeroInBitmap: 0,
      sourceOutsideCBitmap: 0,
    });
    const alphaEntry = (bySourceAlpha[alpha] ??= {
      sourcePixels: 0,
      nativeA: 0,
      croquisIN: 0,
      croquisTUCKED: 0,
      nativeOnly: 0,
      croquisOnly: 0,
      nativeCPositive: 0,
      nativeCZeroInBitmap: 0,
      sourceOutsideCBitmap: 0,
    });
    nativeOnly[p] = Number(native.mask[p] && !croquis.interior[p]);
    croquisOnly[p] = Number(croquis.interior[p] && !native.mask[p]);
    outsideOutput[p] = Number(
      native.mask[p] &&
        (x - offset[0] < outputRect[0] ||
          y - offset[1] < outputRect[1] ||
          x - offset[0] >= outputRect[2] ||
          y - offset[1] >= outputRect[3]),
    );
    both += Number(native.mask[p] && croquis.interior[p]);
    nativeSelectedOutsideCroquisCandidate += Number(native.mask[p] && !candidate.mask[p]);
    croquisSelectedOutsideCroquisCandidate += Number(croquis.interior[p] && !candidate.mask[p]);
    for (const group of [entry, alphaEntry]) {
      group.sourcePixels++;
      group.nativeA += native.mask[p];
      group.croquisIN += croquis.interior[p];
      group.croquisTUCKED += croquis.tucked[p];
      group.nativeOnly += nativeOnly[p];
      group.croquisOnly += croquisOnly[p];
      if (c) {
        if (c.mask[p]) group.nativeCPositive++;
        else if (
          x - offset[0] >= 0 &&
          x - offset[0] < c.bitmapWidth &&
          y - offset[1] >= 0 &&
          y - offset[1] < c.bitmapHeight
        )
          group.nativeCZeroInBitmap++;
        else group.sourceOutsideCBitmap++;
      }
    }
    entry.croquisCandidate += candidate.mask[p];
  }
  const nativeOnlySummary = summarize(nativeOnly, fixture.width, fixture.height, fixture.probes);
  const croquisOnlySummary = summarize(croquisOnly, fixture.width, fixture.height, fixture.probes);
  const probes = Object.fromEntries(
    Object.entries(fixture.probes).map(([name, [x, y]]) => {
      const p = y * fixture.width + x;
      return [
        name,
        {
          x,
          y,
          sourceRgba: [...source.data.subarray(p * 4, p * 4 + 4)],
          croquisCandidate: Boolean(candidate.mask[p]),
          nativeA: Boolean(native.mask[p]),
          croquisIN: Boolean(croquis.interior[p]),
          croquisTUCKED: Boolean(croquis.tucked[p]),
          nativeCPositive: c ? Boolean(c.mask[p]) : null,
          croquisFinalRgba: [...croquis.output.data.subarray(p * 4, p * 4 + 4)],
        },
      ];
    }),
  );
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
    sourceSeedRgba: candidate.seedRgba,
    nativeBitmapDimensions: [native.bitmapWidth, native.bitmapHeight],
    domain: header.domain,
    sourceTileOffset: header.sourceTileOffset,
    nativeOutputRect: record.outputRect,
    nativeSelectedOutsideDocument: native.selectedOutsideDocument,
    selectedOutsideOutputRectExclusiveOnDocument: summarize(
      outsideOutput,
      fixture.width,
      fixture.height,
    ),
    nativeSelection: summarize(native.mask, fixture.width, fixture.height, fixture.probes),
    croquisSelection: croquis.result.interior,
    croquisTuck: croquis.result.tucked,
    bothSelected: both,
    classificationDifferences: {
      nativeOnly: nativeOnlySummary,
      croquisOnly: croquisOnlySummary,
      nativeSelectedOutsideCroquisCandidate,
      croquisSelectedOutsideCroquisCandidate,
    },
    identicalOnDocument:
      nativeOnlySummary.selectedPixels === 0 && croquisOnlySummary.selectedPixels === 0,
    candidateKnowledge: {
      source: "Exact nonbinary RGBA fixture at the mapped document seed",
      ruleReference: candidate.rule,
      nativeRuleAssumed: false,
      nativeC: {
        state: snapshot.bitmaps.C?.state ?? "absent",
        positiveOutsideDocument: c?.selectedOutsideDocument ?? null,
        bitmapDimensions: c ? [c.bitmapWidth, c.bitmapHeight] : null,
        zeroMeaning:
          "C is prepared lazily; a zero does not establish native candidate rejection. Pixels outside C are counted separately.",
      },
    },
    bySourceRgba,
    bySourceAlpha,
    probes,
    finalRgbaComparison: {
      state: "not-measured",
      nativeFinalRgbaAvailable: false,
      croquisFinalRgbaSha256: croquis.result.finalRgbaSha256,
      reason:
        "A and C are classification bitmaps. No native final layer RGBA was captured by this observer.",
    },
    masks: {
      native: packMask(native.mask, fixture.width, fixture.height),
      croquisIN: croquis.result.masks.interior,
      croquisTUCKED: croquis.result.masks.tucked,
      nativeOnly: packMask(nativeOnly, fixture.width, fixture.height),
      croquisOnly: packMask(croquisOnly, fixture.width, fixture.height),
      nativeC: c ? packMask(c.mask, fixture.width, fixture.height) : null,
    },
  };
  const overlay = Buffer.alloc(fixture.width * fixture.height * 4);
  for (let p = 0; p < native.mask.length; p++) {
    const alpha = source.data[p * 4 + 3] / 255;
    const color = nativeOnly[p]
      ? [235, 70, 65, 255]
      : croquisOnly[p]
        ? [55, 105, 235, 255]
        : native.mask[p]
          ? [110, 205, 145, 255]
          : [0, 1, 2]
              .map((k) => Math.round(source.data[p * 4 + k] * alpha + 245 * (1 - alpha)))
              .concat(255);
    overlay.set(color, p * 4);
  }
  return { result, overlay: encodePng(fixture.width, fixture.height, overlay) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const name = process.argv[i];
    if (name === "--use-captured-seed") args[name] = true;
    else if (
      ["--capturefile", "--fixture", "--call-id", "--map", "--output", "--context"].includes(name)
    )
      args[name] = process.argv[++i];
    else throw new Error(`Unknown argument ${name}`);
  }
  if (!args["--capturefile"] || !args["--output"] || (!args["--fixture"] && !args["--map"])) {
    throw new Error(
      "Required: --capturefile JSONL --fixture ID (or --map JSON) --output report.json",
    );
  }
  const capturePath = resolve(args["--capturefile"]),
    bytes = readFileSync(capturePath);
  const records = bytes
    .toString("utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const mappings = args["--map"] ? JSON.parse(readFileSync(args["--map"], "utf8")) : [];
  const returns = records.filter(
    (r) =>
      r.kind === "boundary" &&
      r.phase === "return" &&
      (!args["--call-id"] || r.callId === args["--call-id"]),
  );
  if (!returns.length) throw new Error("No matching final return captures");
  const outputPath = resolve(args["--output"]);
  mkdirSync(dirname(outputPath), { recursive: true });
  const results = [],
    failures = [];
  for (const record of returns) {
    const fixtureId =
      args["--fixture"] ?? mappings.find((m) => m.callId === record.callId)?.fixtureId;
    try {
      const fixture = manifest.fixtures.find((f) => f.id === fixtureId);
      if (!fixture) throw new Error(`No fixture mapping for native call ${record.callId}`);
      const compared = compareSoftReturn(record, fixture, {
        useCapturedSeed: Boolean(args["--use-captured-seed"]),
      });
      const overlayPng = `${outputPath.replace(/\.json$/, "")}-${String(record.callId).replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
      writeFileSync(overlayPng, compared.overlay, { flag: "wx" });
      results.push({ ...compared.result, overlayPng });
    } catch (error) {
      failures.push({ callId: record.callId, fixtureId, message: error.message });
    }
  }
  const contextBytes = args["--context"] ? readFileSync(args["--context"]) : null;
  const report = {
    schema: "native-croquis-soft-fill-comparison/v1",
    captureFile: capturePath,
    captureSha256: sha256(bytes),
    fillSourceSha256,
    comparison:
      "Final native A versus Croquis IN; C positives grouped against exact source RGBA. TUCKED and final rendering are separate.",
    requiredNativeSettings: manifest.requiredNativeSettings,
    context: contextBytes
      ? {
          path: resolve(args["--context"]),
          sha256: sha256(contextBytes),
          data: JSON.parse(contextBytes),
        }
      : null,
    settingEvidence:
      "The boundary confirms gap/seed/narrow argument. Reference, color margin, antialiasing, and area scaling need retained UI context; required settings alone are not confirmation.",
    overlayLegend: { red: "Native only", blue: "Croquis only", green: "Both selected" },
    results,
    failures,
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  process.stdout.write(
    JSON.stringify({
      comparedCalls: results.length,
      rejectedCalls: failures.length,
      differingCalls: results.filter((r) => !r.identicalOnDocument).length,
      output: outputPath,
      failures,
    }) + "\n",
  );
  if (failures.length) process.exitCode = 1;
}
