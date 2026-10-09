import { releaseCanvas } from "../../ui/releaseCanvas";
import { context2d } from "./context2d";
import type { PredictionLayer } from "./inkEngine";
import type { StrokeOp } from "./ops";
import { paintStroke } from "./paintStroke";

/** The ink canvas's backing size and its device px per sheet unit, which the overlay matches. */
type InkSize = { width: number; height: number; density: number };

/**
 * A transparent canvas over the ink, sized and scaled as the ink is, holding a pen's prediction for
 * one frame. It takes its backing at the first prediction, so a device with no pen pays nothing.
 */
export class PredictionCanvas implements PredictionLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ink: () => InkSize;
  private ctx: CanvasRenderingContext2D | null = null;
  private painted = false;

  constructor(canvas: HTMLCanvasElement, ink: () => InkSize) {
    this.canvas = canvas;
    this.ink = ink;
  }

  paint(op: StrokeOp): void {
    const ctx = this.matched();
    this.wipe(ctx);
    paintStroke(ctx, op);
    this.painted = true;
  }

  clear(): void {
    if (this.painted && this.ctx) this.wipe(this.ctx);
  }

  /** Lets go of its backing now, as when the sheet goes. */
  release(): void {
    releaseCanvas(this.canvas);
    [this.ctx, this.painted] = [null, false];
  }

  /** Its context, the canvas sized as the ink is, which each sheet's frame sets. */
  private matched(): CanvasRenderingContext2D {
    const { width, height, density } = this.ink();
    if (this.canvas.width !== width || this.canvas.height !== height) {
      [this.canvas.width, this.canvas.height, this.painted] = [width, height, false];
    }
    const ctx = (this.ctx ??= context2d(this.canvas));
    ctx.setTransform(density, 0, 0, density, 0, 0);
    return ctx;
  }

  private wipe(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
    this.painted = false;
  }
}
