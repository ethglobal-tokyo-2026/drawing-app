import { formatHandle } from "../stickers/format";
import type { StickerUrls } from "../stickers/stickerUrls";
import type { IsoTime, Person, Sticker } from "./contract";

/** Someone, as a screen shows them. */
export interface PersonView {
  id: string;
  /** Null until the handle prompt is answered. Print it with formatHandle. */
  handle: string | null;
  /** The LINE name; the handle when LINE's is gone. */
  name: string;
  pictureUrl?: string;
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
}

export const toMs = (t: IsoTime): number => Date.parse(t);

export const toPerson = (p: Person): PersonView => ({
  id: p.id,
  handle: p.handle,
  name: p.lineDisplayName ?? (p.handle === null ? "Someone" : formatHandle(p.handle)),
  ...(p.linePictureUrl && { pictureUrl: p.linePictureUrl }),
});

/** An empty image URL is an image the sticker doesn't have. */
export const toSticker = (s: Sticker): StickerView => ({
  id: s.id,
  no: s.number,
  artist: toPerson(s.artist),
  timeUsed: s.timeUsed,
  width: s.width,
  height: s.height,
  outline: s.outline,
  urls: {
    png: s.images.png,
    ...(s.images.mask && { mask: s.images.mask }),
    ...(s.images.spec && { spec: s.images.spec }),
    ...(s.images.rim && { rim: s.images.rim }),
  },
  sealedAt: toMs(s.sealedAt),
});
