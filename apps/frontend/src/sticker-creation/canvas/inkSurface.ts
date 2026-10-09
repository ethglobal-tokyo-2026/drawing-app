import { releaseCanvas } from "../../ui/releaseCanvas";
import type { Rect } from "../sealing/stickerLayers";
import { hexToRgb } from "./color";
import { context2d } from "./context2d";
import { floodSheet } from "./fill";
import type { Surface } from "./history";
import type { FillOp, Op, StrokeOp } from "./ops";
import { paintStroke } from "./paintStroke";
import type { SheetFrame } from "./sheetFrame";

/** A fill reads, floods and rewrites pixels, far more work than painting a stroke. */
const FILL_COST = 24;
/**
 * Sheet units on a side of the square a fill reads first, around its seed: room for a shape drawn to
 * be filled. A region reaching past it costs one more read, of the whole sheet.
 */
const FILL_NEAR = 160;

const wholeOf = (canvas: HTMLCanvasElement): Rect => ({
  x: 0,
  y: 0,
  w: canvas.width,
  h: canvas.height,
});

/** A blank canvas the size of `box`, holding a copy of that box of `source`. */
function copyOf(source: HTMLCanvasElement, box: Rect, settings?: CanvasRenderingContext2DSettings) {
  const copy = document.createElement("canvas");
  copy.width = box.w;
  copy.height = box.h;
  const ctx = context2d(copy, settings);
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return { copy, ctx };
}

/**
 * The ink: a transparent canvas over the white paper, drawn in sheet units and backed at its
 * frame's density. It's painted every frame, so it's never read back itself: fills and the seal read
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

  /** Device pixels per sheet unit. */
  get density(): number {
    return this.dpr;
  }

  /** Sizes the canvas to the frame, which clears it; says whether its size changed. */
  setFrame({ w, h, density }: SheetFrame): boolean {
    const width = Math.max(1, Math.round(w * density));
    const height = Math.max(1, Math.round(h * density));
    if (width === this.canvas.width && height === this.canvas.height && density === this.dpr)
      return false;
    this.dpr = density;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.setTransform(density, 0, 0, density, 0, 0);
    return true;
  }

  /** Paints points [from, to) of a stroke in progress. */
  paint(op: StrokeOp, from: number, to: number): void {
    paintStroke(this.ctx, op, from, to);
  }

  /** Floods from the op's point; false when nothing changed. */
  fill(op: FillOp): boolean {
    const read = (box: Rect) => {
      const { copy, ctx } = copyOf(this.canvas, box, { willReadFrequently: true });
      try {
        return ctx.getImageData(0, 0, box.w, box.h);
      } finally {
        releaseCanvas(copy);
      }
    };
    const flood = floodSheet(
      this.canvas,
      read,
      Math.floor(op.x * this.dpr),
      Math.floor(op.y * this.dpr),
      hexToRgb(op.color),
      op.gap * this.dpr,
      Math.round(FILL_NEAR * this.dpr),
    );
    if (!flood) return false;
    const { pixels, at, changed } = flood;
    this.ctx.putImageData(pixels, at.x, at.y, changed.x, changed.y, changed.w, changed.h);
    return true;
  }

  /** A copy of the ink to read pixels from, as sealing does. */
  copyForReading(): HTMLCanvasElement {
    return copyOf(this.canvas, wholeOf(this.canvas), { willReadFrequently: true }).copy;
  }

  apply(op: Op): void {
    if (op.tool === "fill") this.fill(op);
    else paintStroke(this.ctx, op);
  }

  cost(op: Op): number {
    return op.tool === "fill" ? FILL_COST : 1;
  }

  snapshot(): HTMLCanvasElement {
    return copyOf(this.canvas, wholeOf(this.canvas)).copy;
  }

  discard(snapshot: HTMLCanvasElement): void {
    releaseCanvas(snapshot);
  }

  restore(snapshot: HTMLCanvasElement | null): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (snapshot) this.ctx.drawImage(snapshot, 0, 0);
    this.ctx.restore();
  }
}
