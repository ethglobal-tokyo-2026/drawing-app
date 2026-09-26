import type { BoardSticker, IsoTime, Person, Placement } from "../contract";
import type { Overlay } from "./index";

type Answer<T> = T | Promise<T>;

/** What the board's fixtures read from the other overlays, each time they answer. */
export interface BoardSources {
  /** Stickers you received on this page load, as your board holds them. */
  receivedStickers: () => Answer<readonly BoardSticker[]>;
  /** Your stickers the pretend friend received, by sticker ID. */
  receivedGifts: () => Answer<ReadonlyMap<string, { receiver: Person; receivedAt: IsoTime }>>;
}

/**
 * The board's fixtures: the stickers you received join your own, and the ones the pretend friend
 * received are given away. A received sticker's spot and NEW mark are kept here, for the page load.
 */
export function boardOverlayWith(sources: BoardSources): Overlay {
  return (below) => {
    const placements = new Map<string, Placement>();
    const seen = new Map<string, IsoTime>();
    const received = async () =>
      (await sources.receivedStickers()).map((b): BoardSticker => ({
        ...b,
        placement: placements.get(b.stickerId) ?? b.placement,
        seenAt: seen.get(b.stickerId) ?? b.seenAt,
      }));

    return {
      stickerBoard: async () => {
        const [board, given, theirs] = await Promise.all([
          below.stickerBoard(),
          sources.receivedGifts(),
          received(),
        ]);
        const yours = board.boardStickers.map((b): BoardSticker => {
          const to = given.get(b.stickerId);
          return to ? { ...b, held: false, givenTo: { ...to }, openGift: null } : b;
        });
        // In the sticker tray's order.
        const boardStickers = [...yours, ...theirs].sort(
          (a, b) => Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt),
        );
        return { owner: board.owner, boardStickers };
      },

      saveStickerPlacement: async (stickerId, placement) => {
        const theirs = (await received()).find((b) => b.stickerId === stickerId);
        if (!theirs) return below.saveStickerPlacement(stickerId, placement);
        placements.set(stickerId, placement);
        return { stickerId, placement, seenAt: theirs.seenAt, arrivedAt: theirs.arrivedAt };
      },

      markTraySeen: async (stickerIds) => {
        const theirs = await received();
        const ids = new Set(theirs.map((b) => b.stickerId));
        const now = new Date().toISOString();
        for (const id of stickerIds) if (ids.has(id) && !seen.has(id)) seen.set(id, now);
        const { newStickerCount } = await below.markTraySeen(
          stickerIds.filter((id) => !ids.has(id)),
        );
        const unseen = theirs.filter((b) => b.seenAt === null && !seen.has(b.stickerId));
        return { newStickerCount: newStickerCount + unseen.length };
      },
    };
  };
}

/** Until Receiving and Giving hand over what their fixtures did, nothing is received either way. */
export const boardOverlay = boardOverlayWith({
  receivedStickers: () => [],
  receivedGifts: () => new Map(),
});
