import type { BoardStickerView } from "./boardSticker";

/** For tests: a board sticker's fields that say it's your own, held, with no gift. */
export const yoursHeld: Pick<
  BoardStickerView,
  "artist" | "held" | "hasTimelapse" | "trail" | "givenTo" | "openGift"
> = {
  artist: { id: "me", handle: "me", name: "Me", nsfwOptIn: false },
  held: true,
  hasTimelapse: false,
  trail: { timesGiven: 0, newestHasGratitude: false },
  givenTo: null,
  openGift: null,
};
