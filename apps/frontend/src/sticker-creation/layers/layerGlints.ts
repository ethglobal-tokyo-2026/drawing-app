import { clamp } from "../../ui/easing";

interface Point {
  x: number;
  y: number;
}

/** A bounded spatial reservoir keeps short hairlines eligible beside a large filled shape. */
export function pickInkEdges(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  random: () => number = Math.random,
): Point[] {
  const buckets: Point[][] = Array.from({ length: 256 }, () => []);
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
      if (slot < 2) buckets[cell][slot] = { x: (x + 0.5) / scaleX, y: (y + 0.5) / scaleY };
    }
  const candidates = buckets.flat();
  const chosen: Point[] = [];
  while (candidates.length && chosen.length < 4) {
    const point = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
    if (chosen.every((p) => Math.hypot(p.x - point.x, p.y - point.y) >= 64)) chosen.push(point);
  }
  return chosen;
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
) {
  const size = Math.min(
    satellite === 0 ? [42, 38, 40, 36][group % 4] : satellite === 1 ? 20 : 12,
    Math.min(width, height) * 0.42,
  );
  const margin = size * 0.7 + 3;
  const direction = group % 2 === 0 ? 1 : -1;
  const x = clamp(point.x + (satellite ? direction * 16 : 0), margin, width - margin);
  const y = clamp(
    point.y + (satellite === 1 ? -14 : satellite === 2 ? 8 : 0),
    margin,
    height - margin,
  );
  const duration = [0.78, 0.82, 0.72][satellite];
  const horizontal = flight(
    x,
    direction * [160, 230, 185][satellite],
    0,
    margin,
    width - margin,
    duration,
  );
  const vertical = flight(y, [-175, -225, -125][satellite], 930, margin, height - margin, duration);
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
    delay: group * 12 + [0, 26 + group * 9, 54 + group * 6][satellite],
  };
}
