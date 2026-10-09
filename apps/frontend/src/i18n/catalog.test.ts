import { describe, expect, it } from "vitest";
import { BREAK_HINT, resourcesIn, type Strings } from "./catalog";
import { strings } from "./strings";

/** One language's strings by dotted key, as i18next looks them up. */
const byKey = (resources: Strings, prefix = ""): [string, string][] =>
  Object.entries(resources).flatMap(([name, value]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    return typeof value === "string" ? [[key, value]] : byKey(value, key);
  });

/** A string's `{{variables}}` and `<tags>`, in order, any attributes kept. */
const placeholders = (text: string) =>
  text.match(/\{\{[^{}]*\}\}|<\/?[A-Za-z0-9]+(?:\s[^<>]*)?\/?>/g) ?? [];

/** Whether each `</tag>` closes the last `<tag>` still open, and none is left open. */
const nests = (tokens: readonly string[]) => {
  const open: string[] = [];
  for (const token of tokens) {
    if (token.startsWith("</")) {
      if (open.pop() !== token.replace("/", "")) return false;
    } else if (token.startsWith("<") && !token.endsWith("/>")) open.push(token);
  }
  return open.length === 0;
};

describe("the catalog", () => {
  it("gives each Japanese string its English's {{variables}} and <tags>, a break hint aside", () => {
    const english = new Map(byKey(resourcesIn(strings, "en")));
    const wrong = byKey(resourcesIn(strings, "ja")).flatMap(([key, japanese]) => {
      const expected = placeholders(english.get(key) ?? "");
      // Japanese may reorder them, so long as its tags still nest.
      const found = placeholders(japanese.replaceAll(BREAK_HINT, ""));
      const same = JSON.stringify(found.toSorted()) === JSON.stringify(expected.toSorted());
      return same && nests(found)
        ? []
        : [`${key}: "${expected.join("")}" in English, "${found.join("")}" in Japanese`];
    });
    expect(wrong).toEqual([]);
  });
});
