// One-shot: migration 0014 marks every stored timelapse v2, which records layers, and SQL can't unzip a
// timelapse to convert it, so the staging below converts each v1 one first. Delete the staging, its call
// in migrate.ts and its tests once every database with stickers, the box's and each dev's, has applied
// 0014; delete timelapseV1ToV2 with sealing's v1 bridge, once the server log shows no
// sticker.timelapse.v1_converted. Run alone, it's a dry run that lists what it would convert:
//   node packages/db/src/timelapseV2.ts <database path>
import { closeSync, fsyncSync, openSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import Database from "better-sqlite3";

/** The one layer a v1 timelapse was drawn on. */
const V1_LAYER = 1;
/** v2's layers for it: number, opacity, locked, clipped. */
const V1_LAYERS = [[V1_LAYER, 100, false, false]];
/** Numbers per point in a stroke's points: x, y, width and ms. */
const POINT_NUMBERS = 4;

type Check = (value: unknown) => boolean;
const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);
const isNumber: Check = (value) => typeof value === "number";
const isString: Check = (value) => typeof value === "string";
const isPoints: Check = (value) =>
  isList(value) && value.length % POINT_NUMBERS === 0 && value.every(isNumber);
/** Whether `values` are one each of `checks`, in order. */
const fits = (values: readonly unknown[], checks: readonly Check[]) =>
  values.length === checks.length && checks.every((check, at) => check(values[at]));
const isNumbers = (value: unknown, length: number) =>
  isList(value) &&
  fits(
    value,
    Array.from({ length }, () => isNumber),
  );

/** A v1 op's values after its tool: a stroke's color, ms and points; a fill's color, ms, tap and gap. */
const STROKE = [isString, isNumber, isPoints];
const FILL = [isString, isNumber, isNumber, isNumber, isNumber];

/** A v1 op as v2 records it: its layer after its tool, and a fill's gap always. */
function opToV2(op: unknown, at: number): unknown[] {
  const [tool, ...values] = isList(op) ? op : [];
  if ((tool === "brush" || tool === "eraser") && fits(values, STROKE)) {
    return [tool, V1_LAYER, ...values];
  }
  if (tool === "fill" && fits(values, FILL)) return [tool, V1_LAYER, ...values];
  // A fill sealed before fills recorded their gap closed none.
  if (tool === "fill" && fits(values, FILL.slice(0, -1))) return [tool, V1_LAYER, ...values, 0];
  throw new Error(
    `ops[${at}] isn't a v1 brush or eraser [tool, color, ms, points] or fill [tool, color, ms, x, y, gap?]`,
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A v1 timelapse's JSON as v2: one layer, number 1, which every op is on. Throws, naming what's
 * wrong, when `json` isn't v1.
 */
export function timelapseV1ToV2(json: unknown): unknown {
  if (!isRecord(json)) throw new Error("a v1 timelapse is a JSON object");
  const { v, ink, place, density, ops } = json;
  if (v !== 1) throw new Error(`its v is ${JSON.stringify(v)}, not 1`);
  if (!isNumbers(ink, 2)) throw new Error("its ink isn't [width, height]");
  if (!isNumbers(place, 4)) throw new Error("its place isn't [x, y, width, height]");
  if (!isNumber(density)) throw new Error("its density isn't a number");
  if (!isList(ops)) throw new Error("its ops aren't a list");
  return { v: 2, ink, place, density, layers: V1_LAYERS, ops: ops.map(opToV2) };
}

/** Whether sticker_timelapses predates its format column. */
export function needsTimelapsesV2(sqlite: Database.Database): boolean {
  const columns = sqlite
    .prepare<[], { name: string }>("select name from pragma_table_info('sticker_timelapses')")
    .all();
  return columns.length > 0 && !columns.some((column) => column.name === "format");
}

/** A stored v1 timelapse and what replaces it. */
interface Conversion {
  stickerId: string;
  v1: Buffer;
  v2: Buffer;
}

/** Writes `text` to a new file at `path`, on disk before it returns. */
function writeDurably(path: string, text: string): void {
  const file = openSync(path, "w");
  try {
    writeSync(file, text);
    fsyncSync(file);
  } finally {
    closeSync(file);
  }
}

/**
 * Converts every stored v1 timelapse to v2, re-gzipped, before adding its format; a v2 one stays as it
 * is. With `write`, it first backs each v1 one up as stored, one `{ stickerId, gzipBase64 }` per
 * line of `timelapses-v1-<date>.jsonl` beside the database, then converts them in one transaction.
 * Throws, changing nothing, when a timelapse is neither v1 nor v2, naming each such sticker.
 */
export function stageTimelapsesV2(
  sqlite: Database.Database,
  { write }: { write: boolean },
  log: (line: string) => void = console.log,
): Conversion[] {
  const rows = sqlite
    .prepare<[], { stickerId: string; number: number | null; ops: Buffer }>(
      "select t.sticker_id as stickerId, s.number, t.ops from sticker_timelapses t left join stickers s on s.id = t.sticker_id order by s.number, t.sticker_id",
    )
    .all();
  log(`Reading ${rows.length} timelapses for v2, which records layers`);
  const conversions: Conversion[] = [];
  const unreadable: string[] = [];
  for (const { stickerId, number, ops } of rows) {
    const sticker = number === null ? stickerId : `No.${number} ${stickerId}`;
    try {
      const json: unknown = JSON.parse(gunzipSync(ops).toString());
      if (isRecord(json) && json.v === 2) continue;
      conversions.push({ stickerId, v1: ops, v2: gzipSync(JSON.stringify(timelapseV1ToV2(json))) });
      log(`${sticker}: v1, to become v2`);
    } catch (error) {
      unreadable.push(`${sticker} (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  if (unreadable.length > 0) {
    throw new Error(
      `${unreadable.length} stored timelapse(s) are neither v1 nor v2, so sticker_timelapses can't be marked v2: ${unreadable.join("; ")}. Delete those timelapse rows and start again.`,
    );
  }
  log(`${conversions.length} v1 timelapses of ${rows.length}; the rest are v2 already`);
  if (!write) {
    log("Dry run: nothing written");
    return conversions;
  }
  if (conversions.length === 0) return conversions;
  const backup = join(
    dirname(sqlite.name),
    `timelapses-v1-${new Date().toISOString().slice(0, 10)}.jsonl`,
  );
  writeDurably(
    backup,
    conversions
      .map(
        ({ stickerId, v1 }) =>
          `${JSON.stringify({ stickerId, gzipBase64: v1.toString("base64") })}\n`,
      )
      .join(""),
  );
  log(`Backed up the ${conversions.length} v1 timelapses, as stored, to ${backup}`);
  const update = sqlite.prepare("update sticker_timelapses set ops = ? where sticker_id = ?");
  sqlite.transaction(() => {
    for (const { stickerId, v2 } of conversions) update.run(v2, stickerId);
  })();
  log(`Converted ${conversions.length} timelapses to v2`);
  return conversions;
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("Usage: node packages/db/src/timelapseV2.ts <database path>");
    process.exit(1);
  }
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  try {
    if (needsTimelapsesV2(sqlite)) stageTimelapsesV2(sqlite, { write: false });
    else console.log(`${path} has no timelapses from before migration 0014`);
  } finally {
    sqlite.close();
  }
}
