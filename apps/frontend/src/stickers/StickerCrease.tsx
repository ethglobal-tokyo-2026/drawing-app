import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { CREASE_LIGHT } from "./crease";
import { lightUp } from "./light";
import type { Crease } from "./StickerFigure";
import "./sticker-crease.css";
import "./crease-reveal.css";

const creaseStyle = (url: string) => ({ "--crease": `url("${url}")` });

/**
 * A sticker's crease where it lies over other stickers' edges: its base, the shoulder and foot that show
 * under any light, and over it an image of its rise lit from each side, blended by where the one light
 * is, so its lit and shaded sides follow the light without a new bake.
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
  const { base, normal, topLeft, bottomRight, topRight, bottomLeft } = crease;
  const sides = { topLeft, bottomRight, topRight, bottomLeft };
  const local = useRef<HTMLSpanElement>(null);
  const el = ref ?? local;
  // Shown after the light last moved, it starts where the light is, like every crease already shown.
  useLayoutEffect(() => {
    if (el.current) lightUp(el.current);
  }, [el]);
  useEffect(() => {
    if (!onReady) return;
    let current = true;
    const urls = [
      crease.base,
      crease.topLeft,
      crease.bottomRight,
      crease.topRight,
      crease.bottomLeft,
    ];
    const images = urls.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });
    let timer = 0;
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(
        () => reject(new Error("Decoding the painted crease exceeded 20 seconds")),
        20_000,
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
        <span
          ref={el}
          className="sticker-crease"
          data-normal={normal}
          style={{
            "--crease-ux": CREASE_LIGHT[0],
            "--crease-uy": CREASE_LIGHT[1],
          }}
        >
          <i style={creaseStyle(base)} />
          {Object.entries(sides).map(([side, url]) => (
            <i key={side} data-side={side} style={creaseStyle(url)} />
          ))}
        </span>
      </span>
    </span>
  );
}
