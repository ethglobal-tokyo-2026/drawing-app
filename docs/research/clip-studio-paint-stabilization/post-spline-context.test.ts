import assert from "node:assert/strict";
import test from "node:test";
import { buildSplineContext, sampleSplineNodes, type SplineNode } from "./post-spline-context.ts";

function chain(xs: readonly number[]): SplineNode[] {
  const nodes: SplineNode[] = xs.map((x) => ({
    point: { x, y: 0 },
    flags: 0,
    previous: null,
    next: null,
  }));
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].previous = nodes[i - 1] ?? null;
    nodes[i].next = nodes[i + 1] ?? null;
  }
  return nodes;
}
const xs = (points: ReturnType<typeof buildSplineContext>) =>
  points?.map((point) => point.x) ?? null;

test("ordinary context keeps two neighbors on each side in evaluator order", () => {
  const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4])), [-2, -1, 0, 1, 2, 3]);
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 19)), [-2, -1, 0, 1, 2, 3]);
});

test("mode 1 advances the endpoint while mode 2 and mode 3 skip their specified neighbors", () => {
  const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 1)), [-2, -1, 0, 2, 3, 4]);
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 2)), [-3, -2, 0, 1, 1, 3]);
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 3)), [-2, -1, 0, 1, 3, 4]);
});

test("ordinary corner checks collapse each affected side at the checked node", () => {
  for (const [index, expected] of [
    [2, [-1, -1, 0, 1, 2, 3]],
    [3, [0, 0, 0, 1, 2, 3]],
    [4, [-2, -1, 0, 1, 1, 1]],
    [5, [-2, -1, 0, 1, 2, 2]],
  ] as const) {
    const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
    nodes[index].flags = 1;
    assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4])), expected);
  }
});

test("only the corner flag low bit affects context", () => {
  const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
  for (const node of nodes) node.flags = 254;
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4])), [-2, -1, 0, 1, 2, 3]);
});

test("mode 2 ignores skipped previous and endpoint corners but checks its selected previous and next nodes", () => {
  for (const [index, expected] of [
    [1, [-2, -2, 0, 1, 1, 3]],
    [2, [-3, -2, 0, 1, 1, 3]],
    [3, [0, 0, 0, 1, 1, 3]],
    [4, [-3, -2, 0, 1, 1, 3]],
    [5, [-3, -2, 0, 1, 1, 1]],
  ] as const) {
    const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
    nodes[index].flags = 1;
    assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 2)), expected);
  }
});

test("mode 3 ignores the skipped next corner and checks its endpoint and selected next node", () => {
  for (const [index, expected] of [
    [4, [-2, -1, 0, 1, 1, 1]],
    [5, [-2, -1, 0, 1, 3, 4]],
    [6, [-2, -1, 0, 1, 3, 3]],
  ] as const) {
    const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
    nodes[index].flags = 1;
    assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 3)), expected);
  }
});

test("outer adjustment uses the adjusted inner neighbor and never changes source points", () => {
  const nodes = chain([-100, -20, 0, 2, 22, 102]);
  const context = buildSplineContext(nodes[2], nodes[3])!;
  assert.deepEqual(xs(context), [-35, -10, 0, 2, 12, 37]);
  assert.deepEqual(
    nodes.map((node) => node.point.x),
    [-100, -20, 0, 2, 22, 102],
  );
  assert.notStrictEqual(context[2], nodes[2].point);
  assert.equal(nodes[2].point.x, 0);
});

test("missing outer nodes duplicate already adjusted inner points", () => {
  const nodes = chain([-20, 0, 2, 22]);
  assert.deepEqual(xs(buildSplineContext(nodes[1], nodes[2])), [-10, -10, 0, 2, 12, 12]);
});

test("missing selected neighbors collapse both points to the endpoint in each mode", () => {
  for (const mode of [0, 2, 3]) {
    const nodes = chain([0, 1]);
    assert.deepEqual(xs(buildSplineContext(nodes[0], nodes[1], mode)), [0, 0, 0, 1, 1, 1]);
  }
  const nodes = chain([-1, 0, 1, 2]);
  assert.deepEqual(xs(buildSplineContext(nodes[1], nodes[2], 2)), [0, 0, 0, 1, 1, 1]);
  assert.deepEqual(xs(buildSplineContext(nodes[1], nodes[2], 3)), [-1, -1, 0, 1, 1, 1]);
});

test("mode 2 keeps E equal to D and limits the farther next point from that duplicate", () => {
  const nodes = chain([-3, -2, -1, 0, 1, 2, 50, 60]);
  assert.deepEqual(xs(buildSplineContext(nodes[3], nodes[4], 2)), [-3, -2, 0, 1, 1, 11]);
});

test("resolved closed-path links receive the same bounded traversal", () => {
  const nodes = chain([0, 1, 2]);
  nodes[0].previous = nodes[2];
  nodes[2].next = nodes[0];
  assert.deepEqual(xs(buildSplineContext(nodes[0], nodes[1])), [1, 2, 0, 1, 2, 0]);
});

test("mode 1 at the last endpoint returns one direct anchor copy without evaluator rounding", () => {
  const coordinate = 368.6172768546371;
  const nodes = chain([coordinate, 400]);
  assert.equal(buildSplineContext(nodes[0], nodes[1], 1), null);
  const output = sampleSplineNodes(nodes[0], nodes[1], 1, 100, -1, 2);
  assert.deepEqual(output, [{ x: coordinate, y: 0 }]);
  output[0].x = 123;
  assert.equal(nodes[0].point.x, coordinate);
});

test("ordinary dispatch retains the supplied parameter interval and direction", () => {
  const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
  const expected = [24.625 / 99, 37.03125 / 99, 0.5, 61.96875 / 99, 74.375 / 99];
  assert.deepEqual(
    sampleSplineNodes(nodes[3], nodes[4], 0, 100, 0.25, 0.75).map((p) => p.x),
    expected,
  );
  assert.deepEqual(
    sampleSplineNodes(nodes[3], nodes[4], 0, 100, 0.75, 0.25).map((p) => p.x),
    [...expected].reverse(),
  );
});

test("mode 2 and mode 3 force the full parameter range", () => {
  const nodes = chain([-3, -2, -1, 0, 1, 2, 3, 4]);
  assert.deepEqual(
    sampleSplineNodes(nodes[3], nodes[4], 2, 100, 0.25, 0.75).map((p) => p.x),
    [0, 38 / 99, 68 / 99, 88.75 / 99, 1],
  );
  assert.deepEqual(
    sampleSplineNodes(nodes[3], nodes[4], 3, 100, 0.25, 0.75).map((p) => p.x),
    [0, 21.25 / 99, 41 / 99, 65 / 99, 1],
  );
});
