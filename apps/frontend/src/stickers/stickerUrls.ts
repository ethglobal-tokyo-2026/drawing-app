import type { StickerRecord } from "./stickerStorage";

/** Object URLs for a sticker's images. Whoever makes them releases them. */
export interface StickerUrls {
  png: string;
  mask?: string;
  /** The resin's highlight masks. */
  spec?: string;
  rim?: string;
}

export function stickerUrls(r: StickerRecord): StickerUrls {
  return {
    png: URL.createObjectURL(r.blob),
    ...(r.mask && { mask: URL.createObjectURL(r.mask) }),
    ...(r.resin && {
      spec: URL.createObjectURL(r.resin.spec),
      rim: URL.createObjectURL(r.resin.rim),
    }),
  };
}

export function releaseStickerUrls(u: StickerUrls) {
  for (const url of [u.png, u.mask, u.spec, u.rim]) if (url) URL.revokeObjectURL(url);
}
