import assert from "node:assert/strict";
import test from "node:test";
import { processPostEndpoints } from "./post-endpoints.ts";
import type { SplineNode } from "./post-spline-context.ts";

function chain(xs: number[]): SplineNode[] {
  const nodes: SplineNode[] = xs.map((x) => ({
    point: { x, y: 0 },
    flags: 0,
    previous: null,
    next: null,
  }));
  nodes.forEach((node, index) => {
    node.previous = nodes[index - 1] ?? null;
    node.next = nodes[index + 1] ?? null;
  });
  return nodes;
}

test("unknown evaluator is unnecessary for geometry when both first segments exceed travel limit", () => {
  const nodes = chain([0, 20, 40]);
  const result = processPostEndpoints(nodes, 1, 2.5, "unknown");
  assert.deepEqual(result.nodes, nodes);
  assert.equal(result.passes.length, 2);
  assert.ok(
    result.passes.every((pass) => pass.reason === "travel-limit" && pass.firstSegmentLength! > 2.5),
  );
  assert.ok(result.passes.every((pass) => pass.evaluatorGeometryIndependent));
});

test("unknown configuration fails before mutation when geometry needs its result", () => {
  const nodes = chain([0, 0.01, 0.02]);
  assert.throws(() => processPostEndpoints(nodes, 1, 2.5, "unknown"), /endpoint evaluator/);
  assert.equal(nodes[0].next, nodes[1]);
  assert.equal(nodes[1].next, nodes[2]);
});

test("travel-limit equality does not justify ignoring an unknown evaluator", () => {
  assert.throws(() => processPostEndpoints(chain([0, 2]), 1, 2, "unknown"), /endpoint evaluator/);
});

test("tiny spans are removed head first with the absent evaluator's native value one", () => {
  const nodes = chain([0, 0.01, 0.02]);
  const result = processPostEndpoints(nodes, 1, 2.5, null);
  assert.deepEqual(
    result.nodes.map((node) => node.point.x),
    [0.02],
  );
  assert.equal(result.nodes[0].previous, null);
  assert.equal(result.nodes[0].next, null);
  assert.deepEqual(
    result.passes.map((pass) => pass.removed),
    [2, 0],
  );
});

test("zero amount retains short segments when evaluator values are constant", () => {
  const nodes = chain([0, 0.01, 0.02]);
  const result = processPostEndpoints(nodes, 0, 2.5, null);
  assert.equal(result.nodes.length, 3);
  assert.deepEqual(
    result.passes.map((pass) => pass.removed),
    [0, 0],
  );
});

test("after a kept span, a later short span can be removed beyond cumulative 0.5", () => {
  const nodes = chain([0, 0.75, 1.5]);
  const result = processPostEndpoints(nodes, 1, 2.5, null);
  assert.deepEqual(
    result.nodes.map((node) => node.point.x),
    [0, 1.5],
  );
  assert.equal(result.passes[0].removed, 1);
});

test("a next-node corner permits deletion beyond cumulative 0.5", () => {
  const nodes = chain([0, 0.75]);
  nodes[1].flags = 1;
  const result = processPostEndpoints(nodes, 1, 2.5, null);
  assert.deepEqual(
    result.nodes.map((node) => node.point.x),
    [0.75],
  );
});

test("configured evaluator receives native parameter and clamps finite values below one", () => {
  const seen: number[] = [];
  const result = processPostEndpoints(chain([0, 0.01]), 1, 0.5, (_node, parameter) => {
    seen.push(parameter);
    return -4;
  });
  assert.deepEqual(
    result.nodes.map((node) => node.point.x),
    [0.01],
  );
  assert.ok(seen.length >= 2);
  assert.ok(seen.every((value) => value === 0.5));
});
