/**
 * Reads Japanese, and comments, into the catalog's section files, from one of:
 * - a translator's sheet, the CSV `i18n:export` writes, which sets Japanese only;
 * - a work file, `{ "<section>.<path>": { "where": string, "ja"?: string } }`, which sets each
 *   string's comment to `where` and its Japanese to `ja`, clearing it where `ja` is left out.
 * Every check runs before anything is written, and only the strings that change are edited, so every
 * other comment and line stays as it is.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  editSection,
  formatted,
  readCatalog,
  readSection,
  type SourceSection,
  type SourceString,
  type Target,
} from "./catalogSource";
import {
  count,
  decodeUtf8,
  isDeveloperKey,
  list,
  placeholders,
  readSheet,
} from "./translatorSheet";

/** One string's new Japanese, "" to fall back to English. A work file sets its comment too. */
interface Incoming {
  key: string;
  japanese: string;
  where?: string;
  /** The English a sheet was exported with, to warn when it has changed since. */
  english?: string;
  /** What's wrong with a work file's entry for it, before any other check. */
  problem?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A work file's strings, each with what's wrong with its shape, if anything is. */
const readWorkFile = (bytes: Uint8Array): Incoming[] => {
  const text = decodeUtf8(bytes, "The work file isn't UTF-8.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`The work file isn't JSON: ${String(error)}`, { cause: error });
  }
  if (!isRecord(json)) throw new Error("The work file isn't a JSON object of keys.");
  return Object.entries(json).map(([key, value]) => {
    const fields = isRecord(value) ? Object.keys(value) : [];
    const extra = fields.filter((field) => field !== "where" && field !== "ja");
    const { where, ja = "" } = isRecord(value) ? value : {};
    if (extra.length) {
      return {
        key,
        japanese: "",
        problem: `has ${list(extra)}, but a string holds only where and ja`,
      };
    }
    if (typeof where !== "string" || typeof ja !== "string") {
      return {
        key,
        japanese: "",
        problem: `isn't { "where": "…", "ja": "…" }, with ja left out to clear it`,
      };
    }
    return { key, where, japanese: ja.trim() ? ja : "" };
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

/** A comment is one line, naming the screen and what the person is doing. */
const whereProblem = (where: string) => {
  if (!where.trim()) return "has no where: say which screen it's on and what the person is doing";
  if (/[\r\n]/.test(where)) return "has a where of more than one line";
  return where.includes("*/") ? "has a where holding */, which would end its comment" : undefined;
};

/** Why a string can't be imported, if it can't. */
const entryProblem = (
  entry: Incoming,
  string: SourceString | undefined,
  seen: ReadonlySet<string>,
) => {
  if (entry.problem) return entry.problem;
  if (isDeveloperKey(entry.key)) {
    return "is the developer slip's text, which stays in English: delete it";
  }
  if (!string) {
    return "isn't in the catalog: delete it, or move it to the key that replaced it";
  }
  if (seen.has(entry.key)) return "is in the file twice";
  const where = entry.where === undefined ? undefined : whereProblem(entry.where);
  return where ?? (entry.japanese ? placeholderProblem(string.english, entry.japanese) : undefined);
};

/** A section the file changes: the keys whose Japanese it adds, changes or removes, or whose comment it sets. */
export interface SectionChange {
  section: string;
  added: string[];
  changed: string[];
  removed: string[];
  commented: string[];
}

export interface ImportPlan {
  /** Why the file can't be imported, each naming its key. While there are any, nothing is written. */
  problems: string[];
  /** Imported anyway, but worth a look. */
  warnings: string[];
  sections: SectionChange[];
}

/** What the file's strings do to the catalog: each changing string's target, and the plan's report. */
const planImport = (
  sections: readonly SourceSection[],
  entries: readonly Incoming[],
  fromSheet: boolean,
) => {
  const byKey = new Map(sections.flatMap(({ strings }) => strings.map((s) => [s.key, s])));
  const problems: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const targets = new Map<string, Target>();
  for (const entry of entries) {
    const string = byKey.get(entry.key);
    const problem = entryProblem(entry, string, seen);
    if (problem || !string) {
      problems.push(`${entry.key || "A row with no key"}: ${problem}`);
      continue;
    }
    seen.add(entry.key);
    const japanese = entry.japanese || undefined;
    if (japanese && entry.key.endsWith("_one")) {
      warnings.push(`${entry.key}: Japanese has no singular, so this never shows`);
    }
    if (japanese && entry.english !== undefined && entry.english !== string.english) {
      warnings.push(
        `${entry.key}: the English changed since the export; check the Japanese matches`,
      );
    }
    const where = entry.where?.trim() ?? string.where;
    if (japanese !== string.japanese || where !== string.where) {
      targets.set(entry.key, { japanese, where });
    }
  }
  if (fromSheet) {
    for (const key of byKey.keys()) {
      if (!seen.has(key) && !isDeveloperKey(key)) {
        warnings.push(`${key}: isn't in the sheet, so its Japanese stays as it is`);
      }
    }
  }
  const changes = sections.flatMap((section) => {
    const change: SectionChange = {
      section: section.name,
      added: [],
      changed: [],
      removed: [],
      commented: [],
    };
    for (const { key, japanese, where } of section.strings) {
      const target = targets.get(key);
      if (!target) continue;
      if (target.japanese !== japanese) {
        if (japanese === undefined) change.added.push(key);
        else if (target.japanese === undefined) change.removed.push(key);
        else change.changed.push(key);
      }
      if (target.where !== where) change.commented.push(key);
    }
    const size = change.added.length + change.changed.length + change.removed.length;
    return size + change.commented.length ? [{ section, change }] : [];
  });
  return { problems, warnings, targets, changes };
};

/** The section's new text, formatted and read back to check each string came out as planned. */
const rewrite = (section: SourceSection, targets: ReadonlyMap<string, Target>) => {
  try {
    const text = formatted(section.file, editSection(section, targets));
    const after = readSection(section.file, text).strings;
    const wrong = section.strings.find((before, at) => {
      const target = targets.get(before.key) ?? before;
      const string = after[at];
      return (
        string?.key !== before.key ||
        string.english !== before.english ||
        string.japanese !== target.japanese ||
        string.where !== target.where
      );
    });
    if (wrong || after.length !== section.strings.length) {
      return { problem: `${section.name}: the edit didn't read back as planned at ${wrong?.key}` };
    }
    return { text };
  } catch (error) {
    return {
      problem: `${section.name}: the edit couldn't be formatted or read back: ${String(error)}`,
    };
  }
};

export interface ImportOptions {
  /** The folder of the catalog's section files. */
  stringsDir: string;
  report?: Pick<Console, "log" | "error">;
}

/** Reads a sheet, or a work file ending in `.json`, into the catalog's section files. */
export const importFile = (
  file: string,
  { stringsDir, report = console }: ImportOptions,
): ImportPlan => {
  report.log(`Reading ${file}`);
  const bytes = readFileSync(file);
  const fromSheet = path.extname(file).toLowerCase() !== ".json";
  const entries = fromSheet ? readSheet(bytes) : readWorkFile(bytes);
  const sections = readCatalog(stringsDir);
  report.log(`Checking ${count(entries.length, fromSheet ? "row" : "string")} against the catalog`);
  const plan = planImport(sections, entries, fromSheet);
  const problems = [...plan.problems];
  const rewrites = problems.length
    ? []
    : plan.changes.map((change) => ({ ...change, ...rewrite(change.section, plan.targets) }));
  for (const { problem } of rewrites) if (problem) problems.push(problem);
  if (problems.length) {
    report.error("Refused, and nothing was written:");
    for (const problem of problems) report.error(`  ${problem}`);
    return { problems, warnings: [], sections: [] };
  }
  for (const { section, change, text = section.text } of rewrites) {
    const { added, changed, removed, commented } = change;
    report.log(
      `Writing ${path.relative(process.cwd(), section.file)}: ${added.length} added, ${changed.length} changed, ${removed.length} removed, ${commented.length} comments set`,
    );
    for (const key of added) report.log(`  added    ${key}`);
    for (const key of changed) report.log(`  changed  ${key}`);
    for (const key of removed) report.log(`  removed  ${key}`);
    for (const key of commented) report.log(`  comment  ${key}`);
    writeFileSync(section.file, text);
  }
  const unchanged = sections.length - rewrites.length;
  report.log(`Done: ${count(rewrites.length, "section")} changed, ${unchanged} unchanged.`);
  if (plan.warnings.length) report.log("Check these:");
  for (const warning of plan.warnings) report.log(`  ${warning}`);
  return { problems, warnings: plan.warnings, sections: plan.changes.map(({ change }) => change) };
};
