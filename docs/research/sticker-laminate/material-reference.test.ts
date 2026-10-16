import assert from "node:assert/strict";
import { test } from "node:test";

import * as reference from "./material-reference.ts";
const math = () => reference;
const near = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

/** A white flat sticker isolates the perceptual footprint from ink and crease geometry. */
function whiteReflection(pose: reference.Pose, turn = 0) {
  const side = 121;
  const frame = reference.renderMaterialReference({
    width: side,
    height: side,
    print: new Uint8ClampedArray(side * side * 4).fill(255),
    cut: new Float32Array(side * side).fill(1),
    material: reference.MATERIAL_GLOSS,
    pose,
    turn,
  });
  const values = Array.from({ length: side * side }, (_, i) => frame.display[i * 4]);
  const min = Math.min(...values),
    max = Math.max(...values);
  let weight = 0,
    x = 0,
    y = 0,
    bright = 0;
  for (let row = 0; row < side; row++)
    for (let column = 0; column < side; column++) {
      const i = row * side + column;
      const amount = Math.max(0, values[i] - min);
      const point = reference.screenPoint(
        (column + 0.5) / side,
        (row + 0.5) / side,
        side,
        side,
        turn,
      );
      weight += amount;
      x += point[0] * amount;
      y += point[1] * amount;
      if (values[i] >= min + (max - min) / 2) bright++;
    }
  return { min, max, fraction: bright / values.length, x: x / weight, y: y / weight };
}

await test("a gloss reflection has a localized bright region on otherwise near-white paper", () => {
  // A source wider than the sticker produces a uniform wash and must fail this acceptance test.
  for (const pose of [
    { x: 0, y: 0, rotationDegrees: 0 },
    { x: 0.23, y: 0, rotationDegrees: 0 },
    { x: -0.23, y: 0, rotationDegrees: 0 },
    { x: 0, y: 0.23, rotationDegrees: 0 },
    { x: 0, y: -0.23, rotationDegrees: 0 },
  ]) {
    const result = whiteReflection(pose);
    assert.ok(result.min >= 238, `The paper was darkened to ${result.min}`);
    assert.ok(
      result.max - result.min >= 12,
      `The source edge spans only ${result.max - result.min}/255`,
    );
    assert.ok(
      result.fraction >= 0.1 && result.fraction <= 0.45,
      `The reflection covers ${result.fraction * 100}%`,
    );
  }
});

await test("flat and quarter-turned gloss travel in the shared foil pose direction", () => {
  // Reversing either normal rotation makes the reflection move against the backing foil.
  for (const turn of [0, 90]) {
    const neutral = whiteReflection({ x: 0, y: 0, rotationDegrees: 0 }, turn);
    for (const [axis, sign] of [
      ["x", 1],
      ["x", -1],
      ["y", 1],
      ["y", -1],
    ] as const) {
      const tilted = whiteReflection(
        {
          x: axis === "x" ? sign * 0.23 : 0,
          y: axis === "y" ? sign * 0.23 : 0,
          rotationDegrees: 0,
        },
        turn,
      );
      assert.ok(
        (tilted[axis] - neutral[axis]) * sign > 0.12,
        `${turn}° ${axis} ${sign}: reflection traveled against or barely with the foil`,
      );
    }
  }
});

await test("gloss retains a short source edge while matte spreads the same incident light", () => {
  // Excess source feathering makes both materials read like a diffuse color wash.
  const widths = [reference.MATERIAL_GLOSS, reference.MATERIAL_MATTE].map((material) => {
    // Include the surrounding plane: matte's spread reaches beyond a one-width sticker.
    const values = Array.from(
      { length: 3001 },
      (_, i) =>
        reference.coatField({
          point: [i / 1000 - 1.5, -0.06],
          normal: [0, 0, 1],
          material,
        }).environment,
    );
    const min = Math.min(...values),
      max = Math.max(...values);
    const peak = values.indexOf(max);
    const rising = values.slice(0, peak + 1);
    const start = rising.findIndex((value) => value >= min + (max - min) * 0.1);
    const end = rising.findIndex((value) => value >= min + (max - min) * 0.9);
    return (end - start) / 1000;
  });
  assert.ok(widths[0] <= 0.15, `Gloss source edge spans ${widths[0]} sticker widths`);
  assert.ok(widths[1] >= widths[0] * 2.5, `Matte ${widths[1]} should spread gloss ${widths[0]}`);
});

await test("dielectric reflection is four percent at a normal air/1.5 interface", () => {
  const m = math();
  near(m.dielectricFresnel(1, 1.5), 0.04);
  near(m.dielectricFresnel(0, 1.5), 1);
  assert.ok(m.dielectricFresnel(0.25, 1.5) > 0.04);
});

await test("linear reflection of a white environment lifts black to about sRGB 57", () => {
  const m = math();
  const coat = m.coatField({
    point: [0, 0],
    normal: [0, 0, 1],
    material: m.MATERIAL_GLOSS,
    environment: () => 1,
  });
  const color = m.compositePrint([0, 0, 0], coat);
  for (const channel of color) near(channel * 255, 57.267, 0.01);
  assert.ok(color[0] * 255 > 50, "Display-space source-over would produce about 10");
});

await test("the coat's internal returns deepen a mid-gray print and keep white paper and black ink", () => {
  const m = math();
  const coat = m.coatField({
    point: [0, 0],
    normal: [0, 0, 1],
    material: m.MATERIAL_GLOSS,
    environment: () => 0.14,
  });
  const unreturned = { ...coat, internalReflectance: 0 };
  for (const ink of [0, 1])
    assert.deepEqual(
      m.compositePrint([ink, ink, ink], coat),
      m.compositePrint([ink, ink, ink], unreturned),
    );
  const gray = [188 / 255, 188 / 255, 188 / 255] as const;
  assert.ok(m.compositePrint(gray, coat)[0] < m.compositePrint(gray, unreturned)[0] - 10 / 255);
});

await test("a white nonabsorbing reference stays white in uniform white light", () => {
  const m = math();
  for (const material of [m.MATERIAL_GLOSS, m.MATERIAL_MATTE]) {
    const coat = m.coatField({
      point: [0.2, -0.1],
      normal: [0, 0, 1],
      material,
      environment: () => 1,
    });
    for (const value of m.compositePrint([1, 1, 1], coat, 1)) near(value, 1);
    near(coat.reflection + coat.transmission, 1);
  }
});

await test("declared diffuse calibration and HDR window leave visible headroom on white paper", () => {
  const m = math();
  const input = { point: [0, 0] as const, normal: [0, 0, 1] as const, material: m.MATERIAL_GLOSS };
  const dark = m.compositePrint([1, 1, 1], m.coatField({ ...input, environment: () => 0.14 }));
  const bright = m.compositePrint([1, 1, 1], m.coatField({ ...input, environment: () => 1.8 }));
  near(dark[0] * 255, 239.81, 0.03);
  near(bright[0] * 255, 247.96, 0.03);
  assert.ok((bright[0] - dark[0]) * 255 > 7);
});

await test("grazing HDR reflection reports display clipping while preserving incident radiance", () => {
  const m = math();
  const coat = m.coatField({
    point: [0, 0],
    normal: [1, 0, 0],
    material: m.MATERIAL_GLOSS,
    environment: () => 1.8,
  });
  near(coat.environment, 1.8);
  near(coat.color[0], 1.8);
  for (const value of m.compositePrint([1, 1, 1], coat)) near(value, 1);
  const frame = m.renderMaterialReference({
    width: 1,
    height: 1,
    print: new Uint8ClampedArray(4).fill(255),
    cut: new Float32Array([1]),
    material: m.MATERIAL_GLOSS,
    pose: { x: Math.PI / (2 * 0.38), y: 0, rotationDegrees: 0 },
    environment: () => 1.8,
  });
  assert.equal(frame.clippedPixels, 1);
});

await test("print changes leave isolated coating and cut coverage unchanged", () => {
  const m = math();
  const input = {
    width: 3,
    height: 3,
    cut: new Float32Array(9).fill(1),
    material: m.MATERIAL_GLOSS,
    pose: { x: -0.6, y: -0.6, rotationDegrees: 0 },
  };
  const white = m.renderMaterialReference({ ...input, print: new Uint8ClampedArray(36).fill(255) });
  const black = m.renderMaterialReference({ ...input, print: new Uint8ClampedArray(36) });
  assert.deepEqual(white.coat, black.coat);
  assert.deepEqual(white.coverage, black.coverage);
  assert.notDeepEqual(white.display, black.display);
});

await test("flat height offsets preserve normals and raw ramps produce physical slopes", () => {
  const m = math();
  const flat = m.normalFromHeight(new Float32Array(9).fill(2), 3, 3, 1, 1);
  near(flat[0], 0);
  near(flat[1], 0);
  near(flat[2], 1);
  const ramp = new Float32Array([0, 1, 2, 0, 1, 2, 0, 1, 2]);
  const n = m.normalFromHeight(ramp, 3, 3, 1, 1, 1, 1, 0.35);
  near(n[0], -0.33035042472810605);
  near(n[1], 0);
  near(n[2], 0.9438583563660174);
});

await test("a quarter turn rotates non-square geometry and normals in the same screen axes", () => {
  const m = math();
  const p = m.screenPoint(0.75, 0.25, 200, 100, 90);
  near(p[0], 0.25);
  near(p[1], 0.5);
  const n = m.orientNormal([0.6, 0, 0.8], 90, { x: 0, y: 0, rotationDegrees: 0 });
  near(n[0], 0);
  near(n[1], 0.6);
  near(n[2], 0.8);
});

await test("physical in-plane rotation turns geometric normals and the localized source", () => {
  const n = reference.orientNormal([0.6, 0, 0.8], 0, { x: 0, y: 0, rotationDegrees: 90 });
  near(n[0], 0);
  near(n[1], 0.6);
  near(n[2], 0.8);
  const input = {
    width: 41,
    height: 41,
    print: new Uint8ClampedArray(41 * 41 * 4).fill(255),
    cut: new Float32Array(41 * 41).fill(1),
    material: reference.MATERIAL_GLOSS,
  };
  const neutral = reference.renderMaterialReference({
    ...input,
    pose: { x: 0, y: 0, rotationDegrees: 0 },
  });
  const rotated = reference.renderMaterialReference({
    ...input,
    pose: { x: 0, y: 0, rotationDegrees: 10 },
  });
  assert.notDeepEqual(rotated.display, neutral.display);
  assert.deepEqual(rotated.coverage, neutral.coverage);
});

await test("the finite camera changes reflected source position across a flat plane", () => {
  const m = math();
  const center = m.coatField({ point: [0, 0], normal: [0, 0, 1], material: m.MATERIAL_GLOSS });
  const edge = m.coatField({ point: [1.5, 0], normal: [0, 0, 1], material: m.MATERIAL_GLOSS });
  assert.ok(center.environment > edge.environment + 0.3);
});

await test("a CSS flight's X tilt follows its outer quarter turn", () => {
  const m = math();
  const n = m.orientNormal([0, 0, 1], 90, { x: 0, y: 0, rotationDegrees: 0 }, { x: 30, y: 0 });
  near(n[0], 0.5);
  near(n[1], 0);
  near(n[2], Math.sqrt(3) / 2);
});

await test("matte spreads a reflected source boundary instead of hiding the coating", () => {
  const m = math();
  const direction = m.normalize([0.25, 0, 1]);
  const gloss = m.reflectedEnvironment(direction, m.MATERIAL_GLOSS.roughness);
  const matte = m.reflectedEnvironment(direction, m.MATERIAL_MATTE.roughness);
  assert.ok(matte > gloss + 0.05);
  assert.ok(gloss >= 0.14 && matte <= m.ENVIRONMENT.peak);
});

await test("masked-out pixels have zero isolated contribution and output alpha", () => {
  const m = math();
  const frame = m.renderMaterialReference({
    width: 2,
    height: 1,
    print: new Uint8ClampedArray(8).fill(255),
    cut: new Float32Array([0, 0.5]),
    material: m.MATERIAL_GLOSS,
    pose: { x: 0, y: 0, rotationDegrees: 0 },
  });
  assert.deepEqual(Array.from(frame.coat.slice(0, 3)), [0, 0, 0]);
  assert.deepEqual(Array.from(frame.transmitted.slice(0, 3)), [0, 0, 0]);
  assert.equal(frame.display[3], 0);
  assert.equal(frame.display[7], 128);
  assert.equal(frame.coverage[1], 0.5);
});

await test("held poses produce deterministic bounded frames without a clock", () => {
  const m = math();
  const input = {
    width: 7,
    height: 5,
    print: new Uint8ClampedArray(140).fill(255),
    cut: new Float32Array(35).fill(1),
    material: m.MATERIAL_MATTE,
    pose: { x: -0.6, y: -0.6, rotationDegrees: 0 },
  };
  const first = m.renderMaterialReference(input);
  assert.deepEqual(first, m.renderMaterialReference(input));
  assert.ok(first.coat.every((v) => v >= 0 && v <= 1));
  assert.ok(first.transmitted.every((v) => v >= 0 && v <= 1));
});
