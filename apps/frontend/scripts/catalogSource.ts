/**
 * The catalog's section files, `src/i18n/strings/*.ts`, as source text: each string's key, English,
 * Japanese and comment, read with oxc-parser. `editSection` sets strings' Japanese and comments by
 * splicing the text at the parser's spans, so every other character, comment and line stays as it is.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  type Comment,
  type Expression,
  type ObjectExpression,
  type ObjectProperty,
  parseSync,
  type Program,
  type Span,
  type StringLiteral,
} from "oxc-parser";

/** One string in a section file, and where its parts sit in the file's text. */
export interface SourceString {
  /** Dotted, from the section's name: `line.gate.logIn`. */
  key: string;
  english: string;
  /** Absent where the string falls back to English. */
  japanese?: string;
  /** The string's doc comment, on one line; "" when it has none. */
  where: string;
  at: { property: Span; comment?: Span; en: Span; ja?: { property: Span; value: Span } };
}

export interface SourceSection {
  /** The section's name, which is its file's and its export's. */
  name: string;
  file: string;
  text: string;
  strings: SourceString[];
}

/** What a string should hold: its Japanese, absent to fall back to English, and its comment. */
export interface Target {
  japanese?: string;
  where: string;
}

function fail(file: string, text: string, at: Span, problem: string): never {
  const line = text.slice(0, at.start).split("\n").length;
  throw new Error(`${file}:${line}: ${problem}`);
}

const isString = (node: Expression): node is StringLiteral =>
  node.type === "Literal" && typeof node.value === "string";

const nameOf = ({ key, computed }: ObjectProperty): string | undefined => {
  if (computed) return undefined;
  if (key.type === "Identifier") return key.name;
  return key.type === "Literal" && typeof key.value === "string" ? key.value : undefined;
};

/** The object `export const <name> = { … }` holds, through any `as const` and `satisfies`. */
const sectionObject = (program: Program, name: string): ObjectExpression | undefined => {
  for (const statement of program.body) {
    if (statement.type !== "ExportNamedDeclaration") continue;
    if (statement.declaration?.type !== "VariableDeclaration") continue;
    for (const { id, init } of statement.declaration.declarations) {
      if (id.type !== "Identifier" || id.name !== name) continue;
      let value = init;
      while (value?.type === "TSAsExpression" || value?.type === "TSSatisfiesExpression") {
        value = value.expression;
      }
      return value?.type === "ObjectExpression" ? value : undefined;
    }
  }
  return undefined;
};

/** A `/** … *\/` comment's text on one line. */
const oneLine = (comment: Comment) =>
  comment.value
    .slice(1)
    .split("\n")
    .map((line) => line.replace(/^\s*\*?/, "").trim())
    .filter(Boolean)
    .join(" ");

/** Each string in a section file's text, in the file's order. */
const readStrings = (file: string, text: string, name: string): SourceString[] => {
  const { program, comments, errors } = parseSync(file, text, { lang: "ts" });
  if (errors.length) {
    throw new Error(`${file} doesn't parse: ${errors.map((error) => error.message).join("; ")}`);
  }
  const catalog = sectionObject(program, name);
  if (!catalog) throw new Error(`${file} has no \`export const ${name} = { … }\``);
  // A doc comment belongs to the property it ends right before, with only whitespace between.
  const docComments = new Map(
    comments
      .filter((comment) => comment.type === "Block" && comment.value.startsWith("*"))
      .map((comment) => [comment.end, comment]),
  );
  const commentBefore = (at: number) => {
    let end = at;
    while (end > 0 && /\s/.test(text[end - 1] ?? "")) end--;
    return docComments.get(end);
  };
  const strings: SourceString[] = [];
  const visit = (object: ObjectExpression, prefix: string) => {
    for (const property of object.properties) {
      const name = property.type === "Property" ? nameOf(property) : undefined;
      if (property.type !== "Property" || name === undefined) {
        fail(file, text, property, "a section holds only named groups and strings");
      }
      const key = `${prefix}.${name}`;
      const { value } = property;
      if (value.type !== "ObjectExpression") {
        fail(file, text, property, `${key} isn't a string's { en, ja? } or a group of strings`);
      }
      const fields = new Map<string, StringLiteral & { property: ObjectProperty }>();
      for (const field of value.properties) {
        const fieldName = field.type === "Property" ? nameOf(field) : undefined;
        if (field.type === "Property" && fieldName && isString(field.value)) {
          fields.set(fieldName, { ...field.value, property: field });
        }
      }
      const en = fields.get("en");
      if (!en) {
        visit(value, key);
        continue;
      }
      const ja = fields.get("ja");
      if (
        value.properties.length !== fields.size ||
        [...fields.keys()].some((f) => f !== "en" && f !== "ja")
      ) {
        fail(
          file,
          text,
          property,
          `${key} is a string, which holds only en and ja, each in quotes`,
        );
      }
      const comment = commentBefore(property.start);
      strings.push({
        key,
        english: en.value,
        ...(ja && { japanese: ja.value }),
        where: comment ? oneLine(comment) : "",
        at: {
          property: { start: property.start, end: property.end },
          ...(comment && { comment: { start: comment.start, end: comment.end } }),
          en: { start: en.property.start, end: en.property.end },
          ...(ja && {
            ja: {
              property: { start: ja.property.start, end: ja.property.end },
              value: { start: ja.start, end: ja.end },
            },
          }),
        },
      });
    }
  };
  visit(catalog, name);
  return strings;
};

/** A section file, read from disk unless its text is given. */
export const readSection = (file: string, text = readFileSync(file, "utf8")): SourceSection => {
  const name = path.basename(file, ".ts");
  return { name, file, text, strings: readStrings(file, text, name) };
};

/** Every section in the catalog's folder: each `.ts` file but `index.ts`, which joins them. */
export const readCatalog = (dir: string): SourceSection[] =>
  readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .sort()
    .map((file) => readSection(path.join(dir, file)));

interface Splice extends Span {
  text: string;
}

const commentSplice = (text: string, { at }: SourceString, where: string): Splice => {
  const comment = `/** ${where} */`;
  if (at.comment) return { ...at.comment, text: comment };
  const { start } = at.property;
  const indent = text.slice(text.lastIndexOf("\n", start - 1) + 1, start);
  // A string sharing its line gets one of its own, so the comment sits above it.
  return /^\s*$/.test(indent)
    ? { start, end: start, text: `${comment}\n${indent}` }
    : { start, end: start, text: `\n${comment}\n` };
};

const japaneseSplice = ({ at }: SourceString, japanese: string | undefined): Splice => {
  if (japanese !== undefined) {
    const literal = JSON.stringify(japanese);
    return at.ja
      ? { ...at.ja.value, text: literal }
      : { start: at.en.end, end: at.en.end, text: `, ja: ${literal}` };
  }
  if (!at.ja) throw new Error("A string with no Japanese has none to remove");
  // `, ja: "…"` goes, with the comma before it; or `ja: "…", ` where it comes first.
  return at.ja.property.start > at.en.start
    ? { start: at.en.end, end: at.ja.property.end, text: "" }
    : { start: at.ja.property.start, end: at.en.start, text: "" };
};

/** The section's text with each string in `targets` set to its target. oxfmt then tidies the lines. */
export const editSection = (
  section: SourceSection,
  targets: ReadonlyMap<string, Target>,
): string => {
  const splices: Splice[] = [];
  for (const string of section.strings) {
    const target = targets.get(string.key);
    if (!target) continue;
    if (target.where !== string.where)
      splices.push(commentSplice(section.text, string, target.where));
    if (target.japanese !== string.japanese) splices.push(japaneseSplice(string, target.japanese));
  }
  return splices
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, { start, end, text: put }) => text.slice(0, start) + put + text.slice(end),
      section.text,
    );
};

/** A file's text as oxfmt formats it, without writing anything: oxfmt reads it from stdin. */
export const formatted = (file: string, text: string): string =>
  execFileSync("oxfmt", [`--stdin-filepath=${file}`], { input: text, encoding: "utf8" });
