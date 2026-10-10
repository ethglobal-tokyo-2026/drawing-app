import type { BoardSticker as ApiBoardSticker } from "@drawing-app/api/client";
import {
  toMs,
  toPerson,
  toRecordPlacement,
  toSticker,
  type PersonView,
  type StickerView,
} from "../api/views";
import type { StickerUrls } from "../stickers/stickerUrls";
import {
  freeSpot,
  nextZ,
  PHONE_BOARD_SIZE,
  type Art,
  type BoardLayout,
  type BoardSize,
  type Placement,
  type Spots,
  type Taken,
} from "./placement";

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
  /** Its image's size on the sheet it was drawn on, in sheet units: what sizes it on a board. */
  drawnWidth: number;
  drawnHeight: number;
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
  /** Sealed with its timelapse, and not veiled for you, so its detail offers Timelapse. */
  hasTimelapse: boolean;
  /** Its Transfer Trail's outline, which holds the trail's place in its detail until it's read. */
  trail: { timesGiven: number; newestHasGratitude: boolean };
  /** Set when `held` is false. */
  givenTo: GivenTo | null;
  /**
   * Its gift while packed or on its way. `to` is the handle of who it waits for: the person the giver
   * picked in the app, or whoever first opened its link, since LINE's friend picker never says who.
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
interface Placements {
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

/** The spots the board found for a sticker it had never placed, by layout, for saving. */
export interface NewSpots {
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
    drawnWidth: s.drawnWidth,
    drawnHeight: s.drawnHeight,
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
    hasTimelapse: b.hasTimelapse,
    trail: b.trail,
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

/**
 * On the board: stuck on, and still held. A sticker in a gift, packed or on its way, has left it for
 * its tray spot, whatever its spot on the board.
 */
export const onTheBoard = <
  S extends Pick<BoardStickerView, "held" | "openGift"> & { placement: Placement | null },
>(
  s: S,
): s is S & { placement: Placement } => s.placement?.on === true && s.held && !s.openGift;

/** Whether two spots put a sticker in the same place, on the board or in the tray; stacking aside. */
export const samePlace = (a: Placement | null | undefined, b: Placement | null | undefined) =>
  a === b ||
  (!!a && !!b && a.on === b.on && a.x === b.x && a.y === b.y && a.s === b.s && a.r === b.r);

/** Each sticker's spots, by its id. */
export const spotsById = (
  stickers: readonly { id: string; placements: Placements }[],
): ReadonlyMap<string, Placements> => new Map(stickers.map((s) => [s.id, s.placements]));

/**
 * The spots the board moved its stickers to since they were drawn from `from`'s spots, by sticker and
 * layout. Raising a sticker on top isn't a move.
 */
export function movedSince(
  stickers: readonly PlacedBoardSticker[],
  from: ReadonlyMap<string, Placements>,
): Map<string, Spots> {
  const moved = new Map<string, Spots>();
  for (const { id, placements } of stickers) {
    const was = from.get(id);
    const spots: Spots = {};
    if (!samePlace(placements.phone, was?.phone)) spots.phone = placements.phone;
    if (placements.large && !samePlace(placements.large, was?.large))
      spots.large = placements.large;
    if (spots.phone || spots.large) moved.set(id, spots);
  }
  return moved;
}

/** A listed sticker's spot in one layout. */
interface Listed extends Taken, Pick<BoardStickerView, "held" | "openGift"> {}

/**
 * A free spot in `layout` for `s`, on top of every listed spot, which it joins: on the board, or at
 * that spot in the tray. Only the stickers on the board take up room there.
 */
function landIn(
  listed: Listed[],
  s: Art & Pick<BoardStickerView, "held" | "openGift">,
  on: boolean,
  layout: BoardLayout,
  board: BoardSize,
): Placement {
  const placement = {
    on,
    ...freeSpot(listed.filter(onTheBoard), s, layout, board),
    z: nextZ(listed.map((t) => t.placement)),
  };
  listed.push({ placement, art: s, held: s.held, openGift: s.openGift });
  return placement;
}

/**
 * Every sticker at a spot in the phone's layout, and in the large layout once the board has one. A
 * spot the board moved a sticker to (`moved`) wins over the load's in its layout, since the board's
 * moves are newer than any load. One never placed lands on top in each layout, clear of the stickers
 * on the board for its size on `boards`; one you hold that the large layout is missing goes there on
 * the board or in the tray, as on the phone. Each spot found is listed for saving.
 */
export function placeUnplaced(
  loaded: readonly UnplacedBoardSticker[],
  moved: ReadonlyMap<string, Spots> = new Map(),
  boards: Partial<Record<BoardLayout, BoardSize>> = {},
): { stickers: PlacedBoardSticker[]; placed: NewSpots[] } {
  const list = loaded.map((s) => {
    const spots = moved.get(s.id);
    if (!spots) return s;
    const { phone, large } = s.placements;
    return { ...s, placements: { phone: spots.phone ?? phone, large: spots.large ?? large } };
  });
  const large = hasLargeLayout(list);
  const listedIn = (layout: BoardLayout) =>
    list.flatMap((s): Listed[] => {
      const placement = s.placements[layout];
      return placement ? [{ placement, art: s, held: s.held, openGift: s.openGift }] : [];
    });
  const listed = { phone: listedIn("phone"), large: listedIn("large") };
  const boardFor = (layout: BoardLayout) => boards[layout] ?? PHONE_BOARD_SIZE;
  const placed: NewSpots[] = [];
  const stickers = list.map((s): PlacedBoardSticker => {
    const spots: Spots = {};
    const phone =
      s.placements.phone ??
      (spots.phone = landIn(listed.phone, s, true, "phone", boardFor("phone")));
    const inLarge =
      s.placements.large ??
      (large && s.held
        ? (spots.large = landIn(listed.large, s, phone.on, "large", boardFor("large")))
        : null);
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
