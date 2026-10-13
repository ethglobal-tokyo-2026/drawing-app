import * as reference from "../../post-reference.ts";
import type { ArithmeticValue, HelperName, HelperRecord, PostArguments } from "./schema.ts";

export type ArithmeticCheck = {
  name: string;
  status: "derived" | "match" | "mismatch" | "not-evaluated";
  expected?: ArithmeticValue;
  observed?: ArithmeticValue;
  reason?: string;
  evidence?: string;
};

export function bits(value: number, size: 4 | 8): { f32: string } | { f64: string } {
  if (!Number.isFinite(value) || (size === 4 && !Number.isFinite(Math.fround(value)))) {
    throw new Error("Arithmetic result is outside the finite reference domain");
  }
  const bytes = Buffer.alloc(size);
  if (size === 4) {
    bytes.writeFloatBE(value);
    return { f32: bytes.toString("hex") };
  }
  bytes.writeDoubleBE(value);
  return { f64: bytes.toString("hex") };
}

export function fromBits(value: unknown, size: 4 | 8): number {
  if (typeof value !== "string" || !new RegExp(`^[0-9a-fA-F]{${size * 2}}$`).test(value)) {
    throw new Error(`Expected ${size * 2} hexadecimal IEEE bits`);
  }
  const bytes = Buffer.from(value, "hex");
  const number = size === 4 ? bytes.readFloatBE() : bytes.readDoubleBE();
  if (!Number.isFinite(number))
    throw new Error("Nonfinite arithmetic input is outside the reference domain");
  return number;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function decodeInput(value: unknown): any {
  if (object(value) && Object.keys(value).length === 1 && "f32" in value)
    return fromBits(value.f32, 4);
  if (object(value) && Object.keys(value).length === 1 && "f64" in value)
    return fromBits(value.f64, 8);
  if (Array.isArray(value)) return value.map(decodeInput);
  if (object(value))
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, decodeInput(v)]));
  return value;
}

type Validator = (value: any) => boolean;
const number: Validator = (v) => typeof v === "number" && Number.isFinite(v);
const float: Validator = (v) => number(v) && Number.isFinite(Math.fround(v));
const int: Validator = (v) => Number.isInteger(v) && v >= -2147483648 && v <= 2147483647;
const uint: Validator = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
const boolean: Validator = (v) => typeof v === "boolean";
// A conservative helper-only bound prevents unobserved intermediate overflow.
const geometric: Validator = (v) => number(v) && Math.abs(v) <= 1e100;
const point: Validator = (v) => object(v) && geometric(v.x) && geometric(v.y);
const limits: Validator = (v) =>
  object(v) && float(v.ratio) && (v.ratio as number) > 0 && float(v.floor);
const settings: Validator = (v) =>
  object(v) &&
  int(v.k) &&
  number(v.magnificationPercent) &&
  (v.magnificationPercent as number) > 0 &&
  [
    "enabled",
    "flag480",
    "scaleTolerance",
    "selector482",
    "fallbackRequested",
    "priorFlag480",
    "priorSelector482",
  ].every((key) => boolean(v[key]));

const specifications: Record<
  HelperName,
  { arguments: Validator[]; encode: (v: any) => ArithmeticValue }
> = {
  convertPostSettings: {
    arguments: [settings],
    encode: (v) =>
      v === null
        ? null
        : {
            k: v.k,
            tolerance: bits(v.tolerance, 8),
            lengthScale: bits(v.lengthScale, 8),
            flag480: v.flag480,
            selector482: v.selector482,
          },
  },
  applyCallerCap: {
    arguments: [int, number, boolean],
    encode: (v) => ({ k: v.k, tolerance: bits(v.tolerance, 8) }),
  },
  scalarLimits: {
    arguments: [int],
    encode: (v) => ({ ratio: bits(v.ratio, 4), floor: bits(v.floor, 4) }),
  },
  removalPassSchedule: {
    arguments: [int, number],
    encode: (v) => ({
      initialTolerances: v.initialTolerances.map((t: number) => bits(t, 8)),
      raw: v.raw,
      n: v.n,
      decrement: v.decrement,
      additionalPassLimit: v.additionalPassLimit,
      additionalTolerances: v.additionalTolerances.map((t: number) => bits(t, 8)),
    }),
  },
  sourceSegmentTolerance: { arguments: [number, boolean, float], encode: (v) => bits(v, 8) },
  endpointParameter: { arguments: [int], encode: (v) => bits(v, 8) },
  cornerPredicate: { arguments: [point, point, point, geometric, geometric], encode: (v) => v },
  classifiedCornerFlags: { arguments: [uint, boolean], encode: (v) => v },
  scalarBounds: {
    arguments: [float, limits],
    encode: (v) => ({ lower: bits(v.lower, 4), upper: bits(v.upper, 4) }),
  },
  interpolateScalar: {
    arguments: [float, float, (v) => number(v) && v >= 0 && v <= 1],
    encode: (v) => bits(v, 4),
  },
  removalScalarAccepted: {
    arguments: [float, float, float, limits, (v) => number(v) && v >= 0 && v <= 1],
    encode: (v) => v,
  },
  nearCoincidentRemovalAccepted: {
    arguments: [point, point, float, float, limits],
    encode: (v) => v,
  },
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (object(value))
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}

function normalizeObserved(value: ArithmeticValue): ArithmeticValue {
  if (Array.isArray(value)) return value.map(normalizeObserved);
  if (object(value)) {
    if (Object.keys(value).length === 1 && "f32" in value) return bits(fromBits(value.f32, 4), 4);
    if (Object.keys(value).length === 1 && "f64" in value) return bits(fromBits(value.f64, 8), 8);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeObserved(v as ArithmeticValue)]),
    );
  }
  if (value === null || typeof value === "boolean" || (number(value) && Number.isInteger(value)))
    return value;
  throw new Error(
    "Observed floating outputs must use f32/f64 bit tags; only integers, booleans and null are plain values",
  );
}

export function evaluateHelper(record: HelperRecord): ArithmeticCheck {
  const spec = specifications[record.helper];
  if (!spec) throw new Error(`Unsupported helper ${String(record.helper)}`);
  if (typeof record.evidence !== "string" || !record.evidence.trim())
    throw new Error("Helper requires capture provenance in evidence");
  if (!Array.isArray(record.inputs)) throw new Error("Helper inputs must be an ordered array");
  const inputs = record.inputs.map(decodeInput);
  if (
    inputs.length !== spec.arguments.length ||
    !spec.arguments.every((validate, i) => validate(inputs[i]))
  ) {
    throw new Error(`${record.helper} inputs fail the documented finite helper contract`);
  }
  if (
    record.helper === "removalScalarAccepted" ||
    record.helper === "nearCoincidentRemovalAccepted"
  ) {
    const source = record.helper === "removalScalarAccepted" ? inputs[0] : inputs[3];
    const scalarLimits = record.helper === "removalScalarAccepted" ? inputs[3] : inputs[4];
    const bounds = reference.scalarBounds(source, scalarLimits);
    bits(bounds.lower, 4);
    bits(bounds.upper, 4);
  }
  const fn = reference[record.helper] as (...args: any[]) => any;
  const expected = spec.encode(fn(...inputs));
  if (record.observed === undefined)
    return {
      name: record.helper,
      status: "not-evaluated",
      expected,
      reason: "Inputs available, but no independently captured helper output.",
      evidence: record.evidence,
    };
  const observed = normalizeObserved(record.observed);
  return {
    name: record.helper,
    status: canonical(expected) === canonical(observed) ? "match" : "mismatch",
    expected,
    observed,
    evidence: record.evidence,
  };
}

export function derivedChecks(
  args: PostArguments,
  sourceNodes: { address: string; scalar4c: number }[],
): ArithmeticCheck[] {
  if (args.selector482 !== 0)
    return [
      {
        name: "ordinaryCoreParameters",
        status: "not-evaluated",
        reason:
          "selector482 selects PWVectorSampleBezier; ordinary-core formulas do not establish that branch.",
      },
    ];
  const tolerance = fromBits(args.toleranceBits, 8);
  const derived = (helper: HelperName, inputs: unknown[]): ArithmeticCheck => {
    const check = evaluateHelper({
      kind: "helper",
      sequence: 0,
      callId: "derived",
      helper,
      inputs,
      evidence: "Derived from saved wrapper arguments; core execution was not observed.",
    });
    return {
      ...check,
      status: "derived",
      reason: "Reference arithmetic only; no runtime result captured.",
    };
  };
  return [
    {
      name: "convertPostSettings",
      status: "not-evaluated",
      reason:
        "Wrapper inputs do not recover original setting IDs, magnification, fallback or prior outputs; provide a helper observation.",
    },
    {
      name: "applyCallerCap",
      status: "not-evaluated",
      reason:
        "Wrapper arguments follow the caller cap; original k/tolerance and the object condition were not captured.",
    },
    derived("scalarLimits", [args.k]),
    derived("removalPassSchedule", [args.k, tolerance]),
    derived("endpointParameter", [args.k]),
    {
      name: "sourceSegmentToleranceAtInitialPass",
      status: "derived",
      expected: sourceNodes.map((node, sourceSnapshotIndex) => ({
        sourceSnapshotIndex,
        tolerance: bits(
          reference.sourceSegmentTolerance(tolerance, args.flag480 !== 0, node.scalar4c),
          8,
        ),
      })),
      reason:
        "One value per captured source node at the initial tolerance; sampled segments and actual passes remain unobserved.",
    },
  ];
}
