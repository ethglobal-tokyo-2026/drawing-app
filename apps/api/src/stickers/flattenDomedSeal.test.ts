import { describe, expect, it } from "vitest";
import { INSIDE_ALPHA } from "../services/foilMask.ts";
import { bakeDome, flattenDomedSeal, PAPER_MATCH, type Pixels } from "./flattenDomedSeal.ts";

const RGBA = 4;
const WHITE = 255;
/** A sticker image's size, and its cut: an ellipse with a clear margin round it. */
const SIZE = { width: 480, height: 400 };
const CUT = { cx: 240, cy: 200, rx: 210, ry: 170 };
/** Ink sits at least a border inside the cut, as a share of its long side. */
const BORDER_SHARE = 0.1;
const DARK_INK = [40, 30, 60];
const PALE_INK = [196, 196, 196];

/** How far inside the ellipse a point lies, roughly, in px: negative outside. */
const inset = (x: number, y: number) => {
  const r = Math.hypot((x - CUT.cx) / CUT.rx, (y - CUT.cy) / CUT.ry);
  return (1 - r) * Math.min(CUT.rx, CUT.ry);
};

/** The cut's alpha, with a one-pixel ramp at its edge. */
function cutAlpha(): Uint8Array {
  const alpha = new Uint8Array(SIZE.width * SIZE.height);
  for (let y = 0; y < SIZE.height; y++) {
    for (let x = 0; x < SIZE.width; x++) {
      const cover = Math.min(1, Math.max(0, inset(x + 0.5, y + 0.5) + 0.5));
      alpha[y * SIZE.width + x] = Math.round(cover * WHITE);
    }
  }
  return alpha;
}

/** White paper to the cut with a dark stroke and a pale one across it, and which pixels hold ink. */
function print(alpha: Uint8Array): { image: Pixels; ink: Uint8Array } {
  const border = BORDER_SHARE * Math.max(CUT.rx, CUT.ry) * 2;
  const data = new Uint8Array(alpha.length * RGBA);
  const ink = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    const x = i % SIZE.width;
    const y = (i - x) / SIZE.width;
    const deep = inset(x + 0.5, y + 0.5) >= border;
    const stroke = deep && Math.abs(y - CUT.cy * 0.8) < 6 ? DARK_INK : null;
    const pale = deep && Math.abs(x - CUT.cx * 1.2) < 4 ? PALE_INK : null;
    const color = stroke ?? pale ?? [WHITE, WHITE, WHITE];
    ink[i] = stroke || pale ? 1 : 0;
    data.set([...color, alpha[i]], i * RGBA);
  }
  return { image: { data, ...SIZE }, ink };
}

/** `flattenDomedSeal` of an image it must find domed. */
function flattenedDomed(image: Pixels, alpha: Uint8Array): Uint8Array {
  const flattened = flattenDomedSeal(image, alpha);
  if (!flattened) throw new Error("The domed image was taken for a flat one");
  return flattened;
}

describe("flattening a domed seal", () => {
  const alpha = cutAlpha();
  const { image: flatPrint, ink } = print(alpha);
  const domed = { ...flatPrint, data: bakeDome(flatPrint, alpha) };

  it("lifts the dome's paper to white and leaves every ink pixel as sealed", () => {
    const flattened = flattenedDomed(domed, alpha);
    let darkestPaper = WHITE;
    let darkestDomedPaper = WHITE;
    const inkChanged: number[] = [];
    for (let i = 0; i < alpha.length; i++) {
      if (alpha[i] < WHITE) continue;
      const at = i * RGBA;
      const pixel = flattened.subarray(at, at + 3);
      if (ink[i]) {
        if (pixel.some((v, c) => v !== domed.data[at + c])) inkChanged.push(i);
      } else {
        darkestPaper = Math.min(darkestPaper, ...pixel);
        darkestDomedPaper = Math.min(darkestDomedPaper, ...domed.data.subarray(at, at + 3));
      }
    }
    // The dome darkened the paper by far more than PAPER_MATCH, so this is its lift, not its absence.
    expect(darkestDomedPaper).toBeLessThan(WHITE - PAPER_MATCH);
    expect(darkestPaper).toBeGreaterThanOrEqual(WHITE - 1);
    expect(inkChanged).toEqual([]);
  });

  it("leaves a sticker sealed flat as it is", () => {
    expect(flattenDomedSeal(flatPrint, alpha)).toBeNull();
  });

  it("never touches pixels outside the cut", () => {
    const flattened = flattenedDomed(domed, alpha);
    const moved = [...alpha.keys()].filter(
      (i) => alpha[i] < INSIDE_ALPHA && flattened[i * RGBA] !== domed.data[i * RGBA],
    );
    expect(moved).toEqual([]);
  });
});
