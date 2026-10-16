import { describe, expect, it } from "vitest";
import { viewingClassOf } from "./viewing";

/** A window whose screen is `width` × `height` CSS px, with a coarse or a fine pointer. */
const screenOf = (width: number, height: number, pointer: "coarse" | "fine") => ({
  screen: { width, height },
  matchMedia: (query: string) => ({ matches: query === `(pointer: ${pointer})` }),
});

describe("viewingClassOf", () => {
  it.each([
    ["an iPhone 17", "phone", screenOf(402, 874, "coarse")],
    ["an iPad Pro 13-inch", "tablet", screenOf(1032, 1376, "coarse")],
    ["a laptop", "tablet", screenOf(1440, 900, "fine")],
  ] as const)("holds %s as a %s", (_, expected, win) => {
    expect(viewingClassOf(win)).toBe(expected);
  });
});
