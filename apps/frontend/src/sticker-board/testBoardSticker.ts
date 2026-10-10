import type { BoardSticker as ApiBoardSticker } from "@drawing-app/api/client";
import { testStickerUrls } from "../stickers/testStickerUrls";
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

/**
 * For tests: a board sticker of your own, held with no gift, on the board and unseen in the sticker
 * tray; `overrides` replace any of its fields. Its phone spot is its `placement`.
 */
export function testBoardSticker(overrides: Partial<BoardStickerView> = {}): BoardStickerView {
  const id = overrides.id ?? "s1";
  const placement = overrides.placement ?? { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 };
  return {
    id,
    no: 1,
    createdAt: 0,
    arrivedAt: 0,
    seenAt: null,
    timeUsed: 60,
    drawnWidth: 480,
    drawnHeight: 480,
    width: 100,
    height: 80,
    nsfw: false,
    kyotoSeikaSubjects: null,
    urls: testStickerUrls(id),
    placement,
    placements: { phone: placement, large: null },
    artist: { id: "me", handle: "me", name: "Me", nsfwOptIn: false },
    held: true,
    hasTimelapse: false,
    trail: { timesGiven: 0, newestHasGratitude: false },
    givenTo: null,
    openGift: null,
    ...overrides,
  };
}
