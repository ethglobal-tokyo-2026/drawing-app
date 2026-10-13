/** Hand-built source/post fixture. No native execution or device observation. */
import { boundary, syntheticCapture } from "../post-replay/fixture.ts";
import type { CaptureDiagnostic, CaptureRecord } from "../post-replay/schema.ts";

export function joinedSourceFixture(): CaptureRecord[] {
  const records = syntheticCapture();
  for (const phase of ["entry", "return"] as const) {
    const row = boundary(records, phase);
    row.arguments.k = 1;
    row.arguments.toleranceBits = "3fb999999999999a";
    row.arguments.lengthScaleBits = "3ff0000000000000";
    const header = Buffer.from(row.path.headerHex, "hex");
    header.writeUInt32LE(phase === "entry" ? 0x2021 : 0x2081, 0x20);
    row.path.headerHex = header.toString("hex");
    row.path.nodes.forEach((node, index) => {
      const raw = Buffer.from(node.bytesHex, "hex");
      raw.writeDoubleLE(0, 0x10);
      raw.writeUInt32LE(0, 0x40);
      if (phase === "entry") {
        raw.writeDoubleLE(index === 1 ? 2 : 0, 0x78);
        raw.writeDoubleLE(0, 0x80);
      }
      node.bytesHex = raw.toString("hex");
    });
  }
  const source = ["begin", "append", "finish"].map((operation, index): CaptureDiagnostic => {
    const record = Buffer.alloc(0x58);
    record.writeDoubleLE(index === 0 ? 0 : 2, 0);
    record.writeDoubleLE(0.5, 0x10);
    record.writeDoubleLE(0.25, 0x20);
    const state = Buffer.alloc(0x44);
    state.writeDoubleLE(0.05, 0x18);
    const details: Record<string, unknown> = {
      sourceSequence: index + 1,
      threadId: "7",
      holder: "0x8000",
      boundary: ["0x1028ebd40", "0x1028ec548", "0x1028ec8d0"][index],
      callerReturn: ["0x10288ad38", "0x10288e2d8", "0x102891848"][index],
      recordAddress: "0x7000",
      recordHex: record.toString("hex"),
      complete: true,
      errors: [],
      upstream: { complete: false, errors: ["Synthetic fixture has no upstream observation."] },
    };
    if (index === 0) {
      const begin = Buffer.alloc(0x108);
      record.copy(begin, 0x50);
      begin.writeDoubleLE(1, 0xd0);
      details.beginHex = begin.toString("hex");
    } else
      details.holderBefore = {
        pathAddress: "0x1000",
        stateHex: state.toString("hex"),
        complete: true,
        errors: [],
      };
    if (index === 1) details.scaleBits = "3ff0000000000000";
    if (index === 2) details.renderFlag = 1;
    return { kind: "diagnostic", event: `source_${operation}`, details };
  });
  records.splice(1, 0, ...source);
  return records;
}

export function sourceDetails(records: CaptureRecord[], operation: string) {
  const row = records.find(
    (row) => row.kind === "diagnostic" && row.event === `source_${operation}`,
  );
  if (!row || row.kind !== "diagnostic" || !row.details || typeof row.details !== "object")
    throw new Error(`Missing fixture source ${operation}`);
  return row.details as Record<string, unknown>;
}
