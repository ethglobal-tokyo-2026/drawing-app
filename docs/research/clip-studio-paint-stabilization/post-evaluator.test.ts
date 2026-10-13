import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  createPostEndpointEvaluator,
  createPostEvaluatorConstructorConfig,
  evaluatePostEndpoint,
  evaluatePostResponseCurve,
  type PostEvaluatorConfig,
} from "./post-evaluator.ts";
import { processPostEndpoints } from "./post-endpoints.ts";
import type { PostScalars } from "./post-pipeline.ts";
import type { SplineNode } from "./post-spline-context.ts";

const node = (scale = 1, scalar = 0.5, flags = 0) => ({
  flags,
  scalars: [scalar, 0.25, 0.75, 0, 0.5, scale, 1] as PostScalars,
});

test("constructor configuration applies mode-two reduction after the lower clamp", () => {
  const config = createPostEvaluatorConstructorConfig();
  assert.equal(evaluatePostEndpoint(node(), 2.5, config), 1.875);
  assert.equal(evaluatePostEndpoint(node(0), 2.5, config), 0.75);
  assert.equal(evaluatePostEndpoint(node(2), 2.5, config), 4.375);
});

test("response uses the retained scalar and node bit12 bypasses only the main response", () => {
  const config = createPostEvaluatorConstructorConfig();
  config.adjustmentMode = 0;
  config.main.flags = 16;
  config.main.curves[0] = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
  assert.equal(evaluatePostEndpoint(node(1, 0.25), 8, config), 2);
  assert.equal(evaluatePostEndpoint(node(1, 0.25, 0x1000), 8, config), 8);
  config.secondaryEnabled = true;
  config.secondaryBase = 2;
  config.secondary.flags = 1;
  assert.equal(evaluatePostEndpoint(node(1, 0.25, 0x1000), 8, config), 10);
});

test("response curves preserve extrapolation and quadratic inverse selection", () => {
  assert.equal(evaluatePostResponseCurve([], 0.5), 0);
  assert.equal(evaluatePostResponseCurve([{ x: 0, y: 99 }], 0.5), 0);
  const linear = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
  assert.equal(evaluatePostResponseCurve(linear, -1), -1);
  assert.equal(evaluatePostResponseCurve(linear, 2), 2);
  assert.equal(
    evaluatePostResponseCurve(
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 1 },
        { x: 1, y: 0 },
      ],
      0.5,
    ),
    0.5,
  );
});

test("configured short endpoints retain one node for coincident taps", () => {
  const make = (x: number): SplineNode & { scalars: PostScalars } => ({
    ...node(),
    point: { x, y: 0 },
    previous: null,
    next: null,
  });
  const nodes = [make(0), make(0), make(0)];
  nodes.forEach((n, i) => {
    n.previous = nodes[i - 1] ?? null;
    n.next = nodes[i + 1] ?? null;
  });
  const report = processPostEndpoints(
    nodes,
    1,
    2.5,
    createPostEndpointEvaluator(createPostEvaluatorConstructorConfig()),
  );
  assert.equal(report.nodes.length, 1);
  assert.equal(report.nodes[0], nodes[2]);
  assert.deepEqual(
    report.passes.map((p) => p.removed),
    [2, 0],
  );
});

test("retained scale variation changes short-endpoint decisions even at zero amount", () => {
  const make = (scale: number): SplineNode & { scalars: PostScalars } => ({
    ...node(scale),
    point: { x: 0, y: 0 },
    previous: null,
    next: null,
  });
  for (const [scale, expectedCount] of [
    [1, 2],
    [2, 1],
  ]) {
    const nodes = [make(1), make(scale)];
    nodes[1].point = { x: 0.25, y: 0 };
    nodes[0].next = nodes[1];
    nodes[1].previous = nodes[0];
    const report = processPostEndpoints(
      nodes,
      0,
      2.5,
      createPostEndpointEvaluator(createPostEvaluatorConstructorConfig()),
    );
    assert.equal(report.nodes.length, expectedCount);
  }
});

test("unsupported decoded controls and unretained scalar doubles fail explicitly", () => {
  assert.throws(
    () =>
      evaluatePostResponseCurve(
        [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
        0.5,
      ),
    /nondecreasing/,
  );
  assert.throws(
    () =>
      evaluatePostResponseCurve(
        Array.from({ length: 17 }, (_, x) => ({ x, y: x })),
        0.5,
      ),
    /16/,
  );
  assert.throws(
    () => evaluatePostEndpoint(node(0.1), 2.5, createPostEvaluatorConstructorConfig()),
    /binary32/,
  );
});

test("native evaluator and curve outputs match all retained instruction oracle cases", () => {
  const report = JSON.parse(
    readFileSync(
      new URL("./spikes/post-evaluator/evidence/native-vectors.json", import.meta.url),
      "utf8",
    ),
  );
  const bits = (x: number) => {
    const b = Buffer.alloc(8);
    b.writeDoubleBE(x);
    return b.toString("hex");
  };
  assert.ok(report.cases.length >= 300);
  for (const c of report.cases) {
    const actual =
      c.mode === "C"
        ? evaluatePostResponseCurve(c.curve, c.parameter)
        : evaluatePostEndpoint(c.node, c.parameter, c.config as PostEvaluatorConfig);
    assert.equal(bits(actual), c.outputBits, c.name);
  }
});
