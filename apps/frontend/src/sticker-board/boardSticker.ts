import type { BoardSticker as ApiBoardSticker } from "@drawing-app/api/client";
import {
  toMs,
  toPerson,
  toRecordPlacement,
  toSticker,
  type PersonView,
  type StickerView,
} from "../api/views";
import { formatHandle } from "../stickers/format";
import type { StickerUrls } from "../stickers/stickerUrls";
import { freeSpot, nextZ, type BoardLayout, type Placement, type Spots } from "./placement";

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
  /** The cut line, an SVG path in image pixels. The board kept on this phone carries none. */
  outline?: string;
  urls: StickerUrls;
  placement: Placement;
  /** An NSFW sticker: pink foil, and blurred for anyone without the NSFW opt-in. */
  nsfw: boolean;
  /** Drawn in Kyoto Seika Practice Mode: the pair it was drawn from; null on any other. */
  kyotoSeikaSubjects: StickerView["kyotoSeikaSubjects"];
}

/** Who received a sticker you gave, and when, in milliseconds. */
interface GivenTo {
  receiver: PersonView;
  receivedAt: number;
}

/**
 * One of your Sticker Board's stickers as the board shows it: `placement` is its spot in the layout
 * on screen.
 */
export interface BoardStickerView extends BoardSticker {
  /** The Original Artist. */
  artist: PersonView;
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
  /** Its spot in each layout: always the phone's, and the large layout's once the board has one. */
  placements: {
    phone: Placement;
    large: Placement | null;
  };
}

/** A sticker's spot in each layout; null until that layout first places it. */
export interface Placements {
  phone: Placement | null;
  large: Placement | null;
}

/** A board sticker the board has placed, before it's shown in a layout. */
export type PlacedBoardSticker = Omit<BoardStickerView, "placement">;

/** A board sticker as the API sends it: each spot null until the board first places it there. */
export type UnplacedBoardSticker = Omit<PlacedBoardSticker, "placements"> & {
  placements: Placements;
};

/** Whether the board has a large layout yet: any of its stickers placed in it. */
export const hasLargeLayout = (stickers: readonly { placements: Placements }[]) =>
  stickers.some((s) => s.placements.large !== null);

/** A placed sticker's spots, with `layout`'s moved to `placement`. */
export const movedIn = (
  placements: PlacedBoardSticker["placements"],
  layout: BoardLayout,
  placement: Placement,
): PlacedBoardSticker["placements"] =>
  layout === "large" ? { ...placements, large: placement } : { ...placements, phone: placement };

/** The spots the board gave a sticker, by layout, for saving. */
export interface GivenSpots {
  sticker: PlacedBoardSticker;
  spots: Spots;
}

export function toBoardSticker(b: ApiBoardSticker): UnplacedBoardSticker {
  const s = toSticker(b.sticker);
  return {
    id: s.id,
    no: s.no,
    createdAt: s.sealedAt,
    timeUsed: s.timeUsed,
    width: s.width,
    height: s.height,
    outline: s.outline,
    urls: s.urls,
    nsfw: s.nsfw,
    kyotoSeikaSubjects: s.kyotoSeikaSubjects,
    placements: {
      phone: b.placement && toRecordPlacement(b.placement),
      large: b.largePlacement && toRecordPlacement(b.largePlacement),
    },
    artist: s.artist,
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

/** Sent and not received yet: it has left the board, and waits in its tray spot under frost. */
export const onItsWay = (s: Pick<BoardStickerView, "held" | "openGift">) =>
  s.held && s.openGift?.status === "sent";

/** On the board: stuck on, and still held rather than given away or on its way. */
export const onTheBoard = <
  S extends Pick<BoardStickerView, "held" | "openGift"> & { placement: Placement | null },
>(
  s: S,
): s is S & { placement: Placement } => s.placement?.on === true && s.held && !onItsWay(s);

/** How a person is printed: their handle, or their name until they've chosen one. */
export const handleOf = (p: PersonView) => (p.handle === null ? p.name : formatHandle(p.handle));

/** A free spot in `layout` on top of `taken`, which it joins: on the board, or at that spot in the tray. */
function landIn(taken: Placement[], on: boolean, layout: BoardLayout): Placement {
  const placement = {
    on,
    ...freeSpot(
      taken.filter((p) => p.on),
      layout,
    ),
    z: nextZ(taken),
  };
  taken.push(placement);
  return placement;
}

/**
 * Every sticker at a spot in the phone's layout, and in the large layout once the board has one. One
 * the board already holds keeps its spots, since the board's moves are newer than any load. One never
 * placed lands on top in each layout; one you hold that the large layout is missing goes there on the
 * board or in the tray, as on the phone. Each spot given is listed for saving.
 */
export function placeUnplaced(
  loaded: readonly UnplacedBoardSticker[],
  held: readonly PlacedBoardSticker[] = [],
): { stickers: PlacedBoardSticker[]; placed: GivenSpots[] } {
  const heldSpots = new Map(held.map((s) => [s.id, s.placements]));
  const list = loaded.map((s) => ({ ...s, placements: heldSpots.get(s.id) ?? s.placements }));
  const large = hasLargeLayout(list);
  const taken = {
    phone: list.flatMap((s) => s.placements.phone ?? []),
    large: list.flatMap((s) => s.placements.large ?? []),
  };
  const placed: GivenSpots[] = [];
  const stickers = list.map((s): PlacedBoardSticker => {
    const spots: Spots = {};
    const phone = s.placements.phone ?? (spots.phone = landIn(taken.phone, true, "phone"));
    const inLarge =
      s.placements.large ??
      (large && s.held ? (spots.large = landIn(taken.large, phone.on, "large")) : null);
    const sticker = { ...s, placements: { phone, large: inLarge } };
    if (spots.phone || spots.large) placed.push({ sticker, spots });
    return sticker;
  });
  return { stickers, placed };
}

const views = new WeakMap<PlacedBoardSticker, Partial<Record<BoardLayout, BoardStickerView>>>();

/**
 * Each sticker as the board shows it in `layout`; one that layout hasn't placed (a sticker you gave)
 * shows its phone spot. A sticker that hasn't changed keeps its view, so only moved stickers redraw.
 */
export function shownIn(
  layout: BoardLayout,
  stickers: readonly PlacedBoardSticker[],
): BoardStickerView[] {
  return stickers.map((s) => {
    let byLayout = views.get(s);
    if (!byLayout) views.set(s, (byLayout = {}));
    return (byLayout[layout] ??= { ...s, placement: s.placements[layout] ?? s.placements.phone });
  });
}
