import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  constructQuadraticSourceNode,
  QuadraticSourceBuilder,
  type SourceRecord,
  type SourceConstruction,
} from "./post-source.ts";
import type { PostScalars } from "./post-pipeline.ts";

const config = { deferFirstNode: false, fadeScalar54: null, cornerDetection: null };
const record = (x: number, y: number, sourceIndex = 0): SourceRecord => ({
  point: { x, y },
  scalars: [1, 1, 0, 0, 1, 1, 1],
  flags: 0,
  sourceIndex,
});

test("ordinary contacts create midpoint anchors and raw controls before exact terminal import", () => {
  const builder = new QuadraticSourceBuilder(record(0, 0), config);
  builder.append(record(10, 20, 1), 1);
  builder.append(record(20, 0, 2), 1);
  builder.finish(record(24, 4, 3));
  const result = builder.snapshot();
  assert.deepEqual(
    result.nodes.map(({ point, control }) => ({ point, control })),
    [
      { point: { x: 0, y: 0 }, control: { x: 0, y: 0 } },
      { point: { x: 5, y: 10 }, control: { x: 10, y: 20 } },
      { point: { x: 15, y: 10 }, control: { x: 20, y: 0 } },
      { point: { x: 24, y: 4 }, control: { x: 0, y: 0 } },
    ],
  );
  assert.deepEqual(result.sourceIndices, [[0], [0, 1], [1, 2], [3]]);
  assert.equal(result.pathFlags, 0x2021);
});

test("midpoint import narrows before halving and copies current scalar54 rather than averaging it", () => {
  const a = record(0, 0),
    b = record(4, 2, 1);
  a.scalars = [2 ** -149, 1, 0.25, 350, 0.8, 0.2, 0.4];
  b.scalars = [0, 0.5, 0.75, 10, 0.3, 0.4, 0.8];
  a.flags = 3;
  b.flags = 3;
  const result = constructQuadraticSourceNode("midpoint", a, b, { x: 0, y: 0 });
  assert.deepEqual(result.node.scalars, [
    0,
    0.75,
    0.5,
    360,
    Math.fround(0.3),
    Math.fround(0.3),
    Math.fround(0.6),
  ]);
  assert.equal(result.node.flags, 0);
  const terminal = constructQuadraticSourceNode("terminal", a, b, { x: 0, y: 0 });
  assert.equal(terminal.node.flags, 0x3000);
  assert.deepEqual(terminal.node.point, { x: 4, y: 2 });
});

test("repeated input points remain native source nodes rather than being silently rejected", () => {
  const builder = new QuadraticSourceBuilder(record(4, 7), config);
  builder.append(record(4, 7, 1), 1);
  builder.finish(record(4, 7, 2));
  assert.equal(builder.snapshot().nodes.length, 3);
  assert.deepEqual(
    builder.snapshot().nodes.map((n) => n.point),
    [
      { x: 4, y: 7 },
      { x: 4, y: 7 },
      { x: 4, y: 7 },
    ],
  );
});

test("deferred begin imports the first append without midpoint construction or scalar fade", () => {
  const builder = new QuadraticSourceBuilder(record(0, 0), {
    ...config,
    deferFirstNode: true,
    fadeScalar54: { length: 1 },
  });
  builder.append(record(20, 0, 1), 1);
  assert.deepEqual(
    builder.snapshot().nodes.map((n) => [n.point.x, n.scalars[4]]),
    [[20, 1]],
  );
  builder.finish(record(30, 0, 2));
  assert.deepEqual(
    builder.snapshot().nodes.map((n) => [n.point.x, n.scalars[4]]),
    [
      [20, 1],
      [30, 0],
    ],
  );
});

test("distance accumulation fades scalar54 on contact and terminal using the previous raw record", () => {
  const builder = new QuadraticSourceBuilder(record(0, 0), {
    ...config,
    fadeScalar54: { length: 10 },
  });
  builder.append(record(3, 4, 1), 1);
  builder.finish(record(6, 8, 2));
  assert.deepEqual(
    builder.snapshot().nodes.map((n) => n.scalars[4]),
    [1, 0.5, 0],
  );
});

test("explicit source marker causes a flagged corner on the next append, not on the marked record", () => {
  const builder = new QuadraticSourceBuilder(record(0, 0), config);
  const marked = record(4, 2, 1);
  marked.flags = 0x10;
  builder.append(marked, 1);
  builder.append(record(8, 4, 2), 1);
  const result = builder.snapshot();
  assert.deepEqual(
    result.nodes.map((n) => n.point),
    [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 4, y: 2 },
      { x: 6, y: 3 },
    ],
  );
  assert.deepEqual(
    result.nodes.map((n) => n.flags),
    [0, 0, 5, 0],
  );
  assert.deepEqual(result.nodes[1].control, { x: 3, y: 1.5 });
  assert.deepEqual(result.nodes[2].control, { x: 5, y: 2.5 });
});

test("caller-enabled corner detection inserts an unmarked corner at a sharp reversal", () => {
  const builder = new QuadraticSourceBuilder(record(0, 0), {
    ...config,
    cornerDetection: { positionalTolerance: 0.05 },
  });
  builder.append(record(10, 0, 1), 1);
  builder.append(record(0, 0, 2), 1);
  assert.deepEqual(
    builder.snapshot().nodes.map((n) => n.flags),
    [0, 0, 1, 0],
  );
});

test("source snapshots do not mutate caller records and cannot mutate the builder", () => {
  const first = record(0, 0),
    next = record(3, 4, 1);
  const builder = new QuadraticSourceBuilder(first, { ...config, fadeScalar54: { length: 10 } });
  builder.append(next, 1);
  assert.equal(next.scalars[4], 1);
  const snapshot = builder.snapshot();
  // Attempt a runtime mutation as an untyped caller could, despite the readonly point type.
  Object.assign(snapshot.nodes[0].point, { x: 999 });
  snapshot.nodes[1].scalars[4] = 999;
  assert.equal(builder.snapshot().nodes[0].point.x, 0);
  assert.equal(builder.snapshot().nodes[1].scalars[4], 0.5);
});

test("finite input, explicit work limits and terminal state fail rather than fabricating source nodes", () => {
  assert.throws(() => new QuadraticSourceBuilder(record(NaN, 0), config), /finite/);
  const builder = new QuadraticSourceBuilder(record(0, 0), config);
  builder.finish(record(0, 0, 1));
  assert.throws(() => builder.append(record(1, 0, 2), 1), /finished/);
  const bounded = new QuadraticSourceBuilder(record(0, 0), config, 1);
  assert.throws(() => bounded.append(record(1, 0, 1), 1), /work limit/);
});

test("every source-node field and preceding quadratic control matches standalone native instructions", () => {
  const native = JSON.parse(
    readFileSync(
      new URL("./spikes/post-source/evidence/native-geometry.json", import.meta.url),
      "utf8",
    ),
  ) as {
    cases: { mode: string; name: string; inputBits: string[]; outputBits: string[] }[];
  };
  const decode = (hex: string): number => Buffer.from(hex, "hex").readDoubleBE();
  const bits = (value: number, width = 8): string => {
    const bytes = Buffer.alloc(width);
    if (width === 8) bytes.writeDoubleBE(value);
    else bytes.writeFloatBE(value);
    return bytes.toString("hex");
  };
  const modes: Record<string, SourceConstruction> = {
    I: "import",
    M: "midpoint",
    T: "terminal",
    C: "corner",
    A: "after-corner",
  };
  for (const vector of native.cases) {
    const values = vector.inputBits.map(decode);
    const previous: SourceRecord = {
      point: { x: values[0], y: values[1] },
      scalars: values.slice(2, 9) as PostScalars,
      flags: values[20],
      sourceIndex: 0,
    };
    const current: SourceRecord = {
      point: { x: values[9], y: values[10] },
      scalars: values.slice(11, 18) as PostScalars,
      flags: values[21],
      sourceIndex: 1,
    };
    const result = constructQuadraticSourceNode(modes[vector.mode], previous, current, {
      x: values[18],
      y: values[19],
    });
    const control = result.previousControl ?? { x: -123, y: 456 };
    const actual = [
      bits(result.node.point.x),
      bits(result.node.point.y),
      ...result.node.scalars.map((value) => bits(value, 4)),
      result.node.flags.toString(16).padStart(8, "0"),
      bits(control.x),
      bits(control.y),
    ];
    assert.deepEqual(actual, vector.outputBits, `${vector.mode}: ${vector.name}`);
  }
});
