import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  findFill,
  writeFill,
  IN,
  TUCKED,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/fill.ts";
import { packMask, summarize } from "./bitmap.mjs";

export const researchDirectory = fileURLToPath(new URL(".", import.meta.url));
export const manifest = JSON.parse(
  readFileSync(new URL("fixtures/manifest.json", import.meta.url), "utf8"),
);
export const fillSourceHash = createHash("sha256")
  .update(
    readFileSync(
      new URL("../../../../../apps/frontend/src/sticker-creation/canvas/fill.ts", import.meta.url),
    ),
  )
  .digest("hex");

export function sourceFor(fixture) {
  const data = gunzipSync(
    readFileSync(new URL(`fixtures/${fixture.sourceRgbaGzip}`, import.meta.url)),
  );
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== fixture.sourceRgbaSha256 || data.length !== fixture.width * fixture.height * 4) {
    throw new Error(`Fixture ${fixture.id} source bytes do not match its manifest`);
  }
  return { width: fixture.width, height: fixture.height, data: new Uint8ClampedArray(data) };
}

export function croquisFill(fixture, gap, seed = fixture.seed) {
  const source = sourceFor(fixture);
  const found = findFill(source, seed.x, seed.y, manifest.comparisonFillRgb, gap);
  if (found === "past") throw new Error("Whole-source fill unexpectedly requested a wider source");
  const selected = new Uint8Array(source.width * source.height);
  const interior = new Uint8Array(selected.length);
  let changed = false;
  if (found) {
    for (let y = 0; y < found.box.h; y++) {
      for (let x = 0; x < found.box.w; x++) {
        const mark = found.marks[y * found.box.w + x];
        const p = (found.box.y + y) * source.width + found.box.x + x;
        selected[p] = Number(mark === IN || mark === TUCKED);
        interior[p] = Number(mark === IN);
      }
    }
    const output = { ...source, data: source.data.slice() };
    changed = writeFill(output, source, found, manifest.comparisonFillRgb);
  }
  return {
    selected,
    interior,
    result: {
      fixtureId: fixture.id,
      gap,
      seed,
      changed,
      paper: found?.paper ?? null,
      foundBox: found?.box ?? null,
      selection: summarize(selected, source.width, source.height, fixture.probes),
      interior: summarize(interior, source.width, source.height, fixture.probes),
      selectedMask: packMask(selected, source.width, source.height),
      interiorMask: packMask(interior, source.width, source.height),
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = manifest.fixtures.flatMap((fixture) =>
    manifest.nativePresetValues.map((gap) => croquisFill(fixture, gap).result),
  );
  const output = {
    schema: "croquis-fill-baselines/v1",
    fillSourceSha256: fillSourceHash,
    nodeVersion: process.version,
    gapUnits: "Raw image pixels passed directly to findFill",
    results,
  };
  const destination = new URL("fixtures/croquis-baselines.json", import.meta.url);
  writeFileSync(destination, JSON.stringify(output, null, 2) + "\n");
  process.stdout.write(
    JSON.stringify({
      baselineCount: results.length,
      output: fileURLToPath(destination),
      fillSourceSha256: fillSourceHash,
    }) + "\n",
  );
}
