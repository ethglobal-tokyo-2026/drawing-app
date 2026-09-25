import type { Point, Stroke } from "./types";

function widthAt(stroke: Stroke, p: Point): number {
  if (!stroke.usePressure) return stroke.size;
  return Math.max(0.5, stroke.size * (0.15 + 0.85 * p.pressure));
}

/**
 * Draws a stroke as a chain of quadratic curves through the midpoints of
 * consecutive samples. Eraser strokes punch holes with `destination-out`.
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = ctx.fillStyle = stroke.tool === "eraser" ? "#000" : stroke.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (pts.length === 1) {
    const p = pts[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, widthAt(stroke, p) / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (!stroke.usePressure) {
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  } else {
    // Variable width: one curve segment per sample, each with its own width.
    let sx = pts[0].x;
    let sy = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const isLast = i === pts.length - 1;
      const ex = isLast ? p.x : (p.x + pts[i + 1].x) / 2;
      const ey = isLast ? p.y : (p.y + pts[i + 1].y) / 2;
      ctx.lineWidth = widthAt(stroke, p);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      if (isLast) ctx.lineTo(ex, ey);
      else ctx.quadraticCurveTo(p.x, p.y, ex, ey);
      ctx.stroke();
      sx = ex;
      sy = ey;
    }
  }
  ctx.restore();
}

/** The canvas's 2D context; throws where the browser can't provide one. */
export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return ctx;
}

/** Sizes a canvas backing store for the device pixel ratio (clears it). */
export function sizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
): void {
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  context2d(canvas).setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Clears a canvas regardless of its current transform. */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
