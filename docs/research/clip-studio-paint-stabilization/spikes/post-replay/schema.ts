import type { PostSettingsInput } from "../../post-reference.ts";
import type { PostEvaluatorSnapshot } from "../post-joined/evaluator.ts";

/** Numbers with bits in their name are fixed-width, big-endian IEEE hexadecimal. */
export type PostArguments = {
  k: number;
  flag480: 0 | 1;
  closedMode: number;
  selector482: 0 | 1;
  toleranceBits: string;
  lengthScaleBits: string;
};

/** Raw memory hex preserves address order: the analyzed ARM64 image is little-endian. */
export type PathSnapshot = {
  address: string;
  headerHex: string;
  nodes: { address: string; bytesHex: string }[];
  complete: boolean;
  errors: string[];
  /** Absent in historical captures; absence does not mean a null native evaluator. */
  endpointEvaluator?: PostEvaluatorSnapshot;
};

export type CaptureHeader = {
  kind: "header";
  schema: "csp-post-capture/v1";
  imageSha256: string;
  imageBase: string;
  architecture: "arm64";
  provenance: "runtime" | "synthetic";
  device: "mouse" | "tablet" | "unknown";
  metadata?: Record<string, unknown>;
};

export type BoundaryRecord = {
  kind: "boundary";
  sequence: number;
  callId: string;
  phase: "entry" | "return";
  threadId: string;
  holder: string;
  boundary: "0x1028ed064" | "0x1028ed144";
  arguments: PostArguments;
  path: PathSnapshot;
  returnedPath?: string;
  /** Required at both runtime boundaries for the supported floating-point mode. */
  fpcr?: string;
  fpsr?: string;
  /** Optional independent settings fingerprint; copied arguments alone cannot detect UI drift. */
  configurationFingerprint?: string;
};

export type HelperName =
  | "convertPostSettings"
  | "applyCallerCap"
  | "scalarLimits"
  | "removalPassSchedule"
  | "sourceSegmentTolerance"
  | "endpointParameter"
  | "cornerPredicate"
  | "classifiedCornerFlags"
  | "scalarBounds"
  | "interpolateScalar"
  | "removalScalarAccepted"
  | "nearCoincidentRemovalAccepted";

/** Floating outputs are tagged bit strings, including nested outputs; see README examples. */
export type ArithmeticValue =
  | null
  | boolean
  | number
  | { f32: string }
  | { f64: string }
  | ArithmeticValue[]
  | { [key: string]: ArithmeticValue };

export type HelperRecord = {
  kind: "helper";
  sequence: number;
  callId: string;
  helper: HelperName;
  /** Exact public post-reference function arguments, in their original order. */
  inputs: unknown[];
  observed?: ArithmeticValue;
  /** Human-readable capture boundary, including argument/return registers or memory offsets. */
  evidence: string;
  /** Required to claim runtime helper agreement; zero establishes the supported FPCR mode. */
  fpcr?: string;
};

export type CaptureError = {
  kind: "error";
  sequence: number;
  callId?: string;
  message: string;
};

export type CaptureSummary = {
  kind: "summary";
  captureComplete: boolean;
  stopReason: string;
  entries: number;
  pairs: number;
  cleanupErrors: string[];
  detachRequestSucceeded: boolean;
  detachedStateObserved: boolean;
  unmatchedEntries?: number;
  deadlineExceeded?: boolean;
  watchdogError?: string | null;
  cleanupWarnings?: string[];
};

export type CaptureDiagnostic = { kind: "diagnostic"; event: string; details?: unknown };

export type CaptureRecord =
  | CaptureHeader
  | BoundaryRecord
  | HelperRecord
  | CaptureError
  | CaptureSummary
  | CaptureDiagnostic;

export type SettingsInputs = [PostSettingsInput];
