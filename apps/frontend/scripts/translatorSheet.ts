/**
 * The translator's sheet: the i18n catalogs as one row per English string, with its Japanese and
 * notes a translator who doesn't code can follow, in a CSV that Excel and Google Sheets open; and
 * the checks that read their Japanese back into ja/.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/** A catalog section, or a group of keys within one. Japanese sections leave keys out. */
export type Catalog = { readonly [key: string]: string | Catalog | undefined };

/** One English string. `japanese` is "" where the key falls back to English. */
export interface SheetRow {
  key: string;
  english: string;
  japanese: string;
  notes: string;
}

/** A row as the import reads it back: the notes are only for the translator. */
export type SheetEntry = Omit<SheetRow, "notes">;

const COLUMNS = { key: "key", english: "English", japanese: "Japanese", notes: "Notes" } as const;

/** Every string in a catalog by its dotted key, in the catalog's order. */
export const strings = (catalog: Catalog, prefix = ""): Map<string, string> => {
  const found = new Map<string, string>();
  for (const [name, value] of Object.entries(catalog)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === "string") found.set(key, value);
    else if (value) for (const [inner, text] of strings(value, key)) found.set(inner, text);
  }
  return found;
};

/** The developer slip's text sits under a `developer` key, and is never translated. */
const isDeveloperKey = (key: string) => key.split(".").includes("developer");

const PLURAL = /_(one|other)$/;

/** For a context variant such as `title_unknownGiver`: the key it's a case of, and the case. */
const contextOf = (key: string, english: ReadonlyMap<string, string>) => {
  const stem = key.replace(PLURAL, "");
  const name = stem.lastIndexOf(".") + 1;
  // Error codes hold underscores too, so a variant is only one whose base key exists.
  for (let at = stem.lastIndexOf("_"); at > name; at = stem.lastIndexOf("_", at - 1)) {
    const base = stem.slice(0, at);
    if ([base, `${base}_one`, `${base}_other`].some((sibling) => english.has(sibling))) {
      return { base, context: stem.slice(at + 1) };
    }
  }
  return undefined;
};

const PLACEHOLDER = /\{\{([^{}]*)\}\}|<(\/?)([A-Za-z0-9]+)\s*(\/?)>/g;

/** The `{{variables}}` and `<tags>` in a string, in order, written as `{{name}}`, `<b>`, `</b>` or `<br/>`. */
export const placeholders = (text: string): string[] =>
  [...text.matchAll(PLACEHOLDER)].map(([, variable, close = "", tag = "", empty = ""]) =>
    variable === undefined ? `<${close}${tag}${empty}>` : `{{${variable.trim()}}}`,
  );

/** "a", "a and b", "a, b and c". */
const list = (items: readonly string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** "1 row", "2 rows". */
const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** `unknownGiver` as "unknown giver". */
const words = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();

/** What a translator needs to know about one string, in plain words. */
const notesFor = (key: string, text: string, english: ReadonlyMap<string, string>) => {
  if (key.endsWith("_one")) return "Japanese has no singular: leave this empty.";
  const notes: string[] = [];
  if (key.endsWith("_other")) notes.push("Used for every count in Japanese.");
  const variant = contextOf(key, english);
  if (variant) {
    notes.push(
      `The “${words(variant.context)}” case of ${variant.base}: translate the two together.`,
    );
  }
  const found = [...new Set(placeholders(text))];
  // A self-closing tag stands for something the app puts in, as a variable does.
  const kept = found.filter((token) => token.startsWith("{{") || token.endsWith("/>"));
  const wrapping = found
    .filter((token) => /^<[^/]/.test(token) && !token.endsWith("/>"))
    .map((open) => `${open}…${open.replace("<", "</")}`);
  if (kept.length === 1) notes.push(`Keep ${kept[0]} as it is: the app fills it in.`);
  if (kept.length > 1) notes.push(`Keep ${list(kept)} as they are: the app fills them in.`);
  if (wrapping.length) {
    notes.push(`Put ${list(wrapping)} around the matching words, as the English does.`);
  }
  return notes.join(" ");
};

/** The sheet: every English string but the developer slip's, sorted by key. */
export const sheetRows = (en: Catalog, ja: Catalog): SheetRow[] => {
  const english = strings(en);
  const japanese = strings(ja);
  return [...english]
    .filter(([key]) => !isDeveloperKey(key))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, text]) => ({
      key,
      english: text,
      japanese: japanese.get(key) ?? "",
      notes: notesFor(key, text, english),
    }));
};

/** Excel reads a CSV as UTF-8 only when it starts with a byte order mark. */
const BOM = "\uFEFF";

/**
 * Spreadsheets run a cell that starts with = + - or @ as a formula, so "+{{seconds}}s" would show as
 * an error. A leading apostrophe keeps it text; reading the sheet drops it again.
 */
const FORMULA_START = /^[=+\-@]/;

const toCell = (value: string) => {
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const fromCell = (cell: string) =>
  (/^'[=+\-@]/.test(cell) ? cell.slice(1) : cell).replaceAll("\r\n", "\n");

/** The sheet as a CSV, in UTF-8 with a byte order mark so Excel and Google Sheets show Japanese. */
export const toCsv = (rows: readonly SheetRow[]) =>
  BOM +
  [Object.values(COLUMNS), ...rows.map((row) => [row.key, row.english, row.japanese, row.notes])]
    .map((cells) => cells.map(toCell).join(","))
    .join("\r\n") +
  "\r\n";

/** A CSV's records. A quoted cell can hold commas, doubled quotes and line breaks. */
const parseCsv = (text: string): string[][] => {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[at + 1] === '"') cell += text[++at];
      else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      record.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[at + 1] === "\n") at++;
      records.push([...record, cell]);
      record = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("The sheet ends inside a quoted cell, so it's cut short.");
  if (cell || record.length) records.push([...record, cell]);
  return records;
};

/** A translator's sheet as a spreadsheet saved it: each row's key, English and Japanese. */
export const readSheet = (bytes: Uint8Array): SheetEntry[] => {
  let text: string;
  try {
    // Fatal, so a sheet saved in another encoding stops here rather than garbling the Japanese.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error("The sheet isn't UTF-8: save it from Excel as “CSV UTF-8”.", { cause: error });
  }
  const [header = [], ...records] = parseCsv(text);
  const column = (name: string) => {
    const at = header.findIndex((cell) => cell.trim() === name);
    if (at < 0) throw new Error(`The sheet's first row has no “${name}” column.`);
    return at;
  };
  const [key, english, japanese] = [COLUMNS.key, COLUMNS.english, COLUMNS.japanese].map(column);
  return records
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => {
      const translation = fromCell(cells[japanese] ?? "");
      return {
        key: (cells[key] ?? "").trim(),
        english: fromCell(cells[english] ?? ""),
        japanese: translation.trim() ? translation : "",
      };
    });
};

/** How a translation's `{{variables}}` and `<tags>` differ from its English's, if they do. */
const placeholderProblem = (english: string, japanese: string) => {
  const expected = new Set(placeholders(english));
  const found = new Set(placeholders(japanese));
  const missing = [...expected].filter((token) => !found.has(token));
  const extra = [...found].filter((token) => !expected.has(token));
  const problems = [
    ...(missing.length ? [`is missing ${list(missing)}`] : []),
    ...(extra.length ? [`has ${list(extra)}, which the English doesn't`] : []),
  ];
  return problems.length ? `the Japanese ${problems.join(" and ")}` : undefined;
};

/** Why a row can't be imported, if it can't. */
const rowProblem = (
  row: SheetEntry,
  english: string | undefined,
  seen: ReadonlyMap<string, string>,
) => {
  if (isDeveloperKey(row.key)) {
    return "is the developer slip's text, which stays in English: delete the row";
  }
  if (english === undefined) {
    return "isn't in the English catalog: delete the row, or move its Japanese to the key that replaced it";
  }
  if (seen.has(row.key)) return "is in the sheet twice";
  return row.japanese ? placeholderProblem(english, row.japanese) : undefined;
};

/** A catalog's group under `name`, or an empty one. */
const group = (catalog: Catalog, name: string): Catalog => {
  const value = catalog[name];
  return typeof value === "object" ? value : {};
};

/** A Japanese section in its English's key order, holding what `japaneseFor` gives each key. */
const nest = (
  english: Catalog,
  japaneseFor: (key: string) => string | undefined,
  prefix: string,
): Catalog => {
  const section: Record<string, string | Catalog> = {};
  for (const [name, value] of Object.entries(english)) {
    const key = `${prefix}.${name}`;
    const japanese =
      typeof value === "string" ? japaneseFor(key) : value && nest(value, japaneseFor, key);
    if (typeof japanese === "string" || (japanese && Object.keys(japanese).length)) {
      section[name] = japanese;
    }
  }
  return section;
};

/** A section whose Japanese the sheet changes, with the keys it adds, changes and removes. */
export interface SectionChange {
  section: string;
  japanese: Catalog;
  added: string[];
  changed: string[];
  removed: string[];
}

export interface ImportPlan {
  /** Why the sheet can't be imported, each naming its key. While there are any, nothing is written. */
  problems: string[];
  /** Imported anyway, but worth a look. */
  warnings: string[];
  sections: SectionChange[];
}

/**
 * What a sheet does to the Japanese catalog. An empty cell falls back to English; a key the sheet
 * doesn't have, such as English added since the export, keeps its Japanese.
 */
export const planImport = (en: Catalog, ja: Catalog, rows: readonly SheetEntry[]): ImportPlan => {
  const english = strings(en);
  const current = strings(ja);
  const sheet = new Map<string, string>();
  const problems: string[] = [];
  const warnings: string[] = [];
  for (const row of rows) {
    const text = english.get(row.key);
    const problem = rowProblem(row, text, sheet);
    if (problem) {
      problems.push(`${row.key || "A row with no key"}: ${problem}`);
      continue;
    }
    sheet.set(row.key, row.japanese);
    if (row.japanese && row.key.endsWith("_one")) {
      warnings.push(`${row.key}: Japanese has no singular, so this never shows`);
    }
    if (row.japanese && row.english !== text) {
      warnings.push(`${row.key}: the English changed since the export; check the Japanese matches`);
    }
  }
  if (problems.length) return { problems, warnings: [], sections: [] };
  for (const key of english.keys()) {
    if (!sheet.has(key) && !isDeveloperKey(key)) {
      warnings.push(`${key}: isn't in the sheet, so its Japanese stays as it is`);
    }
  }
  const japaneseFor = (key: string) =>
    sheet.has(key) ? sheet.get(key) || undefined : current.get(key);
  const sections = Object.keys(en).flatMap((section) => {
    const japanese = nest(group(en, section), japaneseFor, section);
    const before = strings(group(ja, section), section);
    const after = strings(japanese, section);
    const added = [...after.keys()].filter((key) => !before.has(key));
    const changed = [...after].filter(([key, text]) => before.has(key) && before.get(key) !== text);
    const removed = [...before.keys()].filter((key) => !after.has(key));
    return added.length || changed.length || removed.length
      ? [{ section, japanese, added, changed: changed.map(([key]) => key), removed }]
      : [];
  });
  return { problems, warnings, sections };
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** An object literal on one line; oxfmt then breaks what doesn't fit, as the files were written. */
const literal = (catalog: Catalog): string => {
  const properties = Object.entries(catalog).flatMap(([name, value]) =>
    value === undefined
      ? []
      : [
          `${IDENTIFIER.test(name) ? name : JSON.stringify(name)}: ${
            typeof value === "string" ? JSON.stringify(value) : literal(value)
          }`,
        ],
  );
  return properties.length ? `{ ${properties.join(", ")} }` : "{}";
};

/** A Japanese section's file, before oxfmt formats it. */
export const renderSection = (section: string, japanese: Catalog) =>
  [
    `import type { Translation } from "../catalog";`,
    `import type { ${section} as english } from "../en/${section}";`,
    "",
    `export const ${section}: Translation<typeof english> = ${literal(japanese)};`,
    "",
  ].join("\n");

export interface ImportOptions {
  en: Catalog;
  ja: Catalog;
  /** The folder of the Japanese sections' files. */
  jaDir: string;
  report?: Pick<Console, "log" | "error">;
}

/**
 * Reads a translator's sheet into the Japanese sections' files. Only a section whose Japanese
 * changes is rewritten, so an untouched sheet leaves every file, and its hand formatting, as it is.
 */
export const importSheet = (
  file: string,
  { en, ja, jaDir, report = console }: ImportOptions,
): ImportPlan => {
  report.log(`Reading ${file}`);
  const rows = readSheet(readFileSync(file));
  report.log(`Checking ${count(rows.length, "row")} against the English catalog`);
  const plan = planImport(en, ja, rows);
  const target = (section: string) => path.join(jaDir, `${section}.ts`);
  for (const { section } of plan.sections) {
    if (!existsSync(target(section))) {
      plan.problems.push(`${section}: ${target(section)} doesn't exist; add it to ja/index.ts too`);
    }
  }
  if (plan.problems.length) {
    report.error("Refused, and nothing was written:");
    for (const problem of plan.problems) report.error(`  ${problem}`);
    return plan;
  }
  const files = plan.sections.map(({ section, japanese, added, changed, removed }) => {
    const sectionFile = target(section);
    report.log(
      `Writing ${path.relative(process.cwd(), sectionFile)}: ${added.length} added, ${changed.length} changed, ${removed.length} removed`,
    );
    for (const key of added) report.log(`  added    ${key}`);
    for (const key of changed) report.log(`  changed  ${key}`);
    for (const key of removed) report.log(`  removed  ${key}`);
    writeFileSync(sectionFile, renderSection(section, japanese));
    return sectionFile;
  });
  if (files.length) {
    report.log(`Formatting ${count(files.length, "file")} with oxfmt`);
    execFileSync("oxfmt", files);
  }
  const unchanged = Object.keys(en).length - files.length;
  report.log(`Done: ${count(files.length, "section")} changed, ${unchanged} unchanged.`);
  if (plan.warnings.length) report.log("Check these:");
  for (const warning of plan.warnings) report.log(`  ${warning}`);
  return plan;
};

/**
 * A path the person typed, from where they ran pnpm: pnpm runs a package's scripts in its folder, and
 * says where it was started in INIT_CWD.
 */
export const pathFromArgument = (argument: string | undefined, usage: string) => {
  if (!argument) throw new Error(`Say which CSV file: ${usage}`);
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), argument);
};
