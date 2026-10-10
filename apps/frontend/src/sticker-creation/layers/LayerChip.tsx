import { useEffectEvent, useLayoutEffect, useRef } from "react";
import { EyeSlash } from "../../icons";
import { useTranslation } from "../../i18n/react";
import type { LayerId } from "../canvas/ops";
import { drawThumbnail } from "./layerThumbnails";
import type { LayerChipView, ThumbnailSource } from "./layerView";

/** A chip's size, CSS px, as LayerColumn.css sets it. */
export const CHIP_WIDTH = 30;
export const CHIP_HEIGHT = 38;
/** A faded layer's thumbnail fades with it, but no further, so a faint sketch still reads. */
const FADED_FLOOR = 0.5;
/** A hidden layer's thumbnail, dimmer than any faded one. */
const HIDDEN = 0.25;

interface Props {
  chip: LayerChipView;
  current: boolean;
  thumbnails: ThumbnailSource;
  /** Whether it's the list's one Tab stop. */
  tabStop: boolean;
  /** The current chip's: whether its options bar is open; undefined on every other chip. */
  expanded: boolean | undefined;
  /** The options bar's id while it's shown beside this chip. */
  controls: string | undefined;
  onPress: (id: LayerId) => void;
  onFocus: (id: LayerId) => void;
}

/**
 * One layer's chip: a small sheet of paper showing the layer's ink cropped to its box, with the
 * layer's number in its foot; an empty layer's shows only its number. The thumbnail redraws only when
 * the layer's `version` bumps, since the column re-renders for every change to any layer.
 */
export function LayerChip({
  chip,
  current,
  thumbnails,
  tabStop,
  expanded,
  controls,
  onPress,
  onFocus,
}: Props) {
  const { t } = useTranslation();
  const thumb = useRef<HTMLCanvasElement>(null);
  const hidden = chip.opacity === 0;

  const draw = useEffectEvent(() => {
    if (!thumb.current) return;
    drawThumbnail(thumb.current, thumbnails(chip.id), CHIP_WIDTH, CHIP_HEIGHT, devicePixelRatio);
  });
  // Drawn before paint, so a chip that takes its first ink never shows a blank frame.
  useLayoutEffect(() => draw(), [chip.version, chip.inked]);

  let name: string = t(($) => $.stickerCreation.layers.chip, { number: chip.id });
  const states = [
    hidden && t(($) => $.stickerCreation.layers.hidden),
    chip.locked && t(($) => $.stickerCreation.layers.locked),
    chip.clipBase !== null && t(($) => $.stickerCreation.layers.clippedTo, { base: chip.clipBase }),
  ];
  for (const state of states) {
    if (state) name = t(($) => $.stickerCreation.layers.withState, { name, state });
  }

  const classes = ["layer-chip"];
  if (current) classes.push("is-current");
  if (!chip.inked) classes.push("is-empty");
  if (chip.locked) classes.push("is-locked");
  if (chip.clipBase !== null) classes.push("is-clipped");

  return (
    <button
      type="button"
      role="option"
      className={classes.join(" ")}
      data-layer-chip={chip.id}
      aria-selected={current}
      aria-label={name}
      aria-expanded={expanded}
      aria-controls={controls}
      tabIndex={tabStop ? 0 : -1}
      onClick={() => onPress(chip.id)}
      onFocus={() => onFocus(chip.id)}
    >
      {chip.inked && (
        <canvas
          ref={thumb}
          className="layer-thumb"
          style={{ opacity: hidden ? HIDDEN : Math.max(FADED_FLOOR, chip.opacity / 100) }}
        />
      )}
      <span className="layer-number">{chip.id}</span>
      {hidden && <EyeSlash className="layer-hidden-mark" size={12} weight="bold" />}
    </button>
  );
}
