/** Decode bounded endpoint snapshots, without substituting constructor configuration. */
import type {
  PostEvaluatorConfig,
  PostResponseConfig,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/post-correction/evaluator.ts";

export interface PostResponseCurveSnapshot {
  address: string;
  state: "null" | "present";
  headerHex: string;
  countHex: string;
  controlsHex: string;
  complete: boolean;
  errors: string[];
}
export interface PostResponseSnapshot {
  address: string;
  bytesHex: string;
  curves: [PostResponseCurveSnapshot, PostResponseCurveSnapshot, PostResponseCurveSnapshot] | null;
  complete: boolean;
  errors: string[];
}
export interface PostEvaluatorSnapshot {
  schema: "csp-post-evaluator/v1";
  address: string;
  imageBase: string;
  state: "null" | "present";
  /** Exactly 0x630 bytes, including the embedded main response. */
  prefixHex: string;
  main: PostResponseSnapshot | null;
  /** Separate embedded 0x58-byte object at evaluator +0x630. */
  secondary: PostResponseSnapshot | null;
  complete: boolean;
  errors: string[];
}

function require(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Endpoint evaluator snapshot: ${message}`);
}
function record(value: unknown, name: string): Record<string, unknown> {
  require(value !== null &&
    typeof value === "object" &&
    !Array.isArray(value), `${name} is missing or not an object`);
  return value as Record<string, unknown>;
}
function complete(value: Record<string, unknown>, name: string): void {
  require(value.complete === true, `${name} is incomplete`);
  require(Array.isArray(value.errors) &&
    value.errors.length === 0, `${name} contains errors or lacks an error list`);
}
function address(value: unknown, name: string): bigint {
  require(typeof value === "string" &&
    /^0x[0-9a-f]{1,16}$/.test(value), `${name} is not a hexadecimal address`);
  const result = BigInt(value);
  require(result % 8n === 0n, `${name} is not aligned`);
  return result;
}
function bytes(value: unknown, size: number, name: string): Buffer {
  require(typeof value === "string" &&
    value.length === size * 2 &&
    /^[0-9a-f]*$/.test(value), `${name} must contain exactly ${size} raw bytes`);
  return Buffer.from(value, "hex");
}
function finite(value: number, name: string): number {
  require(Number.isFinite(value), `${name} is nonfinite`);
  return value;
}

/**
 * Missing historical data throws; only an observed complete null pointer returns null.
 * The joined reader should pass its verified image base. Type/field validation here
 * does not authenticate a recording or turn synthetic memory into native evidence.
 */
export function decodePostEvaluatorSnapshot(
  value: unknown,
  expectedImageBase?: string,
): PostEvaluatorConfig | null {
  const snapshot = record(value, "evaluator");
  require(snapshot.schema === "csp-post-evaluator/v1", "unsupported schema");
  complete(snapshot, "evaluator");
  const at = address(snapshot.address, "evaluator address");
  const imageBase = address(snapshot.imageBase, "image base");
  require(imageBase !== 0n, "image base is null");
  if (expectedImageBase !== undefined)
    require(imageBase ===
      address(expectedImageBase, "expected image base"), "image base differs from capture header");
  const loaded = (fileAddress: bigint) => imageBase + fileAddress - 0x100000000n;
  if (snapshot.state === "null") {
    require(at === 0n &&
      snapshot.prefixHex === "" &&
      snapshot.main === null &&
      snapshot.secondary === null, "null evaluator carries contradictory bytes or objects");
    return null;
  }
  require(snapshot.state === "present" &&
    at !== 0n, "present evaluator has no valid address/state");
  require(at + 0x688n <= 0x10000000000000000n, "evaluator range overflows address space");
  const prefix = bytes(snapshot.prefixHex, 0x630, "evaluator prefix");
  require(prefix.readBigUInt64LE(0) === loaded(0x104a495f0n), "unsupported evaluator vtable");

  const curve = (
    value: unknown,
    pointer: bigint,
    name: string,
  ): readonly { x: number; y: number }[] | null => {
    const item = record(value, name);
    complete(item, name);
    require(address(item.address, `${name} address`) ===
      pointer, `${name} pointer differs from response bytes`);
    if (item.state === "null") {
      require(pointer === 0n &&
        item.headerHex === "" &&
        item.countHex === "" &&
        item.controlsHex === "", `${name} null state contradicts its bytes`);
      return null;
    }
    require(item.state === "present" && pointer !== 0n, `${name} is not an observed present curve`);
    require(pointer + 0x16cn <= 0x10000000000000000n, `${name} range overflows address space`);
    const header = bytes(item.headerHex, 0x68, `${name} header`);
    require(header.readBigUInt64LE(0) ===
      loaded(0x104a491a0n), `${name} has an unsupported vtable`);
    const count = bytes(item.countHex, 4, `${name} count`).readInt32LE(0);
    require(count >= 0 && count <= 16, `${name} count is outside 0..16`);
    const raw = bytes(item.controlsHex, count * 16, `${name} controls`);
    const points = Array.from({ length: count }, (_, index) => ({
      x: finite(raw.readDoubleLE(index * 16), `${name} control x`),
      y: finite(raw.readDoubleLE(index * 16 + 8), `${name} control y`),
    }));
    require(points.every(
      (point, index) => index === 0 || point.x >= points[index - 1].x,
    ), `${name} controls descend in x`);
    return points;
  };
  const response = (value: unknown, offset: number, name: string): PostResponseConfig => {
    const item = record(value, name);
    complete(item, name);
    require(address(item.address, `${name} address`) ===
      at + BigInt(offset), `${name} is not the embedded response`);
    const raw = bytes(item.bytesHex, 0x58, `${name} bytes`);
    require(raw.readBigUInt64LE(0) === loaded(0x104a493b0n), `${name} has an unsupported vtable`);
    if (offset === 0x88)
      require(raw.equals(
        prefix.subarray(0x88, 0xe0),
      ), "main response differs from evaluator prefix");
    require(Array.isArray(item.curves) &&
      item.curves.length === 3, `${name} must contain all three curve slots`);
    const curves: PostResponseConfig["curves"] = [
      curve(item.curves[0], raw.readBigUInt64LE(0x28), `${name} curve 0`),
      curve(item.curves[1], raw.readBigUInt64LE(0x38), `${name} curve 1`),
      curve(item.curves[2], raw.readBigUInt64LE(0x48), `${name} curve 2`),
    ];
    // All bits remain unsigned and intact; native code compares exactly 1 and tests bits.
    return {
      flags: raw.readUInt32LE(8),
      minimum: finite(raw.readFloatLE(0xc), `${name} minimum`),
      input1Minimum: finite(raw.readFloatLE(0x10), `${name} input1Minimum`),
      input1Maximum: finite(raw.readFloatLE(0x14), `${name} input1Maximum`),
      input2Minimum: finite(raw.readFloatLE(0x18), `${name} input2Minimum`),
      randomMinimum: finite(raw.readFloatLE(0x1c), `${name} randomMinimum`),
      input4Minimum: finite(raw.readFloatLE(0x20), `${name} input4Minimum`),
      curves,
    };
  };
  return {
    main: response(snapshot.main, 0x88, "main response"),
    secondary: response(snapshot.secondary, 0x630, "secondary response"),
    secondaryEnabled: (prefix.readUInt32LE(0x624) & 1) !== 0,
    secondaryBase: finite(prefix.readDoubleLE(0x628), "secondary base"),
    brushFlag4: (prefix.readUInt32LE(0x80) & 0x10) !== 0,
    adjustmentMode: prefix.readUInt32LE(0x198),
  };
}
