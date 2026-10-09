import { StrokeBuilder } from "../sticker-creation/canvas/brush";
import type { StrokeOp } from "../sticker-creation/canvas/ops";

/** The brushes on the Brushes shelf; the brush is the one the drawing screen has today. */
export type BrushKind = "brush" | "marker" | "fineliner" | "pixelPen";

/** Ink, the color every sample is painted in. */
const INK = "#1C1824";
/** The chisel's flat edge, in radians, running up and to the right: a stroke across it lays down the full width. */
const CHISEL = -Math.PI / 4;
/** The chisel's edge, as a share of the swatch: broad, so the flat cut ends read at 104px. */
const CHISEL_WIDTH = 0.15;

/** One S-shaped wave across a `side` square, the path every sample paints. */
function wave(side: number): [number, number][] {
  const pad = side * 0.16;
  const steps = Math.round(side * 1.2);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    return [pad + (side - 2 * pad) * u, side / 2 - side * 0.22 * Math.sin(2 * Math.PI * u)];
  });
}

/** A stroke whose width at each point comes from `width(i, direction)`. */
function shaped(side: number, width: (i: number, direction: number) => number): StrokeOp {
  const path = wave(side);
  const pts = path.flatMap(([x, y], i) => {
    const [nx, ny] = path[Math.min(i + 1, path.length - 1)];
    const [px, py] = path[Math.max(i - 1, 0)];
    return [x, y, width(i, Math.atan2(ny - py, nx - px)), i * 12];
  });
  return { tool: "brush", color: INK, pts, T: 0 };
}

/**
 * The sample stroke for `kind` across a `side` square, painted by the drawing screen's own
 * `paintStroke`. The brush is today's, from its own StrokeBuilder with a pen's pressure swelling
 * and easing off; the others are shaped here the way their tips would lay ink down.
 */
export function brushSample(kind: BrushKind, side: number): StrokeOp {
  const size = side * 0.11;
  switch (kind) {
    case "brush": {
      const path = wave(side);
      const [x, y] = path[0];
      // Today's brush as a pen that senses pressure draws it, under the Normal curve.
      const stroke = new StrokeBuilder({
        tool: "brush",
        color: INK,
        size,
        x,
        y,
        t: 0,
        T: 0,
        pressure: 0,
        pointerType: "pen",
        pressureVaries: true,
        response: "normal",
      });
      path.slice(1).forEach(([px, py], i) => {
        const pressure = Math.sin((Math.PI * (i + 1)) / path.length) ** 0.8;
        stroke.add(px, py, pressure, (i + 1) * 12);
      });
      stroke.settle(...path[path.length - 1]);
      stroke.taperEnd();
      return stroke.op;
    }
    case "marker": {
      // A chisel tip is a flat edge held at one angle, so its mark is the path swept by that edge: broad down, a
      // hairline up, and both ends cut straight along the edge, where a brush tapers round. Copies of the path laid
      // side by side across the edge build that sweep, run back and forth so each join lies along a cut end.
      const path = wave(side);
      const edge = side * CHISEL_WIDTH;
      const line = Math.max(1.2, side * 0.014);
      const copies = Math.ceil(edge / (line * 0.6)) + 1;
      const pts: number[] = [];
      for (let k = 0; k < copies; k++) {
        const across = edge * (k / (copies - 1) - 0.5);
        const run = k % 2 === 0 ? path : [...path].reverse();
        for (const [x, y] of run) {
          pts.push(
            x + across * Math.cos(CHISEL),
            y + across * Math.sin(CHISEL),
            line,
            pts.length * 3,
          );
        }
      }
      return { tool: "brush", color: INK, pts, T: 0 };
    }
    case "fineliner":
      return shaped(side, () => Math.max(1.5, side * 0.025));
    case "pixelPen":
      return shaped(side, () => Math.max(1, side * 0.05));
  }
}
