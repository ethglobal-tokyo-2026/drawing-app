import { memo, type CSSProperties, type Ref } from "react";
import { useTranslation } from "../i18n/react";
import type { CreaseSide } from "./crease";
import { LiveResin } from "./LiveResin";
import { madeFoil } from "./madeFoil";
import { StickerCrease } from "./StickerCrease";
import { StickerFoil, type FoilSize } from "./StickerFoil";
import type { StickerUrls } from "./stickerUrls";
import { revealOnLoad } from "../ui/reveal";
import "./nsfw-mark.css";
import "./sticker-figure.css";

/** A sticker's crease, baked: an image of it lit from each side, which the one light blends between. */
export type Crease = Record<CreaseSide, string>;

interface Props {
  urls: StickerUrls;
  /** The art's size, which sets its shape. */
  width: number;
  height: number;
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
  /** Degrees it's turned on screen, which its foil's glint undoes. */
  turn?: number;
  /** Stuck to a board: it sits close to it, with the board's short cast and thinner resin. */
  stuck?: boolean;
  /** Held back, every layer, until its image has loaded, then faded in. */
  reveal?: boolean;
  /** Where it lies over other stickers' edges: the baked crease, its lit side following the one light. */
  crease?: Crease;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

const cssUrl = (url: string) => `url("${url}")`;

/**
 * A sticker as material, filling its box: its foil when someone else drew it, it's NSFW or it was drawn in
 * Kyoto Seika Practice Mode, the image with its kiss-cut and cast shadow, live resin under the one light,
 * and the gloss sweep that plays when it sticks. Memoized: a board sticker re-renders as it's selected,
 * held or restacked, none of which changes its figure.
 */
export const StickerFigure = memo(function StickerFigure({
  urls,
  width,
  height,
  foil,
  nsfw = false,
  kyotoSeika = false,
  veiled = false,
  turn = 0,
  stuck = false,
  reveal = false,
  crease,
  className,
  ref,
}: Props) {
  const { t } = useTranslation();
  const { mask, spec, rim } = urls;
  // A foil that marks how it was made shows whoever drew it; holo marks someone else's hand.
  const made = madeFoil({ nsfw, kyotoSeika });
  const foilSize = foil ?? (made ? "board" : undefined);
  const tone = made ?? "holo";
  const style: CSSProperties = {
    "--ar": (width / height).toFixed(4),
    "--m": cssUrl(mask),
    "--mt": cssUrl(spec),
    "--mb": cssUrl(rim),
  };
  const classes = [
    "sticker-figure",
    nsfw && "is-nsfw",
    veiled && "is-veiled",
    stuck && "is-stuck",
    reveal && "reveal-img",
    className,
  ].filter(Boolean);
  return (
    <span ref={ref} className={classes.join(" ")} style={style}>
      {foilSize && <StickerFoil size={foilSize} turn={turn} tone={tone} mask={urls.foil} />}
      {/* A foil's band casts for it. */}
      {stuck && !foilSize && <span className="sticker-figure__cast" aria-hidden="true" />}
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
      {/* Keyed by its images, so a rebaked crease presses in again. */}
      {crease && <StickerCrease key={crease.topLeft} crease={crease} />}
      {veiled && (
        <span className="sticker-figure__veil">
          <b className="nsfw-mark" role="img" aria-label={t(($) => $.stickers.nsfw.veiled)}>
            {t(($) => $.stickers.nsfw.mark)}
          </b>
        </span>
      )}
      <LiveResin />
      <span className="sticker-figure__sweep" aria-hidden="true">
        <i />
      </span>
    </span>
  );
});
