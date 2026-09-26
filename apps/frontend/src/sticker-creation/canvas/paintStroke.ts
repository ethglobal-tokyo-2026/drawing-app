import { STRIDE, type StrokeOp } from "./ops";

const TAU = Math.PI * 2;
/** Radius floor, so the finest point still paints a pixel. */
const MIN_RADIUS = 0.3;

/**
 * The hull of two circles: one round-capped segment whose width can change along it. Every subpath
 * winds the same way, so a whole stroke fills as one union with clean edges.
 */
function capsule(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  // One circle inside the other: the bigger one is the whole hull.
  if (d <= Math.abs(r1 - r0) + 1e-3) {
    const [x, y, r] = r0 >= r1 ? [x0, y0, r0] : [x1, y1, r1];
    g.moveTo(x + r, y);
    g.arc(x, y, r, 0, TAU);
    return;
  }
  const a = Math.atan2(dy, dx);
  const phi = Math.acos((r0 - r1) / d);
  g.moveTo(x0 + r0 * Math.cos(a + phi), y0 + r0 * Math.sin(a + phi));
  g.arc(x0, y0, r0, a + phi, a - phi + TAU);
  g.arc(x1, y1, r1, a - phi, a + phi);
  g.closePath();
}

const radius = (pts: number[], i: number) => Math.max(pts[i * STRIDE + 2] / 2, MIN_RADIUS);

/**
 * Paints points [from, to) of a stroke, joined to the point before `from`, so a stroke in progress
 * paints only what's new each frame. The brush is opaque; the eraser clears to transparent.
 */
export function paintStroke(
  g: CanvasRenderingContext2D,
  op: StrokeOp,
  from = 0,
  to = op.pts.length / STRIDE,
): void {
  if (to <= from) return;
  const { pts } = op;
  g.save();
  g.globalCompositeOperation = op.tool === "eraser" ? "destination-out" : "source-over";
  g.fillStyle = op.tool === "eraser" ? "#000" : op.color;
  g.beginPath();
  let i = from;
  if (i === 0) {
    const r = radius(pts, 0);
    g.moveTo(pts[0] + r, pts[1]);
    g.arc(pts[0], pts[1], r, 0, TAU);
    i = 1;
  }
  for (; i < to; i++) {
    const j = i * STRIDE;
    capsule(
      g,
      pts[j - STRIDE],
      pts[j - STRIDE + 1],
      radius(pts, i - 1),
      pts[j],
      pts[j + 1],
      radius(pts, i),
    );
  }
  g.fill();
  g.restore();
}
