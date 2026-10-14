import type { CSSProperties } from "react";
import { StickerFigure } from "../stickers/StickerFigure";
import type { LaminateFinish } from "../stickers/laminate";
import type { ShopSticker } from "./shopSticker";

/** The styles on the Backing foils shelf; holo is the foil every sticker wears today. */
export type BackingFoil = "holo" | "gold" | "silver" | "roseGold";

type Finish = { laminate: LaminateFinish } | { foil: BackingFoil };

/** How much of a swatch's side the sticker takes, leaving room for a foil band past its edge. */
const FILL = 0.74;

/**
 * Your sticker in a coming finish: a laminate over it, or a backing foil round it the way someone
 * else's sticker board would show it. Every finish takes the same shared pose and environment.
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
  const { urls, width, height } = sticker;
  const long = Math.max(width, height);
  const box: CSSProperties = {
    width: (side * FILL * width) / long,
    height: (side * FILL * height) / long,
  };
  const foil = "foil" in finish ? finish.foil : undefined;
  return (
    <span className="finish-preview" aria-hidden="true">
      <span className="finish-preview__art" style={box}>
        <StickerFigure
          urls={urls}
          width={width}
          height={height}
          foil={foil ? "detail" : undefined}
          foilStyle={foil}
          turn={-4}
          laminate={"laminate" in finish ? finish.laminate : "gloss"}
          reveal
        />
      </span>
    </span>
  );
}
