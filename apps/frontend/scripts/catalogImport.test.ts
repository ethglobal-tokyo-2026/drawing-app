import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { resourcesIn, type Strings } from "../src/i18n/catalog";
import { strings as catalog } from "../src/i18n/strings";
import { importFile } from "./catalogImport";
import { readCatalog, readSection } from "./catalogSource";
import { placeholders, type SheetRow, sheetRows, toCsv } from "./translatorSheet";

const stringsDir = path.join(import.meta.dirname, "../src/i18n/strings");
const quiet = { log: () => {}, error: () => {} };

/** A folder of section files to import into: a copy of the catalog's, or the files given. */
const importTarget = (files?: Record<string, string>) => {
  const dir = mkdtempSync(path.join(tmpdir(), "catalog-import-"));
  onTestFinished(() => rmSync(dir, { recursive: true }));
  const target = path.join(dir, "strings");
  if (files) {
    mkdirSync(target);
    for (const [file, text] of Object.entries(files)) writeFileSync(path.join(target, file), text);
  } else cpSync(stringsDir, target, { recursive: true });
  const read = (file: string) => readFileSync(path.join(target, file), "utf8");
  const before = new Map(readdirSync(target).map((file) => [file, read(file)]));
  return {
    target,
    read,
    importFrom: (name: string, contents: string | Uint8Array) => {
      const file = path.join(dir, name);
      writeFileSync(file, contents);
      return importFile(file, { stringsDir: target, report: quiet });
    },
    changedFiles: () => [...before].filter(([file, text]) => read(file) !== text).map(([f]) => f),
  };
};

const catalogRows = () => sheetRows(readCatalog(stringsDir));

const rowWhere = (rows: readonly SheetRow[], test: (row: SheetRow) => boolean) => {
  const row = rows.find(test);
  if (!row) throw new Error("The catalog has no row this test needs.");
  return row;
};

const withJapanese = (rows: readonly SheetRow[], japanese: Record<string, string>) =>
  rows.map((row) => ({ ...row, japanese: japanese[row.key] ?? row.japanese }));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The value at a dotted key in an imported section file. */
const valueAt = (module: unknown, key: string) =>
  key.split(".").reduce((value, name) => (isRecord(value) ? value[name] : undefined), module);

const flat = (strings: Strings, prefix = ""): [string, string][] =>
  Object.entries(strings).flatMap(([name, value]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    return typeof value === "string" ? [[key, value]] : flat(value, key);
  });

const BOARD = `import type { Section } from "../catalog";

export const board = {
  /** The board's own screen. */
  own: {
    /** Old comment. */
    title: { en: "Your board", ja: "ボード" },
    draw: { en: "Draw" },
    blank: { en: "Nothing here yet.", ja: "まだ何もありません。" },
  },
  tag: { from: { en: "From {{name}}" }, for: { en: "For" } },
  sealed: { en: "<b>Sealed</b> {{date}}" },
  developer: { debug: { en: "Debug" } },
} as const satisfies Section;
`;

describe("the catalog's tools", () => {
  it("read the same strings the app has", () => {
    const source = readCatalog(stringsDir).flatMap((section) => section.strings);
    expect(new Map(source.map(({ key, english }) => [key, english]))).toEqual(
      new Map(flat(resourcesIn(catalog, "en"))),
    );
    const japanese = source.flatMap(({ key, japanese: ja }): [string, string][] =>
      ja === undefined ? [] : [[key, ja]],
    );
    expect(new Map(japanese)).toEqual(new Map(flat(resourcesIn(catalog, "ja"))));
  });

  it("leave the catalog as it is after an export and an import", () => {
    const { importFrom, changedFiles } = importTarget();
    const plan = importFrom("sheet.csv", toCsv(catalogRows()));
    expect(plan).toEqual({ problems: [], warnings: [], sections: [] });
    expect(changedFiles()).toEqual([]);
  });

  it("leave the developer slip's text out of the export", () => {
    const csv = toCsv(sheetRows([readSection("board.ts", BOARD)]));
    expect(csv).toContain("board.own.title");
    expect(csv).not.toContain("developer");
  });
});

describe("a translator's sheet", () => {
  it("is refused, naming its key, when Japanese drops a variable, and nothing is written", () => {
    const rows = catalogRows();
    const broken = rowWhere(rows, (row) => row.english.includes("{{"));
    const fine = rowWhere(rows, (row) => row !== broken && !placeholders(row.english).length);
    const { importFrom, changedFiles } = importTarget();
    const sheet = withJapanese(rows, { [broken.key]: "変数なし", [fine.key]: "訳" });
    const plan = importFrom("sheet.csv", toCsv(sheet));
    expect(plan.problems).toEqual([expect.stringContaining(broken.key)]);
    expect(plan.problems[0]).toContain(placeholders(broken.english)[0]);
    expect(changedFiles()).toEqual([]);
  });

  it("takes a break hint only in the spelling the app turns into a break", () => {
    const rows = catalogRows();
    const row = rowWhere(
      rows,
      ({ key, english }) => !placeholders(english).length && !key.endsWith("_one"),
    );
    const { importFrom } = importTarget();
    const sheetWith = (japanese: string) => toCsv(withJapanese(rows, { [row.key]: japanese }));
    expect(importFrom("exact.csv", sheetWith("一行目<wbr/>二行目")).problems).toEqual([]);
    for (const spelling of ["<wbr />", '<wbr class="x"/>'])
      expect(importFrom("other.csv", sheetWith(`一行目${spelling}二行目`)).problems).toEqual([
        expect.stringContaining(row.key),
      ]);
  });

  it("sets only the Japanese it changes, keeping every character and the string's comment", async () => {
    const rows = catalogRows();
    const row = rowWhere(
      rows,
      ({ key, where, english }) =>
        !!where && !placeholders(english).length && !key.endsWith("_one"),
    );
    const [section = ""] = row.key.split(".");
    // A formula's first character, the CSV's separators, a quote and a line break.
    const japanese = '+「テスト」, "引用"\n二行目';
    // The sheet's Where is for the translator to read: an edit there changes no comment.
    const sheet = rows.map((r) =>
      r === row ? { ...r, japanese, where: "Edited in the sheet" } : r,
    );
    const { target, importFrom, changedFiles } = importTarget();
    const plan = importFrom("sheet.csv", toCsv(sheet));
    expect(changedFiles()).toEqual([`${section}.ts`]);
    expect(plan.sections).toMatchObject([
      { section, [row.japanese ? "changed" : "added"]: [row.key], removed: [], commented: [] },
    ]);
    const file = path.join(target, `${section}.ts`);
    const written = readSection(file).strings.find(({ key }) => key === row.key);
    expect(written).toMatchObject({ japanese, where: row.where });
    expect(valueAt(await import(file), row.key)).toEqual({ en: row.english, ja: japanese });
  });
});

describe("a work file", () => {
  it("sets each string's comment and Japanese, clearing the Japanese it leaves out", () => {
    const { importFrom, read } = importTarget({ "board.ts": BOARD });
    const plan = importFrom(
      "work.json",
      JSON.stringify({
        "board.own.title": { where: "Your board: its title", ja: "あなたのボード" },
        "board.own.draw": { where: "*Draw* key on your board", ja: "かく" },
        "board.own.blank": { where: "Your board, empty: the line in its spot" },
        "board.tag.from": { where: "A gift bag's tag: the giver", ja: "{{name}}から" },
      }),
    );
    expect(plan).toEqual({
      problems: [],
      warnings: [],
      sections: [
        {
          section: "board",
          added: ["board.own.draw", "board.tag.from"],
          changed: ["board.own.title"],
          removed: ["board.own.blank"],
          commented: ["board.own.title", "board.own.draw", "board.own.blank", "board.tag.from"],
        },
      ],
    });
    // Only those strings change; the group's comment and the developer slip's text stay as they are.
    expect(read("board.ts")).toBe(`import type { Section } from "../catalog";

export const board = {
  /** The board's own screen. */
  own: {
    /** Your board: its title */
    title: { en: "Your board", ja: "あなたのボード" },
    /** *Draw* key on your board */
    draw: { en: "Draw", ja: "かく" },
    /** Your board, empty: the line in its spot */
    blank: { en: "Nothing here yet." },
  },
  tag: {
    /** A gift bag's tag: the giver */
    from: { en: "From {{name}}", ja: "{{name}}から" },
    for: { en: "For" },
  },
  sealed: { en: "<b>Sealed</b> {{date}}" },
  developer: { debug: { en: "Debug" } },
} as const satisfies Section;
`);
  });

  it("is refused, naming each key, when a key or its where or Japanese is wrong, and nothing is written", () => {
    const { importFrom, changedFiles } = importTarget({ "board.ts": BOARD });
    const plan = importFrom(
      "work.json",
      JSON.stringify({
        "board.own.gone": { where: "A string since removed", ja: "消えた" },
        "board.developer.debug": { where: "The developer slip", ja: "デバッグ" },
        "board.own.title": { where: "Two\nlines", ja: "ボード" },
        "board.own.draw": { where: "Your board: the Draw key", jp: "かく" },
        "board.tag.from": { where: "A gift bag's tag: the giver", ja: "から" },
        "board.sealed": { where: "A sealed sticker: its date", ja: "</b>封印<b>{{date}}" },
      }),
    );
    expect(plan.problems.map((problem) => problem.slice(0, problem.indexOf(":")))).toEqual([
      "board.own.gone",
      "board.developer.debug",
      "board.own.title",
      "board.own.draw",
      "board.tag.from",
      "board.sealed",
    ]);
    expect(changedFiles()).toEqual([]);
  });

  it("is refused when it isn't UTF-8", () => {
    const { importFrom } = importTarget({ "board.ts": BOARD });
    // "ボード" in Shift JIS.
    const shiftJis = new Uint8Array([0x83, 0x7b, 0x81, 0x5b, 0x83, 0x68]);
    expect(() => importFrom("work.json", shiftJis)).toThrow("isn't UTF-8");
  });
});
