import type { BoardStickerView } from "./boardSticker";

/** For tests: a board sticker's fields that say it's your own, held, with no gift. */
export const yoursHeld: Pick<BoardStickerView, "artist" | "held" | "givenTo" | "openGift"> = {
  artist: { id: "me", handle: "me", name: "Me", ageStatus: "adult" },
  held: true,
  givenTo: null,
  openGift: null,
};
