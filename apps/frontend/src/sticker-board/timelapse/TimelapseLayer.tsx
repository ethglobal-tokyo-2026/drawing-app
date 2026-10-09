import type { Timelapse } from "./useTimelapse";
import "./timelapse.css";

/**
 * The ink playing over the detail's stage, on the paper of the sheet it was drawn on. It sits beside
 * the figure, not in it, since the detail's lift clones the figure and a cloned canvas is blank. A tap
 * skips to the end.
 */
export function TimelapseLayer({ timelapse }: { timelapse: Timelapse }) {
  const {
    sticker,
    phase,
    skip,
    attach: { layer: layerRef, paper: paperRef, canvas: canvasRef },
  } = timelapse;
  if (!sticker || phase === "idle" || phase === "loading") return null;
  return (
    <div
      ref={layerRef}
      className="timelapse-layer"
      data-phase={phase}
      aria-hidden="true"
      onClick={skip}
    >
      <span ref={paperRef} className="timelapse-layer__paper" />
      <canvas ref={canvasRef} className="timelapse-layer__ink" />
    </div>
  );
}
