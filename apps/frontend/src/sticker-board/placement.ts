import type { Placement } from "../stickers/stickerStorage";

const DEFAULT_SCALE = 0.42;
export const MIN_SCALE = 0.12;
export const MAX_SCALE = 0.95;

/** Stable pseudo-random number in [0, 1) from a sticker id. */
function hash01(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * A spot for a sticker that has never been placed: the candidate (stable per
 * id) farthest from the stickers already on the board.
 */
export function autoPlace(id: string, taken: Placement[], z: number): Placement {
  let best = { x: 0.5, y: 0.5 };
  let bestScore = -1;
  for (let i = 0; i < 16; i++) {
    const c = { x: 0.2 + hash01(id, i * 2) * 0.6, y: 0.15 + hash01(id, i * 2 + 1) * 0.7 };
    const score = taken.length
      ? Math.min(...taken.map((t) => Math.hypot(t.x - c.x, (t.y - c.y) * 1.4)))
      : 1;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return { ...best, scale: DEFAULT_SCALE, z };
}
