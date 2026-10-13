/** Offline ordinary brush constructor/movement replay from independent saved inputs. */
import { createHash } from "node:crypto";
import {
  createPostInputRecord,
  PostMovement,
  type PostInputPacket,
  type PostMovementConfig,
} from "../../post-input.ts";
import { decodePostCapture } from "../post-pipeline/replay.ts";

type ObjectValue = Record<string, unknown>;
type Difference = { path: string; expected: unknown; actual: unknown };
type Stage = {
  status: "match" | "mismatch" | "incomplete";
  compared: number;
  differences: Difference[];
};
const PLATFORM_PROOF = [
  ["0x102194e64", 4, "76944184d89426b3385e765455755586150b69c1df1ca6c7280a8b85bec041db"],
  ["0x102072aa4", 8, "0becf359e148792c5ed24ca79a91209e5f15e0f015d2a0b9f4d69c2e82d59f3a"],
] as const;

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown, name: string): ObjectValue {
  ensure(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${name} is missing`,
  );
  return value as ObjectValue;
}
function complete(value: ObjectValue, name: string) {
  ensure(
    value.complete === true && Array.isArray(value.errors) && value.errors.length === 0,
    `${name} is incomplete: ${JSON.stringify(value.errors)}`,
  );
}
function raw(value: unknown, size: number, name: string) {
  ensure(
    typeof value === "string" && new RegExp(`^[0-9a-fA-F]{${size * 2}}$`).test(value),
    `${name} requires ${size} raw bytes`,
  );
  return Buffer.from(value, "hex");
}
function pointer(value: unknown, name: string) {
  ensure(
    typeof value === "string" && /^0x[0-9a-fA-F]{1,16}$/.test(value),
    `${name} is not a pointer`,
  );
  const address = BigInt(value);
  ensure(address > 0n && address % 8n === 0n, `${name} is null or unaligned`);
  return address;
}
function double(bytes: Buffer, offset: number, name: string) {
  const value = bytes.readDoubleLE(offset);
  ensure(Number.isFinite(value), `${name} must be finite`);
  return value;
}
function bits(value: number) {
  const data = Buffer.alloc(8);
  data.writeDoubleBE(value);
  return data.toString("hex");
}
function fromBits(value: unknown, name: string) {
  const data = raw(value, 8, name);
  const number = data.readDoubleBE();
  ensure(Number.isFinite(number), `${name} must be finite`);
  return number;
}
function compare(stage: Stage, path: string, expected: unknown, actual: unknown) {
  if (!Object.is(expected, actual)) stage.differences.push({ path, expected, actual });
}
function movementSnapshot(value: unknown, address: bigint, imageBase: bigint) {
  const snapshot = object(value, "Movement snapshot");
  complete(snapshot, "Movement snapshot");
  ensure(pointer(snapshot.address, "Movement address") === address, "Movement identity changed");
  const bytes = raw(snapshot.bytesHex, 0x90, "Movement object");
  ensure(bytes.readBigUInt64LE(0) === imageBase + 0x4a5a2f0n, "Movement vtable is unsupported");
  ensure(
    Array.isArray(snapshot.timestamps) && snapshot.timestamps.length <= 256,
    "Movement timestamps are missing or exceed the capture bound",
  );
  const timestamps = snapshot.timestamps.map((entry, index) =>
    raw(entry, 8, `Timestamp ${index}`).readBigInt64LE(),
  );
  ensure(
    bytes.readBigUInt64LE(0x40) === BigInt(timestamps.length),
    "Movement timestamp count is inconsistent",
  );
  const mapBegin = bytes.readBigUInt64LE(0x20),
    mapEnd = bytes.readBigUInt64LE(0x28);
  const first = bytes.readBigUInt64LE(0x38);
  ensure(
    mapBegin <= mapEnd && (mapEnd - mapBegin) % 8n === 0n,
    "Movement timestamp map is invalid",
  );
  if (timestamps.length) {
    const last = first + BigInt(timestamps.length) - 1n;
    ensure(
      mapBegin !== 0n && last < 1n << 64n && mapBegin + 8n * ((last >> 9n) + 1n) <= mapEnd,
      "Movement timestamps extend outside the active map",
    );
  }
  return { bytes, timestamps };
}
function compareMovement(
  stage: Stage,
  index: number,
  observed: ReturnType<typeof movementSnapshot>,
  predicted: ReturnType<PostMovement["snapshot"]>,
) {
  const base = `records[${index}].movement`,
    bytes = observed.bytes;
  for (const [name, offset, value] of [
    ["timeMode", 8, Number(predicted.timeMode)],
    ["count", 0x48, predicted.count],
    ["limit", 0x4c, predicted.limit],
    ["shortInterval", 0x58, Number(predicted.shortInterval)],
    ["startupRemaining", 0x5c, predicted.startupRemaining],
  ] as const)
    compare(stage, `${base}.${name}`, bytes.readInt32LE(offset), value);
  for (const [name, offset, value] of [
    ["scale", 0x10, predicted.scale],
    ["current.x", 0x68, predicted.current.x],
    ["current.y", 0x70, predicted.current.y],
    ["previous.x", 0x78, predicted.previous.x],
    ["previous.y", 0x80, predicted.previous.y],
    ["result", 0x88, predicted.result],
  ] as const)
    compare(stage, `${base}.${name}`, bits(double(bytes, offset, name)), bits(value));
  compare(
    stage,
    `${base}.initialTimestamp`,
    bytes.readBigInt64LE(0x50).toString(),
    predicted.initialTimestamp.toString(),
  );
  compare(stage, `${base}.timestampCount`, observed.timestamps.length, predicted.timestamps.length);
  for (let at = 0; at < Math.max(observed.timestamps.length, predicted.timestamps.length); at++)
    compare(
      stage,
      `${base}.timestamps[${at}]`,
      observed.timestamps[at]?.toString(),
      predicted.timestamps[at]?.toString(),
    );
  stage.compared++;
}

export function replayJoinedUpstreamCapture(text: string) {
  const records: Stage = { status: "incomplete", compared: 0, differences: [] };
  const movement: Stage = { status: "incomplete", compared: 0, differences: [] };
  const errors: string[] = [];
  let provenance: "runtime" | "synthetic" | "unknown" = "unknown";
  let configuration: PostMovementConfig | undefined;
  try {
    const decoded = decodePostCapture(text);
    provenance = decoded.analyzed.provenance as "runtime" | "synthetic";
    const rows: ObjectValue[] = text
      .trim()
      .split("\n")
      .map((line) => object(JSON.parse(line), "Capture row"));
    const header = rows.find((row) => row.kind === "header")!;
    const imageBase = pointer(header.imageBase, "Image base");
    if (provenance === "runtime")
      for (const [address, size, sha256] of PLATFORM_PROOF)
        ensure(
          rows.some(
            (row) =>
              row.kind === "diagnostic" &&
              row.event === "instruction_verified" &&
              object(row.details, "Instruction proof").file_address === address &&
              object(row.details, "Instruction proof").size === size &&
              object(row.details, "Instruction proof").sha256 === sha256,
          ),
          `Loaded platform getter proof is missing at ${address}`,
        );
    const postIndex = rows.findIndex((row) => row.kind === "boundary" && row.phase === "entry");
    const source = rows.flatMap((row, position) => {
      if (
        row.kind !== "diagnostic" ||
        !["source_begin", "source_append", "source_finish"].includes(String(row.event))
      )
        return [];
      ensure(position < postIndex, "Upstream source records must precede correction");
      return [
        { operation: String(row.event).slice(7), details: object(row.details, "Source details") },
      ];
    });
    ensure(
      source.length >= 2 && source.length <= 256,
      "A complete bounded source group is required",
    );
    let brush: bigint | undefined,
      movementAddress: bigint | undefined,
      model: PostMovement | undefined;
    let previousCounter = -Infinity;
    for (const [index, { operation, details }] of source.entries()) {
      const expectedOperation =
        index === 0 ? "begin" : index === source.length - 1 ? "finish" : "append";
      ensure(
        operation === expectedOperation && details.sourceSequence === index + 1,
        "Source sequence is incomplete or out of order",
      );
      ensure(
        details.threadId === decoded.entry.threadId &&
          pointer(details.holder, "Source holder") === pointer(decoded.entry.holder, "Post holder"),
        "Source thread or holder changed",
      );
      complete(details, `Source ${index}`);
      if (provenance === "runtime")
        ensure(details.fpcr === "00000000", "Source FPCR zero must be observed");
      const caller = { begin: "0x10288ad38", append: "0x10288e2d8", finish: "0x102891848" }[
        expectedOperation
      ];
      const boundary = { begin: "0x1028ebd40", append: "0x1028ec548", finish: "0x1028ec8d0" }[
        expectedOperation
      ];
      ensure(
        details.callerReturn === caller && details.boundary === boundary,
        "Only primary direct source calls are supported; generated calls are incomplete",
      );
      const upstream = object(details.upstream, "Upstream inputs");
      complete(upstream, "Upstream inputs");
      ensure(upstream.kind === "brush_event_constructor_inputs", "Unexpected upstream input kind");
      const currentBrush = pointer(upstream.brush, "Brush address");
      ensure(brush === undefined || brush === currentBrush, "Brush identity changed");
      brush = currentBrush;
      pointer(upstream.event, "Brush event address");
      const brushFields = object(upstream.brushFields, "Brush fields"),
        eventFields = object(upstream.eventFields, "Event fields");
      const offsets = raw(brushFields["0x128"], 8, "Coordinate offsets");
      ensure(
        raw(brushFields["0x148"], 8, "Angle-source flags").equals(Buffer.alloc(8)) &&
          upstream.reflectionGettersCalled === false,
        "Reflection/angle-source getters are outside this ordinary input profile",
      );
      const startup = raw(brushFields["0x190"], 8, "Startup settings");
      const startupCounter = startup.readInt32LE(4);
      ensure(startupCounter >= previousCounter, "Startup counter decreased");
      previousCounter = startupCounter;
      ensure(
        bits(startupCounter) === String(upstream.startupPositionBits).toLowerCase(),
        "Startup position differs from the captured signed counter",
      );
      const position = raw(upstream.constructorPointHex, 16, "Constructor point");
      const orientation = raw(eventFields["0xa8"], 12, "Event orientation");
      const timestamp = raw(eventFields["0xd0"], 8, "Event timestamp").readBigInt64LE();
      const packet: PostInputPacket = {
        point: { x: double(position, 0, "Constructor x"), y: double(position, 8, "Constructor y") },
        pressure: double(raw(eventFields["0xa0"], 8, "Event pressure"), 0, "Event pressure"),
        bearingDegrees: orientation.readInt32LE(0),
        tiltDegrees: orientation.readInt32LE(4),
        rotationDegrees: orientation.readInt32LE(8),
        movement: 0,
        sourceIndex: index,
        startupPosition: startupCounter,
        startupLength: startup.readInt32LE(),
        offset: { x: offsets.readInt32LE(), y: offsets.readInt32LE(4) },
        angleSource: "none",
        reflect360: false,
        reflect180: false,
      };
      const predicted = createPostInputRecord(packet);
      if (operation === "begin") {
        ensure(
          upstream.movementStage === "before_initialization",
          "Initial movement boundary is missing",
        );
        movementAddress = pointer(upstream.movementAddress, "Initial movement address");
        const initial = object(upstream.movementInitializer, "Movement initializer");
        if (provenance === "runtime")
          ensure(initial.platformValue === 2, "Observed pinned platform value is missing");
        configuration = {
          enabled: raw(initial.enabledHex, 4, "Movement enabled").readInt32LE() !== 0,
          deviceType: raw(eventFields["0xb8"], 4, "Device type").readInt32LE(),
          window: raw(initial.windowHex, 4, "Movement window").readInt32LE(),
          platform: 2,
          magnificationFraction: fromBits(initial.mBits, "Magnification fraction"),
          coordinateFactor: fromBits(initial.cBits, "Coordinate factor"),
          documentRatio: fromBits(initial.dBits, "Document ratio"),
        };
        const timeMode =
          configuration.enabled && configuration.deviceType !== 1 && timestamp !== 0n;
        const base = timeMode
          ? 8
          : configuration.deviceType === 1 || configuration.deviceType === 4
            ? 100
            : 20;
        const product =
          (configuration.enabled
            ? configuration.coordinateFactor * configuration.documentRatio
            : 1) * base;
        const denominator =
          configuration.magnificationFraction > 1e-8
            ? product / configuration.magnificationFraction
            : product;
        if (!(denominator > 1e-8)) {
          const prior = object(
            upstream.movementBeforeInitialization,
            "Retained prior movement scale",
          );
          complete(prior, "Retained prior movement scale");
          ensure(
            pointer(prior.address, "Prior movement address") === movementAddress &&
              raw(prior.vtableHex, 8, "Prior movement vtable").readBigUInt64LE() ===
                imageBase + 0x4a5a2f0n &&
              bits(
                double(raw(prior.scaleHex, 8, "Prior movement scale"), 0, "Prior movement scale"),
              ) === bits(1),
            "Initializer retained prior scale is outside the fresh-scale replay profile",
          );
        }
        model = new PostMovement(configuration, predicted.point, timestamp);
      } else {
        ensure(model && movementAddress, "Movement initializer is missing");
        ensure(upstream.movementStage === "after_update", "Movement update observation is missing");
        if (operation === "finish")
          ensure(upstream.freshRecord === 1, "Reused finish constructor inputs are not captured");
        const observed = movementSnapshot(upstream.movement, movementAddress, imageBase);
        // +60 is an explicit update input, retained unchanged by 0x1028f25b0.
        predicted.scalars[2] = model.update(
          predicted.point,
          timestamp,
          observed.bytes.readUInt32LE(0x60) !== 0,
        );
        compareMovement(movement, index, observed, model.snapshot());
      }
      const expected = raw(details.recordHex, 0x58, "Observed constructed record");
      if (operation === "begin")
        ensure(
          raw(details.beginHex, 0x108, "Source begin input").subarray(0x50, 0xa8).equals(expected),
          "Constructed begin record differs from the embedded source input",
        );
      const actual = Buffer.alloc(0x58);
      actual.writeDoubleLE(predicted.point.x, 0);
      actual.writeDoubleLE(predicted.point.y, 8);
      predicted.scalars.forEach((value, field) => actual.writeDoubleLE(value, 0x10 + field * 8));
      actual.writeUInt32LE(predicted.flags, 0x50);
      actual.writeUInt32LE(
        raw(eventFields["0xc0"], 8, "Event record metadata").readUInt32LE(),
        0x54,
      );
      for (let offset = 0; offset < 0x58; offset += offset >= 0x50 ? 4 : 8) {
        const size = offset >= 0x50 ? 4 : 8;
        compare(
          records,
          `records[${index}].bytes+0x${offset.toString(16)}`,
          expected.subarray(offset, offset + size).toString("hex"),
          actual.subarray(offset, offset + size).toString("hex"),
        );
      }
      records.compared++;
    }
    records.status = records.differences.length ? "mismatch" : "match";
    movement.status = movement.differences.length ? "mismatch" : "match";
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return {
    schema: "csp-joined-upstream-replay/v1",
    inputSha256: createHash("sha256").update(text).digest("hex"),
    provenance,
    status: errors.length
      ? "incomplete"
      : records.status === "mismatch" || movement.status === "mismatch"
        ? "mismatch"
        : "match",
    records,
    movement,
    configuration,
    errors,
    scope:
      "Observed primary direct brush constructor inputs → constructed records and modeled movement state. Browser acquisition, event generation, reflection getters, generated/reused source calls, allocator addresses and rendered pixels are excluded.",
    wholeFeatureEquivalence: "not-established",
  };
}
