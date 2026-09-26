import { hexToRgb } from "./color";
import { context2d } from "./context2d";
import { floodFill } from "./fill";
import type { Surface } from "./history";
import type { FillOp, Op, StrokeOp } from "./ops";
import { paintStroke } from "./paintStroke";

/** Past this density a sharper canvas costs memory and shows nothing more. */
export const MAX_DPR = 3;
/** A fill rereads and rewrites every pixel, far more work than painting a stroke. */
const FILL_COST = 24;

/** A blank canvas the size of `source`, holding a copy of it. */
function copyOf(source: HTMLCanvasElement, settings?: CanvasRenderingContext2DSettings) {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const ctx = context2d(copy, settings);
  ctx.drawImage(source, 0, 0);
  return { copy, ctx };
}

/**
 * The ink: a transparent canvas over the white paper, drawn in sheet pixels and backed at the
 * screen's density. It's painted every frame, so it's never read back itself: fills and the seal read
 * a copy made for reading, which keeps this one on the GPU.
 */
export class InkSurface implements Surface<HTMLCanvasElement> {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = context2d(canvas);
  }

  /** Device pixels per sheet pixel. */
  get density(): number {
    return this.dpr;
  }

  /** Sizes the canvas to the sheet, which clears it; says whether the size changed. */
  resize(width: number, height: number, devicePixelRatio: number): boolean {
    const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (w === this.canvas.width && h === this.canvas.height && dpr === this.dpr) return false;
    this.dpr = dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /** Paints points [from, to) of a stroke in progress. */
  paint(op: StrokeOp, from: number, to: number): void {
    paintStroke(this.ctx, op, from, to);
  }

  /** Floods from the op's point; false when nothing changed. */
  fill(op: FillOp): boolean {
    const { copy, ctx: reader } = copyOf(this.canvas, { willReadFrequently: true });
    try {
      const pixels = reader.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const x = Math.floor(op.x * this.dpr);
      const y = Math.floor(op.y * this.dpr);
      if (!floodFill(pixels, x, y, hexToRgb(op.color))) return false;
      this.ctx.putImageData(pixels, 0, 0);
      return true;
    } finally {
      // iOS counts canvases against a small budget until they're collected, so this one goes now.
      copy.width = 0;
      copy.height = 0;
    }
  }

  /** A copy of the ink to read pixels from, as sealing does. */
  copyForReading(): HTMLCanvasElement {
    return copyOf(this.canvas, { willReadFrequently: true }).copy;
  }

  apply(op: Op): void {
    if (op.tool === "fill") this.fill(op);
    else paintStroke(this.ctx, op);
  }

  cost(op: Op): number {
    return op.tool === "fill" ? FILL_COST : 1;
  }

  snapshot(): HTMLCanvasElement {
    return copyOf(this.canvas).copy;
  }

  restore(snapshot: HTMLCanvasElement | null): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (snapshot) this.ctx.drawImage(snapshot, 0, 0);
    this.ctx.restore();
  }
}
