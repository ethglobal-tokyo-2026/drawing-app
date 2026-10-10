import type { LayerId, StrokeOp } from "../canvas/ops";
import type { Rect } from "../sealing/stickerPasses";
import type { LayerState } from "./layerState";

/* oxlint-disable typescript/method-signature-style -- implemented by a class; method syntax keeps unbound-method able to flag a detached call */
/**
 * What shows the sheet: the layers below the current one composited, the current layer's own canvas
 * with the wet stroke over it, and the layers above composited. A live stroke paints on the wet
 * canvas only; at lift the engine paints the whole op on the layer, so live ink equals its replay.
 * Clipping follows the current layer's ink as it changes: a clipped current layer shows cut to its
 * base, and layers clipped to the current one show through it.
 */
export interface SheetDisplay {
  /** Sizes the display's canvases to the ink's sheet, after its frame changed. */
  resize(): void;
  /** Shows `state` with `current` as the current layer: composites below and above again, and mounts the current layer's canvas at its opacity, times its base's when it clips. */
  show(state: LayerState, current: LayerId): void;
  /** Mounts the current layer's canvas as the ink has it now, after a commit or a fill made or let go of it. */
  showCurrent(): void;
  /** Previews the current layer at `opacity`, including layers clipped to it; null restores its committed opacity. */
  previewOpacity(opacity: number | null): void;
  /** The current layer's ink changed within `box`, device px, as after a fill. */
  inkChanged(box: Rect): void;
  /** A stroke starts on the current layer. An eraser, or a brush on a locked layer, previews over a copy of the layer, which hides until `endStroke`. */
  beginStroke(op: StrokeOp): void;
  /** Paints the stroke's settled points [from, to) on the wet canvas. */
  paintStroke(from: number, to: number): void;
  /** The points the curve still holds back, flat, joined to the last settled point; they replace the last frame's. Empty for none. */
  paintTail(pts: readonly number[]): void;
  /** Clears the wet canvas and shows the layer again. */
  endStroke(): void;
  /**
   * Flashes the current layer's ink in the light, once it has just been selected or moved. A stroke
   * starting, another current layer, a resize or a release stops it. Nothing plays mid-stroke, for a
   * hidden or inkless layer, or under reduced motion.
   */
  flash(): void;
  /** Lets go of the display's canvases and empties its host. */
  release(): void;
}
/* oxlint-enable typescript/method-signature-style */
