import { describe, expect, it } from "vitest";
import { sharpToLoad } from "./sharpImage";

const urls = { sharp: "https://cdn.test/0xabc.sharp.webp" };
/** The stored image's width, in image px. */
const WIDTH = 704;

describe("sharpToLoad", () => {
  it("loads the sharp copy only once the screen shows more pixels than the stored image holds", () => {
    expect(sharpToLoad(urls, WIDTH, WIDTH / 2, 2)).toBeNull();
    expect(sharpToLoad(urls, WIDTH, WIDTH / 2 + 1, 2)).toBe(urls.sharp);
    expect(sharpToLoad(urls, WIDTH, WIDTH, 1)).toBeNull();
    expect(sharpToLoad(urls, WIDTH, WIDTH / 3 + 1, 3)).toBe(urls.sharp);
  });

  it("keeps the stored image for a sticker sealed without a sharp copy", () => {
    expect(sharpToLoad({}, WIDTH, WIDTH * 2, 2)).toBeNull();
  });
});
