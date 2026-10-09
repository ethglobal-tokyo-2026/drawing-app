import { useEffect, useState } from "react";
import type { StickerUrls } from "./stickerUrls";

/**
 * The sharp copy to load for a sticker shown `shownWidth` CSS px wide: only when the screen shows it
 * with more pixels than its stored image's `width` holds, and it has one.
 */
export function sharpToLoad(
  urls: Pick<StickerUrls, "sharp">,
  width: number,
  shownWidth: number,
  devicePixelRatio: number,
): string | null {
  return urls.sharp && shownWidth * devicePixelRatio > width ? urls.sharp : null;
}

/**
 * The image `img` shows: the stored image, swapped for the sharp copy once `img` is shown larger
 * than the stored image holds and the copy has decoded, so the swap never flashes. A copy that
 * fails to load leaves the stored image, and the console says why.
 */
export function useSharpSrc(img: HTMLImageElement | null, urls: StickerUrls, width: number) {
  const [decoded, setDecoded] = useState<string | null>(null);
  const wanted = decoded === urls.sharp ? null : urls.sharp;
  useEffect(() => {
    if (!img || !wanted) return;
    let loading: HTMLImageElement | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const sharp = sharpToLoad(
        { sharp: wanted },
        width,
        entry.contentRect.width,
        window.devicePixelRatio,
      );
      if (!sharp || loading) return;
      observer.disconnect();
      loading = new Image();
      loading.src = sharp;
      loading.decode().then(
        () => setDecoded(sharp),
        (error: unknown) => console.error(`The sharp copy ${sharp} didn't load`, error),
      );
    });
    observer.observe(img);
    return () => {
      observer.disconnect();
      // Stops a download nobody will show.
      if (loading) loading.src = "";
    };
  }, [img, wanted, width]);
  return decoded !== null && decoded === urls.sharp ? decoded : urls.png;
}
