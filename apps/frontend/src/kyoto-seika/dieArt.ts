import { seededRandom } from "../ui/seededRandom";
import { outline, penStroke, pressure, wobble, type PenPoint, type Pt } from "./pen";

/** The face the die shows before its first roll: five pips, as many as the subjects it deals. */
const FIRST_FACE = 5;

/** The face the die lands on after `rolls` rolls: never the one it left, and the same for the same roll. */
export function dieFace(rolls: number): number {
  let face = FIRST_FACE;
  for (let roll = 1; roll <= rolls; roll++) {
    const random = seededRandom(roll * 7);
    face = ((face + Math.floor(random() * 5)) % 6) + 1;
  }
  return face;
}

/** The die's face is this wide, in px, inked round with the clouds' G-pen. */
const DIE_PX = 26;
const HALF = DIE_PX / 2;
const CORNER = 5.5;
/** Each pip's place on the face's three-by-three grid, by face. */
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[0, 0]],
  2: [
    [1, -1],
    [-1, 1],
  ],
  3: [
    [1, -1],
    [0, 0],
    [-1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};
const PIP = { step: 6.6, r: 2.25 };
/** Each side's stroke at its heaviest: top, right, foot, left, heavier away from the light. */
const SIDE_PEN = [1.5, 2.2, 2.4, 1.6];

/** The die's face round its center, as a rounded square from its top-left corner, clockwise. */
function faceRing(steps = 96): Pt[] {
  const inner = HALF - CORNER;
  const corners = [
    { x: -inner, y: -inner, from: Math.PI },
    { x: inner, y: -inner, from: -Math.PI / 2 },
    { x: inner, y: inner, from: 0 },
    { x: -inner, y: inner, from: Math.PI / 2 },
  ];
  const each = steps / 4;
  return corners.flatMap((c) =>
    Array.from({ length: each }, (_, i) => {
      // A quarter of the corner, then the side to the next.
      const t = i / each;
      if (t < 0.25) {
        const a = c.from + (t / 0.25) * (Math.PI / 2);
        return { x: c.x + CORNER * Math.cos(a), y: c.y + CORNER * Math.sin(a) };
      }
      const a = c.from + Math.PI / 2;
      const start = { x: c.x + CORNER * Math.cos(a), y: c.y + CORNER * Math.sin(a) };
      const f = (t - 0.25) / 0.75;
      const along = { x: -Math.sin(a), y: Math.cos(a) };
      return {
        x: start.x + along.x * 2 * inner * f,
        y: start.y + along.y * 2 * inner * f,
      };
    }),
  );
}

/** A die as the clouds are drawn: a white face, a G-pen line round it side by side, and inked pips. */
export interface DieDrawing {
  white: string;
  ink: string;
  pips: string;
}

function draw(face: number): DieDrawing {
  const random = seededRandom(1301);
  const ring = faceRing();
  const quarter = ring.length / 4;
  // Each side is one stroke, from just before one corner's middle to just past the next one's.
  const ink = SIDE_PEN.map((heavy, side) => {
    const wob = wobble(random, 2);
    const from = side * quarter + quarter * 0.125 - 1;
    const count = quarter + 2;
    const pts: PenPoint[] = Array.from({ length: count + 1 }, (_, i) => {
      const p = ring[(from + i + ring.length) % ring.length];
      const t = i / count;
      const out = 0.25 * wob(t);
      return {
        x: p.x * (1 + out / HALF),
        y: p.y * (1 + out / HALF),
        w: 1 + (heavy - 1) * pressure(t, 0.45),
      };
    });
    return penStroke(pts);
  }).join("");
  const pips = PIPS[face]
    .map(([gx, gy]) => {
      const c = { x: gx * PIP.step, y: gy * PIP.step };
      const dot = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = PIP.r * (1 + (random() - 0.5) * 0.12);
        return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
      });
      return outline(dot);
    })
    .join("");
  return { white: outline(ring), ink, pips };
}

const drawn = new Map<number, DieDrawing>();
/** The die showing `face`, drawn once and kept. */
export function dieDrawing(face: number): DieDrawing {
  const known = drawn.get(face);
  if (known) return known;
  const made = draw(face);
  drawn.set(face, made);
  return made;
}

/** The die blown up: its face chipped at the top right, cracked from the chip, and two shards of it. */
export interface BrokenDie extends DieDrawing {
  cracks: string;
  shards: string;
}

/** The chip's jagged edge across the top-right corner, from the top side round to the right. */
const CHIP = [
  { x: 4.5, y: -HALF },
  { x: 6.8, y: -10.4 },
  { x: 6, y: -8.6 },
  { x: 9.2, y: -7.4 },
  { x: 10.6, y: -5 },
  { x: HALF, y: -4.2 },
];
/** Cracks running from the chip across the face: each from where it starts to where it peters out. */
const CRACKS = [
  [
    { x: 7, y: -7.5 },
    { x: 2.5, y: -2.5 },
    { x: -0.5, y: 2.5 },
    { x: -4.5, y: 4.5 },
    { x: -8.5, y: 10 },
  ],
  [
    { x: 2.5, y: -2.5 },
    { x: 5.5, y: 2.5 },
    { x: 9.5, y: 5.5 },
  ],
  [
    { x: -0.5, y: 2.5 },
    { x: -5.5, y: -1.5 },
    { x: -9.5, y: -3 },
  ],
];
/** The two shards that flew off the corner and landed beside the die. */
const SHARDS = [
  [
    { x: 15, y: -16 },
    { x: 19.5, y: -15 },
    { x: 18.5, y: -11.5 },
    { x: 15.5, y: -12.5 },
  ],
  [
    { x: 17.5, y: -8 },
    { x: 21, y: -6.5 },
    { x: 18.8, y: -4 },
  ],
];

function drawBroken(face: number): BrokenDie {
  const random = seededRandom(2203);
  const ring = faceRing();
  // The corner the chip takes is one run of the ring, which starts at the top-left corner.
  const chipEnd = CHIP[CHIP.length - 1];
  const inChip = (p: Pt) => p.x > CHIP[0].x && p.y < chipEnd.y;
  const first = ring.findIndex(inChip);
  const last = ring.findLastIndex(inChip);
  const outlineRing = [...ring.slice(0, first), ...CHIP, ...ring.slice(last + 1)];
  const n = outlineRing.length;
  // The edge left whole, inked round in three strokes from the chip's far end back to its near one.
  const resume = first + CHIP.length;
  const remaining = n - CHIP.length;
  const strokes = [0, 1, 2].map((part) => {
    const from = resume + Math.round((part * remaining) / 3) - 1;
    const count = Math.round(remaining / 3) + 2;
    const wob = wobble(random, 2);
    const pts: PenPoint[] = Array.from({ length: count + 1 }, (_, i) => {
      const p = outlineRing[(from + i) % n];
      const t = i / count;
      const out = 0.25 * wob(t);
      return {
        x: p.x * (1 + out / HALF),
        y: p.y * (1 + out / HALF),
        w: 1 + (2.1 - 1) * pressure(t, 0.45),
      };
    });
    return penStroke(pts);
  });
  // The chip's raw edge, in a thinner, unsteady line.
  const chipEdge = penStroke(
    CHIP.map((p, i) => ({ ...p, w: 1.1 - 0.3 * (i % 2) })),
    { jagged: true },
  );
  const crackInk = (pts: readonly Pt[]) =>
    penStroke(
      pts.map((p, i) => ({ ...p, w: 1.3 * (1 - i / pts.length) + 0.25 })),
      { jagged: true },
    );
  const normal = dieDrawing(face);
  return {
    white: outline(outlineRing),
    ink: [...strokes, chipEdge].join(""),
    pips: normal.pips,
    cracks: CRACKS.map(crackInk).join(""),
    shards: SHARDS.map(outline).join(""),
  };
}

const broken = new Map<number, BrokenDie>();
/** The die blown up on `face`, drawn once and kept. */
export function brokenDieDrawing(face: number): BrokenDie {
  const known = broken.get(face);
  if (known) return known;
  const made = drawBroken(face);
  broken.set(face, made);
  return made;
}

/** A wisp of smoke rising from (0, 0): a pen stroke swaying up, full at its foot and thinning out. */
function smokeWisp(seed: number): string {
  const random = seededRandom(seed);
  const phase = random() * Math.PI * 2;
  const sway = 2.5 + random() * 2;
  const pts: PenPoint[] = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return {
      x: sway * Math.sin(phase + t * Math.PI * 1.7),
      y: -t * 28,
      w: 0.4 + 2.2 * (1 - t) ** 0.7 * Math.min(1, t * 6),
    };
  });
  return penStroke(pts);
}
/** The wisps that rise from a blown-up die and its cloud, drawn once. */
export const SMOKE_WISPS = [smokeWisp(3), smokeWisp(8), smokeWisp(13)];

/** A shard the bang throws off the die: a few jagged corners round (0, 0), white, inked round once. */
function shardShape(seed: number): { white: string; ink: string } {
  const random = seededRandom(seed);
  const corners = 3 + Math.floor(random() * 3);
  const start = random() * Math.PI * 2;
  const ring: Pt[] = Array.from({ length: corners }, (_, i) => {
    const a = start + (i / corners) * Math.PI * 2 + (random() - 0.5) * 0.7;
    const r = 2.6 + random() * 2.6;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  const loop = [...ring, ring[0], ring[1]];
  const ink = penStroke(
    loop.map((p, i) => ({ ...p, w: i === 0 || i === loop.length - 1 ? 0.5 : 1.15 })),
    { jagged: true },
  );
  return { white: outline(ring), ink };
}
/** The shards a bang throws, drawn once. */
export const BANG_SHARDS = [5, 17, 29, 41, 53].map(shardShape);
