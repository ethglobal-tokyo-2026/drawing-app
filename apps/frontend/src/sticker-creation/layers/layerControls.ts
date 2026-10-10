import type { LayerId } from "../canvas/ops";
import type { LayerView, ThumbnailSource } from "./layerView";

/* oxlint-disable typescript/method-signature-style -- implemented by a class; method syntax keeps unbound-method able to flag a detached call */
/**
 * The layer column's way into the sheet. Each change but a preview is one undo step. A stroke in
 * progress ends first, as clear ends it, and nothing changes while the sheet is locked.
 */
export interface LayerControls {
  /** A new layer just above the current one, made current; nothing at `MAX_LAYERS`. */
  addLayer(): void;
  selectLayer(id: LayerId): void;
  /** Deletes the current layer: the one below it becomes current, or the one above when it was at the back. Nothing on the last layer. */
  deleteLayer(): void;
  /** Moves `id` to `to`, its place counted from the back, and makes it current. */
  moveLayer(id: LayerId, to: number): void;
  /** Empties the current layer, keeping its opacity. */
  clearLayer(): void;
  /** Shows the current layer at `opacity` while the slider is dragged, with no step; null shows its own again. */
  previewOpacity(opacity: number | null): void;
  /** The current layer's opacity, as one step: back-to-back changes to one layer make one step. */
  setOpacity(opacity: number): void;
  setLocked(on: boolean): void;
  setClipped(on: boolean): void;
  /** A layer's ink for its chip. */
  readonly thumbnail: ThumbnailSource;
}
/* oxlint-enable typescript/method-signature-style */

/** What the sheet tells the drawing screen about its layers. */
export interface LayerEvents {
  onLayers: (view: LayerView) => void;
  /** A stroke, fill or erase met the hidden current layer, and made no mark. */
  onBlockedHidden: () => void;
  /** A layer's canvas couldn't be made even after undo's copies were let go, so the mark that needed it was dropped. */
  onInkFailed: (error: unknown) => void;
}
