import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readCapture } from "./reader.ts";
import { replayCapture, compareNumber } from "./compare.ts";
import { QueueReplay } from "./queue.ts";
import type { Ingestion } from "./queue.ts";
import { callRows, float, jsonl, queue, queueRecord, syntheticRows } from "./synthetic-fixtures.ts";

function workqueueRecoveryRows(count = 1) {
  const rows = syntheticRows();
  const recovery = {
    stop_id: 7,
    thread_id: 99,
    reason: 6,
    data: [6, 1, 0],
    pc: "0x180001004",
    module_path: "/usr/lib/system/libsystem_pthread.dylib",
    module_uuid: "12345678-1234-1234-1234-123456789ABC",
    symbol_name: "start_wqthread",
    symbol_start: "0x180001000",
    instruction_bytes_le: "08000094200020d4",
    bl_target: "0x180001024",
    bl_target_symbol: "_pthread_wqthread",
    bl_target_symbol_start: "0x180001024",
    bl_target_module_uuid: "12345678-1234-1234-1234-123456789ABC",
    owned_thread_id: 1,
    owned_breakpoint_id: 1,
    owned_breakpoint_location_id: 1,
    owned_breakpoint_pc: "0x1021367c0",
    owned_breakpoint_hardware: true,
    secondary_pending_ingestion: false,
    secondary_source_role: false,
    secondary_capture_role: false,
    recovery_index: 1,
    recovery_limit: 4,
    action: "preserve_owned_callback_and_resume_without_target_writes",
  };
  const probes = [
    [1, "shared_ingestion_entry", "0x1021367c0"],
    [2, "shared_ingestion_exit", "0x1021369ac"],
    [3, "digitizer_terminal_complete", "0x1020bdf38"],
    [4, "digitizer_native_dispatch", "0x1020bdb6c"],
  ];
  const inserted: any[] = probes.map(([id, label, pc]) => ({
    kind: "breakpoint_install",
    label,
    command: `breakpoint set --hardware --address ${pc}`,
    output: "synthetic hardware observation",
    error: "",
    ids: [id],
  }));
  rows.splice(
    rows.findIndex((row) => row.kind === "entry_pairing"),
    0,
    ...inserted,
  );
  const boundaries = rows.filter((row) =>
    ["entry_pairing", "exit", "native_dispatch"].includes(row.kind),
  );
  const recoveries = [];
  for (let index = 0; index < count; index++) {
    const boundary = boundaries[index];
    const probe =
      boundary.kind === "entry_pairing"
        ? probes[0]
        : boundary.kind === "exit"
          ? probes[1]
          : probes[3];
    const detail = {
      ...recovery,
      stop_id: 7 + index,
      thread_id: 99 + index,
      recovery_index: index + 1,
      owned_breakpoint_id: probe[0],
      owned_breakpoint_pc: probe[2],
    };
    recoveries.push(detail);
    rows.splice(
      rows.indexOf(boundary),
      0,
      { kind: "capture_state_event", process_unique_id: 10, state: 5, restarted: false },
      { kind: "thread_stop", thread_id: 1, reason: 3, data: [probe[0], 1] },
      { kind: "thread_stop", thread_id: detail.thread_id, reason: 6, data: [6, 1, 0] },
      { kind: "workqueue_step_recovery", ...detail },
    );
  }
  rows.at(-1).owned_breakpoints = [1, 2, 3, 4];
  rows.at(-1).workqueue_step_recoveries = structuredClone(recoveries);
  rows.at(-1).capture_warnings = ["Synthetic bounded workqueue recovery; timing is instrumented."];
  return rows.map((row, index) => ({ ...row, elapsed_seconds: index / 1000 }));
}

test("reader accepts a fully evidenced workqueue recovery without changing arithmetic", () => {
  const report = replayCapture(readCapture(jsonl(workqueueRecoveryRows())));
  assert.equal(report.status, "exact_match");
  assert.equal(report.calls.length, 3);
});

function updateRecoverySummary(rows: any[]) {
  rows.at(-1).workqueue_step_recoveries = rows
    .filter((row) => row.kind === "workqueue_step_recovery")
    .map(({ kind: _kind, elapsed_seconds: _elapsedSeconds, ...detail }) => structuredClone(detail));
  return rows.map((row, index) => ({ ...row, elapsed_seconds: index / 1000 }));
}

test("reader accepts at most four independently evidenced workqueue recoveries", () => {
  assert.equal(replayCapture(readCapture(jsonl(workqueueRecoveryRows(4)))).status, "exact_match");
  assert.throws(() => readCapture(jsonl(workqueueRecoveryRows(5))), /recovery/i);
});

test("workqueue recovery must preserve the owned callback thread", () => {
  const rows = workqueueRecoveryRows();
  rows.find((row) => row.kind === "workqueue_step_recovery").owned_thread_id = 9;
  rows.find((row) => row.kind === "thread_stop" && row.reason === 3).thread_id = 9;
  assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery.*callback/i);
});

test("workqueue recovery must invoke the callback associated with its probe", () => {
  const rows = workqueueRecoveryRows();
  const recovery = rows.find((row) => row.kind === "workqueue_step_recovery");
  recovery.owned_breakpoint_id = 3;
  recovery.owned_breakpoint_pc = "0x1020bdf38";
  rows.find((row) => row.kind === "thread_stop" && row.reason === 3).data = [3, 1];
  assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery.*callback/i);
});

test("workqueue recovery cannot skip its callback before another stop or recovery", () => {
  const rows = workqueueRecoveryRows(2);
  const second = rows.findIndex(
    (row) => row.kind === "workqueue_step_recovery" && row.recovery_index === 2,
  );
  const block = rows.splice(second - 3, 4);
  rows.splice(
    rows.findIndex((row) => row.kind === "entry_pairing"),
    0,
    ...block,
  );
  assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery.*callback/i);
});

for (const [field, value] of [
  ["reason", 3],
  ["data", [6, 1, 1]],
  ["pc", "0x180001008"],
  ["module_path", "/tmp/libsystem_pthread.dylib"],
  ["module_uuid", "unknown"],
  ["symbol_name", "other_thread"],
  ["instruction_bytes_le", "08000014200020d4"],
  ["instruction_bytes_le", "08000094000020d4"],
  ["bl_target", "0x180001028"],
  ["bl_target_symbol", "other_worker"],
  ["bl_target_symbol_start", "0x180001028"],
  ["bl_target_module_uuid", "00000000-1234-1234-1234-123456789ABC"],
  ["owned_thread_id", 99],
  ["owned_breakpoint_id", 5],
  ["owned_breakpoint_location_id", 2],
  ["owned_breakpoint_pc", "0x1021367c4"],
  ["owned_breakpoint_hardware", false],
  ["secondary_pending_ingestion", true],
  ["secondary_source_role", true],
  ["secondary_capture_role", true],
  ["recovery_index", 2],
  ["recovery_limit", 5],
  ["action", "continue_any_exception"],
] as const)
  test(`workqueue recovery rejects invalid ${field}=${JSON.stringify(value)}`, () => {
    const rows = workqueueRecoveryRows();
    rows.find((row) => row.kind === "workqueue_step_recovery")[field] = value;
    assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery/i);
  });

test("workqueue recovery requires matching stop records and a nonrestarted stopped event", () => {
  for (const mutate of [
    (rows: any[]) =>
      rows.splice(
        rows.findIndex((row) => row.kind === "thread_stop" && row.reason === 6),
        1,
      ),
    (rows: any[]) => {
      rows.find((row) => row.kind === "thread_stop" && row.reason === 6).data = [6, 1, 2];
    },
    (rows: any[]) => {
      rows.find((row) => row.kind === "capture_state_event").restarted = true;
    },
    (rows: any[]) => {
      rows.find((row) => row.kind === "capture_state_event").state = 6;
    },
    (rows: any[]) =>
      rows.splice(
        rows.findIndex((row) => row.kind === "workqueue_step_recovery"),
        0,
        { kind: "thread_stop", thread_id: 3, reason: 3, data: [2, 1] },
      ),
  ]) {
    const rows = workqueueRecoveryRows();
    mutate(rows);
    assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery/i);
  }
});

test("workqueue recovery requires a currently installed hardware probe", () => {
  const rows = workqueueRecoveryRows();
  rows.find((row) => row.kind === "breakpoint_install" && row.ids[0] === 1).command =
    "breakpoint set --address 0x1021367c0";
  assert.throws(() => readCapture(jsonl(rows)), /recovery/i);
});

test("workqueue recovery refuses the same secondary thread twice", () => {
  const rows = workqueueRecoveryRows(2);
  rows.filter((row) => row.kind === "workqueue_step_recovery")[1].thread_id = 99;
  rows.filter((row) => row.kind === "thread_stop" && row.reason === 6)[1].thread_id = 99;
  assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery/i);
});

test("workqueue recovery summary must contain exactly the recorded details", () => {
  for (const summary of [undefined, [], [{ thread_id: 99 }]]) {
    const rows = workqueueRecoveryRows();
    rows.at(-1).workqueue_step_recoveries = summary;
    assert.throws(() => readCapture(jsonl(rows)), /recovery/i);
  }
});

test("workqueue recovery cannot override incomplete capture or failed cleanup", () => {
  for (const [field, value] of [
    ["fixture_complete", false],
    ["cleanup_errors", ["delete failed"]],
  ]) {
    const rows = workqueueRecoveryRows();
    rows.at(-1)[field as string] = value;
    assert.throws(() => readCapture(jsonl(rows)), /incomplete|cleanup/i);
  }
});

test("legacy captures may omit recovery metadata, but cannot claim unrecorded recoveries", () => {
  assert.equal(replayCapture(readCapture(jsonl(syntheticRows()))).status, "exact_match");
  const rows = syntheticRows();
  rows.at(-1).workqueue_step_recoveries = [];
  assert.equal(replayCapture(readCapture(jsonl(rows))).status, "exact_match");
  rows.at(-1).workqueue_step_recoveries = workqueueRecoveryRows().at(-1).workqueue_step_recoveries;
  assert.throws(() => readCapture(jsonl(rows)), /recovery/i);
});

test("zero-recovery legacy fixtures retain existing audit-record handling", () => {
  const rows = syntheticRows();
  rows.splice(1, 0, {
    kind: "source_breakpoint_rotated",
    previous_id: 4,
    current_id: 5,
    label: "native_source_return",
    load_address: "0x102100000",
    active_owned_breakpoints: 4,
  });
  const numbered = rows.map((row, index) => ({ ...row, elapsed_seconds: index / 1000 }));
  assert.equal(replayCapture(readCapture(jsonl(numbered))).status, "exact_match");
});

test("workqueue recovery cross-checks prior secondary-thread roles despite false flags", () => {
  for (const provenance of [
    [{ kind: "entry_pairing", thread_id: 99, call_id: 90 }],
    [{ kind: "native_source_pairing", thread_id: 99 }],
    [
      { kind: "entry_pairing", thread_id: 99, call_id: 90 },
      { kind: "exit", thread_id: 99, call_id: 90 },
    ],
    [{ kind: "thread_stop", thread_id: 99, reason: 3, data: [1, 1] }],
  ]) {
    const rows = workqueueRecoveryRows();
    rows.splice(
      rows.findIndex((row) => row.kind === "capture_state_event"),
      0,
      ...provenance,
    );
    assert.throws(
      () => readCapture(jsonl(updateRecoverySummary(rows))),
      /secondary thread.*provenance/,
    );
  }
});

test("workqueue recovery tracks source probe rotation and rejects its removed ID", () => {
  const rows = workqueueRecoveryRows();
  const stopIndex = rows.findIndex((row) => row.kind === "capture_state_event");
  const recoveryStop = rows.splice(stopIndex, 4);
  rows.splice(
    rows.findIndex((row) => row.kind === "native_source_return"),
    0,
    {
      kind: "breakpoint_install",
      label: "native_source_return",
      ids: [5],
      error: "",
      command: "breakpoint set --hardware --address 0x102100000",
    },
    {
      kind: "source_breakpoint_rotated",
      previous_id: 4,
      current_id: 5,
      label: "native_source_return",
      load_address: "0x102100000",
      active_owned_breakpoints: 4,
    },
    ...recoveryStop,
  );
  const recovery = rows.find((row) => row.kind === "workqueue_step_recovery");
  recovery.owned_breakpoint_id = 5;
  recovery.owned_breakpoint_pc = "0x102100000";
  rows.find((row) => row.kind === "thread_stop" && row.reason === 3).data = [5, 1];
  rows.at(-1).owned_breakpoints = [1, 2, 3, 5];
  assert.equal(
    replayCapture(readCapture(jsonl(updateRecoverySummary(rows)))).status,
    "exact_match",
  );
  recovery.owned_breakpoint_id = 4;
  recovery.owned_breakpoint_pc = "0x1020bdb6c";
  rows.find((row) => row.kind === "thread_stop" && row.reason === 3).data = [4, 1];
  assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /current hardware probe/);
});

test("workqueue recovery accepts matching dispatch and terminal callbacks", () => {
  for (const [kind, id, pc] of [
    ["native_dispatch", 4, "0x1020bdb6c"],
    ["terminal_wrapper_complete", 3, "0x1020bdf38"],
  ] as const) {
    const rows = workqueueRecoveryRows();
    const block = rows.splice(
      rows.findIndex((row) => row.kind === "capture_state_event"),
      4,
    );
    const recovery = block.find((row) => row.kind === "workqueue_step_recovery");
    recovery.owned_breakpoint_id = id;
    recovery.owned_breakpoint_pc = pc;
    block.find((row) => row.kind === "thread_stop" && row.reason === 3).data = [id, 1];
    rows.splice(
      rows.findIndex((row) => row.kind === kind),
      0,
      ...block,
    );
    assert.equal(
      replayCapture(readCapture(jsonl(updateRecoverySummary(rows)))).status,
      "exact_match",
    );
  }
});

test("workqueue recovery decodes a backward BL and requires a retained warning", () => {
  const rows = workqueueRecoveryRows();
  const recovery = rows.find((row) => row.kind === "workqueue_step_recovery");
  recovery.instruction_bytes_le = "feffff97200020d4";
  recovery.bl_target = recovery.bl_target_symbol_start = "0x180000ffc";
  assert.equal(
    replayCapture(readCapture(jsonl(updateRecoverySummary(rows)))).status,
    "exact_match",
  );
  rows.at(-1).capture_warnings = [];
  assert.throws(() => readCapture(jsonl(updateRecoverySummary(rows))), /recovery.*warning/);
});

function normalReleaseWindowResetRows() {
  const rows = syntheticRows().filter((row) => row.kind !== "terminal_wrapper_complete");
  for (const row of rows.filter((row) => row.call_id === 3)) {
    if (row.caller_family) row.caller_family = "digitizer_normal";
    if (row.kind === "entry") {
      row.queue = queueRecord(queue({ 0x88: 1, 0xe0: 1 }, Buffer.from(row.queue.bytes_le, "hex")));
      row.phase = { ...row.phase, bytes_le: "03000000", value_i32: 3 };
      row.registers.x4 = { bits: "0x0000000000000001", signed_decimal: "1", unsigned_decimal: "1" };
    }
    if (row.kind === "entry_contract") row.between_call_changes = [];
    if (row.kind === "exit")
      row.queue = queueRecord(queue({ 0x58: 5.5 }, Buffer.from(row.queue.bytes_le, "hex")));
  }
  rows.at(-1).input_end_seen = true;
  rows.at(-1).terminal_wrapper_observed = false;
  const returned = rows.find((row) => row.kind === "native_source_return");
  returned.observed_terminal_window_reset = true;
  returned.terminal_window_reset_writer_observed = false;
  return rows;
}

test("normal final release return permits H resetting exactly to I without altering captured arithmetic", () => {
  const capture = readCapture(jsonl(normalReleaseWindowResetRows()));
  assert.equal(capture.calls.at(-1)!.after.readDoubleLE(0x58), 5.5);
  assert.equal(Buffer.from(capture.sourceReturns[0].queue.bytes_le, "hex").readDoubleLE(0x58), 0);
});

test("terminal window reset requires an explicit observed boundary with an unresolved writer", () => {
  for (const field of ["observed_terminal_window_reset", "terminal_window_reset_writer_observed"]) {
    const rows = normalReleaseWindowResetRows();
    delete rows.find((row) => row.kind === "native_source_return")[field];
    assert.throws(() => readCapture(jsonl(rows)), /mutation|window reset/);
  }
});

for (const [offset, value] of [
  [0x58, 0.5],
  [0x90, 9],
  [0x50, 1],
  [0x88, 2],
])
  test(`final release window reset cannot hide mutation at ${offset.toString(16)}`, () => {
    const rows = normalReleaseWindowResetRows();
    const returned = rows.find((row) => row.kind === "native_source_return");
    returned.queue = queueRecord(
      queue({ [offset]: value }, Buffer.from(returned.queue.bytes_le, "hex")),
    );
    assert.throws(() => readCapture(jsonl(rows)), /mutation|configuration/);
  });

test("hand-calculated synthetic begin, suppressed call, terminal flush and source return", () => {
  const report = replayCapture(readCapture(jsonl(syntheticRows())));
  assert.equal(report.status, "exact_match");
  assert.equal(report.fixtureOrigin, "synthetic");
  assert.deepEqual(
    report.calls.map((call) => call.predicted.emitted),
    [true, false, true],
  );
  assert.equal(report.calls[1].predicted.phase, 1);
  assert.equal(report.calls[1].predicted.state, 1);
  assert.equal(report.calls[2].predicted.phase, 3);
  assert.equal(report.terminalComparisons[0].callId, 3);
});

test("deleted breakpoint IDs retained in the summary do not reject a completed capture", () => {
  const rows = syntheticRows();
  rows.at(-1).owned_breakpoints = [1, 2, 3, 6];
  const report = replayCapture(readCapture(jsonl(rows)));
  assert.equal(report.status, "exact_match");
  assert.equal(report.calls.length, 3);
});

for (const ids of [
  null,
  [0],
  [-1],
  [1.5],
  ["1"],
  [Number.MAX_SAFE_INTEGER + 1],
  [1, 1],
  [1, 2, 3, 4, 5],
])
  test(`summary rejects malformed owned breakpoint IDs ${JSON.stringify(ids)}`, () => {
    const rows = syntheticRows();
    rows.at(-1).owned_breakpoints = ids;
    assert.throws(() => readCapture(jsonl(rows)), /breakpoint/i);
  });

for (const [field, value] of [
  ["cleanup_errors", ["Could not delete own breakpoint 3"]],
  ["detach_request_succeeded", false],
  ["detached_state_observed", false],
] as const)
  test(`retained breakpoint IDs cannot override failed ${field}`, () => {
    const rows = syntheticRows();
    rows.at(-1).owned_breakpoints = [1, 2, 3, 6];
    rows.at(-1)[field] = value;
    assert.throws(() => readCapture(jsonl(rows)), new RegExp(field));
  });

test("S=2 starts from captured hover history and averages newest first", () => {
  const replay = new QueueReplay(queue({ 0x30: 1, 0x38: 1, 0x3c: 2, 0x50: 2, 0x58: 2 }), [
    { x: 0, y: 4, pressure: 0, timestamp: 90n },
  ]);
  const result = replay.ingest({
    x: 4,
    y: 8,
    pressure: 0.5,
    timestamp: 100n,
    phase: 2,
    catchUp: false,
    gating: true,
    interval: 10n,
    bypass: false,
  });
  assert.deepEqual(result.output, { x: 2, y: 6, pressure: 0.25 });
  assert.equal(replay.raw.readBigInt64LE(0x80), 90n);
  assert.equal(replay.raw.readDoubleLE(0xc8), 0.5);
  assert.equal(replay.raw.readInt32LE(0x88), 1);
});

test("bypass preserves every queue byte, phase and history", () => {
  const raw = queue({ 0x3c: 2, 0x50: 2, 0x58: 2 });
  const replay = new QueueReplay(raw, []);
  const result = replay.ingest({
    x: 9,
    y: -2,
    pressure: 0.75,
    timestamp: 3n,
    phase: 3,
    catchUp: false,
    gating: true,
    interval: 10n,
    bypass: true,
  });
  assert.deepEqual(result, { emitted: true, phase: 3, output: { x: 9, y: -2, pressure: 0.75 } });
  assert.deepEqual(replay.raw, raw);
  assert.equal(replay.history.length, 0);
});

test("history cap removes oldest record while preserving suppressed processing", () => {
  const history = Array.from({ length: 1000 }, (_, i) => ({
    x: i,
    y: 0,
    pressure: 0.5,
    timestamp: BigInt(i),
  }));
  const replay = new QueueReplay(queue({ 0x30: 1000, 0x38: 1000, 0x88: 1, 0x78: 999 }), history);
  const result = replay.ingest({
    x: 1000,
    y: 0,
    pressure: 0.5,
    timestamp: 1000n,
    phase: 1,
    catchUp: false,
    gating: true,
    interval: 10n,
    bypass: false,
  });
  assert.equal(result.emitted, false);
  assert.equal(replay.history.length, 1000);
  assert.equal(replay.history[0].x, 1);
  assert.equal(replay.raw.readInt32LE(0x38), 1000);
  assert.equal(replay.raw.readDoubleLE(0x90), 1000);
});

for (const [label, corrupt, pattern] of [
  [
    "missing exit",
    (rows: any[]) => rows.filter((row) => !(row.kind === "exit" && row.call_id === 2)),
    /unpaired|exit/i,
  ],
  [
    "duplicate pair",
    (rows: any[]) => [
      ...rows.slice(0, -1),
      { ...rows.find((row) => row.kind === "exit"), elapsed_seconds: rows.at(-1).elapsed_seconds },
      rows.at(-1),
    ],
    /duplicate|unpaired/i,
  ],
  [
    "missing begin history",
    (rows: any[]) => {
      delete rows.find((row) => row.kind === "entry").initial_history_oldest_first;
      return rows;
    },
    /history/i,
  ],
  [
    "missing contract",
    (rows: any[]) => rows.filter((row) => !(row.kind === "entry_contract" && row.call_id === 2)),
    /contract/i,
  ],
  [
    "missing terminal",
    (rows: any[]) => rows.filter((row) => row.kind !== "terminal_wrapper_complete"),
    /terminal/i,
  ],
  [
    "missing source return",
    (rows: any[]) => rows.filter((row) => row.kind !== "native_source_return"),
    /source|return/i,
  ],
  [
    "missing wrapper changes",
    (rows: any[]) => {
      rows.find((row) => row.kind === "entry_contract" && row.call_id === 3).between_call_changes =
        [];
      return rows;
    },
    /mutation|changes/i,
  ],
  [
    "unsupported FPCR",
    (rows: any[]) => {
      rows.find((row) => row.kind === "entry").fpcr_bits = "0x01000000";
      return rows;
    },
    /FPCR/i,
  ],
  [
    "nonfinite input",
    (rows: any[]) => {
      rows.find((row) => row.kind === "entry").floating_registers.d0 = {
        ...float(Infinity),
        value: "inf",
      };
      return rows;
    },
    /finite/i,
  ],
  [
    "unknown record",
    (rows: any[]) => {
      rows.splice(3, 0, { kind: "future_schema", elapsed_seconds: 0.001 });
      return rows;
    },
    /unsupported.*record/i,
  ],
  [
    "changed globals",
    (rows: any[]) => {
      rows.find((row) => row.kind === "entry").active_globals.terminal_mode.value = 1;
      return rows;
    },
    /global|bytes/i,
  ],
  [
    "incomplete summary",
    (rows: any[]) => {
      rows.at(-1).fixture_complete = false;
      return rows;
    },
    /incomplete/i,
  ],
] as const)
  test(`strict saved-file reader rejects ${label}`, () =>
    assert.throws(() => readCapture(jsonl(corrupt(syntheticRows()))), pattern));

test("truncated JSONL and absent summary cannot pass", () => {
  const text = jsonl(syntheticRows());
  assert.throws(() => readCapture(text.slice(0, -1)), /newline|truncat/i);
  assert.throws(() => readCapture(text.slice(0, -100)), /newline|truncat/i);
  assert.throws(() => readCapture(jsonl(syntheticRows().slice(0, -1))), /summary/i);
});

test("all numeric differences include absolute and ULP distances, including signed zero", () => {
  assert.deepEqual(compareNumber(1, 1 + Number.EPSILON), {
    expected: 1,
    actual: 1 + Number.EPSILON,
    expectedBits: "0x3ff0000000000000",
    actualBits: "0x3ff0000000000001",
    exact: false,
    absoluteError: Number.EPSILON,
    ulpDistance: "1",
  });
  assert.equal(compareNumber(-0, 0).exact, false);
  assert.equal(compareNumber(-0, 0).ulpDistance, "1");
});

test("numeric mismatch remains visible and predicted state is never reseeded to force agreement", () => {
  const rows = syntheticRows();
  const firstExit = rows.find((row) => row.kind === "exit");
  const changed = Buffer.from(firstExit.queue.bytes_le, "hex");
  changed.writeDoubleLE(4 + Number.EPSILON * 4, 0x90);
  firstExit.queue = queueRecord(changed);
  rows.find((row) => row.kind === "entry" && row.call_id === 2).queue = queueRecord(changed);
  const report = replayCapture(readCapture(jsonl(rows)));
  assert.equal(report.status, "differences");
  const difference = report.calls[0].differences.find((row) => row.field === "queue.processed_x");
  assert.equal(difference?.numeric?.ulpDistance, "1");
  assert.equal(report.calls[1].predicted.emitted, false);
});

test("incorrect emitted result reports control mismatch", () => {
  const rows = syntheticRows();
  const suppressed = rows.find((row) => row.kind === "exit" && row.call_id === 2);
  suppressed.emitted = true;
  suppressed.w0_bits = "0x00000001";
  suppressed.output = {
    address: "0x3000",
    bytes_at_08_le: [8, 8, 0.5].map((v) => float(v).bytes_le).join(""),
    x: float(8),
    y: float(8),
    pressure: float(0.5),
  };
  const report = replayCapture(readCapture(jsonl(rows)));
  assert.equal(report.status, "differences");
  assert.ok(report.calls[1].differences.some((row) => row.field === "emitted"));
});

test("unexpected nonzero return register does not pass as a matching true value", () => {
  const rows = syntheticRows();
  rows.find((row) => row.kind === "exit").w0_bits = "0x00000002";
  const report = replayCapture(readCapture(jsonl(rows)));
  assert.equal(report.status, "differences");
  assert.ok(report.calls[0].differences.some((row) => row.field === "return_w0_bits"));
});

test("terminal packet numeric differences are compared with the final predicted emission", () => {
  const rows = syntheticRows();
  const terminal = rows.find((row) => row.kind === "terminal_wrapper_complete");
  const raw = Buffer.from(terminal.output_packet.bytes_le, "hex");
  raw.writeDoubleLE(9, 8);
  terminal.output_packet.bytes_le = raw.toString("hex");
  const report = replayCapture(readCapture(jsonl(rows)));
  assert.equal(report.status, "differences");
  assert.equal(report.terminalComparisons[0].differences[0].field, "terminal.output.x");
  assert.equal(report.terminalComparisons[0].numeric.x.absoluteError, 1);
});

test("reader rejects ingestion between final flush emission and terminal wrapper completion", () => {
  const rows = syntheticRows();
  const finalExit = rows.find((row) => row.kind === "exit" && row.call_id === 3);
  const finalRaw = Buffer.from(finalExit.queue.bytes_le, "hex");
  const extra = callRows(4, finalRaw, finalRaw, [8, 8, 0], 1, 1, 105, true, [8, 8, 0], {
    bypass: 1n,
  });
  (extra.find((row) => row.kind === "entry") as any).latest_observed_source_event_id = 1;
  rows.splice(
    rows.findIndex((row) => row.kind === "terminal_wrapper_complete"),
    0,
    ...extra,
  );
  const summary = rows.at(-1);
  summary.entries = 4;
  summary.paired_calls = 4;
  summary.fixture_call_ids = [1, 2, 3, 4];
  rows.forEach((row, index) => {
    row.elapsed_seconds = index / 1000;
  });
  assert.throws(
    () => readCapture(jsonl(rows)),
    /after final flush.*before terminal|terminal.*final flush call/i,
  );
});

const input = (overrides: Partial<Ingestion> = {}): Ingestion => ({
  x: 10,
  y: 0,
  pressure: 0.5,
  timestamp: 100n,
  phase: 1,
  catchUp: false,
  gating: false,
  interval: 10n,
  bypass: false,
  ...overrides,
});

test("fixed dispatch grows H before fractional average and records whole-weight timestamp", () => {
  const replay = new QueueReplay(queue({ 0x30: 1, 0x38: 1, 0x3c: 4, 0x50: 2, 0x58: 2, 0x88: 1 }), [
    { x: 0, y: 0, pressure: 0.5, timestamp: 90n },
  ]);
  const result = replay.ingest(input());
  assert.equal(replay.raw.readDoubleLE(0x58), 2.5);
  assert.deepEqual(result.output, { x: 4, y: 0, pressure: 0.5 });
  assert.equal(replay.raw.readBigInt64LE(0x80), 90n);
});

test("fast expired preceding timestamp skips average and does not fall back to fixed", () => {
  const replay = new QueueReplay(
    queue({ 0x30: 1, 0x38: 1, 0x3c: 4, 0x40: 1, 0x50: 2, 0x58: 2, 0x60: 108, 0x88: 1 }),
    [{ x: 0, y: 0, pressure: 0.5, timestamp: -901n }],
  );
  const result = replay.ingest(input());
  assert.equal(replay.raw.readDoubleLE(0x58), 2);
  assert.deepEqual(result.output, { x: 10, y: 0, pressure: 0.5 });
  assert.equal(replay.raw.readBigInt64LE(0x80), 100n);
});

test("fast distance of D gives no H change and averages two records", () => {
  const replay = new QueueReplay(
    queue({ 0x30: 1, 0x38: 1, 0x3c: 4, 0x40: 1, 0x50: 2, 0x58: 2, 0x60: 108, 0x88: 1 }),
    [{ x: 0, y: 0, pressure: 0.5, timestamp: 90n }],
  );
  assert.deepEqual(replay.ingest(input({ x: 108 })).output, { x: 54, y: 0, pressure: 0.5 });
  assert.equal(replay.raw.readDoubleLE(0x58), 2);
});

test("finite fast-mode coordinates can overflow distance while retaining finite output", () => {
  const replay = new QueueReplay(
    queue({ 0x30: 1, 0x38: 1, 0x3c: 20, 0x40: 1, 0x50: 2, 0x58: 2, 0x60: 140, 0x88: 1 }),
    [{ x: 0, y: 0, pressure: 0.5, timestamp: 90n }],
  );
  assert.deepEqual(replay.ingest(input({ x: 0, y: 1e200 })).output, {
    x: 0,
    y: 5e199,
    pressure: 0.5,
  });
  assert.equal(replay.raw.readDoubleLE(0x58), 2);
});

test("slow first backward pressure boundary may fail average with H below one", () => {
  const replay = new QueueReplay(queue({ 0x30: 1, 0x38: 1, 0x3c: 30, 0x44: 1, 0x50: 2, 0x58: 2 }), [
    { x: 0, y: 0, pressure: 0, timestamp: 90n },
  ]);
  const result = replay.ingest(input({ phase: 2 }));
  assert.equal(replay.raw.readDoubleLE(0x58), 0.25);
  assert.deepEqual(result.output, { x: 10, y: 0, pressure: 0.5 });
  assert.equal(replay.raw.readBigInt64LE(0x80), 100n);
  assert.equal(result.phase, 2);
});

test("stationary slow path skips caps and pads current sample across initial H", () => {
  const replay = new QueueReplay(queue({ 0x3c: 30, 0x44: 1, 0x50: 2, 0x58: 2 }), []);
  assert.deepEqual(replay.ingest(input({ phase: 2 })).output, { x: 10, y: 0, pressure: 0.5 });
  assert.equal(replay.raw.readDoubleLE(0x58), 2);
});

test("zero-pressure extrapolation is saved before pressure ending interpolation", () => {
  const replay = new QueueReplay(
    queue({ 0x88: 1, 0x90: 4, 0x98: 8, 0xb0: 0.25, 0xc8: 0.125, 0xd0: 0.5 }),
    [],
  );
  const result = replay.ingest(input({ x: 13, y: 8, pressure: 0 }));
  assert.equal(replay.raw.readDoubleLE(0xc8), -0.2);
  assert.equal(replay.raw.readDoubleLE(0xd0), 0.125);
  assert.equal(result.phase, 3);
  assert.equal(result.output!.pressure, 0);
  assert.equal(result.output!.x, 9);
});

test("consuming phase 3 skips ending geometry, then next packet can end", () => {
  const replay = new QueueReplay(queue({ 0x88: 1, 0x90: 10, 0xa0: 0, 0xb0: 0.5 }), []);
  const first = replay.ingest(input({ x: 9, phase: 3 }));
  assert.equal(first.phase, 1);
  assert.equal(replay.raw.readInt32LE(0x88), 2);
  const second = replay.ingest(input({ x: 9.5 }));
  assert.equal(second.phase, 3);
  assert.equal(replay.raw.readInt32LE(0x88), 0);
  assert.equal(second.output!.pressure, 0.5);
});

test("remembered skip gate keeps caller phase 3 unchanged on suppressed ending input", () => {
  const replay = new QueueReplay(queue({ 0x88: 1, 0xe8: 2, 0xb0: 0.5 }), []);
  const result = replay.ingest(input({ phase: 3, gating: true }));
  assert.equal(result.emitted, false);
  assert.equal(result.phase, 3);
  assert.equal(replay.raw.readInt32LE(0x88), 2);
  assert.equal(replay.raw.readInt32LE(0xe0), 0);
  assert.equal(replay.raw.readInt32LE(0xe4), 1);
  assert.equal(replay.raw.readDoubleLE(0x90), 10);
});

test("reader requires active global snapshots on every arithmetic boundary", () => {
  const rows = syntheticRows();
  delete rows.find((row) => row.kind === "entry").active_globals;
  assert.throws(() => readCapture(jsonl(rows)), /active_globals/);
});

test("CLI reads saved files, saves requested reports, returns failures, and never overwrites", () => {
  const directory = mkdtempSync(join(tmpdir(), "csp-offline-replay-test-"));
  const capture = join(directory, "synthetic.jsonl"),
    report = join(directory, "report.json");
  const cli = fileURLToPath(new URL("./compare-capture.ts", import.meta.url));
  try {
    const original = jsonl(syntheticRows());
    writeFileSync(capture, original);
    const run = (...args: string[]) =>
      spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 10000 });
    const exact = run(capture, "--report", report);
    assert.equal(exact.status, 0, exact.stderr);
    assert.equal(JSON.parse(readFileSync(report, "utf8")).status, "exact_match");
    assert.equal(readFileSync(capture, "utf8"), original);
    const again = run(capture, "--report", report);
    assert.equal(again.status, 2);
    assert.match(again.stderr, /EEXIST/);
    assert.equal(run(capture, "--report", capture).status, 2);
    assert.equal(readFileSync(capture, "utf8"), original);
    writeFileSync(capture, original.slice(0, -20));
    const incomplete = run(capture);
    assert.equal(incomplete.status, 2);
    assert.equal(JSON.parse(incomplete.stdout).status, "invalid_capture");
    const rows = syntheticRows();
    const first = rows.find((row) => row.kind === "exit");
    first.output.x = float(4 + Number.EPSILON * 4);
    first.output.bytes_at_08_le =
      first.output.x.bytes_le + first.output.y.bytes_le + first.output.pressure.bytes_le;
    writeFileSync(capture, jsonl(rows));
    const mismatch = run(capture);
    assert.equal(mismatch.status, 1);
    assert.equal(JSON.parse(mismatch.stdout).status, "differences");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
