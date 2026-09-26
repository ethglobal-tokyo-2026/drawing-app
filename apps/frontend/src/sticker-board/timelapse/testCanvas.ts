/**
 * A 2D context for happy-dom, which has none: tests mock `context2d` with `fakeContext2d`. It records
 * every call, and keeps pixels for what fills read back: image data in and out, clears, and copies
 * between canvases (nearest pixel). Paths paint nothing, and transforms and clips are only recorded.
 * Copies replace rather than blend: every copy the prepare pass reads lands on a clear canvas.
 */

export type Call = [name: string, ...args: unknown[]];

const made: FakeContext[] = [];
const byCanvas = new WeakMap<HTMLCanvasElement, FakeContext>();

export class FakeContext {
  readonly calls: Call[] = [];
  readonly canvas: HTMLCanvasElement;
  readonly settings: CanvasRenderingContext2DSettings | undefined;
  globalCompositeOperation = "source-over";
  fillStyle = "#000";
  private pixels: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement, settings: CanvasRenderingContext2DSettings | undefined) {
    this.canvas = canvas;
    this.settings = settings;
  }

  /** The canvas's pixels; a new size clears them, as it does a real canvas. */
  get image(): ImageData {
    const width = Math.max(1, this.canvas.width);
    const height = Math.max(1, this.canvas.height);
    if (this.pixels?.width !== width || this.pixels.height !== height) {
      this.pixels = new ImageData(width, height);
    }
    return this.pixels;
  }

  private record(name: string, args: unknown[]): void {
    this.calls.push([name, ...args]);
  }

  save(): void {
    this.record("save", []);
  }
  restore(): void {
    this.record("restore", []);
  }
  setTransform(...args: number[]): void {
    this.record("setTransform", args);
  }
  beginPath(): void {
    this.record("beginPath", []);
  }
  moveTo(...args: number[]): void {
    this.record("moveTo", args);
  }
  arc(...args: number[]): void {
    this.record("arc", args);
  }
  closePath(): void {
    this.record("closePath", []);
  }
  fill(): void {
    this.record("fill", []);
  }
  clip(): void {
    this.record("clip", []);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.record("clearRect", [x, y, w, h]);
    const { data, width, height } = this.image;
    for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
      data.fill(0, (row * width + Math.max(0, x)) * 4, (row * width + Math.min(width, x + w)) * 4);
    }
  }

  /** `drawImage(source, dx, dy)` or with source and target rectangles, sampling the nearest pixel. */
  drawImage(source: HTMLCanvasElement, ...args: number[]): void {
    this.record("drawImage", [source, ...args]);
    const whole = [0, 0, source.width, source.height];
    const [sx, sy, sw, sh, dx, dy, dw, dh] =
      args.length === 2 ? [...whole, args[0], args[1], source.width, source.height] : args;
    if (args.length !== 2 && args.length !== 8) {
      throw new Error(`The fake canvas draws with 2 or 8 numbers, not ${args.length}`);
    }
    const from = byCanvas.get(source)?.image;
    const to = this.image;
    for (let y = Math.max(0, Math.round(dy)); y < Math.min(to.height, Math.round(dy + dh)); y++) {
      for (let x = Math.max(0, Math.round(dx)); x < Math.min(to.width, Math.round(dx + dw)); x++) {
        const fx = Math.floor(sx + ((x + 0.5 - dx) * sw) / dw);
        const fy = Math.floor(sy + ((y + 0.5 - dy) * sh) / dh);
        const inside = from && fx >= 0 && fy >= 0 && fx < from.width && fy < from.height;
        const i = (y * to.width + x) * 4;
        if (inside)
          to.data.set(
            from.data.subarray((fy * from.width + fx) * 4, (fy * from.width + fx) * 4 + 4),
            i,
          );
        else to.data.fill(0, i, i + 4);
      }
    }
  }

  getImageData(x: number, y: number, w: number, h: number): ImageData {
    this.record("getImageData", [x, y, w, h]);
    const from = this.image;
    const out = new ImageData(w, h);
    for (let row = 0; row < h; row++) {
      const start = ((y + row) * from.width + x) * 4;
      out.data.set(from.data.subarray(start, start + w * 4), row * w * 4);
    }
    return out;
  }

  putImageData(image: ImageData, x: number, y: number): void {
    this.record("putImageData", [image, x, y]);
    const to = this.image;
    for (let row = 0; row < image.height; row++) {
      const start = row * image.width * 4;
      to.data.set(
        image.data.subarray(start, start + image.width * 4),
        ((y + row) * to.width + x) * 4,
      );
    }
  }
}

/** The canvas's context, the same one each time, as a browser's is. */
export function fakeContext2d(
  canvas: HTMLCanvasElement,
  settings?: CanvasRenderingContext2DSettings,
): FakeContext {
  const known = byCanvas.get(canvas);
  if (known) return known;
  const context = new FakeContext(canvas, settings);
  byCanvas.set(canvas, context);
  made.push(context);
  return context;
}

export const contextOf = (canvas: HTMLCanvasElement) => byCanvas.get(canvas);

/** Every context made since the last `forgetContexts`, oldest first. */
export const madeContexts = (): readonly FakeContext[] => [...made];

export const forgetContexts = () => {
  made.length = 0;
};
