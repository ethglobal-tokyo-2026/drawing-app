import { describe, expect, it } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import { FEEL_CONFIG } from "./gameConfig";
import { createMiniHeartPhysics, type MiniHeartPhysics } from "./miniHeartPhysics";

const bounds = { width: 390, height: 741, ceiling: 256 };
const heart = { x: 195, y: 420, width: 226, height: 218 };
const STEP = 1 / 120;

const run = (physics: MiniHeartPhysics, seconds: number) => {
  for (let t = 0; t < seconds; t += STEP) physics.step(STEP);
};
/** Steps until every heart rests, for at most `limit` seconds. */
const settle = (physics: MiniHeartPhysics, limit = 10) => {
  for (let t = 0; t < limit && !physics.hearts.every((h) => h.resting); t += STEP)
    physics.step(STEP);
};

describe("createMiniHeartPhysics", () => {
  it("sprays hearts that bounce, settle into a pile along the bottom, then fade away", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(1));
    physics.sprayFromTap(195, 380, heart, 3);
    expect(physics.hearts).toHaveLength(3);
    settle(physics);
    expect(physics.hearts.every((h) => h.resting)).toBe(true);
    for (const h of physics.hearts) {
      expect(h.y + h.size / 2).toBeLessThanOrEqual(bounds.height);
      expect(h.y).toBeGreaterThan(bounds.height - FEEL_CONFIG.miniHearts.pileMax - h.size);
    }
    run(physics, 6);
    expect(physics.hearts).toHaveLength(0);
  });

  it("shoves a settled heart away from a tap beside it", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(2));
    physics.sprayFromTap(195, 380, heart, 3);
    settle(physics);
    const [target] = physics.hearts;
    const tap = { x: target.x + 20, y: target.y };
    const before = Math.hypot(target.x - tap.x, target.y - tap.y);
    physics.shoveAwayFrom(tap.x, tap.y);
    run(physics, 0.1);
    const after = physics.hearts.find((h) => h.id === target.id);
    if (!after) throw new Error("The shoved heart vanished");
    expect(Math.hypot(after.x - tap.x, after.y - tap.y)).toBeGreaterThan(before);
  });

  it("keeps no more hearts in play than the live cap", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(3));
    for (let i = 0; i < 80; i++) {
      physics.sprayFromTap(195, 380, heart, 3);
      run(physics, 1 / 30);
      const inPlay = physics.hearts.filter((h) => h.opacity === 1).length;
      expect(inPlay).toBeLessThanOrEqual(FEEL_CONFIG.miniHearts.live);
    }
  });

  it("keeps every heart between the walls", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(4));
    for (let i = 0; i < 20; i++) physics.sprayFromTap(20, 380, heart, 3);
    for (let t = 0; t < 4; t += STEP) {
      physics.step(STEP);
      for (const h of physics.hearts) {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.x).toBeLessThanOrEqual(bounds.width);
      }
    }
  });
});
