/** A sticker's images, by URL: the WebP copies the server makes from its PNGs. */
export interface StickerUrls {
  /** The sticker itself. */
  png: string;
  mask: string;
  /** The resin's highlight masks. */
  spec: string;
  rim: string;
  /**
   * The foil band's mask: the silhouette grown to the band's outer edge, at the image's size. The
   * Shop's sample sticker has none.
   */
  foil?: string;
}
