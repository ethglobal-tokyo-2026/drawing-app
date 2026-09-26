// One-off: makes the WebP files and the foil band's mask for stickers sealed before sealing made them.
// Delete it, and its entry in build.ts, once it has run on the box: every seal since makes its own.
//
// `pnpm --filter @drawing-app/api build` bundles it as dist/backfill-sticker-webp.mjs. Copy that to
// /srv/drawing-api/server/ on the box, where deploy-api.sh has installed sharp, and run it there as the API's
// user, after the deploy that serves the WebP URLs:
//
//   IMAGE_DIR=/srv/drawing-api/images /usr/local/lib/nodejs/node-24/bin/node backfill-sticker-webp.mjs --dry-run
//   IMAGE_DIR=/srv/drawing-api/images /usr/local/lib/nodejs/node-24/bin/node backfill-sticker-webp.mjs
//
// It only adds files, never replaces one, so running it again is safe: a second run finds nothing to make.
import { readdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { missingWebps, writeMissingWebps } from "../src/services/imageStore.ts";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
const dryRun = values["dry-run"];
const imageDir = process.env.IMAGE_DIR;
if (!imageDir) throw new Error("Set IMAGE_DIR to the folder the sticker images are in");

// The sticker PNG is `{contentHash}.png`; its other files have a kind before the extension.
const contentHashes = (await readdir(imageDir))
  .flatMap((name) => /^(0x[0-9a-f]{64})\.png$/.exec(name)?.[1] ?? [])
  .sort();
console.log(
  `${contentHashes.length} stickers in ${imageDir}${dryRun ? "; a dry run, so nothing is written" : ""}`,
);

let lacking = 0;
let failed = 0;
for (const [i, contentHash] of contentHashes.entries()) {
  const at = `${i + 1}/${contentHashes.length} ${contentHash}`;
  try {
    const kinds = dryRun
      ? await missingWebps(imageDir, contentHash)
      : await writeMissingWebps(imageDir, contentHash);
    if (kinds.length > 0) {
      lacking += 1;
      console.log(`${at}: ${dryRun ? "lacks" : "made"} ${kinds.join(", ")}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`${at}: failed`, error);
  }
}
console.log(
  `${lacking} of ${contentHashes.length} stickers ${dryRun ? "lack" : "got"} WebP files; ${failed} failed`,
);
if (failed > 0) process.exitCode = 1;
