/** Literal synthetic upstream observations; no native execution. */
import { joinedSourceFixture, sourceDetails } from "./source-fixture.ts";
import { boundary } from "../post-replay/fixture.ts";

const hex = (size: number, write: (data: Buffer) => void) => {
  const data = Buffer.alloc(size);
  write(data);
  return data.toString("hex");
};
const d = (value: number) => hex(8, (data) => data.writeDoubleLE(value));
export const int32Hex = (value: number) => hex(4, (data) => data.writeInt32LE(value));
export const timestampHex = (value: bigint) => hex(8, (data) => data.writeBigInt64LE(value));

/** Literal ordinary source inputs/outputs, not produced by the implementation under test. */
export function upstreamFixture(timeMode = false, reuseFinish = false) {
  const rows = joinedSourceFixture();
  for (const [index, operation] of ["begin", "append", "finish"].entries()) {
    const details = sourceDetails(rows, operation);
    const [x, y] = [
      [2, 3],
      [5, 7],
      [8, 11],
    ][index];
    const movementValue =
      index === 0 ? 0 : timeMode ? (index === 1 || reuseFinish ? 0.15625 : 0.3125) : 0.05;
    const timestamp = BigInt(100 + index * (timeMode ? 4 : 1));
    details.recordHex = hex(0x58, (data) => {
      data.writeDoubleLE(x + 1, 0);
      data.writeDoubleLE(y - 1, 8);
      [0.5, 1, movementValue, 0, 1, 1, 1].forEach((value, field) =>
        data.writeDoubleLE(value, 0x10 + field * 8),
      );
      data.writeUInt32LE(7, 0x54);
    });
    if (operation === "begin") {
      const begin = Buffer.from(String(details.beginHex), "hex");
      Buffer.from(String(details.recordHex), "hex").copy(begin, 0x50);
      details.beginHex = begin.toString("hex");
    }
    const count = timeMode ? (index === 2 && reuseFinish ? 1 : index) : 0;
    const timestamps = timeMode ? [100n, 104n, 108n].slice(0, count + 1) : [];
    const upstream: Record<string, unknown> = {
      kind: "brush_event_constructor_inputs",
      complete: true,
      errors: [],
      brush: "0x6000",
      event: "0x7000",
      reflectionGettersCalled: false,
      brushFields: {
        "0x128": hex(8, (data) => {
          data.writeInt32LE(1);
          data.writeInt32LE(-1, 4);
        }),
        "0x148": "0000000000000000",
        "0x190": hex(8, (data) => data.writeInt32LE(index, 4)),
        "0x1a0": int32Hex(0),
      },
      eventFields: {
        "0x10": "00".repeat(16),
        "0x80": hex(16, (data) => {
          data.writeDoubleLE(x);
          data.writeDoubleLE(y, 8);
        }),
        "0xa0": d(0.5),
        "0xa8": hex(12, (data) => {
          data.writeInt32LE(45);
          data.writeInt32LE(90, 4);
          data.writeInt32LE(10, 8);
        }),
        "0xb8": int32Hex(timeMode ? 2 : 1),
        "0xc0": hex(8, (data) => data.writeInt32LE(7)),
        "0xd0": timestampHex(timestamp),
      },
      startupPositionBits: hex(8, (data) => data.writeDoubleBE(index)),
      constructorPointHex: hex(16, (data) => {
        data.writeDoubleLE(x);
        data.writeDoubleLE(y, 8);
      }),
    };
    if (operation === "begin")
      Object.assign(upstream, {
        movementAddress: "0xa000",
        movementStage: "before_initialization",
        movementInitializer: {
          enabledHex: int32Hex(timeMode ? 1 : 0),
          windowHex: int32Hex(8),
          mBits: "3ff0000000000000",
          cBits: "3ff0000000000000",
          dBits: "3ff0000000000000",
        },
      });
    else
      Object.assign(upstream, {
        movementStage: "after_update",
        ...(operation === "finish" ? { freshRecord: 1 } : {}),
        movement: {
          address: "0xa000",
          complete: true,
          errors: [],
          timestamps: timestamps.map(timestampHex),
          bytesHex: hex(0x90, (data) => {
            data.writeBigUInt64LE(0x104a5a2f0n);
            data.writeUInt32LE(timeMode ? 1 : 0, 8);
            data.writeDoubleLE(timeMode ? 0.125 : 0.01, 0x10);
            if (timestamps.length) {
              data.writeBigUInt64LE(0xb000n, 0x20);
              data.writeBigUInt64LE(0xb008n, 0x28);
            }
            data.writeBigUInt64LE(BigInt(timestamps.length), 0x40);
            data.writeUInt32LE(count, 0x48);
            data.writeUInt32LE(timeMode ? 4 : 2, 0x4c);
            data.writeBigInt64LE(100n, 0x50);
            data.writeUInt32LE(operation === "finish" && reuseFinish ? 1 : 0, 0x60);
            data.writeDoubleLE(x + 1, 0x68);
            data.writeDoubleLE(y - 1, 0x70);
            data.writeDoubleLE(index === 1 ? 3 : 6, 0x78);
            data.writeDoubleLE(index === 1 ? 2 : 6, 0x80);
            data.writeDoubleLE(movementValue, 0x88);
          }),
        },
      });
    details.upstream = upstream;
  }
  return rows;
}

/** Literal straight-path construction and correction expectations for the full join. */
export function joinedUpstreamFixture() {
  const rows = upstreamFixture();
  for (const phase of ["entry", "return"] as const) {
    const points =
      phase === "entry"
        ? [
            [3, 2],
            [4.5, 4],
            [9, 10],
          ]
        : [
            [3, 2],
            [9, 10],
          ];
    const movements = phase === "entry" ? [0, 0.025, 0.05] : [0, 0.05];
    const controls = [
      [3, 2],
      [6, 6],
      [0, 0],
    ];
    boundary(rows, phase).path.nodes.forEach((node, index) => {
      const raw = Buffer.from(node.bytesHex, "hex");
      raw.writeDoubleLE(points[index][0], 8);
      raw.writeDoubleLE(points[index][1], 0x10);
      [0.5, 1, movements[index], 0, 1, 1, 1].forEach((value, field) =>
        raw.writeFloatLE(value, 0x44 + field * 4),
      );
      if (phase === "entry") {
        raw.writeDoubleLE(controls[index][0], 0x78);
        raw.writeDoubleLE(controls[index][1], 0x80);
      }
      node.bytesHex = raw.toString("hex");
    });
  }
  return rows;
}
