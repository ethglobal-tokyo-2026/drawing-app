import type { StickerUrls } from "./stickerUrls";

/** For tests: every image a sticker has, each at its own made-up URL named after `name`. */
export const testStickerUrls = (name: string): StickerUrls => ({
  png: `${name}.png`,
  mask: `${name}-mask.png`,
});
