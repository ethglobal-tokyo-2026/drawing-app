import { useLayoutEffect, useRef } from "react";
import { lightUp } from "./light";
import "./sticker-foil.css";

/** Where a foil sticker shows, which sets how wide its band is. */
export type FoilSize = "board" | "detail" | "sheet";

/**
 * Holo, for a sticker someone other than the board's owner drew; pink, for an NSFW sticker; Kyoto
 * Seika, for a sticker drawn in Kyoto Seika Manga Expression Practice Mode.
 */
export type FoilTone = "holo" | "pink" | "kyoto-seika";

interface Props {
  size: FoilSize;
  /** Degrees the sticker is turned on screen, which the glint undoes so the light falls alike on all. */
  turn?: number;
  tone?: FoilTone;
  /**
   * The band's mask, made on the server; the Shop's bundled sample has none, so its band is dilated
   * from `--m` here.
   */
  mask?: string;
}

/**
 * Foil round a sticker, holo, pink or Kyoto Seika: its silhouette grown into a band just past the
 * white edge, from the server's mask when the sticker has one, else dilated in CSS from the `--m` the
 * container sets. The band is the sticker's edge, so its cut and cast shadow fall from the band's
 * outer edge. Holo and pink are bands of color that the light slides under a fine, still grating; Kyoto
 * Seika is a narrower band of manga screentone, with scraped highlights that the light slides through
 * its glint. A glint sits where the app's one light falls, holding where the last tilt left it, so a
 * still light holds every foil still. It goes under the image, which shows only inside its own cut.
 */
export function StickerFoil({ size, turn = 0, tone = "holo", mask }: Props) {
  const foil = useRef<HTMLSpanElement>(null);
  // Shown after the light last moved, it starts where the light is, like every foil already shown.
  useLayoutEffect(() => {
    if (foil.current) lightUp(foil.current);
  }, []);
  return (
    <span
      ref={foil}
      className={`sticker-foil sticker-foil--${size} sticker-foil--${tone}${mask ? " sticker-foil--baked" : ""}`}
      style={{
        "--foil-turn": turn,
        ...(mask && { "--foil-mask": `url("${mask}")` }),
      }}
      aria-hidden="true"
    >
      <span className="sticker-foil__cast" />
      <span className="sticker-foil__band">
        <i className="sticker-foil__sheen" />
        <i className="sticker-foil__glint" />
      </span>
    </span>
  );
}
