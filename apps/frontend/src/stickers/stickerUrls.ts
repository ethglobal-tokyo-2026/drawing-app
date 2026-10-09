/** A sticker's images, by URL: the WebP copies the server makes from its PNGs. */
export interface StickerUrls {
  /** The sticker itself. */
  png: string;
  mask: string;
  /**
   * The foil band's mask: the silhouette grown to the band's outer edge, at the image's size. Only
   * the Shop's bundled sample lacks one, and its foil grows the silhouette itself.
   */
  foil?: string;
  /** The sticker again, larger, for where it shows larger than `png` holds; absent without one. */
  sharp?: string;
}
