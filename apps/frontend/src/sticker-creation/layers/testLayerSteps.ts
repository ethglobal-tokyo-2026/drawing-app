import type { FillOp, LayerId, LayerStep, StrokeOp } from "../canvas/ops";
import { FIRST_LAYER } from "./layerState";

/** Steps for tests: on `layer` (the first unless said), at time 0, otherwise as little as they can be. */
export const brush = (layer: LayerId = FIRST_LAYER): StrokeOp => ({
  tool: "brush",
  layer,
  color: "#1C1824",
  pts: [],
  T: 0,
});

export const eraser = (layer: LayerId = FIRST_LAYER): StrokeOp => ({
  tool: "eraser",
  layer,
  color: "#1C1824",
  pts: [],
  T: 0,
});

export const fill = (layer: LayerId = FIRST_LAYER): FillOp => ({
  tool: "fill",
  layer,
  x: 0,
  y: 0,
  color: "#1C1824",
  gap: 0,
  T: 0,
});

export const addLayer = (layer: LayerId, at: number): LayerStep => ({
  tool: "add",
  layer,
  at,
  T: 0,
});

export const deleteLayer = (layer: LayerId): LayerStep => ({ tool: "delete", layer, T: 0 });

export const moveLayer = (layer: LayerId, to: number): LayerStep => ({
  tool: "move",
  layer,
  to,
  T: 0,
});

export const setOpacity = (
  layer: LayerId,
  opacity: number,
): Extract<LayerStep, { tool: "opacity" }> => ({
  tool: "opacity",
  layer,
  opacity,
  T: 0,
});

export const setLock = (layer: LayerId, on: boolean): LayerStep => ({
  tool: "lock",
  layer,
  on,
  T: 0,
});

export const setClip = (layer: LayerId, on: boolean): LayerStep => ({
  tool: "clip",
  layer,
  on,
  T: 0,
});

export const clearLayer = (layer: LayerId): LayerStep => ({ tool: "clear", layer, T: 0 });
