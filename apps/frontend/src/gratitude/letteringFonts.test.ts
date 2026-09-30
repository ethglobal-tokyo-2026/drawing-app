import { describe, expect, it, vi } from "vitest";
import { letteringCharacters, loadLetteringFonts } from "./letteringFonts";
import { POP_IN_WORDS } from "./popInWords";
import { TIER_NAMES } from "./tierNames";
import { UNLOCK_SLAMS } from "./tierSlamAndPopIns";

describe("loadLetteringFonts", () => {
  it("asks for the lettering's typeface in every character a slam or pop-in word can show", () => {
    const load = vi.fn(() => Promise.resolve([]));
    loadLetteringFonts({ load }, '"Dela Gothic One", sans-serif');

    expect(load).toHaveBeenCalledWith('1em "Dela Gothic One", sans-serif', letteringCharacters());
    const asked = new Set(letteringCharacters());
    const shown = [
      ...TIER_NAMES,
      ...Object.values(UNLOCK_SLAMS),
      ...Object.values(POP_IN_WORDS).flat(),
    ];
    for (const word of shown) {
      for (const character of word.jp) expect(asked.has(character)).toBe(true);
    }
  });

  it("asks nothing where the browser can't load fonts ahead", () => {
    // This file runs without a DOM, so there's no document and no font loading.
    expect(() => loadLetteringFonts()).not.toThrow();
  });

  it("warns, rather than failing the game, when the typeface can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    loadLetteringFonts({ load: () => Promise.reject(new Error("offline")) }, '"Dela Gothic One"');

    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
    warn.mockRestore();
  });
});
