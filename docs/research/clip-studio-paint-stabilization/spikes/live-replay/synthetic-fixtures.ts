/** Synthetic, hand-calculated inputs. These are not Clip Studio Paint captures. */
import { Buffer } from "node:buffer";

export const ORIGINAL_SHA256 = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd";
export function float(value: number) {
  const raw = Buffer.alloc(8);
  raw.writeDoubleLE(value);
  return {
    bytes_le: raw.toString("hex"),
    bits: `0x${raw.readBigUInt64LE().toString(16).padStart(16, "0")}`,
    value,
  };
}
export function queue(fields: Record<string, number | bigint> = {}, base?: Buffer) {
  const raw = base ? Buffer.from(base) : Buffer.alloc(236);
  if (!base) {
    raw.writeInt32LE(200, 0x48);
    raw.writeInt32LE(25, 0x4c);
    raw.writeDoubleLE(1, 0x70);
    raw.writeInt32LE(1, 0xe0);
  }
  const doubles = [0x58, 0x60, 0x70, 0x90, 0x98, 0xa0, 0xa8, 0xb0, 0xb8, 0xc0, 0xc8, 0xd0];
  for (const [offsetText, value] of Object.entries(fields)) {
    const offset = Number(offsetText);
    if (doubles.includes(offset)) raw.writeDoubleLE(Number(value), offset);
    else if ([0x28, 0x30, 0x78, 0x80].includes(offset))
      raw.writeBigUInt64LE(BigInt.asUintN(64, BigInt(value)), offset);
    else raw.writeInt32LE(Number(value), offset);
  }
  return raw;
}
export function queueRecord(raw: Buffer) {
  return {
    address: "0x1000",
    size: 236,
    bytes_le: raw.toString("hex"),
    window_H: float(raw.readDoubleLE(0x58)),
    state_i32: raw.readInt32LE(0x88),
    processed_x: float(raw.readDoubleLE(0x90)),
    processed_y: float(raw.readDoubleLE(0x98)),
    processed_pressure: float(raw.readDoubleLE(0xb0)),
  };
}
export function phase(value: number) {
  const raw = Buffer.alloc(4);
  raw.writeInt32LE(value);
  return { address: "0x2000", bytes_le: raw.toString("hex"), value_i32: value };
}
export function register(value: bigint) {
  return {
    bits: `0x${BigInt.asUintN(64, value).toString(16).padStart(16, "0")}`,
    signed_decimal: BigInt.asIntN(64, value).toString(),
    unsigned_decimal: BigInt.asUintN(64, value).toString(),
  };
}
export function globals() {
  return Object.fromEntries(
    [
      ["emission_interval", 10, 8],
      ["terminal_mode", 0, 4],
      ["interval_option", 0, 4],
    ].map(([name, value, size]) => {
      const raw = Buffer.alloc(Number(size));
      if (size === 8) raw.writeBigInt64LE(BigInt(value));
      else raw.writeInt32LE(Number(value));
      return [name, { bytes_le: raw.toString("hex"), value }];
    }),
  );
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
export function callRows(
  id: number,
  before: Buffer,
  after: Buffer,
  input: [number, number, number],
  phaseIn: number,
  phaseOut: number,
  timestamp: number,
  emitted: boolean,
  output?: [number, number, number],
  options: { changes?: object[]; caller?: string; history?: object[]; bypass?: bigint } = {},
) {
  const caller = options.caller ?? "digitizer_normal";
  const regs = [
    0x1000n,
    0x2000n,
    BigInt(timestamp),
    0n,
    caller === "digitizer_flush" ? 0n : 1n,
    10n,
    options.bypass ?? 0n,
    0x3000n,
  ];
  return [
    {
      kind: "entry_pairing",
      call_id: id,
      thread_id: 1,
      queue: "0x1000",
      phase: "0x2000",
      output: "0x3000",
      sp: "0x4000",
      caller_family: caller,
      depth: 1,
    },
    {
      kind: "entry",
      call_id: id,
      thread_id: 1,
      caller_family: caller,
      ignored_queue: false,
      registers: Object.fromEntries(regs.map((v, i) => [`x${i}`, register(v)])),
      floating_registers: Object.fromEntries(input.map((v, i) => [`d${i}`, float(v)])),
      fpcr_bits: "0x00000000",
      fpsr_bits: "0x00000000",
      phase: phase(phaseIn),
      queue: queueRecord(before),
      configuration: Object.fromEntries(
        CONFIG.map(([name, offset]) => {
          const isDouble = [0x60, 0x70].includes(offset);
          return [
            name,
            {
              offset: `0x${offset.toString(16)}`,
              bytes_le: before.subarray(offset, offset + (isDouble ? 8 : 4)).toString("hex"),
              value: isDouble ? before.readDoubleLE(offset) : before.readInt32LE(offset),
            },
          ];
        }),
      ),
      active_globals: globals(),
      initial_history_oldest_first: id === 1 ? (options.history ?? []) : null,
      latest_observed_source_event_id: id === 3 ? 1 : null,
    },
    {
      kind: "entry_contract",
      call_id: id,
      included: true,
      begin_candidate: id === 1,
      exclusion_reason: null,
      between_call_changes: options.changes ?? [],
    },
    {
      kind: "exit",
      call_id: id,
      thread_id: 1,
      caller_family: caller,
      ignored_queue: false,
      fpcr_bits: "0x00000000",
      fpsr_bits: "0x00000000",
      w0_bits: emitted ? "0x00000001" : "0x00000000",
      emitted,
      phase: phase(phaseOut),
      queue: queueRecord(after),
      active_globals: globals(),
      ...(output
        ? {
            output: {
              address: "0x3000",
              bytes_at_08_le: output.map((v) => float(v).bytes_le).join(""),
              x: float(output[0]),
              y: float(output[1]),
              pressure: float(output[2]),
            },
          }
        : {}),
    },
  ];
}
/** S=0: raw begin, timestamp-suppressed movement, zero-pressure flush and source return. */
export function syntheticRows(): any[] {
  const initial = queue();
  const first = queue(
    {
      0x30: 1,
      0x38: 1,
      0x78: 100,
      0x80: 100,
      0x88: 1,
      0x90: 4,
      0x98: 8,
      0xb0: 0.5,
      0xb8: 4,
      0xc0: 8,
      0xc8: 0.5,
    },
    initial,
  );
  const second = queue(
    {
      0x30: 2,
      0x38: 2,
      0x80: 105,
      0x90: 8,
      0x98: 8,
      0xa0: 4,
      0xa8: 8,
      0xb8: 8,
      0xd0: 0.5,
      0xe4: 1,
    },
    first,
  );
  const preFlush = queue({ 0x88: 2, 0xe0: 0 }, second);
  const third = queue(
    {
      0x30: 3,
      0x38: 3,
      0x78: 105,
      0x80: 105,
      0x88: 0,
      0xa0: 8,
      0xb0: 0,
      0xc8: 0,
      0xe0: 1,
      0xe4: 0,
    },
    preFlush,
  );
  const changes = [0x88, 0xe0].map((offset) => ({
    offset: `0x${offset.toString(16)}`,
    before_bytes_le: second.subarray(offset, offset + 4).toString("hex"),
    after_bytes_le: preFlush.subarray(offset, offset + 4).toString("hex"),
    static_explanation: "Synthetic wrapper mutation corresponding to inspected setter",
    individual_write_instruction_observed: false,
  }));
  const source = {
    thread_id: 1,
    source_event_id: 1,
    event_kind: 6,
    sp: "0x4000",
    return_load_address: "0x100",
    return_file_address: "0x100",
  };
  return [
    {
      kind: "metadata",
      original_sha256: ORIGINAL_SHA256,
      fixture_scope: "instrumented_digitizer_queue_arithmetic",
      fixture_origin: "synthetic",
      synthetic_description: "Hand-calculated S=0 example; never captured from CSP",
      tablet_capture_implementation_live_validated: false,
    },
    ...["shared_ingestion", "digitizer_dispatch", "digitizer_terminal"].map((label) => ({
      kind: "instruction_verification",
      label,
      matches: true,
      actual_sha256: "0".repeat(64),
      expected_sha256: "0".repeat(64),
    })),
    { kind: "initial_state", queue: queueRecord(initial), active_globals: globals() },
    ...callRows(1, initial, first, [4, 8, 0.5], 2, 2, 100, true, [4, 8, 0.5]),
    ...callRows(2, first, second, [8, 8, 0.5], 1, 1, 105, false),
    {
      kind: "native_dispatch",
      ...source,
      event_kind_u32: 6,
      native_release: true,
      queue: queueRecord(second),
      active_globals: globals(),
      packet: { address: "0x6000", size: 96, bytes_le: "00".repeat(96) },
    },
    { kind: "native_source_pairing", ...source },
    ...callRows(3, preFlush, third, [8, 8, 0], 1, 3, 105, true, [8, 8, 0], {
      changes,
      caller: "digitizer_flush",
    }),
    {
      kind: "terminal_wrapper_complete",
      included: true,
      thread_id: 1,
      queue: queueRecord(third),
      phase: phase(3),
      active_globals: globals(),
      input_packet: { size: 96, bytes_le: "00".repeat(96) },
      output_packet: {
        size: 32,
        bytes_le: "00".repeat(8) + [8, 8, 0].map((v) => float(v).bytes_le).join(""),
      },
    },
    {
      kind: "native_source_return",
      ...source,
      queue: queueRecord(third),
      active_globals: globals(),
    },
    {
      kind: "summary",
      fixture_complete: true,
      fixture_scope: "instrumented_digitizer_queue_arithmetic",
      fixture_incomplete_reasons: [],
      entries: 3,
      paired_calls: 3,
      fixture_call_ids: [1, 2, 3],
      source_events: 1,
      confirmed_begin: true,
      input_end_seen: false,
      native_release_seen: true,
      native_release_returned: true,
      final_source_returned: true,
      unmatched_source_boundary: null,
      terminal_wrapper_observed: true,
      final_pair_id: 3,
      initial_history_count: 0,
      unmatched_entries: [],
      cleanup_errors: [],
      cleanup_warnings: [],
      watchdog_error: null,
      deadline_exceeded: false,
      detach_request_succeeded: true,
      detached_state_observed: true,
      owned_breakpoints: [],
      stop_reason: "digitizer_queue_fixture_complete",
    },
  ].map((row, index) => ({ elapsed_seconds: index / 1000, ...row }));
}
export function jsonl(rows: any[]) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}
