import assert from "node:assert/strict";
import { test } from "node:test";

import * as reference from "./material-reference.ts";
const math = () => reference;
const near = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

await test("dielectric reflection is four percent at a normal air/1.5 interface", () => {
  const m = math();
  near(m.dielectricFresnel(1, 1.5), 0.04);
  near(m.dielectricFresnel(0, 1.5), 1);
  assert.ok(m.dielectricFresnel(0.25, 1.5) > 0.04);
});

await test("linear reflection of a white environment lifts black to about sRGB 56", () => {
  const m = math();
  const coat = m.coatField({
    point: [0, 0],
    normal: [0, 0, 1],
    material: m.MATERIAL_GLOSS,
    environment: () => 1,
  });
  const color = m.compositePrint([0, 0, 0], coat);
  for (const channel of color) near(channel * 255, 56.326, 0.01);
  assert.ok(color[0] * 255 > 50, "Display-space source-over would produce about 10");
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
  near(dark[0] * 255, 239.78, 0.03);
  near(bright[0] * 255, 247.69, 0.03);
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
    pose: { x: Math.PI / (2 * 0.38), y: 0 },
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
    pose: { x: -0.6, y: -0.6 },
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
  const n = m.orientNormal([0.6, 0, 0.8], 90, { x: 0, y: 0 });
  near(n[0], 0);
  near(n[1], 0.6);
  near(n[2], 0.8);
});

await test("the finite camera changes reflected source position across a flat plane", () => {
  const m = math();
  const center = m.coatField({ point: [0, 0], normal: [0, 0, 1], material: m.MATERIAL_GLOSS });
  const edge = m.coatField({ point: [1.5, 0], normal: [0, 0, 1], material: m.MATERIAL_GLOSS });
  assert.ok(center.environment > edge.environment + 0.3);
});

await test("a CSS flight's X tilt follows its outer quarter turn", () => {
  const m = math();
  const n = m.orientNormal([0, 0, 1], 90, { x: 0, y: 0 }, { x: 30, y: 0 });
  near(n[0], 0.5);
  near(n[1], 0);
  near(n[2], Math.sqrt(3) / 2);
});

await test("matte spreads a reflected source boundary instead of hiding the coating", () => {
  const m = math();
  const direction = m.normalize([0.58, 0, 1]);
  const gloss = m.reflectedEnvironment(direction, m.MATERIAL_GLOSS.roughness);
  const matte = m.reflectedEnvironment(direction, m.MATERIAL_MATTE.roughness);
  assert.ok(matte > gloss + 0.05);
  assert.ok(gloss >= 0.14 && matte <= 1);
});

await test("masked-out pixels have zero isolated contribution and output alpha", () => {
  const m = math();
  const frame = m.renderMaterialReference({
    width: 2,
    height: 1,
    print: new Uint8ClampedArray(8).fill(255),
    cut: new Float32Array([0, 0.5]),
    material: m.MATERIAL_GLOSS,
    pose: { x: 0, y: 0 },
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
    pose: { x: -0.6, y: -0.6 },
  };
  const first = m.renderMaterialReference(input);
  assert.deepEqual(first, m.renderMaterialReference(input));
  assert.ok(first.coat.every((v) => v >= 0 && v <= 1));
  assert.ok(first.transmitted.every((v) => v >= 0 && v <= 1));
});
