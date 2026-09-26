import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { en } from "../src/i18n/en";
import { ja } from "../src/i18n/ja";
import {
  type Catalog,
  importSheet,
  placeholders,
  type SheetRow,
  sheetRows,
  strings,
  toCsv,
} from "./translatorSheet";

const jaDir = path.join(import.meta.dirname, "../src/i18n/ja");
const quiet = { log: () => {}, error: () => {} };

/** Exports the real catalogs with some Japanese cells filled in, and imports that into a copy of ja/. */
const exportThenImport = (japanese: Record<string, string> = {}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "translator-sheet-"));
  onTestFinished(() => rmSync(dir, { recursive: true }));
  const copy = path.join(dir, "ja");
  cpSync(jaDir, copy, { recursive: true });
  const rows = sheetRows(en, ja).map((row) => ({
    ...row,
    japanese: japanese[row.key] ?? row.japanese,
  }));
  writeFileSync(path.join(dir, "sheet.csv"), toCsv(rows));
  const plan = importSheet(path.join(dir, "sheet.csv"), { en, ja, jaDir: copy, report: quiet });
  const read = (folder: string, file: string) => readFileSync(path.join(folder, file), "utf8");
  const changedFiles = readdirSync(jaDir).filter((file) => read(copy, file) !== read(jaDir, file));
  return { plan, copy, changedFiles };
};

const rowWhere = (test: (row: SheetRow) => boolean) => {
  const row = sheetRows(en, ja).find(test);
  if (!row) throw new Error("The catalogs have no row this test needs.");
  return row;
};

const isCatalog = (value: unknown): value is Catalog => typeof value === "object" && value !== null;

describe("the translator's sheet", () => {
  it("leaves ja/ as it is after an export and an import", () => {
    const { plan, changedFiles } = exportThenImport();
    expect(plan).toEqual({ problems: [], warnings: [], sections: [] });
    expect(changedFiles).toEqual([]);
  });

  it("refuses Japanese that drops a variable, naming its key, and writes nothing", () => {
    const broken = rowWhere((row) => row.english.includes("{{"));
    const fine = rowWhere((row) => row !== broken && !placeholders(row.english).length);
    const { plan, changedFiles } = exportThenImport({ [broken.key]: "変数なし", [fine.key]: "訳" });
    expect(plan.problems).toEqual([expect.stringContaining(broken.key)]);
    expect(plan.problems[0]).toContain(placeholders(broken.english)[0]);
    expect(changedFiles).toEqual([]);
  });

  it("rewrites only the section whose Japanese changed, keeping every character", async () => {
    const row = rowWhere((row) => !placeholders(row.english).length && !row.key.endsWith("_one"));
    const [section = ""] = row.key.split(".");
    // A formula's first character, the CSV's separators, a quote and a line break.
    const japanese = '+「テスト」, "引用"\n二行目';
    const { plan, copy, changedFiles } = exportThenImport({ [row.key]: japanese });
    expect(changedFiles).toEqual([`${section}.ts`]);
    expect(plan.sections).toMatchObject([
      { section, [row.japanese ? "changed" : "added"]: [row.key], removed: [] },
    ]);
    const written: unknown = await import(path.join(copy, `${section}.ts`));
    const catalog = isCatalog(written) ? written[section] : undefined;
    expect(isCatalog(catalog) && strings(catalog, section).get(row.key)).toBe(japanese);
  });

  it("leaves the developer slip's text out of the export", () => {
    const fixture = {
      board: { title: "Board", developer: { debug: "Debug" }, slip: { developer: { id: "ID" } } },
    };
    const csv = toCsv(sheetRows(fixture, {}));
    expect(csv).toContain("board.title");
    expect(csv).not.toContain("developer");
  });
});
