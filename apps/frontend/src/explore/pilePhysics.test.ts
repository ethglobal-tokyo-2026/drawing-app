import { describe, expect, it } from "vitest";
import { convexHull, PileWorld, simplifyHull, type BodySpec, type Pose } from "./pilePhysics";

/** A square sticker `size` across, its image centered at (x, y). */
function square(id: string, x: number, y: number, size = 80): BodySpec {
  const r = size / 2;
  return {
    id,
    x,
    y,
    turn: 0,
    outline: [
      [-r, -r],
      [r, -r],
      [r, r],
      [-r, r],
    ],
  };
}

/** A section 360 across and 300 down, as a phone's pile lays a day out. */
const section = (...specs: BodySpec[]) => new PileWorld(specs, 360, 300);

function poseOf(world: PileWorld, id: string): Pose {
  const pose = world.pose(id);
  if (!pose) throw new Error(`The section has no sticker ${id}`);
  return pose;
}

/** Plays `seconds` at 60 frames a second, and gives `id`'s pose after each frame. */
function play(world: PileWorld, seconds: number, id?: string): Pose[] {
  const track: Pose[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    world.step(1 / 60);
    if (id) track.push(poseOf(world, id));
  }
  return track;
}

/** Picks `id` up by its middle and throws it at `velocity`. */
function throwFrom(world: PileWorld, id: string, velocity: { x: number; y: number }) {
  const { x, y } = poseOf(world, id);
  world.grab(id, x, y);
  world.release(velocity);
}

describe("a cut line's hull", () => {
  it("keeps only its outermost points, and simplifies to the corners asked for", () => {
    const star = Array.from({ length: 16 }, (_, i) => {
      const r = i % 2 ? 20 : 50;
      return [r * Math.cos((i * Math.PI) / 8), r * Math.sin((i * Math.PI) / 8)] as const;
    });
    const hull = convexHull(star);
    expect(hull).toHaveLength(8);
    for (const [x, y] of hull) expect(Math.hypot(x, y)).toBeCloseTo(50);
    const simpler = simplifyHull(hull, 5);
    expect(simpler).toHaveLength(5);
    for (const [x, y] of simpler) expect(hull).toContainEqual([x, y]);
  });
});

describe("a day's section of the pile", () => {
  it("leaves the stickers a picked-up sticker lay over where they are when it's put down", () => {
    const world = section(square("a", 150, 150), square("b", 190, 160), square("c", 120, 185));
    world.grab("a", 150, 150);
    play(world, 0.3);
    world.release({ x: 0, y: 0 });
    play(world, 1);
    expect(poseOf(world, "b")).toEqual({ x: 190, y: 160, turn: 0 });
    expect(poseOf(world, "c")).toEqual({ x: 120, y: 185, turn: 0 });
    expect(world.moving).toBe(false);
  });

  it("throws a sticker into another, which it knocks along without passing through, then stops", () => {
    const world = section(square("a", 60, 150), square("b", 220, 150));
    throwFrom(world, "a", { x: 1200, y: 0 });
    play(world, 3);
    const [a, b] = [poseOf(world, "a"), poseOf(world, "b")];
    expect(b.x).toBeGreaterThan(260);
    expect(b.x - a.x).toBeGreaterThan(79);
    expect(world.moving).toBe(false);
  });

  it("bounces a thrown sticker off its section's edges and keeps it inside them", () => {
    const world = section(square("a", 180, 150));
    throwFrom(world, "a", { x: 2400, y: 900 });
    const track = play(world, 3, "a");
    // At most a substep's travel past an edge, before it's pushed back in.
    for (const { x, y } of track) {
      expect(x).toBeGreaterThan(30);
      expect(x).toBeLessThan(330);
      expect(y).toBeGreaterThan(30);
      expect(y).toBeLessThan(270);
    }
    const furthest = Math.max(...track.map(({ x }) => x));
    expect(track.at(-1)?.x).toBeLessThan(furthest - 20);
  });

  it("keeps a sticker's name tags inside its section, as it keeps its cut", () => {
    const tagged = { ...square("a", 200, 150), extent: [[-90, 0] as const] };
    const world = section(tagged);
    throwFrom(world, "a", { x: -2400, y: 0 });
    for (const { x, turn } of play(world, 3, "a")) {
      expect(x - 90 * Math.cos((turn * Math.PI) / 180)).toBeGreaterThan(-10);
    }
  });

  it("slides a sticker it knocked over one at rest, which stays where it lies", () => {
    const world = section(square("a", 60, 150), square("b", 160, 150), square("c", 260, 150));
    throwFrom(world, "a", { x: 900, y: 0 });
    play(world, 3);
    expect(poseOf(world, "b").x).toBeGreaterThan(200);
    expect(poseOf(world, "c")).toEqual({ x: 260, y: 150, turn: 0 });
  });

  it("knocks a sticker it was laid over, once the two have come apart and meet again", () => {
    const world = section(square("a", 150, 150), square("b", 200, 150));
    world.grab("a", 150, 150);
    world.drag(60, 150);
    play(world, 0.5);
    world.release({ x: 1200, y: 0 });
    play(world, 3);
    expect(poseOf(world, "b").x).toBeGreaterThan(230);
  });

  it("turns a sticker dragged by its corner", () => {
    const world = section(square("a", 150, 150));
    world.grab("a", 185, 185);
    world.drag(300, 185);
    play(world, 1);
    expect(Math.abs(poseOf(world, "a").turn)).toBeGreaterThan(10);
  });

  it("catches only a sticker still sliding", () => {
    const world = section(square("a", 60, 150));
    expect(world.isMoving("a")).toBe(false);
    throwFrom(world, "a", { x: 900, y: 0 });
    play(world, 0.1);
    expect(world.isMoving("a")).toBe(true);
    play(world, 3);
    expect(world.isMoving("a")).toBe(false);
  });

  it("under reduced motion, lets a sticker go where it was let go", () => {
    const world = section(square("a", 150, 150));
    world.reduced = true;
    world.grab("a", 150, 150);
    world.drag(200, 150);
    play(world, 0.5);
    const placed = poseOf(world, "a");
    world.release({ x: 2000, y: 0 });
    play(world, 1);
    expect(poseOf(world, "a").x).toBeCloseTo(placed.x, 0);
    expect(world.moving).toBe(false);
  });
});
