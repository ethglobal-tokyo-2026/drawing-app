import { describe, expect, it } from "vitest";
import { createLiveQueue, type Ingestion } from "./queue";

const packet = (x: number, pressure: number, timestamp: bigint): Ingestion => ({
  x,
  y: 0,
  pressure,
  timestamp,
  phase: 2,
  catchUp: false,
  gating: true,
  interval: 0n,
  bypass: false,
});

describe("live stabilization queue", () => {
  it("averages pressure and position in the same growing fractional window", () => {
    const queue = createLiveQueue(4);
    expect(queue.ingest(packet(0, 1, 0n)).output).toEqual({ x: 0, y: 0, pressure: 1 });
    expect(queue.ingest(packet(10, 0.5, 5n)).output).toEqual({ x: 4, y: 0, pressure: 0.8 });
    // The native path multiplies the accumulated pressure by a rounded reciprocal.
    expect(queue.ingest(packet(20, 0.25, 10n)).output).toEqual({
      x: 10,
      y: 0,
      pressure: 0.5833333333333333,
    });
  });

  it("suppression still updates history and processed state while preserving caller phase", () => {
    const queue = createLiveQueue(0);
    queue.ingest(packet(0, 1, 0n));
    expect(queue.ingest({ ...packet(10, 0.5, 5n), interval: 10n })).toEqual({
      emitted: false,
      phase: 2,
    });
    expect(queue.data.getFloat64(0x90, true)).toBe(10);
    expect(queue.history).toHaveLength(2);
    expect(queue.ingest({ ...packet(20, 0.25, 10n), interval: 10n }).output).toEqual({
      x: 20,
      y: 0,
      pressure: 0.25,
    });
  });

  it("retains at most one thousand input samples without changing their order", () => {
    const queue = createLiveQueue(0);
    for (let index = 0; index < 1005; index++) queue.ingest(packet(index, 1, BigInt(index)));
    expect(queue.history).toHaveLength(1000);
    expect(queue.history[0].x).toBe(5);
    expect(queue.history.at(-1)?.x).toBe(1004);
    expect(queue.data.getBigUint64(0x30, true)).toBe(1000n);
  });
});
