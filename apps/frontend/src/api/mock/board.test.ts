import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../apiClient";
import type { IsoTime, Person } from "../contract";
import { emptyApi, TEST_OWNER } from "../testing";
import { boardOverlayWith } from "./board";
import { boardSticker, people, sticker } from "./fixtures";

/** Your own sticker below, one you received, and the pretend friend's receipts, which load late. */
function setup() {
  const own = boardSticker({
    sticker: sticker({ artist: TEST_OWNER, ownerId: TEST_OWNER.id }),
    arrivedAt: "2026-09-25T09:00:00.000Z",
    openGift: { id: "gift-own", status: "sent" },
  });
  const received = boardSticker({
    sticker: sticker({ artist: people.ken, ownerId: TEST_OWNER.id }),
    arrivedAt: "2026-09-23T12:00:00.000Z",
  });
  const receivedGifts = new Map<string, { receiver: Person; receivedAt: IsoTime }>();
  const below = emptyApi({
    stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [own] }),
    saveStickerPlacement: vi.fn(emptyApi().saveStickerPlacement),
    markTraySeen: vi.fn(() => Promise.resolve({ newStickerCount: 0 })),
  });
  const overlay = boardOverlayWith({
    receivedStickers: () => [received],
    receivedGifts: () => Promise.resolve(receivedGifts),
  });
  const api: ApiClient = { ...below, ...overlay(below) };
  return { api, below, own, received, receivedGifts };
}

describe("boardOverlayWith", () => {
  it("adds the stickers you received, in arrival order, and gives away what your friend received", async () => {
    const { api, own, received, receivedGifts } = setup();
    receivedGifts.set(own.stickerId, {
      receiver: people.bob,
      receivedAt: "2026-09-26T08:00:00.000Z",
    });
    const { boardStickers } = await api.stickerBoard();
    expect(boardStickers.map((b) => b.stickerId)).toEqual([received.stickerId, own.stickerId]);
    expect(boardStickers[0]).toEqual(received);
    expect(boardStickers[1]).toMatchObject({
      held: false,
      givenTo: { receiver: people.bob },
      openGift: null,
    });
  });

  it("keeps a received sticker's spot and NEW mark itself, and passes your own below", async () => {
    const { api, below, own, received } = setup();
    const spot = { onBoard: true, x: 0.4, y: 0.4, scale: 0.3, rotation: 5, z: 2 };
    await api.saveStickerPlacement(received.stickerId, spot);
    const { newStickerCount } = await api.markTraySeen([received.stickerId, own.stickerId]);
    expect(newStickerCount).toBe(0);
    expect(below.saveStickerPlacement).not.toHaveBeenCalled();
    expect(below.markTraySeen).toHaveBeenCalledExactlyOnceWith([own.stickerId]);
    const { boardStickers } = await api.stickerBoard();
    const kept = boardStickers.find((b) => b.stickerId === received.stickerId);
    expect(kept?.placement).toEqual(spot);
    expect(kept?.seenAt).not.toBeNull();
  });
});
