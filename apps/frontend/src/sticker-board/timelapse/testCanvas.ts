/**
 * A 2D context for happy-dom, which has none: tests mock `context2d` with `fakeContext2d`. It records
 * every call, and keeps pixels for what fills read back: image data in and out, clears, and copies
 * between canvases (nearest pixel). Paths are only recorded until `paintPaths` turns painting on:
 * then `fill` paints its path in `fillStyle`, placed by the transform, inking each pixel whose middle
 * it covers. Filled rectangles and gradients are only recorded. Clears and copies are in device px
 * whatever the transform. A clip to a rectangle bounds fills, clears and copies; any other clip is
 * only recorded. `drawImage` and `fill` blend under `globalAlpha` and `globalCompositeOperation`, in
 * premultiplied alpha; a mode `OPERATORS` lacks throws.
 */

export type Call = [name: string, ...args: unknown[]];

/** How much of the source or of the destination an operator keeps, given each one's alpha (0 to 1). */
type Share = (sourceAlpha: number, destinationAlpha: number) => number;

/** Premultiplied out = source × `source` + destination × `destination`, on each channel and alpha. */
interface Operator {
  source: Share;
  destination: Share;
}

/** The Porter-Duff operators the fake blends with, by `globalCompositeOperation`. */
const OPERATORS = new Map<string, Operator>([
  ["source-over", { source: () => 1, destination: (sa) => 1 - sa }],
  ["destination-over", { source: (_, da) => 1 - da, destination: () => 1 }],
  ["destination-in", { source: () => 0, destination: (sa) => sa }],
  ["destination-out", { source: () => 0, destination: (sa) => 1 - sa }],
  ["source-atop", { source: (_, da) => da, destination: (sa) => 1 - sa }],
  ["copy", { source: () => 1, destination: () => 0 }],
]);

/** A transform as `setTransform` takes it: a, b, c, d, e, f. */
type Matrix = readonly [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Left, top, right, bottom. */
type Bounds = readonly [number, number, number, number];
const UNCLIPPED: Bounds = [-Infinity, -Infinity, Infinity, Infinity];

/** A subpath's points in device px, flat: x, y. `rect` when `rect()` made it. */
interface Subpath {
  readonly points: number[];
  readonly rect: boolean;
}

const TAU = Math.PI * 2;
/** Straight pieces a whole turn of an arc is filled as: finer than a test's canvas shows. */
const ARC_PIECES = 64;

let pathsPaint = false;

/** Whether `fill` paints its path, from now on in this test file; off, as it starts, paths are only recorded. */
export function paintPaths(on: boolean): void {
  pathsPaint = on;
}

/**
 * Blends a source pixel (none: transparent), its alpha scaled by `alpha`, into the pixel of `to` at
 * `at`, and stores the result back as non-premultiplied bytes.
 */
function blendPixel(
  to: Uint8ClampedArray,
  at: number,
  source: ArrayLike<number> | null,
  alpha: number,
  operator: Operator,
): void {
  const sa = source ? (source[3] / 255) * alpha : 0;
  const da = to[at + 3] / 255;
  const keepSource = operator.source(sa, da);
  const keepDestination = operator.destination(sa, da);
  const outAlpha = sa * keepSource + da * keepDestination;
  for (let channel = 0; channel < 3; channel++) {
    const sc = source ? (source[channel] / 255) * sa : 0;
    const dc = (to[at + channel] / 255) * da;
    const premultiplied = sc * keepSource + dc * keepDestination;
    to[at + channel] = outAlpha > 0 ? Math.round((premultiplied / outAlpha) * 255) : 0;
  }
  to[at + 3] = Math.round(outAlpha * 255);
}

/** The angle an arc turns through, as the canvas reads its start, end and direction. */
function arcSweep(start: number, end: number, counterclockwise: boolean): number {
  if (!counterclockwise && end - start >= TAU) return TAU;
  if (counterclockwise && start - end >= TAU) return -TAU;
  const turn = (((end - start) % TAU) + TAU) % TAU;
  return counterclockwise && turn > 0 ? turn - TAU : turn;
}

/** An opaque pixel in a fill style's color: "#rgb" or "#rrggbb", the only styles the fake fills with. */
function pixelOf(style: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(style)?.[1];
  if (!hex) throw new Error(`The fake canvas fills with a hex color, not "${style}"`);
  const long = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  const channel = (i: number) => parseInt(long.slice(i * 2, i * 2 + 2), 16);
  return [channel(0), channel(1), channel(2), 255];
}

/** The first pixel whose middle is at or past `edge`. */
const firstPixel = (edge: number) => Math.ceil(edge - 0.5);

const made: FakeContext[] = [];
const byCanvas = new WeakMap<HTMLCanvasElement, FakeContext>();

export class FakeContext {
  readonly calls: Call[] = [];
  readonly canvas: HTMLCanvasElement;
  readonly settings: CanvasRenderingContext2DSettings | undefined;
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  fillStyle = "#000";
  private matrix: Matrix = IDENTITY;
  private path: Subpath[] = [];
  /** What the clip leaves drawable, device px; null for the whole canvas. */
  private clipBounds: Bounds | null = null;
  private pixels: ImageData | null = null;
  private readonly saved: {
    globalAlpha: number;
    globalCompositeOperation: string;
    fillStyle: string;
    matrix: Matrix;
    clipBounds: Bounds | null;
  }[] = [];

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
    const { globalAlpha, globalCompositeOperation, fillStyle, matrix, clipBounds } = this;
    this.saved.push({ globalAlpha, globalCompositeOperation, fillStyle, matrix, clipBounds });
  }
  /** Back to the state the matching `save` kept; with nothing saved it does nothing, as in a browser. */
  restore(): void {
    this.record("restore", []);
    const state = this.saved.pop();
    if (state) Object.assign(this, state);
  }
  setTransform(...args: number[]): void {
    this.record("setTransform", args);
    const [a, b, c, d, e, f] = args;
    this.matrix = [a, b, c, d, e, f];
  }
  beginPath(): void {
    this.record("beginPath", []);
    this.path = [];
  }
  moveTo(...args: number[]): void {
    this.record("moveTo", args);
    this.path.push({ points: this.place(args[0], args[1]), rect: false });
  }
  /** `arc(x, y, radius, start, end, counterclockwise)`, joined to the subpath it continues. */
  arc(...args: number[]): void {
    this.record("arc", args);
    const [x, y, r, start, end] = args;
    const sweep = arcSweep(start, end, Boolean(args[5]));
    const pieces = Math.max(1, Math.ceil((Math.abs(sweep) / TAU) * ARC_PIECES));
    let subpath = this.path.at(-1);
    if (!subpath) {
      subpath = { points: [], rect: false };
      this.path.push(subpath);
    }
    for (let i = 0; i <= pieces; i++) {
      const angle = start + (sweep * i) / pieces;
      subpath.points.push(...this.place(x + r * Math.cos(angle), y + r * Math.sin(angle)));
    }
  }
  rect(...args: number[]): void {
    this.record("rect", args);
    const [x, y, w, h] = args;
    const corners = [x, y, x + w, y, x + w, y + h, x, y + h];
    const points: number[] = [];
    for (let i = 0; i < corners.length; i += 2)
      points.push(...this.place(corners[i], corners[i + 1]));
    this.path.push({ points, rect: true });
  }
  /** Closes the subpath; the next starts where it began, as in a browser. */
  closePath(): void {
    this.record("closePath", []);
    const last = this.path.at(-1);
    if (last) this.path.push({ points: last.points.slice(0, 2), rect: false });
  }
  /** Paints the path, nonzero, once `paintPaths` is on. */
  fill(): void {
    this.record("fill", []);
    if (!pathsPaint) return;
    const operator = this.operator();
    const color = pixelOf(this.fillStyle);
    const { data, width } = this.image;
    const [left, top, right, bottom] = this.drawable();
    let [pathTop, pathBottom] = [Infinity, -Infinity];
    for (const { points } of this.path) {
      for (let i = 1; i < points.length; i += 2) {
        pathTop = Math.min(pathTop, points[i]);
        pathBottom = Math.max(pathBottom, points[i]);
      }
    }
    const crossings: { x: number; winding: number }[] = [];
    const lastRow = Math.min(bottom, firstPixel(pathBottom));
    for (let y = Math.max(top, firstPixel(pathTop)); y < lastRow; y++) {
      const middle = y + 0.5;
      crossings.length = 0;
      for (const { points } of this.path) {
        for (let i = 0; i < points.length; i += 2) {
          // Every subpath fills closed.
          const j = (i + 2) % points.length;
          const [x0, y0, x1, y1] = [points[i], points[i + 1], points[j], points[j + 1]];
          if (Math.min(y0, y1) > middle || Math.max(y0, y1) <= middle) continue;
          const x = x0 + ((middle - y0) * (x1 - x0)) / (y1 - y0);
          crossings.push({ x, winding: y1 > y0 ? 1 : -1 });
        }
      }
      crossings.sort((a, b) => a.x - b.x);
      let winding = 0;
      for (let k = 0; k < crossings.length - 1; k++) {
        winding += crossings[k].winding;
        if (winding === 0) continue;
        const to = Math.min(right, firstPixel(crossings[k + 1].x));
        for (let x = Math.max(left, firstPixel(crossings[k].x)); x < to; x++) {
          blendPixel(data, (y * width + x) * 4, color, this.globalAlpha, operator);
        }
      }
    }
  }
  fillRect(...args: number[]): void {
    this.record("fillRect", args);
  }
  /** A gradient that records its stops on this context; like a path, it paints nothing. */
  createLinearGradient(...args: number[]): {
    addColorStop: (offset: number, color: string) => void;
  } {
    this.record("createLinearGradient", args);
    return { addColorStop: (offset, color) => this.record("addColorStop", [offset, color]) };
  }
  /** Only a rectangle's clip takes effect; any other path's is recorded alone. */
  clip(): void {
    this.record("clip", []);
    const areas = this.path.filter(({ points }) => points.length > 4);
    if (areas.length !== 1 || !areas[0].rect) return;
    const { points } = areas[0];
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const [left, top, right, bottom] = this.clipBounds ?? UNCLIPPED;
    this.clipBounds = [
      Math.max(left, Math.min(...xs)),
      Math.max(top, Math.min(...ys)),
      Math.min(right, Math.max(...xs)),
      Math.min(bottom, Math.max(...ys)),
    ];
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.record("clearRect", [x, y, w, h]);
    const { data, width } = this.image;
    const [left, top, right, bottom] = this.drawable();
    const from = Math.max(left, x);
    const to = Math.min(right, x + w);
    for (let row = Math.max(top, y); row < Math.min(bottom, y + h); row++) {
      data.fill(0, (row * width + from) * 4, (row * width + to) * 4);
    }
  }

  /**
   * `drawImage(source, dx, dy)` or with source and target rectangles, sampling the nearest pixel
   * and blending it in as `globalAlpha` and `globalCompositeOperation` say. Source pixels past the
   * source canvas are transparent. Pixels past the target rectangle stay as they are, where a
   * browser clears them for destination-in and copy; no caller reads them.
   */
  drawImage(source: HTMLCanvasElement, ...args: number[]): void {
    this.record("drawImage", [source, ...args]);
    const operator = this.operator();
    const whole = [0, 0, source.width, source.height];
    const [sx, sy, sw, sh, dx, dy, dw, dh] =
      args.length === 2 ? [...whole, args[0], args[1], source.width, source.height] : args;
    if (args.length !== 2 && args.length !== 8) {
      throw new Error(`The fake canvas draws with 2 or 8 numbers, not ${args.length}`);
    }
    const from = byCanvas.get(source)?.image;
    const to = this.image;
    const [left, top, right, bottom] = this.drawable();
    for (let y = Math.max(top, Math.round(dy)); y < Math.min(bottom, Math.round(dy + dh)); y++) {
      for (let x = Math.max(left, Math.round(dx)); x < Math.min(right, Math.round(dx + dw)); x++) {
        const fx = Math.floor(sx + ((x + 0.5 - dx) * sw) / dw);
        const fy = Math.floor(sy + ((y + 0.5 - dy) * sh) / dh);
        const inside = from && fx >= 0 && fy >= 0 && fx < from.width && fy < from.height;
        const read = inside ? (fy * from.width + fx) * 4 : 0;
        const pixel = inside ? from.data.subarray(read, read + 4) : null;
        blendPixel(to.data, (y * to.width + x) * 4, pixel, this.globalAlpha, operator);
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

  /**
   * `putImageData(image, dx, dy)`, or with a dirty rect: only that part of the image is written. As
   * in a browser, a negative size flips the rect, and it's cut to the image and to the canvas.
   */
  putImageData(image: ImageData, dx: number, dy: number, ...dirty: number[]): void {
    this.record("putImageData", [image, dx, dy, ...dirty]);
    if (dirty.length !== 0 && dirty.length !== 4) {
      throw new Error(`The fake canvas takes a dirty rect of 4 numbers, not ${dirty.length}`);
    }
    const [x, y, w, h] = dirty.length === 4 ? dirty : [0, 0, image.width, image.height];
    const to = this.image;
    const left = Math.max(0, Math.min(x, x + w), -dx);
    const right = Math.min(image.width, Math.max(x, x + w), to.width - dx);
    const top = Math.max(0, Math.min(y, y + h), -dy);
    const bottom = Math.min(image.height, Math.max(y, y + h), to.height - dy);
    if (right <= left) return;
    for (let row = top; row < bottom; row++) {
      const start = (row * image.width + left) * 4;
      to.data.set(
        image.data.subarray(start, start + (right - left) * 4),
        ((dy + row) * to.width + dx + left) * 4,
      );
    }
  }

  /** The operator `globalCompositeOperation` names; throws for one the fake can't blend. */
  private operator(): Operator {
    const operator = OPERATORS.get(this.globalCompositeOperation);
    if (!operator) {
      throw new Error(`The fake canvas can't draw with "${this.globalCompositeOperation}"`);
    }
    return operator;
  }

  /** Where a point in the transform's units falls, device px. */
  private place(x: number, y: number): number[] {
    const [a, b, c, d, e, f] = this.matrix;
    return [a * x + c * y + e, b * x + d * y + f];
  }

  /** The pixels the clip leaves drawable, [left, right) and [top, bottom): the whole canvas with none. */
  private drawable(): Bounds {
    const { width, height } = this.image;
    if (!this.clipBounds) return [0, 0, width, height];
    const [left, top, right, bottom] = this.clipBounds;
    return [
      Math.max(0, firstPixel(left)),
      Math.max(0, firstPixel(top)),
      Math.min(width, firstPixel(right)),
      Math.min(height, firstPixel(bottom)),
    ];
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
