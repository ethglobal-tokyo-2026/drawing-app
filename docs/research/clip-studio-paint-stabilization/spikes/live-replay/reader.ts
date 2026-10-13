/** Strict reader for capture_tablet_stroke JSONL; raw bytes are authoritative. */
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { requireValid, supported, ReplayError, validateQueue, type Ingestion } from "./queue.ts";
import type {
  Phase,
  Sample,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts";

type Row = Record<string, any>;
export type Mutation = { offset: number; before: Buffer; after: Buffer };
export type CapturedCall = {
  id: number;
  entry: Row;
  exit: Row;
  before: Buffer;
  after: Buffer;
  input: Ingestion;
  phaseOut: Phase;
  emitted: boolean;
  output?: { x: number; y: number; pressure: number };
  changes: Mutation[];
  initialHistory: Sample[] | null;
  included: boolean;
  begin: boolean;
};
export type Capture = {
  sha256: string;
  origin: "synthetic" | "saved_native_capture_unverified";
  calls: CapturedCall[];
  excluded: { callId: number; reason: string }[];
  recordCounts: Record<string, number>;
  metadata: Row;
  summary: Row;
  terminalRecords: Row[];
  sourceReturns: Row[];
  rows: Row[];
};
const ORIGINAL_SHA256 = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd";
const AUDIT = new Set([
  "process_selected",
  "process_verified",
  "breakpoint_install",
  "capture_started",
  "thread_stop",
  "capture_state_event",
  "capture_restarted_stop",
  "source_breakpoint_rotated",
  "workqueue_step_recovery",
]);
const KNOWN = new Set([
  ...AUDIT,
  "metadata",
  "instruction_verification",
  "initial_state",
  "entry_pairing",
  "entry",
  "entry_contract",
  "exit",
  "native_dispatch",
  "native_source_pairing",
  "native_source_return",
  "terminal_wrapper_complete",
  "capture_error",
  "summary",
]);
export const MAX_CAPTURE_BYTES = 64 * 1024 * 1024;
const object = (value: any, label: string): Row => {
  requireValid(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`,
  );
  return value;
};
function integer(value: any, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  requireValid(
    Number.isSafeInteger(value) && value >= min && value <= max,
    `${label}: expected integer in [${min},${max}]`,
  );
  return value;
}
function bytes(value: any, length: number, label: string): Buffer {
  requireValid(
    typeof value === "string" && new RegExp(`^[0-9a-f]{${length * 2}}$`).test(value),
    `${label}: expected exactly ${length} bytes in lowercase hexadecimal`,
  );
  return Buffer.from(value, "hex");
}
function bits(value: any, width: number, label: string): bigint {
  requireValid(
    typeof value === "string" && new RegExp(`^0x[0-9a-f]{${width / 4}}$`).test(value),
    `${label}: invalid ${width}-bit hexadecimal`,
  );
  return BigInt(value);
}
function numeric(value: any, label: string, expectedBytes?: Buffer): number {
  const row = object(value, label),
    raw = bytes(row.bytes_le, 8, `${label}.bytes_le`);
  requireValid(
    bits(row.bits, 64, `${label}.bits`) === raw.readBigUInt64LE(),
    `${label}: bits differ from raw bytes`,
  );
  const actual = raw.readDoubleLE();
  supported(Number.isFinite(actual), `${label}: nonfinite floating-point value`);
  requireValid(
    typeof row.value === "number" && row.value === actual,
    `${label}: decoded value differs from bytes`,
  );
  if (expectedBytes)
    requireValid(
      raw.equals(expectedBytes),
      `${label}: redundant float differs from enclosing bytes`,
    );
  return actual;
}
function address(value: any, label: string): bigint {
  requireValid(
    typeof value === "string" && /^0x[0-9a-f]+$/.test(value),
    `${label}: invalid address`,
  );
  const result = BigInt(value);
  requireValid(result > 0n && result < 1n << 64n, `${label}: invalid address range`);
  return result;
}

/** Validate the narrow debugger notification without relaxing stroke completion. */
function readWorkqueueRecoveries(rows: Row[], summary: Row): void {
  if (!rows.some((row) => row.kind === "workqueue_step_recovery")) {
    requireValid(
      summary.workqueue_step_recoveries === undefined ||
        isDeepStrictEqual(summary.workqueue_step_recoveries, []),
      "workqueue recovery summary claims unrecorded recoveries",
    );
    return;
  }
  const probes = new Map<number, { pc: bigint; label: string; hardware: boolean }>();
  const probeCallbacks: Record<string, string> = {
    shared_ingestion_entry: "entry_pairing",
    shared_ingestion_exit: "exit",
    digitizer_terminal_complete: "terminal_wrapper_complete",
    digitizer_native_dispatch: "native_dispatch",
    native_source_return: "native_source_return",
  };
  const probeLabels = new Set(Object.keys(probeCallbacks));
  const capturedThreads = new Set<number>();
  const pendingCalls = new Map<number, number>();
  const sourceThreads = new Set<number>();
  const recoveredThreads = new Set<number>();
  const recoveries: Row[] = [];
  let lastRecoveryStop = 0;
  let stops: Row[] | undefined;
  let expectedCallback: { kind: string; thread: number } | undefined;
  for (const row of rows) {
    if (expectedCallback) {
      // Every recorder callback emits this record before any other audit or
      // process event. Recovery cannot discard the owned hit or resume first.
      requireValid(
        row.kind === expectedCallback.kind && row.thread_id === expectedCallback.thread,
        `line ${row.line}: workqueue recovery must preserve its owned callback kind and thread before another record`,
      );
      expectedCallback = undefined;
    }
    if (row.kind === "breakpoint_install") {
      const match =
        typeof row.command === "string"
          ? /^breakpoint set --hardware --address (0x[0-9a-f]+)$/.exec(row.command)
          : null;
      if (Array.isArray(row.ids) && row.ids.length === 1 && Number.isSafeInteger(row.ids[0]))
        probes.set(row.ids[0], {
          pc: match ? address(match[1], "workqueue recovery installed probe") : 0n,
          label: row.label,
          hardware: match !== null && !row.error && probeLabels.has(row.label),
        });
    } else if (row.kind === "source_breakpoint_rotated") {
      const previous = probes.get(row.previous_id),
        current = probes.get(row.current_id);
      requireValid(
        previous &&
          current &&
          previous.label !== "shared_ingestion_entry" &&
          previous.label !== "shared_ingestion_exit" &&
          previous.label !== "digitizer_terminal_complete" &&
          current.label === row.label &&
          current.pc === address(row.load_address, "workqueue recovery rotated probe"),
        "workqueue recovery source breakpoint rotation lacks matching installation",
      );
      probes.delete(row.previous_id);
    }
    if (row.kind === "entry_pairing") pendingCalls.set(row.call_id, row.thread_id);
    if (row.kind === "exit") pendingCalls.delete(row.call_id);
    if (row.kind === "native_source_pairing") sourceThreads.add(row.thread_id);
    if (row.kind === "native_source_return") sourceThreads.delete(row.thread_id);
    if (
      [
        "entry_pairing",
        "entry",
        "exit",
        "native_dispatch",
        "native_source_pairing",
        "native_source_return",
        "terminal_wrapper_complete",
      ].includes(row.kind)
    )
      capturedThreads.add(row.thread_id);
    if (row.kind === "capture_state_event") {
      stops = row.state === 5 && row.restarted === false ? [] : undefined;
      continue;
    }
    if (row.kind === "thread_stop") {
      stops?.push(row);
      if (row.reason === 3 && Array.isArray(row.data) && probes.has(row.data[0]))
        capturedThreads.add(row.thread_id);
      continue;
    }
    if (row.kind !== "workqueue_step_recovery") {
      stops = undefined;
      continue;
    }
    const label = `line ${row.line}: workqueue recovery`;
    const secondary = integer(row.thread_id, `${label} secondary thread`, 1);
    const ownedThread = integer(row.owned_thread_id, `${label} owned thread`, 1);
    const stopId = integer(row.stop_id, `${label} stop ID`, 1);
    const breakpointId = integer(row.owned_breakpoint_id, `${label} probe ID`, 1);
    const locationId = integer(row.owned_breakpoint_location_id, `${label} probe location`, 1);
    requireValid(
      secondary !== ownedThread &&
        !recoveredThreads.has(secondary) &&
        recoveries.length < 4 &&
        row.recovery_index === recoveries.length + 1 &&
        row.recovery_limit === 4 &&
        stopId > lastRecoveryStop,
      `${label}: repeated secondary thread, unordered stop, or recovery limit exceeded`,
    );
    requireValid(
      row.reason === 6 &&
        isDeepStrictEqual(row.data, [6, 1, 0]) &&
        row.module_path === "/usr/lib/system/libsystem_pthread.dylib" &&
        typeof row.module_uuid === "string" &&
        /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.module_uuid) &&
        row.bl_target_module_uuid === row.module_uuid &&
        ["start_wqthread", "_start_wqthread"].includes(row.symbol_name) &&
        ["_pthread_wqthread", "__pthread_wqthread"].includes(row.bl_target_symbol),
      `${label}: exception or pthread symbol identity differs`,
    );
    const pc = address(row.pc, `${label} PC`);
    const symbolStart = address(row.symbol_start, `${label} symbol start`);
    const target = address(row.bl_target, `${label} BL target`);
    const instructions = bytes(row.instruction_bytes_le, 8, `${label} instructions`);
    const branch = instructions.readUInt32LE(0);
    const immediate = branch & 0x03ffffff;
    const signedImmediate = immediate >= 0x02000000 ? immediate - 0x04000000 : immediate;
    requireValid(
      pc === symbolStart + 4n &&
        symbolStart % 4n === 0n &&
        branch >>> 26 === 0x25 &&
        instructions.readUInt32LE(4) === 0xd4200020 &&
        target === pc + BigInt(signedImmediate) * 4n &&
        target === address(row.bl_target_symbol_start, `${label} target symbol start`),
      `${label}: PC, BL target, or BRK #1 instruction differs`,
    );
    requireValid(
      row.secondary_pending_ingestion === false &&
        row.secondary_source_role === false &&
        row.secondary_capture_role === false &&
        !capturedThreads.has(secondary) &&
        !sourceThreads.has(secondary) &&
        ![...pendingCalls.values()].includes(secondary),
      `${label}: secondary thread has captured ingestion or source provenance`,
    );
    const probe = probes.get(breakpointId);
    requireValid(
      probes.size === 4 &&
        probe?.hardware &&
        row.owned_breakpoint_hardware === true &&
        probe.pc === address(row.owned_breakpoint_pc, `${label} owned PC`),
      `${label}: owned stop does not match a current hardware probe`,
    );
    requireValid(
      stops?.length === 2 &&
        stops.some(
          (stop) =>
            stop.thread_id === secondary &&
            stop.reason === 6 &&
            isDeepStrictEqual(stop.data, [6, 1, 0]),
        ) &&
        stops.some(
          (stop) =>
            stop.thread_id === ownedThread &&
            stop.reason === 3 &&
            isDeepStrictEqual(stop.data, [breakpointId, locationId]),
        ),
      `${label}: matching secondary and single owned stop records are required`,
    );
    requireValid(
      row.action === "preserve_owned_callback_and_resume_without_target_writes",
      `${label}: unsupported recovery action`,
    );
    recoveredThreads.add(secondary);
    lastRecoveryStop = stopId;
    const { kind: _kind, elapsed_seconds: _elapsedSeconds, line: _line, ...detail } = row;
    recoveries.push(detail);
    expectedCallback = { kind: probeCallbacks[probe.label], thread: ownedThread };
    stops = undefined;
  }
  requireValid(!expectedCallback, "workqueue recovery has no following owned callback");
  requireValid(
    isDeepStrictEqual(summary.workqueue_step_recoveries ?? [], recoveries) &&
      summary.workqueue_step_recoveries !== null,
    "workqueue recovery summary differs from the complete recorded details",
  );
  if (recoveries.length)
    requireValid(
      Array.isArray(summary.capture_warnings) &&
        summary.capture_warnings.length > 0 &&
        summary.capture_warnings.every(
          (warning: unknown) => typeof warning === "string" && warning.trim(),
        ),
      "workqueue recovery must retain a capture warning",
    );
}

function readQueue(value: any, label: string): Buffer {
  const row = object(value, label);
  requireValid(row.size === 236, `${label}: invalid common queue size`);
  address(row.address, `${label}.address`);
  const raw = bytes(row.bytes_le, 236, `${label}.bytes_le`);
  validateQueue(raw, label);
  requireValid(row.state_i32 === raw.readInt32LE(0x88), `${label}: state differs from bytes`);
  for (const [name, offset] of [
    ["window_H", 0x58],
    ["processed_x", 0x90],
    ["processed_y", 0x98],
    ["processed_pressure", 0xb0],
  ] as const)
    numeric(row[name], `${label}.${name}`, raw.subarray(offset, offset + 8));
  return raw;
}
function readPhase(value: any, label: string): Phase {
  const row = object(value, label),
    raw = bytes(row.bytes_le, 4, `${label}.bytes_le`);
  requireValid(
    [1, 2, 3].includes(row.value_i32) && row.value_i32 === raw.readInt32LE(),
    `${label}: invalid phase or bytes`,
  );
  address(row.address, `${label}.address`);
  return row.value_i32;
}
function readRegister(value: any, label: string): bigint {
  const row = object(value, label),
    valueBits = bits(row.bits, 64, `${label}.bits`);
  requireValid(
    row.unsigned_decimal === valueBits.toString() &&
      row.signed_decimal === BigInt.asIntN(64, valueBits).toString(),
    `${label}: decimal register values differ from bits`,
  );
  return valueBits;
}
const CONFIG = [
  ["stabilization", 0x3c],
  ["fast_motion", 0x40],
  ["slow_motion", 0x44],
  ["slow_numerator", 0x48],
  ["slow_threshold", 0x4c],
  ["initial_window", 0x50],
  ["distance_scale", 0x60],
  ["taper", 0x68],
  ["maximum_pressure_decline", 0x70],
  ["retain_at_zero", 0xdc],
] as const;
function readConfiguration(value: any, raw: Buffer, label: string): void {
  const row = object(value, label);
  for (const [name, offset] of CONFIG) {
    const field = object(row[name], `${label}.${name}`),
      double = [0x60, 0x70].includes(offset),
      size = double ? 8 : 4;
    requireValid(
      field.offset === `0x${offset.toString(16)}` &&
        bytes(field.bytes_le, size, `${label}.${name}`).equals(raw.subarray(offset, offset + size)),
      `${label}.${name}: configuration bytes disagree`,
    );
    requireValid(
      field.value === (double ? raw.readDoubleLE(offset) : raw.readInt32LE(offset)),
      `${label}.${name}: configuration value disagrees`,
    );
  }
}
function readGlobals(value: any, label: string): string {
  const row = object(value, label),
    result: string[] = [];
  for (const [name, size] of [
    ["emission_interval", 8],
    ["terminal_mode", 4],
    ["interval_option", 4],
  ] as const) {
    const field = object(row[name], `${label}.${name}`),
      raw = bytes(field.bytes_le, size, `${label}.${name}.bytes_le`);
    const decoded =
      size === 8
        ? raw.readBigInt64LE()
        : BigInt(name === "terminal_mode" ? raw.readUInt32LE() : raw.readInt32LE());
    // JSON's numeric duplicate may round large int64 values. Decimal precision
    // for arithmetic comes from bytes/register bit strings, never this number.
    requireValid(
      field.value === Number(decoded),
      `${label}.${name}: decoded global value differs from bytes`,
    );
    result.push(raw.toString("hex"));
  }
  return result.join(":");
}
function history(value: any, count: number, label: string): Sample[] {
  requireValid(
    Array.isArray(value) && value.length === count,
    `${label}: complete initial_history_oldest_first is required`,
  );
  return value.map((item: any, index: number) => {
    const row = object(item, `${label}[${index}]`),
      raw = bytes(row.bytes_le, 32, `${label}[${index}]`);
    const timestamp = raw.readBigInt64LE(24);
    requireValid(
      row.timestamp_signed_decimal === timestamp.toString(),
      `${label}[${index}]: timestamp differs from bytes`,
    );
    return {
      x: numeric(row.x, `${label}[${index}].x`, raw.subarray(0, 8)),
      y: numeric(row.y, `${label}[${index}].y`, raw.subarray(8, 16)),
      pressure: numeric(row.pressure, `${label}[${index}].pressure`, raw.subarray(16, 24)),
      timestamp,
    };
  });
}
function mutations(
  value: any,
  before: Buffer,
  after: Buffer,
  caller: string,
  label: string,
): Mutation[] {
  requireValid(Array.isArray(value), `${label}: missing between_call_changes`);
  const patched = Buffer.from(before),
    result: Mutation[] = [],
    offsets = new Set<number>();
  for (const rawRow of value) {
    const row = object(rawRow, label);
    requireValid(
      typeof row.offset === "string" && /^0x[0-9a-f]+$/.test(row.offset),
      `${label}: invalid mutation offset`,
    );
    const offset = Number(row.offset);
    requireValid(!offsets.has(offset), `${label}: duplicate mutation offset`);
    offsets.add(offset);
    requireValid(
      [0xd8, 0xe0, ...(caller === "digitizer_flush" ? [0x88] : [])].includes(offset),
      `${label}: unsupported wrapper mutation +${row.offset}`,
    );
    const beforeBytes = bytes(row.before_bytes_le, 4, label),
      afterBytes = bytes(row.after_bytes_le, 4, label);
    requireValid(
      beforeBytes.equals(before.subarray(offset, offset + 4)) &&
        afterBytes.equals(after.subarray(offset, offset + 4)) &&
        !beforeBytes.equals(afterBytes),
      `${label}: mutation before/after bytes disagree`,
    );
    const next = afterBytes.readInt32LE();
    requireValid(
      offset === 0xd8 ? [0, 1].includes(next) : next === (offset === 0xe0 ? 0 : 2),
      `${label}: unsupported wrapper mutation value`,
    );
    requireValid(
      row.individual_write_instruction_observed === false &&
        typeof row.static_explanation === "string",
      `${label}: missing wrapper inference attribution`,
    );
    afterBytes.copy(patched, offset);
    result.push({ offset, before: beforeBytes, after: afterBytes });
  }
  requireValid(
    patched.equals(after),
    `${label}: unexplained queue mutation between calls; recorded changes do not explain all bytes`,
  );
  return result;
}

export function readCapture(text: string): Capture {
  requireValid(
    Buffer.byteLength(text) <= MAX_CAPTURE_BYTES,
    `capture exceeds ${MAX_CAPTURE_BYTES} byte bound`,
  );
  requireValid(
    text.endsWith("\n"),
    "capture must end with newline; absent newline may indicate truncation",
  );
  const lines = text.slice(0, -1).split("\n");
  requireValid(lines.length <= 40000, "capture exceeds 40000 record bound");
  const rows: Row[] = [],
    recordCounts: Record<string, number> = {};
  let elapsed = -Infinity;
  for (const [index, line] of lines.entries()) {
    let row: Row;
    try {
      row = object(JSON.parse(line), `line ${index + 1}`);
    } catch (error) {
      throw new ReplayError(
        "invalid_capture",
        `line ${index + 1}: invalid JSON record: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    supported(
      KNOWN.has(row.kind),
      `line ${index + 1}: unsupported record kind ${String(row.kind)}`,
    );
    requireValid(
      Number.isFinite(row.elapsed_seconds) && row.elapsed_seconds >= elapsed,
      `line ${index + 1}: missing or decreasing elapsed_seconds`,
    );
    elapsed = row.elapsed_seconds;
    row.line = index + 1;
    rows.push(row);
    recordCounts[row.kind] = (recordCounts[row.kind] ?? 0) + 1;
  }
  requireValid(
    rows[0]?.kind === "metadata" && recordCounts.metadata === 1,
    "exactly one leading metadata record is required",
  );
  requireValid(
    rows.at(-1)?.kind === "summary" && recordCounts.summary === 1,
    "exactly one final summary is required; capture may be truncated",
  );
  const metadata = rows[0],
    summary = rows.at(-1)!;
  supported(
    metadata.original_sha256 === ORIGINAL_SHA256 &&
      metadata.fixture_scope === "instrumented_digitizer_queue_arithmetic",
    "unsupported image fingerprint or fixture scope",
  );
  requireValid(summary.fixture_scope === metadata.fixture_scope, "summary fixture scope differs");
  const origin =
    metadata.fixture_origin === "synthetic" ? "synthetic" : "saved_native_capture_unverified";
  if (metadata.fixture_origin !== undefined)
    supported(metadata.fixture_origin === "synthetic", "unsupported fixture_origin");
  if (summary.fixture_complete !== true || recordCounts.capture_error)
    throw new ReplayError(
      "incomplete_capture",
      `capture is incomplete: ${JSON.stringify(summary.fixture_incomplete_reasons ?? summary.stop_reason)}`,
    );
  for (const key of ["fixture_incomplete_reasons", "unmatched_entries", "cleanup_errors"])
    requireValid(
      Array.isArray(summary[key]) && summary[key].length === 0,
      `summary.${key} must be an empty array`,
    );
  // Cleanup deletes these target breakpoints but retains their IDs in the log.
  // Cleanup errors and detach status are validated separately.
  requireValid(
    Array.isArray(summary.owned_breakpoints) && summary.owned_breakpoints.length <= 4,
    "summary.owned_breakpoints must be an array of at most four breakpoint IDs",
  );
  const breakpointIds = summary.owned_breakpoints.map((id: unknown) =>
    integer(id, "summary.owned_breakpoints ID", 1),
  );
  requireValid(
    new Set(breakpointIds).size === breakpointIds.length,
    "summary.owned_breakpoints must contain unique IDs",
  );
  for (const key of [
    "confirmed_begin",
    "native_release_seen",
    "native_release_returned",
    "final_source_returned",
    "detach_request_succeeded",
    "detached_state_observed",
  ])
    requireValid(summary[key] === true, `summary.${key} must be true`);
  requireValid(
    summary.watchdog_error === null &&
      summary.deadline_exceeded === false &&
      summary.unmatched_source_boundary === null,
    "summary reports unresolved cleanup/deadline/source boundary",
  );
  readWorkqueueRecoveries(rows, summary);
  const verified = new Set<string>();
  for (const row of rows.filter((row) => row.kind === "instruction_verification")) {
    requireValid(
      row.matches === true &&
        /^[a-f0-9]{64}$/.test(row.actual_sha256) &&
        row.actual_sha256 === row.expected_sha256,
      `line ${row.line}: instruction verification failed`,
    );
    verified.add(row.label);
  }
  for (const label of ["shared_ingestion", "digitizer_dispatch", "digitizer_terminal"])
    requireValid(verified.has(label), `missing instruction verification: ${label}`);
  requireValid(recordCounts.initial_state === 1, "exactly one initial_state is required");
  const initial = rows.find((row) => row.kind === "initial_state")!;
  readQueue(initial.queue, "initial_state.queue");
  const globals = readGlobals(initial.active_globals, "initial_state.active_globals");
  for (const row of rows)
    if (
      [
        "initial_state",
        "entry",
        "exit",
        "native_dispatch",
        "native_source_return",
        "terminal_wrapper_complete",
      ].includes(row.kind)
    )
      requireValid(
        readGlobals(row.active_globals, `line ${row.line}.active_globals`) === globals,
        `line ${row.line}: active globals changed`,
      );

  const pending = new Map<number, { pair: Row; entry?: Row; contract?: Row }>();
  const pairs = new Map<number, CapturedCall>(),
    ordered: CapturedCall[] = [];
  const stacks = new Map<number, number[]>();
  let nextId = 1;
  for (const row of rows) {
    if (!["entry_pairing", "entry", "entry_contract", "exit"].includes(row.kind)) continue;
    const id = integer(row.call_id, `line ${row.line}.call_id`, 1, 512),
      label = `call ${id}, line ${row.line}`;
    if (row.kind === "entry_pairing") {
      requireValid(
        id === nextId++ && !pending.has(id) && !pairs.has(id),
        `${label}: duplicate or missing sequential entry pairing`,
      );
      integer(row.thread_id, `${label}.thread_id`, 1);
      const stack = stacks.get(row.thread_id) ?? [];
      stack.push(id);
      stacks.set(row.thread_id, stack);
      requireValid(
        row.depth === stack.length && stack.length <= 8,
        `${label}: invalid pairing depth; an earlier entry may have no exit`,
      );
      pending.set(id, { pair: row });
      continue;
    }
    const saved = pending.get(id);
    requireValid(saved, `${label}: unpaired or duplicate ${row.kind}`);
    if (row.kind === "entry") {
      requireValid(!saved.entry, `${label}: duplicate entry`);
      saved.entry = row;
      continue;
    }
    if (row.kind === "entry_contract") {
      requireValid(saved.entry && !saved.contract, `${label}: missing entry or duplicate contract`);
      saved.contract = row;
      continue;
    }
    requireValid(saved.entry && saved.contract, `${label}: missing entry or contract before exit`);
    const entry = saved.entry,
      contract = saved.contract,
      pair = saved.pair;
    requireValid(
      entry.thread_id === pair.thread_id &&
        row.thread_id === pair.thread_id &&
        stacks.get(pair.thread_id)?.pop() === id,
      `${label}: thread or nesting pairing mismatch`,
    );
    requireValid(
      ["digitizer_normal", "digitizer_flush", "gesture_normal", "gesture_flush"].includes(
        entry.caller_family,
      ) &&
        entry.caller_family === row.caller_family &&
        entry.caller_family === pair.caller_family,
      `${label}: unsupported or mismatched caller`,
    );
    const ignored = entry.caller_family.startsWith("gesture_");
    requireValid(
      entry.ignored_queue === ignored && row.ignored_queue === ignored,
      `${label}: incorrect ignored_queue classification`,
    );
    const before = readQueue(entry.queue, `${label}.entry.queue`),
      after = readQueue(row.queue, `${label}.exit.queue`);
    requireValid(
      entry.queue.address === row.queue.address && entry.queue.address === pair.queue,
      `${label}: queue address changed`,
    );
    const phaseIn = readPhase(entry.phase, `${label}.entry.phase`),
      phaseOut = readPhase(row.phase, `${label}.exit.phase`);
    requireValid(
      entry.phase.address === row.phase.address && entry.phase.address === pair.phase,
      `${label}: phase address changed`,
    );
    const registers = object(entry.registers, `${label}.registers`),
      regs = Array.from({ length: 8 }, (_, i) =>
        readRegister(registers[`x${i}`], `${label}.x${i}`),
      );
    requireValid(
      regs[0] === address(pair.queue, label) &&
        regs[1] === address(pair.phase, label) &&
        regs[7] === address(pair.output, label),
      `${label}: argument pointer mismatch`,
    );
    const floating = object(entry.floating_registers, `${label}.floating_registers`);
    const input: Ingestion = {
      x: numeric(floating.d0, `${label}.d0`),
      y: numeric(floating.d1, `${label}.d1`),
      pressure: numeric(floating.d2, `${label}.d2`),
      timestamp: BigInt.asIntN(64, regs[2]),
      phase: phaseIn,
      catchUp: BigInt.asUintN(32, regs[3]) !== 0n,
      gating: BigInt.asUintN(32, regs[4]) !== 0n,
      interval: BigInt.asIntN(64, regs[5]),
      bypass: BigInt.asUintN(32, regs[6]) !== 0n,
    };
    const fpcr = bits(entry.fpcr_bits, 32, `${label}.entry.FPCR`);
    supported(
      fpcr === 0n && bits(row.fpcr_bits, 32, `${label}.exit.FPCR`) === 0n,
      `${label}: unsupported FPCR; only 0x00000000 is modeled`,
    );
    bits(entry.fpsr_bits, 32, `${label}.entry.FPSR`);
    bits(row.fpsr_bits, 32, `${label}.exit.FPSR`);
    readConfiguration(entry.configuration, before, `${label}.configuration`);
    requireValid(
      typeof row.emitted === "boolean" &&
        (bits(row.w0_bits, 32, `${label}.w0`) !== 0n) === row.emitted,
      `${label}: emitted differs from w0`,
    );
    let output: CapturedCall["output"];
    if (row.emitted) {
      const savedOutput = object(row.output, `${label}.output`),
        raw = bytes(savedOutput.bytes_at_08_le, 24, `${label}.output`);
      requireValid(savedOutput.address === pair.output, `${label}: output address changed`);
      output = {
        x: numeric(savedOutput.x, `${label}.output.x`, raw.subarray(0, 8)),
        y: numeric(savedOutput.y, `${label}.output.y`, raw.subarray(8, 16)),
        pressure: numeric(savedOutput.pressure, `${label}.output.pressure`, raw.subarray(16, 24)),
      };
    } else
      requireValid(
        row.output === undefined,
        `${label}: suppressed output must not contain uninitialized output bytes`,
      );
    requireValid(
      typeof contract.included === "boolean",
      `${label}: missing included classification`,
    );
    if (ignored)
      requireValid(
        !contract.included &&
          contract.exclusion_reason === "gesture_queue_is_outside_digitizer_fixture",
        `${label}: gesture queue incorrectly included`,
      );
    const begin = contract.begin_candidate === true;
    const initialHistory = begin
      ? history(
          entry.initial_history_oldest_first,
          Number(before.readBigUInt64LE(0x30)),
          `${label}.initial_history_oldest_first`,
        )
      : null;
    if (!begin)
      requireValid(
        entry.initial_history_oldest_first === null,
        `${label}: unexpected initial history outside begin`,
      );
    const call: CapturedCall = {
      id,
      entry,
      exit: row,
      before,
      after,
      input,
      phaseOut,
      emitted: row.emitted,
      output,
      changes: [],
      initialHistory,
      included: contract.included,
      begin,
    };
    (call as CapturedCall & { contract: Row }).contract = contract;
    ordered.push(call);
    pairs.set(id, call);
    pending.delete(id);
  }
  requireValid(
    pending.size === 0,
    `unpaired entry/exit records: ${[...pending.keys()].join(", ")}`,
  );
  requireValid(
    ordered.length > 0 &&
      ordered.length === summary.entries &&
      ordered.length === summary.paired_calls,
    "summary call counts disagree with complete entry/exit pairs",
  );
  const calls = ordered.filter((call) => call.included),
    excluded: Capture["excluded"] = [];
  requireValid(
    calls.length > 0 && calls[0].begin && calls.filter((call) => call.begin).length === 1,
    "fixture must contain exactly one initial begin",
  );
  requireValid(
    JSON.stringify(summary.fixture_call_ids) === JSON.stringify(calls.map((call) => call.id)),
    "summary fixture_call_ids omit/reorder captured calls",
  );
  const first = calls[0];
  requireValid(
    first.entry.caller_family === "digitizer_normal" &&
      first.input.phase === 2 &&
      !first.input.bypass &&
      first.before.readInt32LE(0x88) === 0 &&
      first.emitted &&
      first.phaseOut === 2 &&
      first.after.readInt32LE(0x88) === 1,
    "begin contract requires idle phase 2 to active emitted phase 2",
  );
  requireValid(
    summary.initial_history_count === first.initialHistory!.length,
    "summary initial history count differs",
  );
  let previous: CapturedCall | undefined;
  let final: CapturedCall | undefined;
  for (const call of ordered) {
    const contract = (call as CapturedCall & { contract: Row }).contract;
    if (!call.included) {
      requireValid(
        call.entry.ignored_queue ||
          (!previous &&
            !call.begin &&
            call.input.phase !== 2 &&
            contract.exclusion_reason === "waiting_for_idle_phase_2_begin"),
        `call ${call.id}: captured digitizer call was excluded inside fixture`,
      );
      excluded.push({ callId: call.id, reason: contract.exclusion_reason });
      continue;
    }
    requireValid(
      call.entry.queue.address === first.entry.queue.address,
      `call ${call.id}: digitizer queue identity changed`,
    );
    if (previous) {
      requireValid(call.input.phase !== 2, `call ${call.id}: second begin inside fixture`);
      call.changes = mutations(
        contract.between_call_changes,
        previous.after,
        call.before,
        call.entry.caller_family,
        `call ${call.id}.between_call_changes`,
      );
    } else
      requireValid(
        Array.isArray(contract.between_call_changes) && contract.between_call_changes.length === 0,
        "begin cannot have between-call changes",
      );
    for (const [name, offset] of CONFIG) {
      const size = [0x60, 0x70].includes(offset) ? 8 : 4;
      requireValid(
        call.before
          .subarray(offset, offset + size)
          .equals(call.after.subarray(offset, offset + size)),
        `call ${call.id}: configuration ${name} changed within ingestion`,
      );
    }
    const expectedCount = Math.min(
      1000,
      call.before.readInt32LE(0x38) + Number(!call.input.bypass),
    );
    requireValid(
      call.after.readInt32LE(0x38) === expectedCount,
      `call ${call.id}: history count does not account for ingestion`,
    );
    if (final)
      requireValid(
        call.before.readInt32LE(0x88) === 0 && call.after.readInt32LE(0x88) === 0,
        `call ${call.id}: active segment after provisional ending`,
      );
    if (call.emitted && call.phaseOut === 3) {
      requireValid(
        call.after.readInt32LE(0x88) === 0,
        `call ${call.id}: final output requires idle state`,
      );
      final ??= call;
    }
    previous = call;
  }
  requireValid(
    final && final.id === summary.final_pair_id,
    "missing final emitted phase-3/state-0 call or summary disagreement",
  );
  requireValid(
    summary.input_end_seen === calls.some((call) => call.input.phase === 3),
    "summary input_end_seen disagrees",
  );
  const terminalRecords: Row[] = [],
    sourceReturns: Row[] = [];
  const sources = new Map<number, Row>();
  let sourcePending: Row | undefined, sourceNeedsPairing: Row | undefined;
  const latestSourceByThread = new Map<number, number>();
  let latestCall: CapturedCall | undefined,
    releaseReturned = false,
    finalReturned = false,
    terminal = false,
    sourceCount = 0,
    completionLine = 0;
  for (const row of rows) {
    if (row.kind === "entry")
      requireValid(
        row.latest_observed_source_event_id === (latestSourceByThread.get(row.thread_id) ?? null),
        `line ${row.line}: latest native source event id disagrees`,
      );
    if (
      row.kind === "entry" &&
      pairs.get(row.call_id)?.included &&
      final.entry.caller_family === "digitizer_flush" &&
      row.line > final.exit.line &&
      !terminal
    )
      requireValid(
        false,
        `call ${row.call_id}, line ${row.line}: ingestion after final flush ${final.id} before terminal wrapper completion`,
      );
    if (row.kind === "exit" && pairs.get(row.call_id)?.included)
      latestCall = pairs.get(row.call_id);
    if (row.kind === "native_dispatch") {
      const id = integer(row.source_event_id, "source event id", 1, 2048);
      requireValid(
        id === ++sourceCount && !sources.has(id) && !sourcePending && !sourceNeedsPairing,
        `line ${row.line}: duplicate, missing or nested native source`,
      );
      integer(row.thread_id, "source thread id", 1);
      integer(row.event_kind_u32, "source event kind", 0, 0xffffffff);
      requireValid(
        row.native_release === [6, 9].includes(row.event_kind_u32),
        `line ${row.line}: native release classification differs`,
      );
      readQueue(row.queue, `line ${row.line}.queue`);
      bytes(object(row.packet, "source packet").bytes_le, 96, "source packet");
      if (latestCall)
        requireValid(row.event_kind_u32 !== 2, "native proximity reset interrupts fixture");
      sources.set(id, row);
      latestSourceByThread.set(row.thread_id, id);
      if (latestCall && (row.native_release || releaseReturned)) sourceNeedsPairing = row;
    } else if (row.kind === "native_source_pairing") {
      const source = sources.get(row.source_event_id);
      requireValid(
        latestCall &&
          source &&
          sourceNeedsPairing === source &&
          !sourcePending &&
          row.event_kind === source.event_kind_u32 &&
          row.thread_id === source.thread_id,
        `line ${row.line}: unpaired native source boundary`,
      );
      requireValid(
        [6, 9].includes(row.event_kind) || releaseReturned,
        `line ${row.line}: unsupported source return observation before release`,
      );
      sourcePending = row;
      sourceNeedsPairing = undefined;
    } else if (row.kind === "terminal_wrapper_complete") {
      readQueue(row.queue, `line ${row.line}.queue`);
      readPhase(row.phase, `line ${row.line}.phase`);
      bytes(
        object(row.input_packet, "terminal input packet").bytes_le,
        96,
        "terminal input packet",
      );
      const terminalOutput = bytes(
        object(row.output_packet, "terminal output packet").bytes_le,
        32,
        "terminal output packet",
      );
      for (const offset of [8, 16, 24])
        supported(
          Number.isFinite(terminalOutput.readDoubleLE(offset)),
          `line ${row.line}: nonfinite terminal output`,
        );
      requireValid(
        typeof row.included === "boolean" && row.included === Boolean(latestCall),
        `line ${row.line}: terminal included classification differs`,
      );
      if (row.included) {
        requireValid(
          latestCall?.id === final.id,
          `line ${row.line}: terminal wrapper must belong to final flush call ${final.id}`,
        );
        requireValid(
          final.entry.caller_family === "digitizer_flush" &&
            row.phase.value_i32 === 3 &&
            latestCall &&
            row.queue.bytes_le === latestCall.after.toString("hex"),
          `line ${row.line}: terminal wrapper does not match final flush`,
        );
        terminal = true;
        terminalRecords.push(row);
      }
    } else if (row.kind === "native_source_return") {
      requireValid(sourcePending && latestCall, `line ${row.line}: missing native source pairing`);
      for (const key of [
        "source_event_id",
        "event_kind",
        "thread_id",
        "sp",
        "return_load_address",
        "return_file_address",
      ])
        requireValid(
          row[key] === sourcePending[key],
          `line ${row.line}: source return ${key} differs`,
        );
      const raw = readQueue(row.queue, `line ${row.line}.queue`);
      const expectedReturn = Buffer.from(latestCall.after);
      expectedReturn.writeDoubleLE(latestCall.after.readInt32LE(0x50), 0x58);
      // Only this terminal boundary change was observed natively. Configuration
      // 0x102136764..768 produces H=I, but the actual writer was not traced.
      const terminalWindowReset =
        !raw.equals(latestCall.after) &&
        [6, 9].includes(row.event_kind) &&
        latestCall.id === final.id &&
        final.entry.caller_family === "digitizer_normal" &&
        latestCall.after.readInt32LE(0x88) === 0 &&
        raw.readInt32LE(0x88) === 0 &&
        raw.equals(expectedReturn);
      requireValid(
        (raw.equals(latestCall.after) || terminalWindowReset) &&
          [0, 2].includes(raw.readInt32LE(0x88)),
        `line ${row.line}: queue mutation before source return`,
      );
      requireValid(
        terminalWindowReset
          ? row.observed_terminal_window_reset === true &&
              row.terminal_window_reset_writer_observed === false
          : row.observed_terminal_window_reset === undefined ||
              row.observed_terminal_window_reset === false,
        `line ${row.line}: terminal window reset observation differs`,
      );
      if ([6, 9].includes(row.event_kind)) releaseReturned = true;
      if (raw.readInt32LE(0x88) === 0) {
        requireValid(
          final.exit.line <= row.line,
          "source returned idle without captured final phase",
        );
        if (final.entry.caller_family === "digitizer_flush")
          requireValid(terminal, "source returned before terminal wrapper completion");
        finalReturned = true;
      }
      sourceReturns.push(row);
      sourcePending = undefined;
      if (releaseReturned && finalReturned) completionLine ||= row.line;
    }
  }
  requireValid(sourceCount === summary.source_events, "summary source event count differs");
  requireValid(
    !sourcePending && !sourceNeedsPairing && releaseReturned && finalReturned,
    "missing native release/final source return; capture cannot certify terminal completion",
  );
  requireValid(
    completionLine > calls.at(-1)!.exit.line,
    "captured ingestion after final source completion",
  );
  requireValid(
    summary.terminal_wrapper_observed === terminal &&
      (final.entry.caller_family !== "digitizer_flush" || terminal),
    "missing terminal wrapper completion after final flush",
  );
  return {
    sha256: createHash("sha256").update(text).digest("hex"),
    origin,
    calls,
    excluded,
    recordCounts,
    metadata,
    summary,
    terminalRecords,
    sourceReturns,
    rows,
  };
}
