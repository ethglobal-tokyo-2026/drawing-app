import { useEffect, useRef } from "react";
import { paintStroke } from "../sticker-creation/canvas/paintStroke";
import { brushSample, type BrushKind } from "./brushSamples";

/** The pixel pen paints on a grid this many times coarser than the swatch, then shows it scaled up. */
const PIXEL = 4;
/** On the pixel grid, a pixel at least this opaque is inked; any fainter is paper. */
const PIXEL_INKED = 110;

/** Makes every pixel fully inked or blank, as a pixel pen lays ink down. */
function hardenPixels(g: CanvasRenderingContext2D, side: number) {
  const image = g.getImageData(0, 0, side, side);
  const { data } = image;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= PIXEL_INKED ? 255 : 0;
  g.putImageData(image, 0, 0);
}

/** A brush's sample stroke on a white swatch, painted by the drawing screen's own `paintStroke`. */
export function BrushStrokeSample({ kind, side }: { kind: BrushKind; side: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pixel = kind === "pixelPen";

  useEffect(() => {
    const el = canvas.current;
    const scale = pixel ? 1 / PIXEL : devicePixelRatio;
    const size = Math.round(side * scale);
    if (!el) return;
    el.width = size;
    el.height = size;
    // Test DOMs have no 2D context; the swatch stays blank there.
    const g = el.getContext("2d", { willReadFrequently: pixel });
    if (!g) return;
    g.setTransform(scale, 0, 0, scale, 0, 0);
    paintStroke(g, brushSample(kind, side));
    if (pixel) hardenPixels(g, size);
  }, [kind, side, pixel]);

  return (
    <canvas
      ref={canvas}
      className={`brush-sample ${pixel ? "brush-sample--pixel" : ""}`}
      style={{ width: side, height: side }}
      aria-hidden="true"
    />
  );
}
