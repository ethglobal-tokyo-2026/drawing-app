import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type Ref } from "react";
import { useTranslation } from "../i18n/react";
import type { CreaseImage, CreaseBounds } from "./crease";
import { setCreaseRevealSize } from "./creaseRevealSize";
import { StickerMaterial } from "./StickerMaterial";
import type { LaminateFinish } from "./laminate";
import { madeFoil } from "./madeFoil";
import { useSharpSrc } from "./sharpImage";
import { StickerCrease } from "./StickerCrease";
import { StickerFoil } from "./StickerFoil";
import type { FoilSize, FoilStyle } from "./foilMaterial";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";
import type { StickerUrls } from "./stickerUrls";
import { revealOnLoad } from "../ui/reveal";
import "./nsfw-mark.css";
import "./sticker-figure.css";

/**
 * A sticker's crease, baked: its base and its rise lit from the one light, and its geometric normal
 * data for the laminate reflection.
 */
export type Crease = Record<CreaseImage, string> & { normalBounds?: CreaseBounds };

interface Props {
  urls: StickerUrls;
  /** The art's size, which sets its shape. */
  width: number;
  height: number;
  /** Holo foil, for a sticker someone other than the board's owner drew, sized for where it shows. */
  foil?: FoilSize;
  /** The explicit coming-soon Backing foil selection in the Shop. */
  foilStyle?: FoilStyle;
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
  /** Degrees it is turned on screen, for its material's geometry. */
  turn?: number;
  /** Stuck to a board: it sits close to it, with the board's short cast. */
  stuck?: boolean;
  /** Held back, every layer, until its image has loaded, then faded in. */
  reveal?: boolean;
  /** Where it lies over other stickers' edges: the baked crease, lit from the one light. */
  crease?: Crease;
  /** Only a crease accepted for an explicit placement may press in. */
  canRevealCrease?: (normal: string) => boolean;
  /** Consumes that placement once its real laminate snapshot is ready. */
  startCreaseReveal?: (normal: string) => boolean;
  /** The Laminate: gloss for every sealed sticker; the Shop previews the coming ones. */
  laminate?: LaminateFinish;
  /** Whether this surface is exposed; covering it pauses its laminate snapshots. */
  laminateActive?: boolean;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

const cssUrl = (url: string) => `url("${url}")`;

/**
 * A sticker as material, filling its box: its foil when someone else drew it, it's NSFW or it was drawn in
 * Kyoto Seika Practice Mode, the image with its kiss-cut and cast shadow, a thin laminate under
 * the one light. Memoized: a board sticker re-renders as it's selected,
 * held or restacked, none of which changes its figure.
 */
export const StickerFigure = memo(function StickerFigure({
  urls,
  width,
  height,
  foil,
  foilStyle,
  nsfw = false,
  kyotoSeika = false,
  veiled = false,
  turn = 0,
  stuck = false,
  reveal = false,
  crease,
  canRevealCrease,
  startCreaseReveal,
  laminate = "gloss",
  laminateActive = true,
  className,
  ref,
}: Props) {
  const { t } = useTranslation();
  const { mask } = urls;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const creaseEl = useRef<HTMLSpanElement>(null);
  const [readyCrease, setReadyCrease] = useState<Crease>();
  const creaseReady = useCallback(() => setReadyCrease(crease), [crease]);
  const showCrease = useCallback((normal: string, progress: number) => {
    const el = creaseEl.current;
    // An older texture's completion cannot reveal a replacement crease.
    if (el?.dataset.normal !== normal) return;
    const frame = el.closest(".sticker-crease-reveal");
    const figure = el.closest(".sticker-figure");
    if (!(frame instanceof HTMLElement) || !(figure instanceof HTMLElement)) return;
    if (progress < 1) {
      if (!frame.hasAttribute("data-crease-reveal")) {
        const style = getComputedStyle(figure);
        setCreaseRevealSize(frame, parseFloat(style.width), parseFloat(style.height));
      }
      frame.dataset.creaseReveal = "";
    } else delete frame.dataset.creaseReveal;
    frame.style.opacity = "1";
    frame.style.setProperty("--crease-reveal", String(progress));
  }, []);
  // Its sharp copy once it shows larger than its image holds: the detail, or a board sticker that big.
  const src = useSharpSrc(img, urls, width);
  // Stable, so React hands it the image only as it mounts and unmounts.
  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      setImg(el);
      if (reveal) revealOnLoad(el, el?.closest(".sticker-figure") ?? null);
    },
    [reveal],
  );
  // A foil that marks how it was made shows whoever drew it; holo marks someone else's hand.
  const made = madeFoil({ nsfw, kyotoSeika });
  const foilSize = foil ?? (made ? "board" : undefined);
  const tone = made ?? foilStyle ?? "holo";
  const foilMaterial = useMemo<StickerFoilMaterial | undefined>(
    () =>
      foilSize ? { style: tone, size: foilSize, ...(urls.foil && { mask: urls.foil }) } : undefined,
    [tone, foilSize, urls.foil],
  );
  const style: CSSProperties = {
    "--ar": (width / height).toFixed(4),
    "--m": cssUrl(mask),
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
      {foilMaterial && <StickerFoil material={foilMaterial} cut={mask} active={laminateActive} />}
      {/* A foil's band casts for it. */}
      {stuck && !foilSize && <span className="sticker-figure__cast" aria-hidden="true" />}
      <img ref={imgRef} className="sticker-figure__img" src={src} alt="" draggable={false} />
      <StickerMaterial
        // Concealing artwork discards the previous bitmap before a replacement can load.
        key={veiled ? "veiled" : "visible"}
        foil={foilMaterial}
        print={src}
        cut={mask}
        normal={readyCrease === crease ? crease?.normal : undefined}
        normalBounds={readyCrease === crease ? crease?.normalBounds : undefined}
        turn={turn}
        finish={laminate}
        active={laminateActive}
        onCreaseProgress={showCrease}
        canRevealCrease={canRevealCrease}
        startCreaseReveal={startCreaseReveal}
      />
      {nsfw && <span className="sticker-figure__gloss" aria-hidden="true" />}
      {/* A rebaked crease waits for its matching laminate before both press in together. */}
      {crease && (
        <StickerCrease key={crease.rise} ref={creaseEl} crease={crease} onReady={creaseReady} />
      )}
      {veiled && (
        <span className="sticker-figure__veil">
          <b className="nsfw-mark" role="img" aria-label={t(($) => $.stickers.nsfw.veiled)}>
            {t(($) => $.stickers.nsfw.mark)}
          </b>
        </span>
      )}
    </span>
  );
});
