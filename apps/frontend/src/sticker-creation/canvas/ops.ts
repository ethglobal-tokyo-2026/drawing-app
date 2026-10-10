/** The drawing tools. Brush and eraser make strokes; fill makes fills. */
export type Tool = "brush" | "eraser" | "fill";

/** Numbers per point in `StrokeOp.pts`: x, y, width, t. */
export const STRIDE = 4;

/** A layer's number: printed on its chip, kept for life, never reused on a sheet. */
export type LayerId = number;

/**
 * One stroke on a layer, in sheet units. `pts` is flat, `STRIDE` numbers per point: position, width,
 * and ms since the stroke began. `T` is ms into the session when it began.
 */
export interface StrokeOp {
  tool: "brush" | "eraser";
  layer: LayerId;
  color: string;
  pts: number[];
  T: number;
}

/** A fill seeded at a point in sheet units, `T` ms into the session, painted on `layer`. */
export interface FillOp {
  tool: "fill";
  layer: LayerId;
  x: number;
  y: number;
  color: string;
  /** The widest opening, in sheet units, it treated as closed; 0 for a fill that closed none. */
  gap: number;
  T: number;
}

/** Every mark on a layer is one op; history replays them in order. */
export type Op = StrokeOp | FillOp;

/** A change to the layers, one undo step each, `T` ms into the session; `tool` names the change. */
export type LayerStep =
  /** `at`: the new layer's index from the back. */
  | { tool: "add"; layer: LayerId; at: number; T: number }
  | { tool: "delete"; layer: LayerId; T: number }
  /** `to`: the layer's index from the back once moved. */
  | { tool: "move"; layer: LayerId; to: number; T: number }
  /** `opacity`: 0 to 100, whole numbers. */
  | { tool: "opacity"; layer: LayerId; opacity: number; T: number }
  | { tool: "lock"; layer: LayerId; on: boolean; T: number }
  | { tool: "clip"; layer: LayerId; on: boolean; T: number }
  /** Empties the layer; undo brings its ink back. */
  | { tool: "clear"; layer: LayerId; T: number };

/** One entry in the undo history: a mark on a layer, or a change to the layers. */
export type Step = Op | LayerStep;

export const isOp = (step: Step): step is Op =>
  step.tool === "brush" || step.tool === "eraser" || step.tool === "fill";
