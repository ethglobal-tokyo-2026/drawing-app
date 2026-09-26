import type { BoardSticker } from "../contract";
import { boardSticker, gratitude, imagesOf, people, sticker, trailEntry } from "./fixtures";
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
 * @bob, who received it, with a long Transfer Trail. Their spots are fixed: the mock saves none.
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
            // Newest first: you gave it to @bob; before that it went @mika → @ken → @mika → you.
            transferTrail: [
              trailEntry({
                giftId: "mock-gift-4",
                giver: owner,
                receiver: people.bob,
                receivedAt: givenAt,
                gratitude: gratitude({
                  giftId: "mock-gift-4",
                  total: 2946,
                  originalArtistGratitudeShare: 589,
                }),
              }),
              trailEntry({
                giftId: "mock-gift-3",
                giver: people.mika,
                receiver: owner,
                receivedAt: "2026-09-21T09:30:00.000Z",
                gratitude: gratitude({
                  giftId: "mock-gift-3",
                  total: 820,
                  originalArtistGratitudeShare: 164,
                }),
              }),
              trailEntry({
                giftId: "mock-gift-2",
                giver: people.ken,
                receiver: people.mika,
                receivedAt: "2026-09-19T20:00:00.000Z",
                gratitude: gratitude({ giftId: "mock-gift-2", total: 450 }),
              }),
              trailEntry({
                giftId: "mock-gift-1b",
                giver: people.mika,
                receiver: people.ken,
                receivedAt: "2026-09-18T21:00:00.000Z",
              }),
            ],
          };
    },
  };
};
