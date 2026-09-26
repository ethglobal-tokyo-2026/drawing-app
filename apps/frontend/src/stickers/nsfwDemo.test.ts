// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { isNsfwSticker, markNsfwSticker, readNsfwDemo, saveNsfwDemo } from "./nsfwDemo";

afterEach(() => localStorage.clear());

describe("the NSFW demo", () => {
  it("counts a sticker sealed as NSFW here, or marked by its No., and no other", () => {
    markNsfwSticker("sealed-here");
    saveNsfwDemo({ ...readNsfwDemo(), stickerNos: [152] });
    expect(isNsfwSticker({ id: "sealed-here", number: 147 })).toBe(true);
    expect(isNsfwSticker({ id: "from-elsewhere", number: 152 })).toBe(true);
    expect(isNsfwSticker({ id: "plain", number: 148 })).toBe(false);
  });

  it("starts over from settings it can't read", () => {
    localStorage.setItem("draw.nsfwDemo", JSON.stringify({ myAgeStatus: "teen", stickerIds: [] }));
    expect(readNsfwDemo()).toEqual({ myAgeStatus: null, stickerIds: [], stickerNos: [] });
  });
});
