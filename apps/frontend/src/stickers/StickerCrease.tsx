import { useEffect, useRef, type RefObject } from "react";
import type { Crease } from "./StickerFigure";
import "./sticker-crease.css";
import "./crease-reveal.css";

const creaseStyle = (url: string) => ({ "--crease": `url("${url}")` });
/** How long decoding a painted crease's images may take. */
const CREASE_DECODE_TIMEOUT_MS = 20_000;

/**
 * A sticker's crease where it lies over other stickers' edges: its base, the shoulder and foot. The
 * room's light on its slopes is the sticker material's, from the crease's normal.
 */
export function StickerCrease({
  crease,
  ref,
  onReady,
}: {
  crease: Crease;
  ref?: RefObject<HTMLSpanElement | null>;
  onReady?: () => void;
}) {
  const { base, normal } = crease;
  const local = useRef<HTMLSpanElement>(null);
  const el = ref ?? local;
  useEffect(() => {
    if (!onReady) return;
    let current = true;
    const urls = [crease.base];
    const images = urls.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });
    let timer = 0;
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(
        () =>
          reject(
            new Error(
              `Decoding the painted crease exceeded ${CREASE_DECODE_TIMEOUT_MS / 1000} seconds`,
            ),
          ),
        CREASE_DECODE_TIMEOUT_MS,
      );
    });
    void Promise.race([Promise.all(images.map((image) => image.decode())), timeout])
      .then(
        () => {
          if (current) onReady();
        },
        (error: unknown) => {
          // A removed or superseded bake no longer has paint to reveal.
          if (!current) return;
          for (const image of images) image.src = "";
          const why = `Loading painted crease images (${urls.join(", ")}) failed: ${String(error)}`;
          if (el.current) el.current.dataset.error = why;
          console.error(why);
          // The available paint and laminate remain usable after an image failure.
          onReady();
        },
      )
      .finally(() => window.clearTimeout(timer));
    return () => {
      current = false;
      window.clearTimeout(timer);
      for (const image of images) image.src = "";
    };
  }, [crease, onReady, el]);
  return (
    <span
      className="crease-reveal-frame sticker-crease-reveal"
      style={{ opacity: onReady ? 0 : 1 }}
      aria-hidden="true"
    >
      <span className="crease-reveal-content">
        <span ref={el} className="sticker-crease" data-normal={normal}>
          <i style={creaseStyle(base)} />
        </span>
      </span>
    </span>
  );
}
