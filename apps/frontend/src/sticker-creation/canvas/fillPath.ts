export interface FillSample {
  x: number;
  y: number;
  T: number;
}

/** Pending pointer samples stay small; each segment yields its cells only when requested. */
export class FillPath {
  private samples: FillSample[] = [];
  private head = 0;
  private previous: FillSample | null = null;
  private active: Iterator<FillSample> | null = null;
  private last: FillSample | null = null;
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  append(sample: FillSample): void {
    this.samples.push({ ...sample });
  }

  next(): FillSample | null {
    for (;;) {
      if (this.active) {
        const next = this.active.next();
        if (!next.done) {
          const sample = next.value;
          if (this.last?.x === sample.x && this.last.y === sample.y) continue;
          this.last = sample;
          return sample;
        }
        this.active = null;
      }
      if (this.head === this.samples.length) {
        this.samples = [];
        this.head = 0;
        return null;
      }
      const sample = this.samples[this.head++];
      this.active = this.previous
        ? segment(this.previous, sample, this.width, this.height)
        : first(sample, this.width, this.height);
      this.previous = sample;
      if (this.head >= 1024) {
        this.samples = this.samples.slice(this.head);
        this.head = 0;
      }
    }
  }
}

function* first(sample: FillSample, width: number, height: number): Generator<FillSample> {
  if (sample.x < 0 || sample.y < 0 || sample.x >= width || sample.y >= height) return;
  const x = Math.round(sample.x);
  const y = Math.round(sample.y);
  if (x < width && y < height) yield { x, y, T: sample.T };
}

/** Clips in physical sheet coordinates before traversing the rounded backing-pixel cells. */
function clip(
  a: FillSample,
  b: FillSample,
  width: number,
  height: number,
): [number, number] | null {
  let from = 0;
  let to = 1;
  for (const [start, delta, limit] of [
    [a.x, b.x - a.x, width],
    [a.y, b.y - a.y, height],
  ]) {
    if (delta === 0) {
      if (start < 0 || start >= limit) return null;
      continue;
    }
    const edge0 = -start / delta;
    const edge1 = (limit - start) / delta;
    from = Math.max(from, Math.min(edge0, edge1));
    to = Math.min(to, Math.max(edge0, edge1));
    if (from > to) return null;
  }
  return [from, to];
}

function* segment(
  a: FillSample,
  b: FillSample,
  width: number,
  height: number,
): Generator<FillSample> {
  const clipped = clip(a, b, width, height);
  if (!clipped) return;
  const [from, to] = clipped;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const startX = a.x + dx * from;
  const startY = a.y + dy * from;
  let x = Math.round(startX);
  let y = Math.round(startY);
  const startsOnXBoundary = startX === x - 0.5;
  const startsOnYBoundary = startY === y - 0.5;
  const verticalBoundary = dx === 0 && startsOnXBoundary;
  const horizontalBoundary = dy === 0 && startsOnYBoundary;

  function* cell(cx: number, cy: number, t: number): Generator<FillSample> {
    const T = a.T + (b.T - a.T) * t;
    if (cx >= 0 && cy >= 0 && cx < width && cy < height) yield { x: cx, y: cy, T };
    if (verticalBoundary && cx > 0 && cx <= width && cy >= 0 && cy < height)
      yield { x: cx - 1, y: cy, T };
    if (horizontalBoundary && cy > 0 && cy <= height && cx >= 0 && cx < width)
      yield { x: cx, y: cy - 1, T };
    if (verticalBoundary && horizontalBoundary && cx > 0 && cy > 0 && cx <= width && cy <= height)
      yield { x: cx - 1, y: cy - 1, T };
  }

  yield* cell(x, y, from);
  // A segment's starting endpoint can touch cells it immediately leaves behind.
  if (startsOnXBoundary && dx !== 0) yield* cell(x - 1, y, from);
  if (startsOnYBoundary && dy !== 0) yield* cell(x, y - 1, from);
  if (startsOnXBoundary && startsOnYBoundary && dx !== 0 && dy !== 0)
    yield* cell(x - 1, y - 1, from);
  if (startsOnXBoundary && sx < 0) x--;
  if (startsOnYBoundary && sy < 0) y--;
  if (dx === 0 && dy === 0) return;
  for (;;) {
    const tx = dx === 0 ? Infinity : (x + sx * 0.5 - a.x) / dx;
    const ty = dy === 0 ? Infinity : (y + sy * 0.5 - a.y) / dy;
    const t = Math.min(tx, ty);
    if (t > to) return;
    // At a corner, both side cells touch the segment before it enters the diagonal cell.
    if (Number.isFinite(tx) && Number.isFinite(ty) && Math.abs(tx - ty) <= Number.EPSILON * 4) {
      yield* cell(x + sx, y, t);
      yield* cell(x, y + sy, t);
      x += sx;
      y += sy;
    } else if (tx < ty) x += sx;
    else y += sy;
    yield* cell(x, y, t);
  }
}

/** Interior coverage is marked a row range at a time, keeping large fills off the JS pixel loop. */
export class FillVisits {
  private readonly pixels: Uint8Array;
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  has(x: number, y: number): boolean {
    return (
      x >= 0 && y >= 0 && x < this.width && y < this.height && this.pixels[y * this.width + x] !== 0
    );
  }

  mark(spans: Uint32Array): void {
    for (let i = 0; i < spans.length; i += 3) {
      const row = spans[i] * this.width;
      this.pixels.fill(1, row + spans[i + 1], row + spans[i + 2]);
    }
  }
}
