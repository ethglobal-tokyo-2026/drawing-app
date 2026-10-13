import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzeText } from "./spikes/post-replay/analyze.ts";
import { fromBits } from "./spikes/post-replay/arithmetic.ts";
import {
  runOrdinaryPost,
  runOrdinaryPostBeforeEndpoints,
  type PostScalars,
} from "./post-pipeline.ts";

const capture = readFileSync(
  new URL(
    "./evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl",
    import.meta.url,
  ),
  "utf8",
);
const analyzed = analyzeText(capture);
assert.equal(analyzed.integrity.status, "valid");
const snapshots = analyzed.calls[0].decodedSnapshots!;
const entry = capture
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line))
  .find((row) => row.kind === "boundary" && row.phase === "entry");
const input = {
  nodes: snapshots.before.map((node) => {
    const data = Buffer.from(node.retainedScalarsHex, "hex");
    return {
      point: { x: node.x, y: node.y },
      flags: node.flags,
      scalars: Array.from({ length: 7 }, (_, index) => data.readFloatLE(index * 4)) as PostScalars,
      endpointDataHex: node.endpointDataHex,
      control: node.storedControls[0],
    };
  }),
  pathFlags: Buffer.from(entry.path.headerHex, "hex").readUInt32LE(0x20),
  ...entry.arguments,
  flag480: entry.arguments.flag480 !== 0,
  tolerance: fromBits(entry.arguments.toleranceBits, 8),
  lengthScale: fromBits(entry.arguments.lengthScaleBits, 8),
};
function f64(value: number) {
  const data = Buffer.alloc(8);
  data.writeDoubleBE(value);
  return data.toString("hex");
}
function floats(values: readonly number[]) {
  const data = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => data.writeFloatLE(value, index * 4));
  return data.toString("hex");
}

test("ordinary reconstructed path agrees with all saved native output positions, flags and retained fields", () => {
  const result = runOrdinaryPost(
    input,
    {
      pathParameter: Buffer.from(entry.path.headerHex, "hex").readDoubleLE(0x98),
      evaluator: "unknown",
    },
    { deadlineMilliseconds: 180000 },
  );
  assert.equal(result.outputPathFlags, 0x2081);
  assert.deepEqual(
    result.nodes.map((node) => ({
      x: f64(node.point.x),
      y: f64(node.point.y),
      flags: node.flags,
      retained: floats(node.scalars),
      endpoint: node.endpointDataHex,
    })),
    snapshots.after.map((node) => ({
      x: f64(node.x),
      y: f64(node.y),
      flags: node.flags,
      retained: node.retainedScalarsHex,
      endpoint: node.endpointDataHex,
    })),
  );
  assert.equal(
    result.nodes.flatMap((node) => node.sourceIndices).length,
    result.sourceNodes.length,
  );
});

test("unsupported source flags and alternate paths fail explicitly", () => {
  assert.throws(() => runOrdinaryPostBeforeEndpoints({ ...input, selector482: 1 }), /ordinary/);
  assert.throws(
    () =>
      runOrdinaryPostBeforeEndpoints({
        ...input,
        nodes: [{ ...input.nodes[0], flags: 1 }, ...input.nodes.slice(1)],
      }),
    /flags/,
  );
});

test("ordinary straight input removes interior nodes, preserves scalar values and leaves input untouched", () => {
  const straight = {
    ...input,
    lengthScale: 1,
    tolerance: 100,
    nodes: Array.from({ length: 5 }, (_, index) => ({
      point: { x: index, y: 0 },
      control: { x: index + 0.5, y: 0 },
      flags: 0,
      scalars: [1, 0.5, Math.fround(index / 10), 0, 0.25, 0.75, 1] as PostScalars,
      endpointDataHex: "112233445566778899aabbcc",
    })),
  };
  const untouched = structuredClone(straight);
  const result = runOrdinaryPost(straight, { pathParameter: 2.5, evaluator: "unknown" });
  assert.deepEqual(
    result.nodes.map((node) => node.point),
    [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ],
  );
  assert.deepEqual(
    result.nodes.map((node) => node.scalars),
    [straight.nodes[0].scalars, straight.nodes[4].scalars],
  );
  assert.deepEqual(
    result.nodes.map((node) => node.sourceIndices),
    [[0, 1, 2, 3], [4]],
  );
  assert.ok(result.nodes.every((node) => node.endpointDataHex === "000000000000000000000000"));
  assert.ok(
    result.sourceNodes.every((node) => node.endpointDataHex === "112233445566778899aabbcc"),
  );
  assert.deepEqual(straight, untouched);
});

test("node and source-comparison work limits throw rather than returning a partial path", () => {
  assert.throws(
    () => runOrdinaryPostBeforeEndpoints(input, { maximumNodes: 2 }),
    /node work limit/,
  );
  const short = { ...input, nodes: input.nodes.slice(0, 3), lengthScale: 100000 };
  assert.throws(
    () => runOrdinaryPostBeforeEndpoints(short, { maximumSourceChecks: 1 }),
    /source comparison work limit/,
  );
});
