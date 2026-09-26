import { formatHandle } from "../stickers/format";
import type { Placement as RecordPlacement } from "../sticker-board/placement";
import type { StickerUrls } from "../stickers/stickerUrls";
import type { IsoTime, Person, Placement, Sticker } from "@drawing-app/api/client";

/** Someone, as a screen shows them. */
export interface PersonView {
  id: string;
  /** Null until the handle prompt is answered. Print it with formatHandle. */
  handle: string | null;
  /** The LINE name; the handle when LINE's is gone. */
  name: string;
  pictureUrl?: string;
  /** <label>.croquis.eth. */
  ensName?: string;
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
  outline: string;
  urls: StickerUrls;
  /** Milliseconds. */
  sealedAt: number;
  /** <number>.<artist>.croquis.eth, once it's onchain. */
  ensName?: string;
}

export const toMs = (t: IsoTime): number => Date.parse(t);

export const toPerson = (p: Person): PersonView => ({
  id: p.id,
  handle: p.handle,
  name: p.lineDisplayName ?? (p.handle === null ? "Someone" : formatHandle(p.handle)),
  ...(p.linePictureUrl && { pictureUrl: p.linePictureUrl }),
  ...(p.ensName && { ensName: p.ensName }),
});

/** Shown from its WebP copies, a fraction of its PNGs' bytes. An empty URL is an image it doesn't have. */
export const toSticker = (s: Sticker): StickerView => ({
  id: s.id,
  no: s.number,
  artist: toPerson(s.artist),
  timeUsed: s.timeUsed,
  width: s.width,
  height: s.height,
  outline: s.outline,
  urls: {
    png: s.images.webp.sticker,
    ...(s.images.webp.mask && { mask: s.images.webp.mask }),
    ...(s.images.webp.spec && { spec: s.images.webp.spec }),
    ...(s.images.webp.rim && { rim: s.images.webp.rim }),
    ...(s.images.webp.foil && { foil: s.images.webp.foil }),
  },
  sealedAt: toMs(s.sealedAt),
  ...(s.ensName && { ensName: s.ensName }),
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
