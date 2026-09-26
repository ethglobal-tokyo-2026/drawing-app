/**
 * One-shot: converts the old catalog folders, `src/i18n/en/` and `src/i18n/ja/`, into
 * `src/i18n/strings/`, one file per section with each string's English and Japanese together. Run
 * it again for a section whose en/ or ja/ file a merge brings back; then delete this script and both
 * folders.
 *
 *   pnpm --filter frontend exec tsx scripts/convertCatalog.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type ObjectExpression, parseSync, type Span } from "oxc-parser";
import { editSection, formatted, readSection, type Target } from "./catalogSource";

const i18nDir = path.join(import.meta.dirname, "../src/i18n");
const enDir = path.join(i18nDir, "en");
const jaDir = path.join(i18nDir, "ja");
const stringsDir = path.join(i18nDir, "strings");

const sectionsIn = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith(".ts") && file !== "index.ts")
        .map((file) => path.basename(file, ".ts"))
    : [];

interface OldString extends Span {
  key: string;
  /** The literal as the file writes it, quotes and escapes included. */
  raw: string;
  value: string;
}

/** An old section file's export, and each string in it with its literal's span. */
const readOld = (file: string, section: string) => {
  const text = readFileSync(file, "utf8");
  const { program, errors } = parseSync(file, text, { lang: "ts" });
  if (errors.length) throw new Error(`${file} doesn't parse: ${errors[0]?.message}`);
  const declarator = program.body
    .flatMap((statement) =>
      statement.type === "ExportNamedDeclaration" &&
      statement.declaration?.type === "VariableDeclaration"
        ? statement.declaration.declarations
        : [],
    )
    .find(({ id }) => id.type === "Identifier" && id.name === section);
  const init = declarator?.init;
  let object = init;
  while (object?.type === "TSAsExpression" || object?.type === "TSSatisfiesExpression") {
    object = object.expression;
  }
  if (!init || object?.type !== "ObjectExpression") {
    throw new Error(`${file} has no \`export const ${section} = { … }\``);
  }
  const strings: OldString[] = [];
  const visit = (group: ObjectExpression, prefix: string) => {
    for (const property of group.properties) {
      if (property.type !== "Property" || property.computed) {
        throw new Error(`${file}: ${prefix} holds something other than named strings`);
      }
      const { key, value } = property;
      const name =
        key.type === "Identifier" ? key.name : key.type === "Literal" ? String(key.value) : "";
      if (value.type === "ObjectExpression") visit(value, `${prefix}.${name}`);
      else if (value.type === "Literal" && typeof value.value === "string") {
        strings.push({
          key: `${prefix}.${name}`,
          raw: text.slice(value.start, value.end),
          value: value.value,
          start: value.start,
          end: value.end,
        });
      } else throw new Error(`${file}: ${prefix}.${name} isn't a string in quotes`);
    }
  };
  visit(object, section);
  return { text, program, init, object, strings };
};

/** Each string's Japanese literal, by key: from ja/ where the file is there, else from strings/. */
const japaneseOf = (section: string): Map<string, string> => {
  const oldFile = path.join(jaDir, `${section}.ts`);
  if (existsSync(oldFile)) {
    return new Map(readOld(oldFile, section).strings.map(({ key, raw }) => [key, raw]));
  }
  const converted = path.join(stringsDir, `${section}.ts`);
  if (!existsSync(converted)) return new Map();
  const { text, strings } = readSection(converted);
  return new Map(
    strings.flatMap(({ key, at }) =>
      at.ja ? [[key, text.slice(at.ja.value.start, at.ja.value.end)] as const] : [],
    ),
  );
};

/** The section in the new layout, with en/'s comments and layout, before oxfmt formats it. */
const convert = (section: string) => {
  const file = path.join(enDir, `${section}.ts`);
  const { text, program, init, object, strings } = readOld(file, section);
  const japanese = japaneseOf(section);
  const unknown = [...japanese.keys()].filter(
    (key) => !strings.some((string) => string.key === key),
  );
  if (unknown.length)
    throw new Error(`${section}: Japanese for keys English lacks: ${unknown.join(", ")}`);
  const splices = strings.map(({ key, raw, start, end }) => {
    const ja = japanese.get(key);
    return { start, end, text: `{ en: ${raw}${ja === undefined ? "" : `, ja: ${ja}`} }` };
  });
  // errors' record of codes now holds each code's { en, ja? }.
  const types = {
    " as const": { satisfies: "Section", imports: "Section" },
    ' as const satisfies Record<ErrorCode | "unknown", string>': {
      satisfies: 'Section & Record<ErrorCode | "unknown", Leaf>',
      imports: "Leaf, Section",
    },
  };
  const suffix = text.slice(object.end, init.end);
  const type = Object.entries(types).find(([old]) => old === suffix)?.[1];
  if (!type)
    throw new Error(`${file}: its export ends in \`${suffix}\`, which this doesn't convert`);
  splices.push({ start: object.end, end: init.end, text: ` as const satisfies ${type.satisfies}` });
  const imported = `import type { ${type.imports} } from "../catalog";\n`;
  const lastImport = program.body.findLast((statement) => statement.type === "ImportDeclaration");
  splices.push(
    lastImport
      ? { start: lastImport.end, end: lastImport.end, text: `\n${imported}` }
      : { start: 0, end: 0, text: `${imported}\n` },
  );
  console.log(
    `  ${section}: ${strings.length} strings, ${japanese.size} with Japanese, from en/${existsSync(path.join(jaDir, `${section}.ts`)) ? " and ja/" : ""}`,
  );
  return splices
    .sort((a, b) => b.start - a.start)
    .reduce((out, { start, end, text: put }) => out.slice(0, start) + put + out.slice(end), text);
};

/** A section only ja/ brought back: its Japanese, set on the converted section's strings. */
const applyJapanese = (section: string) => {
  const converted = readSection(path.join(stringsDir, `${section}.ts`));
  const japanese = new Map(
    readOld(path.join(jaDir, `${section}.ts`), section).strings.map(({ key, value }) => [
      key,
      value,
    ]),
  );
  const targets = new Map<string, Target>(
    converted.strings.map(({ key, where }) => {
      const text = japanese.get(key);
      japanese.delete(key);
      return [key, { ...(text !== undefined && { japanese: text }), where }];
    }),
  );
  if (japanese.size)
    throw new Error(
      `${section}: Japanese for keys English lacks: ${[...japanese.keys()].join(", ")}`,
    );
  console.log(`  ${section}: Japanese from ja/, onto strings/`);
  return editSection(converted, targets);
};

const sections = [...new Set([...sectionsIn(enDir), ...sectionsIn(jaDir)])].sort();
console.log(
  `Converting ${sections.length} sections into ${path.relative(process.cwd(), stringsDir)}/`,
);
for (const section of sections) {
  const target = path.join(stringsDir, `${section}.ts`);
  const text = existsSync(path.join(enDir, `${section}.ts`))
    ? convert(section)
    : applyJapanese(section);
  writeFileSync(target, formatted(target, text));
}
const names = sectionsIn(stringsDir).sort();
const index = path.join(stringsDir, "index.ts");
writeFileSync(
  index,
  formatted(
    index,
    [
      ...names.map((name) => `import { ${name} } from "./${name}";`),
      "",
      "/** The catalog: one section per feature folder, plus errors and pages, each string in English and Japanese. */",
      `export const strings = { ${names.join(", ")} };`,
      "",
    ].join("\n"),
  ),
);
console.log(`Wrote ${path.relative(process.cwd(), index)}, joining ${names.length} sections.`);
