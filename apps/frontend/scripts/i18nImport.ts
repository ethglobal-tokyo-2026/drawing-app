/**
 * Reads a translator's sheet from `i18n:export` back into the Japanese catalog, then reports the keys
 * added, changed and removed in each section. An empty Japanese cell falls back to English. It
 * refuses, writing nothing, when a row's key isn't in English or is the developer slip's, or its
 * Japanese changes the English's {{variables}} or <tags>. It rewrites tracked files only, so
 * `git diff` shows the change and `git checkout` undoes it.
 *
 *   pnpm --filter frontend i18n:import <file.csv>
 */
import path from "node:path";
import { en } from "../src/i18n/en";
import { ja } from "../src/i18n/ja";
import { importSheet, pathFromArgument } from "./translatorSheet";

const source = pathFromArgument(process.argv[2], "pnpm --filter frontend i18n:import <file.csv>");
const { problems } = importSheet(source, {
  en,
  ja,
  jaDir: path.join(import.meta.dirname, "../src/i18n/ja"),
});
if (problems.length) process.exitCode = 1;
