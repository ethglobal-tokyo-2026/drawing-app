import type { LayerId } from "../canvas/ops";
import type { Rect } from "../sealing/stickerPasses";
import { baseOf, indexOf, isHidden, type LayerState } from "./layerState";

/**
 * Draws the layers `ids` (a back-to-front run of `state.layers`) onto `g` within `rect`, device px
 * at the identity transform: each at its opacity, a hidden one not at all, and a clipped one cut to
 * its base, the nearest unclipped layer below it in the whole state, even outside `ids`, with the
 * two opacities multiplied. A clipped layer with no unclipped layer below draws as if unclipped.
 */
export function compositeLayers(
  g: CanvasRenderingContext2D,
  state: LayerState,
  canvasOf: (id: LayerId) => HTMLCanvasElement | null,
  ids: readonly LayerId[],
  rect: Rect,
  scratch: CanvasRenderingContext2D,
): void {
  // Every canvas is the sheet's size, so a rectangle is the same place on each.
  const draw = (to: CanvasRenderingContext2D, canvas: HTMLCanvasElement) =>
    to.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);

  g.save();
  scratch.save();
  try {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    scratch.globalAlpha = 1;
    for (const id of ids) {
      const at = indexOf(state, id);
      if (at < 0) {
        const held = state.layers.map((layer) => layer.id).join(", ");
        throw new Error(`Layer ${id} isn't in the layers being composited (${held})`);
      }
      const layer = state.layers[at];
      const canvas = canvasOf(id);
      if (isHidden(layer) || !canvas) continue;

      const base = baseOf(state, id);
      if (!base) {
        g.globalAlpha = layer.opacity / 100;
        draw(g, canvas);
        continue;
      }
      const baseCanvas = canvasOf(base.id);
      if (isHidden(base) || !baseCanvas) continue;
      // The layer is cut to its base on the scratch, since drawing it straight onto `g` would cut
      // the layers beneath it too.
      scratch.clearRect(rect.x, rect.y, rect.w, rect.h);
      scratch.globalCompositeOperation = "copy";
      draw(scratch, canvas);
      scratch.globalCompositeOperation = "destination-in";
      draw(scratch, baseCanvas);
      g.globalAlpha = (layer.opacity / 100) * (base.opacity / 100);
      draw(g, scratch.canvas);
    }
  } finally {
    scratch.restore();
    g.restore();
  }
}
