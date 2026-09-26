import type { StickerRecord } from "./stickerStorage";

/** Object URLs for a sticker's images. They last for the page: the API client shares them between screens. */
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
