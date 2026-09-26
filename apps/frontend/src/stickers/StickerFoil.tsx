import { useLayoutEffect, useRef } from "react";
import { lightUp } from "./light";
import "./sticker-foil.css";

/** Where a foil sticker shows, which sets how wide its band is. */
export type FoilSize = "board" | "detail" | "sheet";

interface Props {
  size: FoilSize;
  /** The sticker's No., which staggers its bands' flow so neighbors never shimmer in step. */
  no: number;
  /** Degrees the sticker is turned on screen, which the glint undoes so the light falls alike on all. */
  turn?: number;
  /** The band's mask, made on the server; without one, the band is dilated from `--m` here. */
  mask?: string;
}

/**
 * Holo foil round a sticker someone other than the board's owner drew: its silhouette grown into a
 * band just past the white edge, with bands of light flowing along it and a glint where the app's
 * one light falls, which holds where the last tilt left it. The band's shape is the server's mask
 * when the sticker has one, else the silhouette the container sets as `--m`, dilated in CSS. It goes
 * under the image.
 */
export function StickerFoil({ size, no, turn = 0, mask }: Props) {
  const foil = useRef<HTMLSpanElement>(null);
  // Shown after the light last moved, it starts where the light is, like every foil already shown.
  useLayoutEffect(() => {
    if (foil.current) lightUp(foil.current);
  }, []);
  return (
    <span
      ref={foil}
      className={`sticker-foil sticker-foil--${size}${mask ? " sticker-foil--baked" : ""}`}
      style={{
        "--foil-i": no,
        "--foil-turn": turn,
        ...(mask && { "--foil-mask": `url("${mask}")` }),
      }}
      aria-hidden="true"
    >
      <span className="sticker-foil__band">
        <i className="sticker-foil__sheen" />
        <i className="sticker-foil__glint" />
      </span>
    </span>
  );
}
