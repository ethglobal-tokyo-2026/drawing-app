// One-shot: the migration that adds stickers.drawn_width and drawn_height reads each sticker's drawn
// size from its timelapse, which SQL can't unzip, so this stages them for it first. Delete this file and
// its call in migrate.ts once every database with stickers, the box's and each dev's, has applied it.
// Run alone, it's a dry run that lists what the migration will record and any sticker that blocks it:
//   node packages/db/src/drawnSizes.ts <database path>
import { gunzipSync } from "node:zlib";
import Database from "better-sqlite3";

/** A sticker's drawn size in sheet units: the image's rect on the sheet, the timelapse's `place`. */
export interface DrawnSize {
  width: number;
  height: number;
}

/** The drawn size a gzipped timelapse records. Throws when it records none. */
export function drawnSizeOf(gzippedTimelapse: Uint8Array): DrawnSize {
  const json: unknown = JSON.parse(gunzipSync(gzippedTimelapse).toString());
  const place: unknown =
    typeof json === "object" && json !== null && "place" in json ? json.place : null;
  const sides: unknown[] = Array.isArray(place) ? place.slice(2, 4) : [];
  const [width, height] = sides;
  if (typeof width !== "number" || typeof height !== "number" || !(width > 0 && height > 0)) {
    throw new Error(`its timelapse's place is ${JSON.stringify(place)}, not [x, y, w, h]`);
  }
  return { width, height };
}

/** Whether the database holds stickers from before their drawn size was recorded. */
export function needsDrawnSizes(sqlite: Database.Database): boolean {
  const columns = sqlite
    .prepare<[], { name: string }>("select name from pragma_table_info('stickers')")
    .all();
  return columns.length > 0 && !columns.some((column) => column.name === "drawn_width");
}

/**
 * Reads every sticker's drawn size from its timelapse and, with `write`, stages it in
 * sticker_drawn_sizes, which the migration copies onto the stickers and drops. Throws, writing
 * nothing, when a sticker's timelapse is missing or records no place, naming each such sticker.
 */
export function stageDrawnSizes(
  sqlite: Database.Database,
  { write }: { write: boolean },
  log: (line: string) => void = console.log,
): (DrawnSize & { id: string })[] {
  const rows = sqlite
    .prepare<[], { id: string; number: number; ops: Uint8Array | null }>(
      "select s.id, s.number, t.ops from stickers s left join sticker_timelapses t on t.sticker_id = s.id order by s.number",
    )
    .all();
  log(`Reading the drawn size of ${rows.length} stickers from their timelapses`);
  const sized: (DrawnSize & { id: string })[] = [];
  const unknown: string[] = [];
  for (const { id, number, ops } of rows) {
    try {
      if (!ops) throw new Error("it has no timelapse");
      const size = drawnSizeOf(ops);
      sized.push({ id, ...size });
      log(`No.${number} ${id}: ${size.width} × ${size.height} units`);
    } catch (error) {
      unknown.push(
        `No.${number} ${id} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
  if (unknown.length > 0) {
    throw new Error(
      `The drawn size of ${unknown.length} sticker(s) can't be known, so stickers.drawn_width can't be added: ${unknown.join("; ")}. Delete those stickers, or the database, and start again.`,
    );
  }
  if (!write) {
    log(`Dry run: the migration will record these ${sized.length} drawn sizes`);
    return sized;
  }
  sqlite.exec(
    "create table if not exists sticker_drawn_sizes (sticker_id text primary key not null, drawn_width real not null, drawn_height real not null)",
  );
  const insert = sqlite.prepare(
    "insert or replace into sticker_drawn_sizes (sticker_id, drawn_width, drawn_height) values (?, ?, ?)",
  );
  sqlite.transaction(() => {
    for (const { id, width, height } of sized) insert.run(id, width, height);
  })();
  log(`Staged ${sized.length} drawn sizes for the migration`);
  return sized;
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("Usage: node packages/db/src/drawnSizes.ts <database path>");
    process.exit(1);
  }
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  try {
    if (needsDrawnSizes(sqlite)) stageDrawnSizes(sqlite, { write: false });
    else console.log(`${path} has no stickers from before their drawn size was recorded`);
  } finally {
    sqlite.close();
  }
}
