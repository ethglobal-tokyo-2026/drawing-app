import type { BoardSticker } from "../contract";
import { boardSticker, imagesOf, people, sticker, trailEntry } from "./fixtures";
import type { Overlay } from "./index";

const received = sticker({
  id: "mock-received",
  number: 88,
  images: imagesOf("fox"),
  artist: people.mika,
  sealedAt: "2026-09-21T03:00:00.000Z",
});
const given = sticker({
  id: "mock-given",
  number: 61,
  images: imagesOf("fish"),
  artist: people.ken,
  ownerId: people.bob.id,
  sealedAt: "2026-09-18T03:00:00.000Z",
});
const givenAt = "2026-09-23T03:00:00.000Z";

/**
 * The board's fixtures: a sticker @mika gave you that you haven't thanked, and one of @ken's you gave
 * @bob, who received it. Their spots are fixed: the mock saves none.
 */
export const boardOverlay: Overlay = (below) => {
  const extra = (me: string): BoardSticker[] => [
    boardSticker({
      sticker: { ...received, ownerId: me },
      placement: { onBoard: true, x: 0.62, y: 0.2, scale: 0.28, rotation: 6, z: 1 },
    }),
    boardSticker({
      sticker: given,
      placement: { onBoard: true, x: 0.3, y: 0.72, scale: 0.26, rotation: -8, z: 1 },
      held: false,
      givenTo: { receiver: people.bob, receivedAt: givenAt },
    }),
  ];

  return {
    async stickerBoard() {
      const board = await below.stickerBoard();
      return { ...board, boardStickers: [...extra(board.owner.id), ...board.boardStickers] };
    },
    async saveStickerPlacement(stickerId, placement) {
      if (stickerId !== received.id) return below.saveStickerPlacement(stickerId, placement);
      return { stickerId, placement, seenAt: null, arrivedAt: received.sealedAt };
    },
    async stickerDetail(stickerId) {
      if (stickerId !== received.id && stickerId !== given.id)
        return below.stickerDetail(stickerId);
      const { owner } = await below.stickerBoard();
      return stickerId === received.id
        ? {
            sticker: { ...received, ownerId: owner.id },
            owner,
            transferTrail: [
              trailEntry({ giftId: "mock-gift-1", receiver: owner, receivedAt: givenAt }),
            ],
          }
        : {
            sticker: given,
            owner: people.bob,
            transferTrail: [
              trailEntry({
                giftId: "mock-gift-2",
                giver: owner,
                receiver: people.bob,
                receivedAt: givenAt,
              }),
            ],
          };
    },
  };
};
