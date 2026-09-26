import type { BoardSticker } from "./boardSticker";

/** For tests: a board sticker's fields that say it's your own, held, seen, with no gift. */
export const yoursHeld: Pick<BoardSticker, "artist" | "held" | "seen" | "givenTo" | "openGift"> = {
  artist: { id: "me", handle: "me", name: "Me" },
  seen: true,
  held: true,
  givenTo: null,
  openGift: null,
};
