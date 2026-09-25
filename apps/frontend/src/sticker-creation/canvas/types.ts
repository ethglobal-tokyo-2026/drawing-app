export type Tool = "brush" | "eraser" | "bucket";

/** A sampled input point in CSS pixels. `pressure` is 0..1, `t` is ms. */
export interface Point {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

export interface Stroke {
  tool: "brush" | "eraser";
  color: string;
  size: number;
  /** Whether width should vary with pressure (pen input only). */
  usePressure: boolean;
  points: Point[];
}

export type Entry =
  | { kind: "stroke"; stroke: Stroke }
  /** Bucket fill seeded at a point in CSS pixels. */
  | { kind: "fill"; x: number; y: number; color: string }
  | { kind: "clear" };
