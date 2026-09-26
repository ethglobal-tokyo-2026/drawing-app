/**
 * Writes the catalog as a sheet for a translator: one row per English string, with where it appears,
 * its current Japanese and notes on what to keep as it is. Run it when there's English to translate,
 * hand the CSV over, then read their Japanese back with `i18n:import`.
 *
 *   pnpm --filter frontend i18n:export <file.csv>
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { readCatalog } from "./catalogSource";
import { pathFromArgument, sheetRows, toCsv } from "./translatorSheet";

const target = pathFromArgument(process.argv[2], "pnpm --filter frontend i18n:export <file.csv>");
console.log(`Exporting the catalog to ${target}`);
const rows = sheetRows(readCatalog(path.join(import.meta.dirname, "../src/i18n/strings")));
writeFileSync(target, toCsv(rows));
const translated = rows.filter((row) => row.japanese).length;
console.log(
  `Wrote ${rows.length} rows, ${translated} with Japanese. The developer slip's text is left out.`,
);
