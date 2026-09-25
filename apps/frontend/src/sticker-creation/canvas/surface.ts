import type { Surface } from "./history";
import { hexToRgba } from "./color";
import { floodFill } from "./fill";
import { clearCanvas, context2d, drawStroke } from "./renderer";
import type { Entry } from "./types";

/** History surface backed by a canvas; snapshots are canvas copies. */
export class CanvasSurface implements Surface<HTMLCanvasElement> {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = context2d(canvas);
  }

  apply(entry: Entry): void {
    if (entry.kind === "clear") clearCanvas(this.ctx);
    else if (entry.kind === "fill") this.fill(entry.x, entry.y, entry.color);
    else drawStroke(this.ctx, entry.stroke);
  }

  /** The color currently at a CSS-pixel point, as RGBA. */
  pixelAt(x: number, y: number): Uint8ClampedArray {
    const dpr = this.ctx.getTransform().a;
    return this.ctx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data;
  }

  private fill(x: number, y: number, color: string): void {
    const dpr = this.ctx.getTransform().a;
    const img = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    if (floodFill(img, Math.floor(x * dpr), Math.floor(y * dpr), hexToRgba(color)))
      this.ctx.putImageData(img, 0, 0);
  }

  restore(snapshot: HTMLCanvasElement | null): void {
    clearCanvas(this.ctx);
    if (!snapshot) return;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(snapshot, 0, 0);
    this.ctx.restore();
  }

  snapshot(): HTMLCanvasElement {
    const copy = document.createElement("canvas");
    copy.width = this.canvas.width;
    copy.height = this.canvas.height;
    context2d(copy).drawImage(this.canvas, 0, 0);
    return copy;
  }
}
