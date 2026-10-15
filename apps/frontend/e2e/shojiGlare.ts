import { expect, type Page } from "@playwright/test";
import type { Reading } from "./deviceRotation";
import type { ScreenshotPixels } from "./screenshotPixels";

// The light sweeps' black gloss sticker mirrors only the room. The shoji's glare is the bright region
// carrying its lattice; the room's round lights make glare of their own, which the sweeps ignore.

/** Display luma, 0 to 1, above which a pixel of the black sticker is glare. */
const GLARE = 0.35;
/** The least share of the sticker the shoji's glare must cover to be measured. */
const MIN_SHARE = 0.003;
/** Glare pixels this close, in CSS px, are one region, so the shoji's panes join across its bars. */
const JOIN_PX = 16;
/**
 * How alike a region's edge directions are at 4θ, 0 to 1, for it to carry the lattice. A round
 * light's core spreads its edges' directions evenly, so it falls short.
 */
const LATTICE_COHERENCE = 0.3;
/** How far back, as a share of the sticker, a step may go before it breaks a monotonic path. */
export const STEP_SLACK = 0.01;
/** The glare's share of the sticker past which its centroid no longer tracks where it is. */
const FILLED = 0.7;

export interface Glare {
  /** The swept angle, in degrees, or the frame's name. */
  at: number | string;
  /** The glare's share of the sticker's pixels. */
  share: number;
  /** The glare's centroid, as a share of the sticker's width and height from its top left. */
  x: number;
  y: number;
  /** The lattice's orientation mod 90°, in degrees clockwise on screen. */
  lattice: number;
}

export interface Frame {
  luma: Float32Array;
  glare: Omit<Glare, "at"> | null;
}

/**
 * The shoji's glare: of the glare regions, the one whose edges are most strongly squared, with its
 * centroid and the lattice's orientation from its edges' gradients, averaged at 4θ.
 */
export function measureGlare({ width, height, data }: ScreenshotPixels): Frame {
  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++)
    luma[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  const columns = Math.ceil(width / JOIN_PX);
  const rows = Math.ceil(height / JOIN_PX);
  const cellOf = (x: number, y: number) =>
    Math.floor(y / JOIN_PX) * columns + Math.floor(x / JOIN_PX);
  const lit = new Uint8Array(columns * rows);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (luma[y * width + x] > GLARE) lit[cellOf(x, y)] = 1;
  // Cells holding glare, joined to their eight neighbors.
  const regionOf = new Int32Array(columns * rows).fill(-1);
  let regions = 0;
  for (let start = 0; start < lit.length; start++) {
    if (!lit[start] || regionOf[start] >= 0) continue;
    regionOf[start] = regions;
    const stack = [start];
    for (let cell = stack.pop(); cell !== undefined; cell = stack.pop()) {
      const cx = cell % columns;
      const cy = Math.floor(cell / columns);
      for (let ny = Math.max(0, cy - 1); ny <= Math.min(rows - 1, cy + 1); ny++)
        for (let nx = Math.max(0, cx - 1); nx <= Math.min(columns - 1, cx + 1); nx++) {
          const next = ny * columns + nx;
          if (lit[next] && regionOf[next] < 0) {
            regionOf[next] = regions;
            stack.push(next);
          }
        }
    }
    regions++;
  }
  const stats = Array.from({ length: regions }, () => ({
    count: 0,
    sumX: 0,
    sumY: 0,
    cos: 0,
    sin: 0,
    weight: 0,
  }));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const region = stats[regionOf[cellOf(x, y)]];
      if (!region) continue;
      if (luma[y * width + x] > GLARE) {
        region.count++;
        region.sumX += x;
        region.sumY += y;
      }
      if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) continue;
      const at = (dx: number, dy: number) => luma[(y + dy) * width + x + dx];
      const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
      const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
      const weight = gx * gx + gy * gy;
      if (!weight) continue;
      const angle = 4 * Math.atan2(gy, gx);
      region.cos += weight * Math.cos(angle);
      region.sin += weight * Math.sin(angle);
      region.weight += weight;
    }
  const squared = (region: (typeof stats)[number]) => Math.hypot(region.cos, region.sin);
  const shoji = stats
    .filter(
      (region) =>
        region.count >= MIN_SHARE * width * height &&
        squared(region) >= LATTICE_COHERENCE * region.weight,
    )
    .reduce<(typeof stats)[number] | null>(
      (best, region) => (!best || squared(region) > squared(best) ? region : best),
      null,
    );
  if (!shoji) return { luma, glare: null };
  return {
    luma,
    glare: {
      share: shoji.count / (width * height),
      x: shoji.sumX / shoji.count / width,
      y: shoji.sumY / shoji.count / height,
      lattice: (Math.atan2(shoji.sin, shoji.cos) / 4) * (180 / Math.PI),
    },
  };
}

/**
 * Waits for the light to land exactly on `reading`, as it does once a reading is held, then for the
 * material to draw it. With `quietMs`, the pose must also hold that long, which outlasts a
 * re-centering viewer's spaced steps.
 */
export async function landOn(page: Page, reading: Reading, deadlineMs: number, quietMs = 0) {
  const landed = await page.evaluate(
    async ({ reading, deadlineMs, quietMs }) => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const start = performance.now();
      let previous = "";
      let changed = start;
      let landed = false;
      while (!landed && performance.now() < start + deadlineMs) {
        await frame();
        const pose = window.lightSweepsFixture.getPose();
        const next = JSON.stringify(pose);
        if (next !== previous) changed = performance.now();
        previous = next;
        // A landed light publishes the reading's own angles, where a gliding one publishes its own.
        landed =
          pose.beta === reading.beta &&
          pose.gamma === reading.gamma &&
          performance.now() - changed >= quietMs;
      }
      await frame();
      await frame();
      return { landed, settledMs: changed - start };
    },
    { reading, deadlineMs, quietMs },
  );
  expect(
    landed.landed,
    `The light never lands on ${JSON.stringify(reading)}${quietMs ? ` and holds there ${quietMs} ms` : ""}`,
  ).toBe(true);
  return landed.settledMs;
}

const describeGlare = (g: Glare) =>
  `${g.at}: (${g.x.toFixed(3)}, ${g.y.toFixed(3)}) lattice ${g.lattice.toFixed(1)}° share ${g.share.toFixed(3)}`;
export const listPath = (path: Glare[]) => path.map(describeGlare).join("\n");

/**
 * The poses where most of the glare is on the sticker. A sliver clipped by the sticker's edge has
 * too few lattice edges to orient, and its centroid sits wherever the tilted edge crosses first.
 */
export const wholeGlare = (path: Glare[]) =>
  path.filter((glare) => glare.share >= 0.5 * Math.max(...path.map((other) => other.share)));

/**
 * The glare travels one way along `along` as the sweep goes, with little drift across it: each step
 * where it is whole goes `direction`'s way, never back by more than STEP_SLACK.
 */
export function expectTravel(path: Glare[], along: "x" | "y", direction: 1 | -1, label: string) {
  const across = along === "x" ? "y" : "x";
  const detail = `${label}\n${listPath(path)}`;
  expect.soft(path.length, `The glare shows at too few poses: ${detail}`).toBeGreaterThanOrEqual(4);
  if (path.length < 2) return;
  const whole = wholeGlare(path);
  // A glare that fills most of the sticker has its centroid pinned near the middle, so those steps
  // say nothing about its travel.
  const backSteps = whole
    .slice(1)
    .filter(
      (glare, i) =>
        Math.max(glare.share, whole[i].share) < FILLED &&
        (glare[along] - whole[i][along]) * direction < -STEP_SLACK,
    );
  expect.soft(backSteps, `The glare turns back along ${along}: ${detail}`).toEqual([]);
  const values = (axis: "x" | "y", glares: Glare[]) => glares.map((glare) => glare[axis]);
  const travel = Math.max(...values(along, path)) - Math.min(...values(along, path));
  const drift = Math.max(...values(across, whole)) - Math.min(...values(across, whole));
  expect.soft(travel, `The glare barely moves along ${along}: ${detail}`).toBeGreaterThan(0.15);
  expect.soft(drift, `The glare drifts along ${across}: ${detail}`).toBeLessThan(0.25 * travel);
}

/** Lattice orientations differ by this much, in degrees, mod 90. */
export const latticeTurn = (from: number, to: number) => ((((to - from + 45) % 90) + 90) % 90) - 45;
