/** Pure benchmark entry shared by Node and bundled browser runs. */
import {
  runOrdinaryPost,
  type OrdinaryPostInput,
  type PostEndpointContext,
} from "../../post-pipeline.ts";

export interface BenchmarkCase {
  name: string;
  input: OrdinaryPostInput;
  endpoint: PostEndpointContext;
}

/** Synthetic geometry is explicitly distinct from a paired native capture. */
export function syntheticCases(base: OrdinaryPostInput): BenchmarkCase[] {
  return [32, 99, 240].map((count) => ({
    name: `synthetic-wave-${count}`,
    input: {
      ...base,
      lengthScale: 1,
      tolerance: 1,
      nodes: Array.from({ length: count }, (_, index) => {
        const x = index * 4,
          y = 80 * Math.sin(index * 0.08);
        const nextY = 80 * Math.sin((index + 1) * 0.08);
        return {
          point: { x, y },
          control: { x: x + 2, y: (y + nextY) * 0.5 },
          flags: 0,
          scalars: [1, 0.5, 1, 0, 0, 0, 1] as [
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ],
          endpointDataHex: "000000000000000000000000",
        };
      }),
    },
    endpoint: { pathParameter: 2.5, evaluator: null },
  }));
}

export function benchmark(cases: readonly BenchmarkCase[], repeats = 3) {
  const started = performance.now();
  const rows = [];
  for (const item of cases) {
    for (let repeat = 0; repeat < repeats; repeat++) {
      if (performance.now() - started > 30000) throw new Error("Benchmark exceeded 30 seconds");
      const start = performance.now();
      const result = runOrdinaryPost(item.input, item.endpoint, { deadlineMilliseconds: 5000 });
      const milliseconds = performance.now() - start;
      // Values cross the browser bridge without dropping signed zero or float bits.
      const bytes = new DataView(new ArrayBuffer(8));
      const bits = (value: number) => {
        bytes.setFloat64(0, value);
        return bytes.getBigUint64(0).toString(16).padStart(16, "0");
      };
      rows.push({
        name: item.name,
        repeat,
        milliseconds,
        inputNodes: item.input.nodes.length,
        sourceNodes: result.sourceNodes.length,
        sourceChecks: result.sourceChecks,
        outputPathFlags: result.outputPathFlags,
        outputNodes: result.nodes.map((node) => ({
          point: [bits(node.point.x), bits(node.point.y)],
          flags: node.flags,
          scalars: node.scalars.map(bits),
          endpoint: node.endpointDataHex,
        })),
      });
    }
  }
  return { milliseconds: performance.now() - started, rows };
}
