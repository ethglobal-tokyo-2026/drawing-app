import type { CSSProperties } from "react";
import type { Timelapse } from "./useTimelapse";
import "./timelapse.css";

/**
 * The ink playing over the sticker: white paper cut to its silhouette, in its figure's grid cell and
 * at its size. It sits beside the figure, not in it, since the detail's lift clones the figure and a
 * cloned canvas is blank. A tap skips to the end.
 */
export function TimelapseLayer({ timelapse }: { timelapse: Timelapse }) {
  const {
    sticker,
    phase,
    skip,
    attach: { layer: layerRef, canvas: canvasRef },
  } = timelapse;
  const mask = sticker?.urls.mask;
  if (!sticker || !mask || phase === "idle" || phase === "loading") return null;
  const style: CSSProperties = {
    "--m": `url("${mask}")`,
    "--ar": (sticker.width / sticker.height).toFixed(4),
  };
  return (
    <div
      ref={layerRef}
      className="timelapse-layer"
      data-phase={phase}
      style={style}
      aria-hidden="true"
      onClick={skip}
    >
      <canvas ref={canvasRef} className="timelapse-layer__ink" />
    </div>
  );
}
