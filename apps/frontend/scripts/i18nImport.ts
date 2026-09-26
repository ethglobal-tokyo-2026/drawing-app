/**
 * Reads Japanese into the catalog, then reports the keys added, changed and removed in each section:
 * - a translator's sheet from `i18n:export` sets Japanese only, and an empty Japanese cell falls
 *   back to English;
 * - a work file, `{ "<section>.<path>": { "where": "…", "ja": "…" } }`, sets each string's comment
 *   and Japanese, and clears the Japanese of a string that leaves `ja` out.
 * It refuses, writing nothing, when a key isn't in the catalog or is the developer slip's, or its
 * Japanese changes the English's {{variables}} or <tags>. It rewrites tracked files only, so
 * `git diff` shows the change and `git checkout` undoes it.
 *
 *   pnpm --filter frontend i18n:import <file.csv | file.json>
 */
import path from "node:path";
import { importFile } from "./catalogImport";
import { pathFromArgument } from "./translatorSheet";

const source = pathFromArgument(
  process.argv[2],
  "pnpm --filter frontend i18n:import <file.csv | file.json>",
);
const { problems } = importFile(source, {
  stringsDir: path.join(import.meta.dirname, "../src/i18n/strings"),
});
if (problems.length) process.exitCode = 1;
