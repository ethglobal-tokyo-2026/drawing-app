import type { StickerUrls } from "./stickerUrls";

/** For tests: a sticker's images, each at its own URL starting with `name`, and no foil mask. */
export const testStickerUrls = (name: string): StickerUrls => ({
  png: `${name}.png`,
  mask: `${name}-mask.png`,
  spec: `${name}-spec.png`,
  rim: `${name}-rim.png`,
});
