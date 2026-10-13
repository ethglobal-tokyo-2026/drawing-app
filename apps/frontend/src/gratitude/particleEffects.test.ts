// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createParticleEffects } from "./particleEffects";

afterEach(() => vi.restoreAllMocks());

it("fills large-stage burst rings with more hearts and a wider spread, within the sprite cap", () => {
  const animated = vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  const effects = document.createElement("div");
  const particles = createParticleEffects(
    { effects, stamps: document.createElement("div"), lines: document.createElement("div") },
    { reduced: () => false, random: () => 0.5, coverage: () => ({ density: 3, travel: 2.5 }) },
  );
  particles.burst(8, { x: 0, y: 0 });
  expect(effects.children.length).toBeGreaterThan(8);
  const spread = animated.mock.calls.map(([frames]) => {
    const end: unknown = Array.isArray(frames) ? frames.at(-1) : null;
    if (
      typeof end !== "object" ||
      end === null ||
      !("transform" in end) ||
      typeof end.transform !== "string"
    )
      throw new Error("The burst has no destination transform");
    const point = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(end.transform);
    if (!point) throw new Error(`No burst destination in ${end.transform}`);
    return Math.hypot(Number(point[1]), Number(point[2]));
  });
  expect(Math.max(...spread)).toBeGreaterThan(400);
  for (let i = 0; i < 20; i++) particles.burst(8, { x: 0, y: 0 });
  expect(effects.children.length).toBeLessThanOrEqual(36);
});
