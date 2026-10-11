import { releaseCanvas } from "../../ui/releaseCanvas";
import { context2d } from "../canvas/context2d";

/** The ink's bounds are found on a copy this many pixels on its long side: the sheet is millions. */
const SCAN_PX = 192;
/** The preview's long side in device pixels, enough for a sharp 140px box on a 3× phone. */
const PREVIEW_PX = 420;

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Finds every nontransparent pixel in a Canvas2D readback. */
function alphaBounds(data: Uint8ClampedArray, width: number, height: number): Bounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

/** Reads the small scan first, then checks exact alpha only if resampling missed everything. */
function inkBounds(ink: HTMLCanvasElement): Bounds | null {
  const scale = Math.min(1, SCAN_PX / Math.max(ink.width, ink.height, 1));
  const w = Math.max(1, Math.round(ink.width * scale));
  const h = Math.max(1, Math.round(ink.height * scale));
  const scan = document.createElement("canvas");
  scan.width = w;
  scan.height = h;
  try {
    const g = context2d(scan, { willReadFrequently: true });
    g.drawImage(ink, 0, 0, w, h);
    const small = alphaBounds(g.getImageData(0, 0, w, h).data, w, h);
    if (small) {
      return { x: small.x / scale, y: small.y / scale, w: small.w / scale, h: small.h / scale };
    }
    const original = context2d(ink, { willReadFrequently: true }).getImageData(
      0,
      0,
      ink.width,
      ink.height,
    );
    return alphaBounds(original.data, ink.width, ink.height);
  } finally {
    releaseCanvas(scan);
  }
}

/**
 * Paints visible ink on white into `target`, with `border` ink px around it. Both passed canvases
 * remain caller-owned. Transparent composites return empty without painting a white sticker.
 */
export function prepareSealPreview(
  target: HTMLCanvasElement,
  ink: HTMLCanvasElement,
  border: number,
): "ready" | "empty" {
  const bounds = inkBounds(ink);
  if (!bounds) return "empty";
  const pad = Math.round(border);
  const crop = {
    x: bounds.x - pad,
    y: bounds.y - pad,
    w: bounds.w + pad * 2,
    h: bounds.h + pad * 2,
  };
  const k = Math.min(1, PREVIEW_PX / Math.max(crop.w, crop.h));
  target.width = Math.max(1, Math.round(crop.w * k));
  target.height = Math.max(1, Math.round(crop.h * k));
  const g = context2d(target);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, target.width, target.height);
  // Only the part of the crop on the ink is drawn: WebKit draws nothing from a source rectangle past
  // its canvas's edge.
  const sx = Math.max(0, crop.x);
  const sy = Math.max(0, crop.y);
  const ex = Math.min(ink.width, crop.x + crop.w);
  const ey = Math.min(ink.height, crop.y + crop.h);
  if (ex > sx && ey > sy) {
    g.drawImage(
      ink,
      sx,
      sy,
      ex - sx,
      ey - sy,
      (sx - crop.x) * k,
      (sy - crop.y) * k,
      (ex - sx) * k,
      (ey - sy) * k,
    );
  }
  return "ready";
}
