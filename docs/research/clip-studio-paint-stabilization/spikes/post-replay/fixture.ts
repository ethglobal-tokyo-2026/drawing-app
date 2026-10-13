import type { BoundaryRecord, CaptureHeader, CaptureRecord, PathSnapshot } from "./schema.ts";

/** Synthetic fixtures only. These bytes were never recorded from CSP. */
export function syntheticCapture(identity = false): CaptureRecord[] {
  const header: CaptureHeader = {
    kind: "header",
    schema: "csp-post-capture/v1",
    imageSha256: "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd",
    imageBase: "0x100000000",
    architecture: "arm64",
    provenance: "synthetic",
    device: "unknown",
    metadata: { description: "Hand-constructed path snapshots; no CSP execution." },
  };
  const before = path(
    0x1000,
    [
      [0, 0],
      [1, 1],
      [2, 0],
    ],
    0x20,
  );
  const after = identity
    ? path(
        0x2000,
        [
          [0, 0],
          [1, 1],
          [2, 0],
        ],
        0x20,
      )
    : path(
        0x2000,
        [
          [0, 0],
          [2, 0],
        ],
        0x80,
      );
  const common = {
    kind: "boundary" as const,
    callId: "synthetic-1",
    threadId: "7",
    holder: "0x8000",
    configurationFingerprint: "hand-built-settings-a",
    arguments: {
      k: 10,
      flag480: 0 as const,
      closedMode: 0,
      selector482: 0 as const,
      toleranceBits: "4004000000000000",
      lengthScaleBits: "3fd0000000000000",
    },
  };
  return [
    header,
    { ...common, sequence: 1, phase: "entry", boundary: "0x1028ed064", path: before },
    {
      ...common,
      arguments: { ...common.arguments },
      sequence: 2,
      phase: "return",
      boundary: "0x1028ed144",
      path: after,
      returnedPath: after.address,
    },
    {
      kind: "summary",
      captureComplete: true,
      stopReason: "synthetic fixture complete",
      entries: 1,
      pairs: 1,
      cleanupErrors: [],
      detachRequestSucceeded: true,
      detachedStateObserved: true,
    },
  ];
}

function path(address: number, positions: number[][], type: number): PathSnapshot {
  const header = Buffer.alloc(0xa8);
  header.writeBigUInt64LE(0x104a53a78n, 0);
  const pointers = positions.map((_, i) => address + 0x100 + i * 0x100);
  header.writeUInt32LE(type, 0x20);
  header.writeBigUInt64LE(BigInt(pointers[0] ?? 0), 0x30);
  header.writeBigUInt64LE(BigInt(pointers.at(-1) ?? 0), 0x38);
  header.writeUInt32LE(positions.length, 0x40);
  header.writeBigUInt64LE(0x9000n, 0x48);
  const nodes = positions.map(([x, y], i) => {
    const bytes = Buffer.alloc(type === 0x20 ? 0x88 : 0x78);
    bytes.writeBigUInt64LE(type === 0x20 ? 0x104a527b0n : 0x104a53918n, 0);
    bytes.writeDoubleLE(x, 8);
    bytes.writeDoubleLE(y, 0x10);
    bytes.writeBigUInt64LE(BigInt(pointers[i + 1] ?? 0), 0x28);
    bytes.writeBigUInt64LE(BigInt(pointers[i - 1] ?? 0), 0x30);
    bytes.writeBigUInt64LE(BigInt(address), 0x38);
    bytes.writeUInt32LE(type, 0x40);
    bytes.writeFloatLE(0.5, 0x44);
    bytes.writeFloatLE(0.25, 0x4c);
    if (type === 0x20) {
      bytes.writeDoubleLE(x, 0x78);
      bytes.writeDoubleLE(y, 0x80);
    }
    return { address: "0x" + pointers[i].toString(16), bytesHex: bytes.toString("hex") };
  });
  return {
    address: "0x" + address.toString(16),
    headerHex: header.toString("hex"),
    nodes,
    complete: true,
    errors: [],
  };
}

export function fixtureText(records: unknown[] = syntheticCapture()): string {
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}

export function boundary(records: CaptureRecord[], phase: "entry" | "return"): BoundaryRecord {
  return records.find(
    (record) => record.kind === "boundary" && record.phase === phase,
  ) as BoundaryRecord;
}

export function replaceBytes(
  hex: string,
  offset: number,
  value: number | bigint,
  size: 4 | 8,
): string {
  const bytes = Buffer.from(hex, "hex");
  if (size === 8) bytes.writeBigUInt64LE(BigInt(value), offset);
  else bytes.writeUInt32LE(Number(value), offset);
  return bytes.toString("hex");
}
