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
  /** The band's mask, made on the server; without one the band grows from the container's `--m`. */
  mask?: string;
}

/**
 * Foil round a sticker, holo, pink or Kyoto Seika: a band grown from the server's mask, or from `--m`
 * without one. sticker-foil.css describes the material.
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
