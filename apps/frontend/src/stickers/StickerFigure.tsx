import type { CSSProperties, Ref } from "react";
import type { Fold } from "./liftedCorner";
import { LiveResin } from "./LiveResin";
import type { StickerUrls } from "./stickerUrls";
import "./sticker-figure.css";

interface Props {
  urls: StickerUrls;
  /** The art's size, which sets its shape. */
  width: number;
  height: number;
  /** A lifted corner, folded back along this line. */
  fold?: Fold | null;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

const cssUrl = (url: string) => `url("${url}")`;

/**
 * A sticker as material, filling its box: the image with its kiss-cut and cast shadow, live resin
 * under the one light, a lifted corner, and the gloss sweep that plays when it sticks. The parts
 * shaped by the silhouette need the sticker's mask; without one it's the image alone.
 */
export function StickerFigure({ urls, width, height, fold, className, ref }: Props) {
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
  const classes = ["sticker-figure", mask && fold && "is-curled", className].filter(Boolean);
  return (
    <span ref={ref} className={classes.join(" ")} style={style}>
      {mask && <span className="sticker-figure__spot" aria-hidden="true" />}
      <img className="sticker-figure__img" src={urls.png} alt="" draggable={false} />
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
