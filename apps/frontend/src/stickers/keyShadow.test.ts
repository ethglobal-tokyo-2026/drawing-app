import { describe, expect, it } from "vitest";
import { keyShadow } from "./keyShadow";

const at = (beta: number, gamma = 0) => keyShadow({ beta, gamma, screenAngle: 0 });
const reach = ({ x, y }: { x: number; y: number }) => Math.hypot(x, y);

describe("keyShadow", () => {
  it("falls down from the reading pose, and further and softer upright", () => {
    const reading = at(47);
    const upright = at(90);
    expect(reading.y).toBeGreaterThan(0);
    expect(upright.y).toBeGreaterThan(reading.y);
    expect(upright.soft).toBeGreaterThan(reading.soft);
    expect(upright.sharp + upright.soft).toBeLessThan(reading.sharp + reading.soft);
  });

  it("falls toward the top edge lying flat, where the light comes from the bottom edge", () => {
    expect(at(0).y).toBeLessThan(0);
  });

  it("swings across as the device turns sideways, and never throws past its reach", () => {
    expect(Math.sign(at(47, 25).x)).toBe(-Math.sign(at(47, -25).x));
    for (const beta of [0, 20, 47, 70, 90, 110]) expect(reach(at(beta))).toBeLessThan(1.5 + 1e-9);
  });
});
