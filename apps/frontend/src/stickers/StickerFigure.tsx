import type { CSSProperties, Ref } from "react";
import type { Fold } from "./liftedCorner";
import { LiveResin } from "./LiveResin";
import { StickerFoil, type FoilSize } from "./StickerFoil";
import type { StickerUrls } from "./stickerUrls";
import { revealOnLoad } from "../ui/reveal";
import "./sticker-figure.css";

interface Props {
  urls: StickerUrls;
  /** The art's size, which sets its shape. */
  width: number;
  height: number;
  /** A lifted corner, folded back along this line. */
  fold?: Fold | null;
  /** Holo foil, for a sticker someone other than the board's owner drew, sized for where it shows. */
  foil?: FoilSize;
  /** The sticker's No., which staggers its foil's light against its neighbors'. */
  no?: number;
  /** Degrees it's turned on screen, which its foil's glint undoes. */
  turn?: number;
  /** Held back, every layer, until its image has loaded, then faded in. */
  reveal?: boolean;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

const cssUrl = (url: string) => `url("${url}")`;

/**
 * A sticker as material, filling its box: its foil when someone else drew it, the image with its
 * kiss-cut and cast shadow, live resin under the one light, a lifted corner, and the gloss sweep that
 * plays when it sticks. The parts shaped by the silhouette need the sticker's mask; without one it's
 * the image alone.
 */
export function StickerFigure({
  urls,
  width,
  height,
  fold,
  foil,
  no = 0,
  turn = 0,
  reveal = false,
  className,
  ref,
}: Props) {
  const { mask, spec, rim } = urls;
  const style: CSSProperties = {
    "--ar": (width / height).toFixed(4),
    ...(mask && { "--m": cssUrl(mask) }),
    ...(spec && { "--mt": cssUrl(spec) }),
    ...(rim && { "--mb": cssUrl(rim) }),
    ...(fold && {
      "--clip-in": fold.clipIn,
      "--clip-out": fold.clipOut,
      "--fx": fold.fx,
      "--fy": fold.fy,
      "--refl": fold.refl,
    }),
  };
  const classes = [
    "sticker-figure",
    mask && fold && "is-curled",
    reveal && "reveal-img",
    className,
  ].filter(Boolean);
  return (
    <span ref={ref} className={classes.join(" ")} style={style}>
      {mask && foil && <StickerFoil size={foil} no={no} turn={turn} mask={urls.foil} />}
      {mask && <span className="sticker-figure__spot" aria-hidden="true" />}
      <img
        ref={
          reveal ? (img) => revealOnLoad(img, img?.closest(".sticker-figure") ?? null) : undefined
        }
        className="sticker-figure__img"
        src={urls.png}
        alt=""
        draggable={false}
      />
      {mask && (
        <>
          <LiveResin highlights={Boolean(spec && rim)} />
          <span className="sticker-figure__flapw" aria-hidden="true">
            <i className="sticker-figure__flap" />
          </span>
          <span className="sticker-figure__sweep" aria-hidden="true">
            <i />
          </span>
        </>
      )}
    </span>
  );
}
