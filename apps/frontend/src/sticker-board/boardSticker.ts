import type { BoardSticker as ApiBoardSticker } from "@drawing-app/api/client";
import { toMs, toPerson, toRecordPlacement, toSticker, type PersonView } from "../api/views";
import type { Placement } from "./placement";
import type { StickerUrls } from "../stickers/stickerUrls";
import { freeSpot, nextZ } from "./placement";

/** A sticker as the board holds it: what it draws, where it sits, and where its gift is. */
export interface BoardSticker {
  id: string;
  /** Printed as No.0147. */
  no: number;
  /** When it was sealed, in milliseconds. */
  createdAt: number;
  /** When it reached you, in milliseconds: the sticker tray's order. */
  arrivedAt: number;
  /** Seen in the open sticker tray, so it isn't NEW. */
  seen: boolean;
  timeUsed: number;
  width: number;
  height: number;
  /** The cut line, an SVG path in image pixels; absent for stickers sealed before it was kept. */
  outline?: string;
  urls: StickerUrls;
  placement: Placement;
  /** The Original Artist. */
  artist: PersonView;
  /** False once given away: a given sticker silhouette on the board, an empty spot in the tray. */
  held: boolean;
  /** Who received it, once it's given away. */
  givenTo: { receiver: PersonView; receivedAt: number } | null;
  /** Its gift while packed or on its way; LINE's friend picker never says who was picked. */
  openGift: { id: string; status: "packed" | "sent" } | null;
}

/** A board sticker as it comes from the API; its placement may not be settled yet. */
export type UnplacedBoardSticker = Omit<BoardSticker, "placement"> & {
  placement: Placement | null;
};

export function toBoardSticker(b: ApiBoardSticker): UnplacedBoardSticker {
  const sticker = toSticker(b.sticker);
  return {
    id: sticker.id,
    no: sticker.no,
    createdAt: sticker.sealedAt,
    arrivedAt: toMs(b.arrivedAt),
    seen: b.seenAt !== null,
    timeUsed: sticker.timeUsed,
    width: sticker.width,
    height: sticker.height,
    // The API sends an empty cut line for a sticker sealed before it was kept.
    ...(sticker.outline && { outline: sticker.outline }),
    urls: sticker.urls,
    placement: b.placement && toRecordPlacement(b.placement),
    artist: sticker.artist,
    held: b.held,
    givenTo: b.givenTo && {
      receiver: toPerson(b.givenTo.receiver),
      receivedAt: toMs(b.givenTo.receivedAt),
    },
    openGift: b.openGift,
  };
}

/**
 * Settles every sticker's placement, oldest first. One without a placement gets a free spot on top
 * of the others, and `keep` saves it so it doesn't move when others do.
 */
export function placeUnplaced(
  stickers: readonly UnplacedBoardSticker[],
  keep: (sticker: BoardSticker) => void,
): BoardSticker[] {
  const placements = stickers.flatMap((s) => (s.placement ? [s.placement] : []));
  return stickers.map((s) => {
    if (s.placement) return { ...s, placement: s.placement };
    const placement: Placement = {
      on: true,
      ...freeSpot(placements.filter((p) => p.on)),
      z: nextZ(placements),
    };
    placements.push(placement);
    const placed = { ...s, placement };
    keep(placed);
    return placed;
  });
}
