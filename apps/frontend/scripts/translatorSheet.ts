/**
 * The translator's sheet: the catalog as one row per English string, with where it appears, its
 * Japanese and notes a translator who doesn't code can follow, in a CSV that Excel and Google Sheets
 * open; and the reading of their sheet back, which `catalogImport` checks and applies.
 */
import path from "node:path";
import { BREAK_HINT } from "../src/i18n/catalog";
import type { SourceSection } from "./catalogSource";

/** One English string. `japanese` is "" where the key falls back to English. */
export interface SheetRow {
  key: string;
  /** The string's comment: which screen it's on, and what the person is doing. */
  where: string;
  english: string;
  japanese: string;
  notes: string;
}

/** A row as the import reads it back: the where and notes are only for the translator. */
export type SheetEntry = Omit<SheetRow, "where" | "notes">;

const COLUMNS = {
  key: "key",
  where: "Where",
  english: "English",
  japanese: "Japanese",
  notes: "Notes",
} as const;

/** The developer slip's text sits under a `developer` key, and is never translated. */
export const isDeveloperKey = (key: string) => key.split(".").includes("developer");

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

const PLACEHOLDER = /\{\{([^{}]*)\}\}|<(\/?)([A-Za-z0-9]+)(\s[^<>]*?)?\s*(\/?)>/g;

/**
 * The `{{variables}}` and `<tags>` in a string, in order, written as `{{name}}`, `<b>`, `</b>` or
 * `<br/>`, attributes kept. A break hint isn't one: only Japanese has them. Only its exact spelling is
 * one, since the app turns only that into a break; any other spelling counts as a tag.
 */
export const placeholders = (text: string): string[] =>
  [...text.replaceAll(BREAK_HINT, "").matchAll(PLACEHOLDER)].map(
    ([, variable, close = "", tag = "", attributes = "", empty = ""]) =>
      variable === undefined
        ? `<${close}${tag}${attributes.trim() && ` ${attributes.trim()}`}${empty}>`
        : `{{${variable.trim()}}}`,
  );

/** "a", "a and b", "a, b and c". */
export const list = (items: readonly string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** "1 row", "2 rows". */
export const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

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
export const sheetRows = (sections: readonly SourceSection[]): SheetRow[] => {
  const all = sections.flatMap((section) => section.strings);
  const english = new Map(all.map(({ key, english: text }) => [key, text]));
  return all
    .filter(({ key }) => !isDeveloperKey(key))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map(({ key, where, english: text, japanese = "" }) => ({
      key,
      where,
      english: text,
      japanese,
      notes: [
        notesFor(key, text, english),
        japanese.includes(BREAK_HINT)
          ? `Keep the ${BREAK_HINT} marks at phrase breaks: this short centered line breaks only there.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    }));
};

/** Excel reads a CSV as UTF-8 only when it starts with a byte order mark. */
const BOM = "﻿";

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
  [
    Object.values(COLUMNS),
    ...rows.map((row) => [row.key, row.where, row.english, row.japanese, row.notes]),
  ]
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

/**
 * A file's text, which must be UTF-8. Fatal, so a file saved in another encoding stops here rather
 * than garbling the Japanese.
 */
export const decodeUtf8 = (bytes: Uint8Array, problem: string) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(problem, { cause: error });
  }
};

/** A translator's sheet as a spreadsheet saved it: each row's key, English and Japanese. */
export const readSheet = (bytes: Uint8Array): SheetEntry[] => {
  const text = decodeUtf8(bytes, "The sheet isn't UTF-8: save it from Excel as “CSV UTF-8”.");
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

/**
 * A path the person typed, from where they ran pnpm: pnpm runs a package's scripts in its folder, and
 * says where it was started in INIT_CWD.
 */
export const pathFromArgument = (argument: string | undefined, usage: string) => {
  if (!argument) throw new Error(`Say which file: ${usage}`);
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), argument);
};
