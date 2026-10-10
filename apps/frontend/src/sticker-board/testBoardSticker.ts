import type { BoardSticker as ApiBoardSticker } from "@drawing-app/api/client";
import type { BoardStickerView } from "./boardSticker";

/** For tests: a spot on the board as the API sends it, upright at the usual size. */
export const placedAt = (x: number, y = 0.5): NonNullable<ApiBoardSticker["placement"]> => ({
  onBoard: true,
  x,
  y,
  scale: 0.3,
  rotation: 0,
  z: 1,
});

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
