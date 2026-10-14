import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  findFill,
  writeFill,
  IN,
  TUCKED,
} from "../../../../../../apps/frontend/src/sticker-creation/canvas/fill.ts";
import { encodePng, packMask, summarize } from "../bitmap.mjs";

export const manifest = JSON.parse(readFileSync(new URL("manifest.json", import.meta.url), "utf8"));
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const fillSourceSha256 = sha256(
  readFileSync(
    new URL("../../../../../../apps/frontend/src/sticker-creation/canvas/fill.ts", import.meta.url),
  ),
);

export function sourceFor(fixture) {
  const png = readFileSync(new URL(fixture.sourcePng, import.meta.url));
  const data = gunzipSync(readFileSync(new URL(fixture.sourceRgbaGzip, import.meta.url)));
  if (
    sha256(png) !== fixture.sourcePngSha256 ||
    sha256(data) !== fixture.sourceRgbaSha256 ||
    data.length !== fixture.width * fixture.height * 4
  )
    throw new Error(`Source bytes differ from manifest for ${fixture.id}`);
  return { width: fixture.width, height: fixture.height, data: new Uint8ClampedArray(data) };
}

export function eligibility(source, seed) {
  const rgba = source.data.subarray(
    (seed.y * source.width + seed.x) * 4,
    (seed.y * source.width + seed.x) * 4 + 4,
  );
  const paper = rgba[3] < 128;
  const mask = new Uint8Array(source.width * source.height);
  for (let p = 0; p < mask.length; p++) {
    const q = p * 4;
    mask[p] = Number(
      paper
        ? source.data[q + 3] < 128
        : source.data[q + 3] >= 128 &&
            Math.abs(source.data[q] - rgba[0]) +
              Math.abs(source.data[q + 1] - rgba[1]) +
              Math.abs(source.data[q + 2] - rgba[2]) <
              72,
    );
  }
  return {
    mask,
    seedRgba: [...rgba],
    paper,
    rule: paper
      ? "Croquis paper candidates: alpha<128, irrespective of RGB"
      : "Croquis recolor candidates: alpha>=128 and summed RGB distance<72",
  };
}

export function croquisFill(fixture, gap, seed = fixture.seed) {
  const source = sourceFor(fixture);
  const found = findFill(source, seed.x, seed.y, manifest.comparisonFillRgb, gap);
  if (found === "past") throw new Error("Whole-source fill unexpectedly requested more pixels");
  const interior = new Uint8Array(source.width * source.height);
  const tucked = new Uint8Array(interior.length);
  const marked = new Uint8Array(interior.length);
  const output = { ...source, data: source.data.slice() };
  const marks = new Uint8Array(interior.length);
  if (found) {
    for (let y = 0; y < found.box.h; y++) {
      for (let x = 0; x < found.box.w; x++) {
        const p = (found.box.y + y) * source.width + found.box.x + x;
        const mark = found.marks[y * found.box.w + x];
        marks[p] = mark;
        interior[p] = Number(mark === IN);
        tucked[p] = Number(mark === TUCKED);
        marked[p] = Number(mark === IN || mark === TUCKED);
      }
    }
  }
  const wrote = found ? writeFill(output, source, found, manifest.comparisonFillRgb) : false;
  const changed = new Uint8Array(interior.length);
  const bySourceAlpha = {};
  for (let p = 0; p < interior.length; p++) {
    const at = p * 4,
      alpha = source.data[at + 3];
    changed[p] = Number(
      [0, 1, 2, 3].some((channel) => source.data[at + channel] !== output.data[at + channel]),
    );
    const entry = (bySourceAlpha[alpha] ??= {
      sourcePixels: 0,
      interior: 0,
      tucked: 0,
      changed: 0,
    });
    entry.sourcePixels++;
    entry.interior += interior[p];
    entry.tucked += tucked[p];
    entry.changed += changed[p];
  }
  const probes = Object.fromEntries(
    Object.entries(fixture.probes).map(([name, [x, y]]) => {
      const p = y * source.width + x;
      return [
        name,
        {
          x,
          y,
          sourceRgba: [...source.data.subarray(p * 4, p * 4 + 4)],
          mark: marks[p],
          outputRgba: [...output.data.subarray(p * 4, p * 4 + 4)],
        },
      ];
    }),
  );
  const candidate = eligibility(source, seed);
  const result = {
    fixtureId: fixture.id,
    sourceRgbaSha256: fixture.sourceRgbaSha256,
    gap,
    seed,
    changed: wrote,
    paper: found?.paper ?? null,
    foundBox: found?.box ?? null,
    candidateRule: candidate.rule,
    seedRgba: candidate.seedRgba,
    interior: summarize(interior, source.width, source.height, fixture.probes),
    tucked: summarize(tucked, source.width, source.height, fixture.probes),
    marked: summarize(marked, source.width, source.height, fixture.probes),
    changedPixels: summarize(changed, source.width, source.height, fixture.probes),
    bySourceAlpha,
    probes,
    finalRgbaSha256: sha256(output.data),
    masks: {
      interior: packMask(interior, source.width, source.height),
      tucked: packMask(tucked, source.width, source.height),
      marked: packMask(marked, source.width, source.height),
      changed: packMask(changed, source.width, source.height),
    },
  };
  return { source, output, interior, tucked, marked, marks, result };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const destination = new URL("croquis-results/", import.meta.url);
  mkdirSync(destination, { recursive: true });
  const results = manifest.fixtures.flatMap((fixture) =>
    manifest.comparisonGaps.map((gap) => {
      const run = croquisFill(fixture, gap);
      const name = `${fixture.id}-g${gap}`;
      const artifacts = {
        finalPng: `croquis-results/${name}-final.png`,
        finalRgbaGzip: `croquis-results/${name}-final.rgba.gz`,
        marksGzip: `croquis-results/${name}-marks.gz`,
      };
      const outputs = [
        [artifacts.finalPng, encodePng(fixture.width, fixture.height, run.output.data)],
        [artifacts.finalRgbaGzip, gzipSync(run.output.data, { level: 9 })],
        [artifacts.marksGzip, gzipSync(run.marks, { level: 9 })],
      ];
      for (const [path, data] of outputs)
        writeFileSync(new URL(path, import.meta.url), data, { flag: "wx" });
      return { ...run.result, artifacts };
    }),
  );
  const report = {
    schema: "croquis-soft-fill-baselines/v1",
    fillSourceSha256,
    nodeVersion: process.version,
    classification:
      "Croquis IN and TUCKED are kept separately; final RGBA is from writeFill on the same source layer.",
    results,
  };
  writeFileSync(
    new URL("croquis-baselines.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
    { flag: "wx" },
  );
  process.stdout.write(
    JSON.stringify({
      baselineCount: results.length,
      fillSourceSha256,
      measurements: results.map((r) => ({
        fixture: r.fixtureId,
        gap: r.gap,
        interior: r.interior.selectedPixels,
        tucked: r.tucked.selectedPixels,
        outside: r.interior.probes.outside.selected,
        bySourceAlpha: r.bySourceAlpha,
      })),
    }) + "\n",
  );
}
