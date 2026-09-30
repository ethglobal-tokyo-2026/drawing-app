import { describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "./gameConfig";
import { POP_IN_WORDS } from "./popInWords";
import { loadPuffyFont, puffyCharacters } from "./puffyFont";
import { TIER_NAMES } from "./tierNames";
import { UNLOCK_SLAMS } from "./tierSlamAndPopIns";

const GIVER = "mika";

describe("loadPuffyFont", () => {
  it("asks for the puffy typeface in every character the game sets in it", () => {
    const load = vi.fn(() => Promise.resolve([]));
    loadPuffyFont(GIVER, { load }, '"Dela Gothic One", sans-serif');

    expect(load).toHaveBeenCalledWith('1em "Dela Gothic One", sans-serif', puffyCharacters(GIVER));
    const asked = new Set(puffyCharacters(GIVER));
    const words = [
      ...TIER_NAMES,
      ...Object.values(UNLOCK_SLAMS),
      ...Object.values(POP_IN_WORDS).flat(),
    ];
    for (const word of words) {
      for (const character of word.jp) expect(asked.has(character)).toBe(true);
    }
    // The multiplier sticker's figure, whatever it reads between ×1.0 and its ceiling.
    for (let tenths = 10; tenths <= GAME_CONFIG.multiplier.max * 10; tenths++) {
      for (const character of (tenths / 10).toFixed(1)) expect(asked.has(character)).toBe(true);
    }
    // The initial a giver without a picture wears, upper-cased as the photo sticker sets it.
    expect(asked.has("M")).toBe(true);
  });

  it("asks nothing where the browser can't load fonts ahead", () => {
    // This file runs without a DOM, so there's no document and no font loading.
    expect(() => loadPuffyFont(GIVER)).not.toThrow();
  });

  it("warns, rather than failing the game, when the typeface can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    loadPuffyFont(GIVER, { load: () => Promise.reject(new Error("offline")) }, '"Dela Gothic One"');

    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
    warn.mockRestore();
  });
});
