import { useEffect, useState, type CSSProperties } from "react";
import { StickerFigure } from "../stickers/StickerFigure";
import type { ShopSticker } from "./shopSticker";

/** The finishes on the Laminates shelf; gloss is the resin every sticker is sealed with today. */
export type Laminate = "gloss" | "matte" | "glitter" | "prism";
/** The styles on the Backing foils shelf; holo is the foil every sticker wears today. */
export type BackingFoil = "holo" | "gold" | "silver" | "roseGold";

type Finish = { laminate: Laminate } | { foil: BackingFoil };

/** How much of a swatch's side the sticker takes, leaving room for a foil band past its edge. */
const FILL = 0.74;

/** "roseGold" as a class name's "rose-gold". */
const kebab = (id: string) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Whether the image at `url` has loaded. A layer shaped by a mask waits for it, so it never shows
 * before its mask can shape it.
 */
function useImageLoaded(url: string): boolean {
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const img = new Image();
    // A mask that fails to load leaves the layer out, never unmasked.
    img.onload = () => {
      if (live) setLoaded(url);
    };
    img.src = url;
    return () => {
      live = false;
      img.onload = null;
    };
  }, [url]);
  return loaded === url;
}

/**
 * Your sticker in a coming finish: a laminate over it, or a backing foil round it the way someone
 * else's sticker board would show it. A laminate is live resin of another kind, so the app's one
 * light lights it like the resin.
 */
export function FinishPreview({
  sticker,
  side,
  finish,
}: {
  sticker: ShopSticker;
  side: number;
  finish: Finish;
}) {
  const { urls, width, height, no } = sticker;
  const long = Math.max(width, height);
  const box: CSSProperties = {
    width: (side * FILL * width) / long,
    height: (side * FILL * height) / long,
    "--m": `url("${urls.mask}")`,
  };
  const laminate = "laminate" in finish ? finish.laminate : null;
  const foil = "foil" in finish ? finish.foil : null;
  // The haze and the film are shaped by the sticker's mask, so neither shows until it's in.
  const masked = useImageLoaded(urls.mask);
  const film = masked && (laminate === "glitter" || laminate === "prism");
  const finishClass =
    "laminate" in finish ? `laminate--${finish.laminate}` : `backing-foil--${kebab(finish.foil)}`;
  return (
    <span className={`finish-preview ${finishClass}`} aria-hidden="true">
      <span className="finish-preview__art" style={box}>
        <StickerFigure
          urls={urls}
          width={width}
          height={height}
          foil={foil ? "detail" : undefined}
          no={no}
          turn={-4}
          reveal
        />
        {masked && laminate === "matte" && <span className="laminate-haze" />}
        {film && (
          <span className={`live-resin laminate-film laminate-film--${laminate}`}>
            <i>
              <b />
            </i>
          </span>
        )}
      </span>
    </span>
  );
}
