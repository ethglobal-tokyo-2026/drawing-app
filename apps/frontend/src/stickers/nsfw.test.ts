import { describe, expect, it } from "vitest";
import { withoutNsfwDrawings } from "./nsfw";
import { testStickerUrls } from "./testStickerUrls";

describe("withoutNsfwDrawings", () => {
  it("leaves an NSFW sticker neither its drawing nor its sharp copy, and the rest as they are", () => {
    const urls = { ...testStickerUrls("blob:1"), sharp: "blob:1-sharp.webp" };
    const [nsfw, plain] = withoutNsfwDrawings([
      { nsfw: true, urls },
      { nsfw: false, urls },
    ]);
    expect(nsfw?.urls.png).not.toBe(urls.png);
    expect(nsfw?.urls.sharp).toBeUndefined();
    // Its cut still shapes the figure under the 18+ mark.
    expect(nsfw?.urls.mask).toBe(urls.mask);
    expect(plain?.urls).toBe(urls);
  });
});
