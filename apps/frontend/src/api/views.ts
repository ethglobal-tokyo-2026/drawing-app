import { i18next } from "../i18n/i18n";
import { formatHandle } from "../stickers/format";
import type { Placement as RecordPlacement, Spots } from "../sticker-board/placement";
import type { StickerUrls } from "../stickers/stickerUrls";
import type {
  IsoTime,
  Person,
  Placement,
  PlacementsRequest,
  Sticker,
} from "@drawing-app/api/client";

/** Someone, as a screen shows them. */
export interface PersonView {
  id: string;
  /** Null until the handle prompt is answered. Print it with formatHandle. */
  handle: string | null;
  /** The LINE name; the handle when LINE's is gone. */
  name: string;
  pictureUrl?: string;
  /** Only someone with the NSFW opt-in sees NSFW stickers unblurred or receives them. */
  nsfwOptIn: boolean;
}

/** A sticker, as a screen draws it. */
export interface StickerView {
  id: string;
  no: number;
  /** The Original Artist. */
  artist: PersonView;
  /** Seconds on the drawing clock. */
  timeUsed: number;
  width: number;
  height: number;
  /** Its image's size on the sheet it was drawn on, in sheet units: what sizes it on a sticker board. */
  drawnWidth: number;
  drawnHeight: number;
  outline: string;
  urls: StickerUrls;
  /** Milliseconds. */
  sealedAt: number;
  /** An NSFW sticker: pink foil, and blurred for anyone without the NSFW opt-in. */
  nsfw: boolean;
  /** Drawn in Kyoto Seika Practice Mode: the pair it was drawn from, fixed at seal; null on any other. */
  kyotoSeikaSubjects: Sticker["kyotoSeikaSubjects"];
}

export const toMs = (t: IsoTime): number => Date.parse(t);

export const toPerson = (p: Person): PersonView => ({
  id: p.id,
  handle: p.handle,
  name:
    p.lineDisplayName ??
    (p.handle === null ? i18next.t(($) => $.api.person.unnamed) : formatHandle(p.handle)),
  ...(p.linePictureUrl && { pictureUrl: p.linePictureUrl }),
  nsfwOptIn: p.nsfwOptIn,
});

/** Shown from its WebP copies, a fraction of its PNGs' bytes. */
export const toSticker = (s: Sticker): StickerView => ({
  id: s.id,
  no: s.number,
  artist: toPerson(s.artist),
  timeUsed: s.timeUsed,
  width: s.width,
  height: s.height,
  drawnWidth: s.drawnWidth,
  drawnHeight: s.drawnHeight,
  outline: s.outline,
  urls: {
    png: s.images.webp.sticker,
    mask: s.images.webp.mask,
    foil: s.images.webp.foil,
    ...(s.images.sharp && { sharp: s.images.sharp.webp }),
  },
  sealedAt: toMs(s.sealedAt),
  nsfw: s.nsfw,
  kyotoSeikaSubjects: s.kyotoSeikaSubjects,
});

/** The app's placement names: `on`, `s` and `r` for `onBoard`, `scale` and `rotation`. */
export const toRecordPlacement = (p: Placement): RecordPlacement => ({
  on: p.onBoard,
  x: p.x,
  y: p.y,
  s: p.scale,
  r: p.rotation,
  z: p.z,
});

export const toApiPlacement = (p: RecordPlacement): Placement => ({
  onBoard: p.on,
  x: p.x,
  y: p.y,
  scale: p.s,
  rotation: p.r,
  z: p.z,
});

/** A sticker's spots by layout, as the API saves them. */
export const toApiSpots = (spots: Spots): PlacementsRequest => ({
  ...(spots.phone && { placement: toApiPlacement(spots.phone) }),
  ...(spots.large && { largePlacement: toApiPlacement(spots.large) }),
});
