import { clamp } from "../../ui/easing";

const PROFILES = {
  tiny: { sizes: [12, 8, 6], travel: 0.22, time: 0.62 },
  small: { sizes: [18, 12, 8, 6], travel: 0.48, time: 0.82 },
  broad: { sizes: [24, 16, 10, 7, 6], travel: 0.8, time: 1 },
};
type InkTier = keyof typeof PROFILES;

interface Point {
  x: number;
  y: number;
}
interface InkPixel extends Point {
  px: number;
  py: number;
}
interface InkEdge extends InkPixel {
  tier: InkTier;
}

/** Nearby disconnected ink must not enlarge a dot's burst; diagonal hairlines stay connected. */
function localInkTier(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  point: InkPixel,
): InkTier {
  const rx = Math.ceil(48 * scaleX),
    ry = Math.ceil(48 * scaleY);
  const x0 = Math.max(0, point.px - rx),
    x1 = Math.min(width - 1, point.px + rx);
  const y0 = Math.max(0, point.py - ry),
    y1 = Math.min(height - 1, point.py + ry);
  const w = x1 - x0 + 1,
    h = y1 - y0 + 1;
  const seen = new Uint8Array(w * h),
    queue = new Uint32Array(w * h);
  const start = (point.py - y0) * w + point.px - x0;
  queue[0] = start;
  seen[start] = 1;
  let read = 0,
    write = 1,
    minX = point.px,
    maxX = minX,
    minY = point.py,
    maxY = minY,
    span = 0;
  while (read < write) {
    const at = queue[read++],
      x = (at % w) + x0,
      y = Math.floor(at / w) + y0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    span = Math.max((maxX - minX + 1) / scaleX, (maxY - minY + 1) / scaleY);
    // The broad tier is final, so large fills need no complete flood traversal.
    if (span > 48) return "broad";
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
        const next = (ny - y0) * w + nx - x0;
        if (seen[next]) continue;
        seen[next] = 1;
        if (pixels[(ny * width + nx) * 4 + 3]) queue[write++] = next;
      }
  }
  return span <= 12 ? "tiny" : "small";
}

/** A bounded spatial reservoir keeps short hairlines eligible beside a large filled shape. */
export function pickInkEdges(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  random: () => number = Math.random,
): InkEdge[] {
  const buckets: InkPixel[][] = Array.from({ length: 256 }, () => []);
  const seen = new Uint32Array(256);
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : pixels[(y * width + x) * 4 + 3];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (
        !alpha(x, y) ||
        (alpha(x - 1, y) && alpha(x + 1, y) && alpha(x, y - 1) && alpha(x, y + 1))
      )
        continue;
      const cell =
        Math.min(15, Math.floor((y / height) * 16)) * 16 +
        Math.min(15, Math.floor((x / width) * 16));
      const count = ++seen[cell];
      const slot = count <= 2 ? count - 1 : Math.floor(random() * count);
      if (slot < 2)
        buckets[cell][slot] = { x: (x + 0.5) / scaleX, y: (y + 0.5) / scaleY, px: x, py: y };
    }
  const candidates = buckets.flat();
  if (!candidates.length) return [];
  const chosen = [candidates.splice(Math.floor(random() * candidates.length), 1)[0]];
  while (candidates.length && chosen.length < 6) {
    const distances = candidates.map((p) =>
      Math.min(...chosen.map((q) => Math.hypot(p.x - q.x, p.y - q.y))),
    );
    const farthest = Math.max(...distances);
    if (farthest < 64) break;
    const eligible = distances.flatMap((d, i) => (d >= Math.max(64, farthest * 0.9) ? [i] : []));
    const index = eligible[Math.floor(random() * eligible.length)];
    chosen.push(candidates.splice(index, 1)[0]);
  }
  return chosen.map((point) => ({
    ...point,
    tier: localInkTier(pixels, width, height, scaleX, scaleY, point),
  }));
}

/** One reflected flight; a second impact finishes the star rather than making it jitter at an edge. */
function flight(
  p: number,
  velocity: number,
  gravity: number,
  min: number,
  max: number,
  duration: number,
) {
  const hit = (start: number, v: number) => {
    const times: number[] = [];
    for (const edge of [min, max]) {
      if (!gravity) {
        const t = (edge - start) / v;
        if (t > 0.00001) times.push(t);
      } else {
        const discriminant = v * v - 2 * gravity * (start - edge);
        if (discriminant >= 0)
          for (const sign of [-1, 1]) {
            const t = (-v + sign * Math.sqrt(discriminant)) / gravity;
            if (t > 0.00001) times.push(t);
          }
      }
    }
    return Math.min(...times, Infinity);
  };
  // An outward launch from a boundary reflects immediately.
  const first = (p <= min && velocity < 0) || (p >= max && velocity > 0) ? 0 : hit(p, velocity);
  const atHit = clamp(p + velocity * first + (gravity * first * first) / 2, min, max);
  const reflected = -(velocity + gravity * first) * 0.46;
  const second = first < duration ? first + hit(atHit, reflected) : Infinity;
  return {
    end: Math.min(duration, second),
    at: (t: number) => {
      const after = t > first;
      const dt = after ? t - first : t;
      return clamp(
        (after ? atHit : p) + (after ? reflected : velocity) * dt + (gravity * dt * dt) / 2,
        min,
        max,
      );
    },
  };
}

/** Transform-only, precomputed pop, gravity and edge bounce: no per-frame canvas work. */
export function glintPath(
  point: Point,
  group: number,
  satellite: number,
  width: number,
  height: number,
  tier: InkTier,
) {
  const profile = PROFILES[tier];
  const size = Math.min(profile.sizes[satellite], Math.min(width, height) * 0.42);
  const margin = Math.min(size * 0.7 + 3, Math.min(width, height) / 2);
  const travel = profile.travel,
    time = profile.time / 1.35;
  const direction = group % 2 === 0 ? 1 : -1;
  const x = clamp(
    point.x + direction * [0, 16, 16, -12, -16][satellite] * travel,
    margin,
    width - margin,
  );
  const y = clamp(point.y + [0, -14, 8, 6, -10][satellite] * travel, margin, height - margin);
  const duration = [0.78, 0.82, 0.72, 0.68, 0.7][satellite] * time;
  const horizontal = flight(
    x,
    (direction * [160, 230, 185, -120, -200][satellite] * travel) / time,
    0,
    margin,
    width - margin,
    duration,
  );
  const vertical = flight(
    y,
    ([-175, -225, -125, -190, -140][satellite] * travel) / time,
    (930 * travel) / (time * time),
    margin,
    height - margin,
    duration,
  );
  const seconds = Math.min(horizontal.end, vertical.end, duration);
  const frames = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const pop =
      t < 0.18
        ? 1.16 * (1 - (1 - t / 0.18) ** 3)
        : t < 0.32
          ? 1.16 - ((t - 0.18) / 0.14) * 0.16
          : 1;
    const fade = clamp((t - 0.48) / 0.52, 0, 1);
    const dissolve = fade * fade * (3 - 2 * fade);
    const scale = Math.max(0.01, pop * (1 - dissolve));
    return {
      offset: t,
      transform: `translate(${(horizontal.at(t * seconds) - x).toFixed(3)}px,${(vertical.at(t * seconds) - y).toFixed(3)}px) scale(${scale === 0.01 ? "0.01" : scale.toFixed(3)}) rotate(${direction * (t * 110 - 15)}deg)`,
      opacity: t < 0.08 ? t / 0.08 : 1 - dissolve,
    };
  });
  return {
    x,
    y,
    size,
    margin,
    frames,
    duration: seconds * 1000,
    delay: (group * 7 + [0, 24, 48, 72, 40][satellite]) * time * 0.75,
  };
}

/** A balanced shuffled palette lets every particle size wear either color. */
export function glintGroup(
  point: InkEdge,
  group: number,
  width: number,
  height: number,
  random: () => number = Math.random,
) {
  const colors = PROFILES[point.tier].sizes.map((_, i) => (i + group) % 2 === 0);
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors.map((pink, satellite) => ({
    ...glintPath(point, group, satellite, width, height, point.tier),
    pink,
  }));
}
