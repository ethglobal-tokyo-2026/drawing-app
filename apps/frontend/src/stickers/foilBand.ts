import type { FoilSize } from "./foilMaterial";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";

/**
 * How far a holo or pink band grown from the cut reaches past it, in CSS px, at each size it's shown.
 * A band from the server's mask needs none: the mask is the band already.
 */
export const FOIL_BAND_WIDTH: Readonly<Record<FoilSize, number>> = {
  board: 5,
  detail: 6,
  sheet: 3,
};

/**
 * How far the Kyoto Seika Practice Mode foil's band reaches past the cut on a sticker this big, in
 * CSS px. The band is grown from the cut, not the server's mask.
 */
export const kyotoSeikaBandWidth = (w: number, h: number) => Math.max(2, 0.024 * Math.max(w, h));

/** CSS px this material's band grows past its cut in a frame this big. */
export function foilBandWidth(material: StickerFoilMaterial, width: number, height: number) {
  if (material.style === "kyoto-seika") return kyotoSeikaBandWidth(width, height);
  return material.mask ? 0 : FOIL_BAND_WIDTH[material.size];
}
