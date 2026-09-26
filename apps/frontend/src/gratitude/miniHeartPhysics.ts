import { clamp, easeOutCubic, lerp } from "./easing";
import { FEEL_CONFIG } from "./gameConfig";
import { HEART_VIEWBOX, heartOutline } from "./heartArt";

/** The pile's world, in the stage's own pixels. Hearts bounce off `ceiling`, the HUD's underside. */
export interface PileBounds {
  width: number;
  height: number;
  ceiling: number;
}

/** The big heart's box: its middle and its size. */
export interface HeartBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A heart as the layer draws it, centered on (x, y). */
export interface MiniHeart {
  id: number;
  kind: "mini" | "rain";
  /** An index into `FEEL_CONFIG.miniHearts.tones`. */
  tone: number;
  x: number;
  y: number;
  size: number;
  /** Degrees. */
  rotation: number;
  /** A bead swelling, or the fade's shrink. */
  scale: number;
  opacity: number;
  resting: boolean;
}

/**
 * Mini hearts, sweat and 昇天's rain in one world of circles. They bounce off the floor, the walls,
 * the HUD's underside and each other, settle into a heap along the bottom, and sleep there until a
 * hard hit, a tap close by or the heart under them melting away wakes them.
 */
export interface MiniHeartPhysics {
  readonly hearts: readonly MiniHeart[];
  setBounds: (bounds: PileBounds) => void;
  sprayFromTap: (x: number, y: number, heart: HeartBox, count: number) => void;
  sweatFromHeart: (heart: HeartBox) => void;
  rainFromTop: () => void;
  shoveAwayFrom: (x: number, y: number) => void;
  /** Advances the physics' own clock: 0 while the screen is frozen. */
  step: (dt: number) => void;
  clear: () => void;
}

const MINI = FEEL_CONFIG.miniHearts;
/** Shares of a heart's size it collides at, so neighbors' outlines overlap a little. */
const MINI_HIT = 0.42;
const RAIN_HIT = 0.36;
/** The spatial hash's cell in px, and the stride that packs a cell's column and row into one key. */
const CELL = 28;
const CELL_STRIDE = 4096;
/** s one spray fans out before its hearts can knock into each other. */
const FAN_OUT_S = 0.4;
/** s held up and slow before a heart settles. */
const STILL_S = 0.25;
/** px of slack in "this settled heart sits on that one". */
const CONTACT_SLACK = 3;
/** A hard stop this many past the live cap, behind the fast fade. */
const HARD_STOP = 40;
/** Sweat runs down: it beads on the sides and the lower edge. */
const SWEAT_EDGE = heartOutline(72).filter((p) => p.ny > -0.25);

interface Bead {
  from: number;
  duration: number;
  /** Its velocity when it lets go. */
  vx: number;
  vy: number;
}

interface Body extends MiniHeart {
  vx: number;
  vy: number;
  /** deg/s. */
  spin: number;
  radius: number;
  /** Rain falls without bouncing. */
  bounces: boolean;
  gravity: number;
  /** Beading on the big heart's edge before it lets go. */
  bead: Bead | null;
  /** Held up by the floor or the heap this step. */
  held: boolean;
  /** s held up and slow. */
  still: number;
  /** Set the first time it settles, so a heart knocked loose keeps its place in the stagger. */
  fadeDue: { at: number; duration: number } | null;
  fade: { from: number; duration: number } | null;
  /** The spray it came from. */
  batch: number | null;
  born: number;
}

type Launch = Pick<Body, "kind" | "tone" | "x" | "y" | "size" | "rotation" | "spin"> &
  Partial<Pick<Body, "vx" | "vy" | "bounces" | "gravity" | "bead" | "batch">> & { hit?: number };

const beadScale = (k: number) => 0.3 + 0.7 * easeOutCubic(k);

function bounceOffWall(b: Body) {
  b.vx = -b.vx * MINI.wallBounce;
  b.spin = -b.spin * 0.8;
}

export function createMiniHeartPhysics(bounds: PileBounds, random: () => number): MiniHeartPhysics {
  let area = { ...bounds };
  const bodies: Body[] = [];
  let now = 0;
  let nextId = 1;
  let nextBatch = 1;

  const floorY = () => area.height - 8;
  const touching = (a: Body, b: Body) =>
    Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + CONTACT_SLACK;

  /** Bodies stay in spawn order, so the first match is the oldest. Settled ones go first. */
  function oldestIndex(evenFading: boolean): number {
    const candidate = (b: Body) => evenFading || !b.fade;
    const settled = bodies.findIndex((b) => b.resting && candidate(b));
    return settled >= 0 ? settled : bodies.findIndex(candidate);
  }

  function spawn({
    vx = 0,
    vy = 0,
    bounces = true,
    gravity = MINI.gravity,
    bead = null,
    batch = null,
    hit = MINI_HIT,
    ...launch
  }: Launch): Body {
    // Past the live cap the oldest fades out fast instead of blinking away.
    let live = 0;
    for (const b of bodies) if (!b.fade) live++;
    while (live >= MINI.live) {
      const i = oldestIndex(false);
      if (i < 0) break;
      bodies[i].fade = { from: now, duration: 0.25 };
      live--;
    }
    while (bodies.length >= MINI.live + HARD_STOP) remove(oldestIndex(true));
    const body: Body = {
      ...launch,
      id: nextId++,
      scale: bead ? beadScale(0) : 1,
      opacity: 1,
      resting: false,
      vx,
      vy,
      radius: launch.size * hit,
      bounces,
      gravity,
      bead,
      held: false,
      still: 0,
      fadeDue: null,
      fade: null,
      batch,
      born: now,
    };
    bodies.push(body);
    return body;
  }

  function sleep(b: Body) {
    b.resting = true;
    b.vx = b.vy = 0;
    b.still = 0;
    b.fadeDue ??= {
      at: b.kind === "rain" ? Infinity : now + lerp(MINI.linger[0], MINI.linger[1], random()),
      duration: lerp(MINI.fade[0], MINI.fade[1], random()),
    };
    // Nothing settles above the heap's cap: the oldest settled one nearby melts first.
    if (b.y - b.radius < floorY() - MINI.pileMax) {
      const melts =
        bodies.find((o) => o !== b && o.resting && !o.fade && Math.abs(o.x - b.x) < 30) ?? b;
      melts.fade ??= { from: now, duration: 0.3 };
    }
  }

  /** Whatever sits on a heart that wakes wakes with it: nothing is left hanging in the air. */
  function wake(b: Body) {
    const stack = [b];
    while (stack.length > 0) {
      const o = stack.pop();
      if (!o?.resting) continue;
      o.resting = false;
      o.still = 0;
      o.held = false;
      for (const q of bodies) if (q.resting && q.y < o.y && touching(q, o)) stack.push(q);
    }
  }

  function remove(i: number) {
    const b = bodies[i];
    bodies.splice(i, 1);
    if (!b.resting) return;
    // Whatever rested on it tumbles onto what's left: the heap melts instead of floating.
    for (const o of bodies) if (o.resting && o.y < b.y && touching(o, b)) wake(o);
    for (const o of bodies) {
      const aloft = o.resting && o.y + o.radius < floorY() - 2;
      if (aloft && !bodies.some((q) => q !== o && q.resting && q.y > o.y && touching(q, o))) {
        wake(o);
      }
    }
  }

  /**
   * Circle against circle, through a spatial hash. Two in flight trade speed along the line between
   * them. One in flight against a settled one: the settled one stays put unless the hit is hard,
   * then both fly. A slow landing on the heap slides and settles.
   */
  function collide(dt: number) {
    const grid = new Map<number, Body[]>();
    for (const b of bodies) {
      if (b.bead) continue;
      const key = Math.floor(b.x / CELL) * CELL_STRIDE + Math.floor(b.y / CELL);
      const cell = grid.get(key);
      if (cell) cell.push(b);
      else grid.set(key, [b]);
    }
    for (const a of bodies) {
      if (a.resting || a.bead) continue;
      const cx = Math.floor(a.x / CELL);
      const cy = Math.floor(a.y / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          for (const b of grid.get(gx * CELL_STRIDE + gy) ?? []) {
            const flying = !b.resting;
            if (b === a || (flying && b.id < a.id)) continue;
            if (a.batch !== null && a.batch === b.batch && now - a.born < FAN_OUT_S) continue;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            // Two in flight touch only once they overlap, so a crowd doesn't clatter.
            const reach = (a.radius + b.radius) * (flying ? MINI.touch : 1);
            const d2 = dx * dx + dy * dy;
            if (d2 >= reach * reach || d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            const over = reach - d;
            if (flying) {
              // Only a real knock bounces them apart, at no cost in speed; hearts that drift
              // together pass by instead of jamming into a clump. Neither holds the other up.
              const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (closing < -MINI.knock) {
                a.x += (nx * over) / 2;
                a.y += (ny * over) / 2;
                b.x -= (nx * over) / 2;
                b.y -= (ny * over) / 2;
                const j = (-(1 + MINI.miniBounce) * closing) / 2;
                a.vx += j * nx;
                a.vy += j * ny;
                b.vx -= j * nx;
                b.vy -= j * ny;
              }
              continue;
            }
            a.x += nx * over;
            a.y += ny * over;
            const closing = a.vx * nx + a.vy * ny;
            if (closing < 0) {
              const glancing =
                Math.hypot(a.vx, a.vy) > MINI.settle * 1.6 && -closing > MINI.knock / 2;
              if (a.bounces && (-closing > MINI.settle || glancing)) {
                // Off the heap as off the floor; a hard hit knocks the settled one loose.
                a.vx -= (1 + MINI.floorBounce) * closing * nx;
                a.vy -= (1 + MINI.floorBounce) * closing * ny;
                if (-closing > MINI.wake && !b.fade) {
                  wake(b);
                  b.vx += (nx * closing) / 3;
                  b.vy += (ny * closing) / 3;
                }
              } else {
                a.vx -= closing * nx;
                a.vy -= closing * ny;
                const roll = Math.exp(-MINI.roll * dt);
                a.vx *= roll;
                a.vy *= roll;
              }
            }
            if (ny < -0.3) a.held = true;
          }
        }
      }
    }
  }

  function advance(dt: number) {
    const { width } = area;
    const ceilingY = area.ceiling + 2;
    const floor = floorY();
    for (const b of bodies) {
      if (b.bead) {
        const k = clamp((now - b.bead.from) / b.bead.duration, 0, 1);
        b.scale = beadScale(k);
        if (k >= 1) {
          b.vx = b.bead.vx;
          b.vy = b.bead.vy;
          b.bead = null;
        }
        continue;
      }
      if (b.resting) continue;
      b.vy += b.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rotation += b.spin * dt;
      b.held = false;
      const r = b.radius;
      if (b.x < r) {
        b.x = r;
        if (b.vx < 0) bounceOffWall(b);
      } else if (b.x > width - r) {
        b.x = width - r;
        if (b.vx > 0) bounceOffWall(b);
      }
      if (b.bounces && b.vy < 0 && b.y < ceilingY + r) {
        b.y = ceilingY + r;
        b.vy = -b.vy * MINI.wallBounce;
      }
      if (b.y > floor - r) {
        b.y = floor - r;
        // A floor bounce barely slows it sideways, and turns its slide into spin.
        if (b.vy > MINI.settle && b.bounces) {
          b.vy = -b.vy * MINI.floorBounce;
          b.vx *= MINI.floorGrip;
          b.spin = b.spin * 0.6 + b.vx * 0.8;
        } else if (b.vy > 0) b.vy = 0;
        if (b.vy >= 0) {
          b.held = true;
          b.vx *= Math.exp(-MINI.roll * dt);
          b.spin = b.vx * 0.9;
        }
      }
    }
    collide(dt);
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      if (!b.resting && !b.bead) {
        b.still = b.held && Math.hypot(b.vx, b.vy) < MINI.sleep ? b.still + dt : 0;
        if (b.still > STILL_S) sleep(b);
      } else if (b.resting && !b.fade && b.fadeDue && now >= b.fadeDue.at) {
        b.fade = { from: now, duration: b.fadeDue.duration };
      }
      if (b.fade) {
        const k = clamp((now - b.fade.from) / b.fade.duration, 0, 1);
        b.opacity = 1 - k;
        b.scale = 1 - 0.35 * k;
        if (k >= 1) remove(i);
      }
    }
  }

  function throwMini(x: number, y: number, angle: number, speed: number, batch: number) {
    spawn({
      kind: "mini",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: lerp(MINI.sizes[0], MINI.sizes[1], random()),
      rotation: (random() - 0.5) * 40,
      spin: (random() - 0.5) * 2 * MINI.spin,
      tone: Math.floor(random() * MINI.tones.length),
      batch,
    });
  }

  return {
    hearts: bodies,
    setBounds: (next) => {
      area = { ...next };
    },
    // From under the finger, sprayed outward from the heart's middle through the finger, tipped up.
    sprayFromTap: (x, y, heart, count) => {
      let ox = (x - heart.x) / (heart.width * 0.5);
      let oy = (y - heart.y) / (heart.height * 0.5);
      const m = Math.hypot(ox, oy);
      if (m < 0.2) {
        ox = 0;
        oy = -1;
      } else {
        ox /= m;
        oy /= m;
      }
      const base = Math.atan2(oy - 0.6, ox);
      const spray = (MINI.sprayDeg * Math.PI) / 180;
      const batch = nextBatch++;
      for (let i = 0; i < count; i++) {
        const sx = x + (random() - 0.5) * 6;
        const sy = y + (random() - 0.5) * 6;
        const angle = base + (random() - 0.5) * 2 * spray;
        throwMini(sx, sy, angle, lerp(MINI.speed[0], MINI.speed[1], random()), batch);
      }
    },
    // A drop swells on the heart's edge, lets go and falls into the heap.
    sweatFromHeart: (heart) => {
      const p = SWEAT_EDGE[Math.floor(random() * SWEAT_EDGE.length)];
      const size = lerp(MINI.sweatSizes[0], MINI.sweatSizes[1], random());
      const r = size * MINI_HIT;
      const rotation = (random() - 0.5) * 24;
      const spin = (random() - 0.5) * 120;
      const tone = Math.floor(random() * MINI.tones.length);
      const duration = lerp(MINI.bead[0], MINI.bead[1], random());
      spawn({
        kind: "mini",
        tone,
        // Its middle sits just outside the edge.
        x: heart.x + (p.x / HEART_VIEWBOX.width - 0.5) * heart.width + p.nx * r * 0.7,
        y: heart.y + (p.y / HEART_VIEWBOX.height - 0.5) * heart.height + p.ny * r * 0.7,
        size,
        rotation,
        spin,
        bead: { from: now, duration, vx: p.nx * 70 + (random() - 0.5) * 30, vy: p.ny * 40 + 20 },
      });
    },
    // It falls without bouncing, and never fades by itself: it stays until the caps make room.
    rainFromTop: () => {
      let rain = 0;
      for (const b of bodies) if (b.kind === "rain") rain++;
      if (rain >= MINI.rainMax) return;
      const size = 22 + random() * 12;
      spawn({
        kind: "rain",
        tone: 0,
        x: 16 + random() * (area.width - 32),
        y: -30,
        size,
        rotation: (random() - 0.5) * 60,
        spin: 0,
        bounces: false,
        gravity: MINI.rainGravity,
        hit: RAIN_HIT,
      });
    },
    // Hardest right under the finger, and barely at the edge of its reach.
    shoveAwayFrom: (x, y) => {
      for (const b of bodies) {
        if (b.bead || b.fade) continue;
        const dx = b.x - x;
        const dy = b.y - y;
        const d = Math.hypot(dx, dy);
        if (d > MINI.reach) continue;
        const f = (1 - d / MINI.reach) ** 2;
        if (b.resting) {
          if (f < 0.12) continue;
          wake(b);
        }
        const nx = d > 1 ? dx / d : 0;
        const ny = d > 1 ? dy / d : -1;
        const kick = MINI.kick * f;
        // Away from the finger, and a little up.
        b.vx += nx * kick;
        b.vy += ny * kick - kick * 0.35;
        b.spin += (random() - 0.5) * 2 * MINI.spin * f;
      }
    },
    step: (dt) => {
      now += dt;
      if (dt > 0 && bodies.length > 0) advance(dt);
    },
    clear: () => {
      bodies.length = 0;
    },
  };
}
