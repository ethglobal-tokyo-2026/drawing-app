import type { LayerId } from "../canvas/ops";
import type { Rect } from "../sealing/stickerPasses";
import type { LayerState } from "./layerState";

/** What the layer column and the clear tile show: the layers, the current one, which have ink, and when each changed. */
export interface LayerView {
  state: LayerState;
  current: LayerId;
  inked: ReadonlySet<LayerId>;
  /** The current layer has ink: the clear tile can clear it. */
  currentInked: boolean;
  /** Bumps when a layer's ink changes, so its chip redraws; never mid-stroke. */
  versions: ReadonlyMap<LayerId, number>;
}

/** One chip as the column shows it; the column's `chips` array is back to front. */
export interface LayerChipView {
  id: LayerId;
  /** 0 to 100; at 0 the layer is hidden. */
  opacity: number;
  locked: boolean;
  /** The layer it clips to; null when it isn't clipping. */
  clipBase: LayerId | null;
  inked: boolean;
  /** Bumps when its ink changes, so its thumbnail redraws. */
  version: number;
}

/** A layer's ink for its thumbnail: its canvas and the ink's box on it, device px; null while it has none. */
export type ThumbnailSource = (id: LayerId) => { canvas: CanvasImageSource; box: Rect } | null;
