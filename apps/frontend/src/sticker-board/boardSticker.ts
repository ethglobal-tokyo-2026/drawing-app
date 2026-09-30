import type { BoardSticker as ApiBoardSticker } from "@drawing-app/api/client";
import { toMs, toPerson, toRecordPlacement, toSticker, type PersonView } from "../api/views";
import { formatHandle } from "../stickers/format";
import type { StickerUrls } from "../stickers/stickerUrls";
import { freeSpot, nextZ, type Placement } from "./placement";

/** A sticker at its spot, as a Sticker Board's parts draw it. */
export interface BoardSticker {
  id: string;
  no: number;
  /** When it was sealed, in milliseconds. */
  createdAt: number;
  /** Seconds on the drawing clock. */
  timeUsed: number;
  width: number;
  height: number;
  /** The cut line, an SVG path in image pixels. Older stickers don't have one. */
  outline?: string;
  urls: StickerUrls;
  placement: Placement;
  /** An NSFW sticker: pink foil, and blurred for anyone not adult. */
  nsfw: boolean;
  /** Someone else's board hands its demo stickers a stand-in image, which nothing reads. */
  blob?: Blob;
}

/** Who received a sticker you gave, and when, in milliseconds. */
interface GivenTo {
  receiver: PersonView;
  receivedAt: number;
}

/** One of your Sticker Board's stickers: where it sits, who drew it, and where its gift is. */
export interface BoardStickerView extends Omit<BoardSticker, "blob"> {
  /** The Original Artist. */
  artist: PersonView;
  /** <number>.<artist>.croquis.eth, once it's onchain. */
  ensName?: string;
  /** False once it's been given away and received. */
  held: boolean;
  /** Set when `held` is false. */
  givenTo: GivenTo | null;
  /**
   * Its gift while packed or on its way. `to` is the handle of who it waits for: the artist picked in
   * the app, or whoever first opened its link, since LINE's friend picker never says who was picked.
   */
  openGift: { id: string; status: "packed" | "sent"; to?: string } | null;
  /** When the open sticker tray showed it, in milliseconds; null shows NEW. */
  seenAt: number | null;
  /** When it came to you, in milliseconds: the sticker tray's order. */
  arrivedAt: number;
}

/** A board sticker as the API sends it: its placement is null until the board first places it. */
export type UnplacedBoardSticker = Omit<BoardStickerView, "placement"> & {
  placement: Placement | null;
};

export function toBoardSticker(b: ApiBoardSticker): UnplacedBoardSticker {
  const s = toSticker(b.sticker);
  return {
    id: s.id,
    no: s.no,
    createdAt: s.sealedAt,
    timeUsed: s.timeUsed,
    width: s.width,
    height: s.height,
    // An empty cut line is one the sticker doesn't have.
    ...(s.outline && { outline: s.outline }),
    urls: s.urls,
    nsfw: s.nsfw,
    placement: b.placement && toRecordPlacement(b.placement),
    artist: s.artist,
    ...(s.ensName && { ensName: s.ensName }),
    held: b.held,
    givenTo: b.givenTo && {
      receiver: toPerson(b.givenTo.receiver),
      receivedAt: toMs(b.givenTo.receivedAt),
    },
    openGift: b.openGift && {
      id: b.openGift.id,
      status: b.openGift.status,
      ...(b.openGift.for?.handle && { to: b.openGift.for.handle }),
    },
    seenAt: b.seenAt === null ? null : toMs(b.seenAt),
    arrivedAt: toMs(b.arrivedAt),
  };
}

/** Sent and not received yet: it has left the board and the tray for the badge. */
export const onItsWay = (s: Pick<BoardStickerView, "held" | "openGift">) =>
  s.held && s.openGift?.status === "sent";

/** On the board: stuck on, and still held rather than given away or on its way. */
export const onTheBoard = <S extends Pick<UnplacedBoardSticker, "placement" | "held" | "openGift">>(
  s: S,
): s is S & { placement: Placement } => s.placement?.on === true && s.held && !onItsWay(s);

/** How a person is printed: their handle, or their name until they've chosen one. */
export const handleOf = (p: PersonView) => (p.handle === null ? p.name : formatHandle(p.handle));

/**
 * Every sticker at a spot. One the board already holds keeps its spot there, since the board's moves
 * are newer than any load; one never placed goes to a free spot on top of the others, and is listed
 * in `placed` for saving, so it stays put when others move.
 */
export function placeUnplaced(
  loaded: readonly UnplacedBoardSticker[],
  held: readonly BoardStickerView[] = [],
): {
  stickers: BoardStickerView[];
  placed: BoardStickerView[];
} {
  const spots = new Map(held.map((s) => [s.id, s.placement]));
  const list = loaded.map((s) => ({ ...s, placement: spots.get(s.id) ?? s.placement }));
  const placements = list.flatMap((s) => (s.placement ? [s.placement] : []));
  const placed: BoardStickerView[] = [];
  const stickers = list.map((s): BoardStickerView => {
    if (s.placement) return { ...s, placement: s.placement };
    const placement: Placement = {
      on: true,
      ...freeSpot(placements.filter((p) => p.on)),
      z: nextZ(placements),
    };
    placements.push(placement);
    const sticker = { ...s, placement };
    placed.push(sticker);
    return sticker;
  });
  return { stickers, placed };
}
