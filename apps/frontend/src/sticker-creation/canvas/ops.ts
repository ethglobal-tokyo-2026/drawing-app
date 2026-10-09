/** The drawing tools. Brush and eraser make strokes; fill makes fills. */
export type Tool = "brush" | "eraser" | "fill";

/** Numbers per point in `StrokeOp.pts`: x, y, width, t. */
export const STRIDE = 4;

/**
 * One stroke, in sheet units. `pts` is flat, `STRIDE` numbers per point: position, width, and ms
 * since the stroke began. `T` is ms into the session when it began.
 */
export interface StrokeOp {
  tool: "brush" | "eraser";
  color: string;
  pts: number[];
  T: number;
}

/** A fill seeded at a point in sheet units, `T` ms into the session. */
export interface FillOp {
  tool: "fill";
  x: number;
  y: number;
  color: string;
  T: number;
}

/** Every mark on the ink is one op; history replays them in order. */
export type Op = StrokeOp | FillOp;

/** One entry in the undo history: a mark on the ink, or a clear, which sets the marks before it aside. */
export type Step = Op | { tool: "clear" };
