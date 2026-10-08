import type { CSSProperties, Ref } from "react";
import { useTranslation } from "../i18n/react";
import type { Fold } from "./liftedCorner";
import { LiveResin } from "./LiveResin";
import { StickerFoil, type FoilSize } from "./StickerFoil";
import type { StickerUrls } from "./stickerUrls";
import { revealOnLoad } from "../ui/reveal";
import "./nsfw-mark.css";
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
  /** An NSFW sticker: pink foil in place of holo, at `foil`'s size or the board's, and a pink gloss. */
  nsfw?: boolean;
  /**
   * Drawn in Kyoto Seika Manga Expression Practice Mode: that foil in place of holo, whoever drew it,
   * at `foil`'s size or the board's.
   */
  kyotoSeika?: boolean;
  /**
   * For a viewer without the NSFW opt-in, whose `urls` name the veiled image the API sends: shown as it
   * comes, with the 18+ mark over it; its outline and foil stay sharp.
   */
  veiled?: boolean;
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
 * A sticker as material, filling its box: its foil when someone else drew it, it's NSFW or it was drawn in
 * Kyoto Seika Practice Mode, the image with its kiss-cut and cast shadow, live resin under the one light,
 * a lifted corner, and the gloss sweep that plays when it sticks.
 */
export function StickerFigure({
  urls,
  width,
  height,
  fold,
  foil,
  nsfw = false,
  kyotoSeika = false,
  veiled = false,
  no = 0,
  turn = 0,
  reveal = false,
  className,
  ref,
}: Props) {
  const { t } = useTranslation();
  const { mask, spec, rim } = urls;
  // Pink protects people, so it wins over Kyoto Seika; either marks the sticker whoever drew it.
  const foilSize = foil ?? (nsfw || kyotoSeika ? "board" : undefined);
  const tone = nsfw ? "pink" : kyotoSeika ? "kyoto-seika" : "holo";
  const style: CSSProperties = {
    "--ar": (width / height).toFixed(4),
    "--m": cssUrl(mask),
    "--mt": cssUrl(spec),
    "--mb": cssUrl(rim),
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
    fold && "is-curled",
    nsfw && "is-nsfw",
    veiled && "is-veiled",
    reveal && "reveal-img",
    className,
  ].filter(Boolean);
  return (
    <span ref={ref} className={classes.join(" ")} style={style}>
      {foilSize && <StickerFoil size={foilSize} no={no} turn={turn} tone={tone} mask={urls.foil} />}
      <span className="sticker-figure__spot" aria-hidden="true" />
      <img
        ref={
          reveal ? (img) => revealOnLoad(img, img?.closest(".sticker-figure") ?? null) : undefined
        }
        className="sticker-figure__img"
        src={urls.png}
        alt=""
        draggable={false}
      />
      {nsfw && <span className="sticker-figure__gloss" aria-hidden="true" />}
      {veiled && (
        <span className="sticker-figure__veil">
          <b className="nsfw-mark" role="img" aria-label={t(($) => $.stickers.nsfw.veiled)}>
            {t(($) => $.stickers.nsfw.mark)}
          </b>
        </span>
      )}
      <LiveResin />
      <span className="sticker-figure__flapw" aria-hidden="true">
        <i className="sticker-figure__flap" />
      </span>
      <span className="sticker-figure__sweep" aria-hidden="true">
        <i />
      </span>
    </span>
  );
}
