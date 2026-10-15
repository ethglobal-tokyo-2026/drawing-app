/**
 * A day's section of Explore's pile, as stickers lying flat on a table. A held sticker follows the
 * finger on a spring; let go, it slides on at the finger's speed, spins down and stays where it
 * stops, bouncing off the section's edges and knocking the stickers it runs into. Stickers the pile
 * laid over each other pass over each other until they've come apart, and stickers knocked aside
 * slide over the rest, so the heap holds still until something is thrown into it.
 *
 * Rigid bodies on the convex hulls of their cut lines, solved as Box2D solves contacts: sequential
 * impulses at clipped contact points, with split impulses that push overlaps apart without adding
 * speed. Units are the pile's, x across from the section's left and y down from its top.
 */
import { clamp } from "../ui/easing";

type Point = readonly [x: number, y: number];

/** A sticker where the pile laid it. */
export interface BodySpec {
  id: string;
  /** Its image's center. */
  x: number;
  y: number;
  /** Its turn there, in degrees clockwise. */
  turn: number;
  /** Its cut line's points around its image's center, before its turn. */
  outline: readonly Point[];
  /** Points that stay inside the section with it, such as its name tags' corners, placed as `outline`. */
  extent?: readonly Point[];
}

/** Where a sticker's image is now: its center, and its turn in degrees clockwise. */
export interface Pose {
  x: number;
  y: number;
  turn: number;
}

const RAD = Math.PI / 180;
/** Substeps are at most this long, so a sticker can't pass through another in one. */
const SUBSTEP = 1 / 240;
/** A longer frame, after a stall, plays as this long. */
const MAX_FRAME = 1 / 30;
const ITERATIONS = 8;
/** On the table a sliding sticker slows by this much a second (pile units/s²), */
const SLIDE_DECEL = 520;
/** and by this share of its speed a second besides, so a hard throw soon stops crossing the section. */
const SLIDE_DAMPING = 0.9;
/** The same for its spin, in radians. */
const SPIN_DECEL = 8;
const SPIN_DAMPING = 0.9;
const MAX_SPEED = 2400;
const MAX_SPIN = 25;
/** How much of its approach a sticker keeps as it bounces off another sticker, or a section edge. */
const BOUNCE_STICKER = 0.5;
const BOUNCE_EDGE = 0.6;
/** Slower approaches don't bounce, so stickers pushed together stay still. */
const BOUNCE_ABOVE = 40;
const FRICTION_STICKER = 0.3;
const FRICTION_EDGE = 0.2;
/** Overlap left alone, so stickers touching don't jitter. */
const SLOP = 0.5;
/** The share of an overlap pushed out each substep. */
const PUSH_OUT = 0.2;
/** The finger's spring: how fast it pulls, its damping ratio, and its pull at most (pile units/s²). */
const DRAG_HZ = 10;
const DRAG_DAMPING = 0.9;
const DRAG_PULL = 80_000;
/** A held sticker keeps this share of its spin each substep, so it settles under the finger. */
const HELD_SPIN_KEEP = 0.98;
/** Slower than this all round, for this long, the section stops. */
const REST_SPEED = 4;
const REST_SPIN = 0.05;
const REST_TIME = 0.12;
/** Faster than this, a touch catches a sticker rather than tapping it. */
const CATCH_SPEED = 40;
const CATCH_SPIN = 0.8;
/** A hull keeps at most this many corners. */
const MAX_CORNERS = 10;
/** A section's edges, by their normals into the section. */
const EDGES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** The convex hull of `points`, its corners in order of positive area. */
export function convexHull(points: readonly Point[]): [number, number][] {
  const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const turn = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (from: readonly Point[]) => {
    const out: Point[] = [];
    for (const p of from) {
      while (out.length > 1 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.toReversed())].map(([x, y]) => [x, y]);
}

/**
 * Drops the corner that adds least to `hull` until at most `max` are left: the hull only shrinks,
 * and stays convex.
 */
export function simplifyHull(hull: readonly Point[], max = MAX_CORNERS): [number, number][] {
  const out = hull.map(([x, y]): [number, number] => [x, y]);
  while (out.length > max) {
    let least = Infinity;
    let at = 0;
    out.forEach(([x, y], i) => {
      const [px, py] = out[(i + out.length - 1) % out.length];
      const [nx, ny] = out[(i + 1) % out.length];
      const added = Math.abs((x - px) * (ny - py) - (y - py) * (nx - px));
      if (added < least) {
        least = added;
        at = i;
      }
    });
    out.splice(at, 1);
  }
  return out;
}

/** A convex polygon's area, its centroid, and its area's moment about that centroid. */
function massOf(hull: readonly Point[]) {
  const [rx, ry] = hull[0];
  let area = 0;
  let cx = 0;
  let cy = 0;
  let moment = 0;
  for (let i = 1; i + 1 < hull.length; i++) {
    const e1x = hull[i][0] - rx;
    const e1y = hull[i][1] - ry;
    const e2x = hull[i + 1][0] - rx;
    const e2y = hull[i + 1][1] - ry;
    const d = e1x * e2y - e1y * e2x;
    area += d / 2;
    cx += (d / 6) * (e1x + e2x);
    cy += (d / 6) * (e1y + e2y);
    moment += (d / 12) * (e1x * e1x + e2x * e1x + e2x * e2x + e1y * e1y + e2y * e1y + e2y * e2y);
  }
  cx /= area;
  cy /= area;
  return { area, cx: rx + cx, cy: ry + cy, moment: moment - area * (cx * cx + cy * cy) };
}

/** A cut line's hull, or a small square where the line encloses nothing. */
function hullOf(outline: readonly Point[]): [number, number][] {
  const hull = simplifyHull(convexHull(outline));
  if (hull.length > 2 && massOf(hull).area > 1) return hull;
  return [
    [-20, -20],
    [20, -20],
    [20, 20],
    [-20, 20],
  ];
}

class Body {
  /** Its hull around its center of mass, before turning: corners, and each edge's outward normal. */
  private readonly hx: number[];
  private readonly hy: number[];
  private readonly hnx: number[];
  private readonly hny: number[];
  /** The hull where it is now, and its bounding box. */
  readonly cx: number[];
  readonly cy: number[];
  readonly nx: number[];
  readonly ny: number[];
  /** What the section's edges hold in, the hull and `extent`: around its center of mass, and now. */
  private readonly kx: number[];
  private readonly ky: number[];
  readonly wx: number[];
  readonly wy: number[];
  minX = 0;
  minY = 0;
  maxX = 0;
  maxY = 0;
  /** Its center of mass from its image's center, before turning. */
  private readonly ox: number;
  private readonly oy: number;
  readonly invMass: number;
  readonly invInertia: number;
  /** Its center of mass, turn in radians, and their speeds. */
  px: number;
  py: number;
  angle: number;
  vx = 0;
  vy = 0;
  spin = 0;
  /** Speeds that only push overlaps apart, spent each substep. */
  pushX = 0;
  pushY = 0;
  pushSpin = 0;
  awake = false;
  readonly spec: BodySpec;
  readonly index: number;

  constructor(spec: BodySpec, index: number) {
    this.spec = spec;
    this.index = index;
    const hull = hullOf(spec.outline);
    const { area, cx, cy, moment } = massOf(hull);
    this.ox = cx;
    this.oy = cy;
    this.hx = hull.map(([x]) => x - cx);
    this.hy = hull.map(([, y]) => y - cy);
    this.hnx = [];
    this.hny = [];
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      const ex = this.hx[j] - this.hx[i];
      const ey = this.hy[j] - this.hy[i];
      const length = Math.hypot(ex, ey) || 1;
      this.hnx.push(ey / length);
      this.hny.push(-ex / length);
    }
    this.cx = [...this.hx];
    this.cy = [...this.hy];
    this.nx = [...this.hnx];
    this.ny = [...this.hny];
    const kept = spec.extent?.length ? simplifyHull(convexHull([...hull, ...spec.extent])) : hull;
    this.kx = kept.map(([x]) => x - cx);
    this.ky = kept.map(([, y]) => y - cy);
    this.wx = [...this.kx];
    this.wy = [...this.ky];
    this.invMass = 1 / area;
    this.invInertia = 1 / moment;
    this.angle = spec.turn * RAD;
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    this.px = spec.x + c * cx - s * cy;
    this.py = spec.y + s * cx + c * cy;
    this.place();
  }

  /** Puts its hull where it is now. */
  place() {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    for (let i = 0; i < this.hx.length; i++) {
      const x = this.px + c * this.hx[i] - s * this.hy[i];
      const y = this.py + s * this.hx[i] + c * this.hy[i];
      this.cx[i] = x;
      this.cy[i] = y;
      this.nx[i] = c * this.hnx[i] - s * this.hny[i];
      this.ny[i] = s * this.hnx[i] + c * this.hny[i];
      this.minX = Math.min(this.minX, x);
      this.minY = Math.min(this.minY, y);
      this.maxX = Math.max(this.maxX, x);
      this.maxY = Math.max(this.maxY, y);
    }
    for (let i = 0; i < this.kx.length; i++) {
      this.wx[i] = this.px + c * this.kx[i] - s * this.ky[i];
      this.wy[i] = this.py + s * this.kx[i] + c * this.ky[i];
    }
  }

  pose(): Pose {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    return {
      x: this.px - (c * this.ox - s * this.oy),
      y: this.py - (s * this.ox + c * this.oy),
      turn: this.angle / RAD,
    };
  }
}

/** The edge of `p` that `q` lies furthest out from, and how far: past 0, they're apart. */
function deepestEdge(p: Body, q: Body) {
  let edge = 0;
  let most = -Infinity;
  for (let i = 0; i < p.cx.length; i++) {
    let least = Infinity;
    for (let j = 0; j < q.cx.length; j++) {
      least = Math.min(least, p.nx[i] * (q.cx[j] - p.cx[i]) + p.ny[i] * (q.cy[j] - p.cy[i]));
    }
    if (least > most) {
      most = least;
      edge = i;
    }
  }
  return { edge, separation: most };
}

const boxesMeet = (a: Body, b: Body) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

const overlap = (a: Body, b: Body) =>
  boxesMeet(a, b) && deepestEdge(a, b).separation <= 0 && deepestEdge(b, a).separation <= 0;

/** Where two stickers, or a sticker and its section's edge (`a` null), press on each other. */
interface Contact {
  a: Body | null;
  b: Body;
  /** From `a` to `b`. */
  nx: number;
  ny: number;
  x: number;
  y: number;
  depth: number;
  friction: number;
  restitution: number;
  /** From each center of mass to the point. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  normalMass: number;
  tangentMass: number;
  /** The speed it bounces back with. */
  bounce: number;
  /** Impulses so far this substep: along the normal, across it, and pushing apart. */
  pn: number;
  pt: number;
  pp: number;
}

function contact(
  a: Body | null,
  b: Body,
  nx: number,
  ny: number,
  x: number,
  y: number,
  depth: number,
): Contact {
  return {
    a,
    b,
    nx,
    ny,
    x,
    y,
    depth,
    friction: a ? FRICTION_STICKER : FRICTION_EDGE,
    restitution: a ? BOUNCE_STICKER : BOUNCE_EDGE,
    ax: 0,
    ay: 0,
    bx: 0,
    by: 0,
    normalMass: 0,
    tangentMass: 0,
    bounce: 0,
    pn: 0,
    pt: 0,
    pp: 0,
  };
}

/** The part of segment `p`–`q` on the inner side of the line `n·v = offset`. */
function clip(points: Point[], nx: number, ny: number, offset: number): Point[] {
  const [p, q] = points;
  const dp = nx * p[0] + ny * p[1] - offset;
  const dq = nx * q[0] + ny * q[1] - offset;
  const out: Point[] = [];
  if (dp <= 0) out.push(p);
  if (dq <= 0) out.push(q);
  if (dp * dq < 0) {
    const t = dp / (dp - dq);
    out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
  }
  return out;
}

/**
 * Up to two points where `a` and `b` overlap: of the edge on one most facing the other's deepest
 * edge, the part within that edge's ends.
 */
function touch(a: Body, b: Body, out: Contact[]) {
  const fromA = deepestEdge(a, b);
  if (fromA.separation > 0) return;
  const fromB = deepestEdge(b, a);
  if (fromB.separation > 0) return;
  const flip = fromB.separation > fromA.separation + 0.1 * SLOP;
  const ref = flip ? b : a;
  const inc = flip ? a : b;
  const edge = flip ? fromB.edge : fromA.edge;
  const nx = ref.nx[edge];
  const ny = ref.ny[edge];
  let i1 = 0;
  let facing = Infinity;
  for (let i = 0; i < inc.nx.length; i++) {
    const d = nx * inc.nx[i] + ny * inc.ny[i];
    if (d < facing) {
      facing = d;
      i1 = i;
    }
  }
  const i2 = (i1 + 1) % inc.cx.length;
  const next = (edge + 1) % ref.cx.length;
  const x1 = ref.cx[edge];
  const y1 = ref.cy[edge];
  const x2 = ref.cx[next];
  const y2 = ref.cy[next];
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const tx = (x2 - x1) / length;
  const ty = (y2 - y1) / length;
  let points: Point[] = [
    [inc.cx[i1], inc.cy[i1]],
    [inc.cx[i2], inc.cy[i2]],
  ];
  points = clip(points, -tx, -ty, -(tx * x1 + ty * y1));
  if (points.length < 2) return;
  points = clip(points, tx, ty, tx * x2 + ty * y2);
  if (points.length < 2) return;
  const front = nx * x1 + ny * y1;
  for (const [x, y] of points) {
    const depth = front - (nx * x + ny * y);
    // The point midway between the two surfaces.
    if (depth >= 0)
      out.push(contact(ref, inc, nx, ny, x + (nx * depth) / 2, y + (ny * depth) / 2, depth));
  }
}

/** Up to two of what the edges hold in of `b` past each edge of its section, the deepest. */
function touchEdges(b: Body, width: number, height: number, out: Contact[]) {
  for (const [nx, ny] of EDGES) {
    // Inside, n·v is at least this.
    const inside = nx < 0 ? -width : ny < 0 ? -height : 0;
    let first = -1;
    let firstDepth = 0;
    let second = -1;
    let secondDepth = 0;
    for (let i = 0; i < b.wx.length; i++) {
      const depth = inside - (nx * b.wx[i] + ny * b.wy[i]);
      if (depth > firstDepth) {
        second = first;
        secondDepth = firstDepth;
        first = i;
        firstDepth = depth;
      } else if (depth > secondDepth) {
        second = i;
        secondDepth = depth;
      }
    }
    if (first >= 0) out.push(edgeContact(b, first, nx, ny, firstDepth));
    if (second >= 0) out.push(edgeContact(b, second, nx, ny, secondDepth));
  }
}

/** Point `i` of `b`, `depth` past an edge with normal (nx, ny), pressed midway back to it. */
const edgeContact = (b: Body, i: number, nx: number, ny: number, depth: number) =>
  contact(null, b, nx, ny, b.wx[i] + (nx * depth) / 2, b.wy[i] + (ny * depth) / 2, depth);

/** The speed of `b` against `a` at the contact point, along (dx, dy). */
function along(c: Contact, dx: number, dy: number): number {
  const { a, b } = c;
  let speed = (b.vx - b.spin * c.by) * dx + (b.vy + b.spin * c.bx) * dy;
  if (a) speed -= (a.vx - a.spin * c.ay) * dx + (a.vy + a.spin * c.ax) * dy;
  return speed;
}

/** The same in the speeds that push overlaps apart. */
function pushAlong(c: Contact, dx: number, dy: number): number {
  const { a, b } = c;
  let speed = (b.pushX - b.pushSpin * c.by) * dx + (b.pushY + b.pushSpin * c.bx) * dy;
  if (a) speed -= (a.pushX - a.pushSpin * c.ay) * dx + (a.pushY + a.pushSpin * c.ax) * dy;
  return speed;
}

function impulse(c: Contact, px: number, py: number) {
  const { a, b } = c;
  b.vx += b.invMass * px;
  b.vy += b.invMass * py;
  b.spin += b.invInertia * (c.bx * py - c.by * px);
  if (!a) return;
  a.vx -= a.invMass * px;
  a.vy -= a.invMass * py;
  a.spin -= a.invInertia * (c.ax * py - c.ay * px);
}

function prepare(c: Contact) {
  const { a, b } = c;
  c.bx = c.x - b.px;
  c.by = c.y - b.py;
  if (a) {
    c.ax = c.x - a.px;
    c.ay = c.y - a.py;
  }
  const ma = a ? a.invMass : 0;
  const ia = a ? a.invInertia : 0;
  const rna = c.ax * c.ny - c.ay * c.nx;
  const rnb = c.bx * c.ny - c.by * c.nx;
  c.normalMass = 1 / (ma + b.invMass + ia * rna * rna + b.invInertia * rnb * rnb);
  const rta = c.ax * c.nx + c.ay * c.ny;
  const rtb = c.bx * c.nx + c.by * c.ny;
  c.tangentMass = 1 / (ma + b.invMass + ia * rta * rta + b.invInertia * rtb * rtb);
  const approach = along(c, c.nx, c.ny);
  c.bounce = approach < -BOUNCE_ABOVE ? -c.restitution * approach : 0;
}

function solve(c: Contact) {
  // Across the normal, along (-ny, nx): friction, as much as the push along it allows.
  const limit = c.friction * c.pn;
  const pt = clamp(c.pt - along(c, -c.ny, c.nx) * c.tangentMass, -limit, limit);
  const dt = pt - c.pt;
  c.pt = pt;
  impulse(c, -dt * c.ny, dt * c.nx);
  const pn = Math.max(c.pn + (c.bounce - along(c, c.nx, c.ny)) * c.normalMass, 0);
  const dn = pn - c.pn;
  c.pn = pn;
  impulse(c, dn * c.nx, dn * c.ny);
}

function pushApart(c: Contact, h: number) {
  const target = (PUSH_OUT / h) * Math.max(0, c.depth - SLOP);
  const pp = Math.max(c.pp + (target - pushAlong(c, c.nx, c.ny)) * c.normalMass, 0);
  const d = pp - c.pp;
  c.pp = pp;
  const { a, b } = c;
  b.pushX += b.invMass * d * c.nx;
  b.pushY += b.invMass * d * c.ny;
  b.pushSpin += b.invInertia * d * (c.bx * c.ny - c.by * c.nx);
  if (!a) return;
  a.pushX -= a.invMass * d * c.nx;
  a.pushY -= a.invMass * d * c.ny;
  a.pushSpin -= a.invInertia * d * (c.ax * c.ny - c.ay * c.nx);
}

/** Table friction: a steady slowing, and a little more the faster it goes. */
function slow(b: Body, h: number) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > 0) {
    const scale = Math.max(0, speed - SLIDE_DECEL * h) / (1 + SLIDE_DAMPING * h) / speed;
    b.vx *= scale;
    b.vy *= scale;
  }
  const spin = Math.abs(b.spin);
  if (spin > 0) b.spin *= Math.max(0, spin - SPIN_DECEL * h) / (1 + SPIN_DAMPING * h) / spin;
}

/** The finger's hold, a soft spring from a point on the sticker to the finger, as Box2D's mouse joint. */
interface Hold {
  body: Body;
  /** The held point around the center of mass, before turning. */
  lx: number;
  ly: number;
  /** The finger. */
  tx: number;
  ty: number;
  /** This substep's arm, effective mass, softness, position error and impulse so far. */
  rx: number;
  ry: number;
  m11: number;
  m12: number;
  m22: number;
  gamma: number;
  ex: number;
  ey: number;
  ix: number;
  iy: number;
}

function prepareHold(hold: Hold, h: number) {
  const b = hold.body;
  const mass = 1 / b.invMass;
  const omega = 2 * Math.PI * DRAG_HZ;
  const stiffness = mass * omega * omega;
  const gamma = 1 / (h * (2 * mass * DRAG_DAMPING * omega + h * stiffness));
  const beta = h * stiffness * gamma;
  const c = Math.cos(b.angle);
  const s = Math.sin(b.angle);
  const rx = c * hold.lx - s * hold.ly;
  const ry = s * hold.lx + c * hold.ly;
  const k11 = b.invMass + b.invInertia * ry * ry + gamma;
  const k12 = -b.invInertia * rx * ry;
  const k22 = b.invMass + b.invInertia * rx * rx + gamma;
  const inv = 1 / (k11 * k22 - k12 * k12);
  hold.rx = rx;
  hold.ry = ry;
  hold.m11 = inv * k22;
  hold.m12 = -inv * k12;
  hold.m22 = inv * k11;
  hold.gamma = gamma;
  hold.ex = (b.px + rx - hold.tx) * beta;
  hold.ey = (b.py + ry - hold.ty) * beta;
  hold.ix = 0;
  hold.iy = 0;
  b.spin *= HELD_SPIN_KEEP;
}

function solveHold(hold: Hold, h: number) {
  const b = hold.body;
  const vx = b.vx - b.spin * hold.ry + hold.ex + hold.gamma * hold.ix;
  const vy = b.vy + b.spin * hold.rx + hold.ey + hold.gamma * hold.iy;
  const ox = hold.ix;
  const oy = hold.iy;
  hold.ix -= hold.m11 * vx + hold.m12 * vy;
  hold.iy -= hold.m12 * vx + hold.m22 * vy;
  const most = (h * DRAG_PULL) / b.invMass;
  const pull = Math.hypot(hold.ix, hold.iy);
  if (pull > most) {
    hold.ix *= most / pull;
    hold.iy *= most / pull;
  }
  const ix = hold.ix - ox;
  const iy = hold.iy - oy;
  b.vx += b.invMass * ix;
  b.vy += b.invMass * iy;
  b.spin += b.invInertia * (hold.rx * iy - hold.ry * ix);
}

export class PileWorld {
  /** Under reduced motion a sticker moves only while it's held or pushed, and stops when let go. */
  reduced = false;
  private readonly bodies: Body[];
  private readonly byId = new Map<string, Body>();
  /** Pairs the pile laid over each other, until they've come apart. */
  private readonly overlapping = new Set<number>();
  private hold: Hold | null = null;
  /** The sticker last let go, until the section stops. */
  private thrown: Body | null = null;
  private calm = 0;
  /** The section's size. */
  private readonly width: number;
  private readonly height: number;

  constructor(specs: readonly BodySpec[], width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bodies = specs.map((spec, i) => new Body(spec, i));
    for (const body of this.bodies) this.byId.set(body.spec.id, body);
    for (const [i, a] of this.bodies.entries()) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        if (overlap(a, this.bodies[j])) this.overlapping.add(this.pair(a, this.bodies[j]));
      }
    }
  }

  /** Whether anything is held or still moving. */
  get moving(): boolean {
    return this.hold !== null || this.bodies.some((b) => b.awake);
  }

  pose(id: string): Pose | null {
    return this.byId.get(id)?.pose() ?? null;
  }

  /** Whether `id` slides or spins fast enough that a touch catches it. */
  isMoving(id: string): boolean {
    const b = this.byId.get(id);
    if (!b?.awake) return false;
    return Math.hypot(b.vx, b.vy) > CATCH_SPEED || Math.abs(b.spin) > CATCH_SPIN;
  }

  /** Holds `id` by the point (x, y) on it. */
  grab(id: string, x: number, y: number): boolean {
    const body = this.byId.get(id);
    if (!body) return false;
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    const dx = x - body.px;
    const dy = y - body.py;
    this.hold = {
      body,
      lx: c * dx + s * dy,
      ly: c * dy - s * dx,
      tx: x,
      ty: y,
      rx: 0,
      ry: 0,
      m11: 0,
      m12: 0,
      m22: 0,
      gamma: 0,
      ex: 0,
      ey: 0,
      ix: 0,
      iy: 0,
    };
    body.awake = true;
    this.calm = 0;
    return true;
  }

  /** Moves the finger holding a sticker to (x, y). */
  drag(x: number, y: number) {
    if (!this.hold) return;
    this.hold.tx = x;
    this.hold.ty = y;
  }

  /** Lets go: thrown at `velocity` (pile units/s), or sliding on as it was with `null`. */
  release(velocity: { x: number; y: number } | null) {
    const body = this.hold?.body;
    this.hold = null;
    if (!body) return;
    this.thrown = body;
    if (this.reduced) {
      body.vx = body.vy = body.spin = 0;
      return;
    }
    if (!velocity) return;
    const scale = Math.min(1, MAX_SPEED / (Math.hypot(velocity.x, velocity.y) || 1));
    body.vx = velocity.x * scale;
    body.vy = velocity.y * scale;
  }

  /** Plays `seconds` on, and gives the stickers that moved. */
  step(seconds: number): string[] {
    const frame = clamp(seconds, 0, MAX_FRAME);
    if (!frame || !this.moving) return [];
    const count = Math.ceil(frame / SUBSTEP - 1e-9);
    const moved = new Set<Body>();
    for (let i = 0; i < count; i++) this.substep(frame / count, moved);
    const calm =
      !this.hold &&
      this.bodies.every(
        (b) => !b.awake || (Math.hypot(b.vx, b.vy) < REST_SPEED && Math.abs(b.spin) < REST_SPIN),
      );
    this.calm = calm ? this.calm + frame : 0;
    if (this.calm >= REST_TIME) {
      this.thrown = null;
      for (const b of this.bodies) {
        b.awake = false;
        b.vx = b.vy = b.spin = 0;
      }
    }
    return [...moved].map((b) => b.spec.id);
  }

  private pair(a: Body, b: Body) {
    return Math.min(a.index, b.index) * this.bodies.length + Math.max(a.index, b.index);
  }

  private substep(h: number, moved: Set<Body>) {
    const held = this.hold?.body;
    for (const b of this.bodies) if (b.awake && b !== held) slow(b, h);
    const contacts = this.contacts();
    for (const c of contacts) prepare(c);
    if (this.hold) prepareHold(this.hold, h);
    for (let i = 0; i < ITERATIONS; i++) {
      if (this.hold) solveHold(this.hold, h);
      for (const c of contacts) solve(c);
    }
    for (let i = 0; i < ITERATIONS; i++) for (const c of contacts) pushApart(c, h);
    for (const b of this.bodies) {
      if (!b.awake) continue;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) {
        b.vx *= MAX_SPEED / speed;
        b.vy *= MAX_SPEED / speed;
      }
      b.spin = clamp(b.spin, -MAX_SPIN, MAX_SPIN);
      b.px += h * (b.vx + b.pushX);
      b.py += h * (b.vy + b.pushY);
      b.angle += h * (b.spin + b.pushSpin);
      b.pushX = b.pushY = b.pushSpin = 0;
      if (this.reduced && b !== held) b.vx = b.vy = b.spin = 0;
      b.place();
      moved.add(b);
    }
  }

  /**
   * Every point where a moving sticker presses on another or on an edge. Moving stickers knock each
   * other, but only the sticker held or thrown knocks one at rest, which wakes: stickers it knocked
   * slide over the rest, so a heap pressed against its section's edges never jams.
   */
  private contacts(): Contact[] {
    const out: Contact[] = [];
    const held = this.hold?.body;
    for (const a of this.bodies) {
      if (!a.awake) continue;
      touchEdges(a, this.width, this.height, out);
      const strikes = a === held || a === this.thrown;
      for (const b of this.bodies) {
        if (b === a || (b.awake ? b.index < a.index : !strikes)) continue;
        const key = this.pair(a, b);
        if (this.overlapping.has(key)) {
          if (!overlap(a, b)) this.overlapping.delete(key);
          continue;
        }
        if (!boxesMeet(a, b)) continue;
        const before = out.length;
        touch(a, b, out);
        if (out.length > before) b.awake = true;
      }
    }
    return out;
  }
}
