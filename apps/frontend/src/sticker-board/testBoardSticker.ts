import type { BoardStickerView } from "./boardSticker";

/** For tests: a board sticker's fields that say it's your own, held, with no gift. */
export const yoursHeld: Pick<
  BoardStickerView,
  "artist" | "held" | "hasTimelapse" | "givenTo" | "openGift"
> = {
  artist: { id: "me", handle: "me", name: "Me", nsfwOptIn: false },
  held: true,
  hasTimelapse: false,
  givenTo: null,
  openGift: null,
};
