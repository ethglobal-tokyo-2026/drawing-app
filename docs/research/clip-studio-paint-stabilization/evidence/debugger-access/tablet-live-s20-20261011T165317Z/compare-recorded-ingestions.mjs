// Diagnostic replay of recorded ingestion pairs; never certifies capture completion.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { QueueReplay, FLOAT_FIELDS, INT_FIELDS, BIGINT_FIELDS, validateQueue } from "../../../spikes/live-replay/queue.ts";
import { compareNumber } from "../../../spikes/live-replay/compare.ts";

const text = readFileSync(process.argv[2], "utf8");
const rows = text.trimEnd().split("\n").map(JSON.parse);
const summary = rows.at(-1);
assert.equal(summary.kind, "summary");
const ids = summary.fixture_call_ids;
assert.ok(ids.length > 0 && new Set(ids).size === ids.length);
const one = (kind, id) => {
  const found = rows.filter(r => r.kind === kind && r.call_id === id);
  assert.equal(found.length, 1, `${kind} for call ${id}`);
  return found[0];
};
const rawQueue = row => Buffer.from(row.queue.bytes_le, "hex");
const first = one("entry", ids[0]);
assert.equal(first.phase.value_i32, 2);
assert.equal(first.queue.state_i32, 0);
const history = first.initial_history_oldest_first.map(record => {
  const raw = Buffer.from(record.bytes_le, "hex");
  assert.equal(raw.length, 32);
  return { x: raw.readDoubleLE(0), y: raw.readDoubleLE(8), pressure: raw.readDoubleLE(16), timestamp: raw.readBigInt64LE(24) };
});
const replay = new QueueReplay(rawQueue(first), history);
const differences = [];
const numeric = [];
function compareQueue(callId, stage, expected, actual) {
  validateQueue(actual, `${callId} ${stage}`);
  for (const [field, offset] of FLOAT_FIELDS) {
    const result = compareNumber(expected.readDoubleLE(offset), actual.readDoubleLE(offset));
    numeric.push({ callId, stage, field, ...result });
    if (!result.exact) differences.push({ callId, stage, field, ...result });
  }
  for (const [field, offset] of INT_FIELDS) {
    const predicted = expected.readInt32LE(offset), observed = actual.readInt32LE(offset);
    if (predicted !== observed) differences.push({ callId, stage, field, predicted, observed });
  }
  for (const [field, offset] of BIGINT_FIELDS) {
    const predicted = expected.readBigUInt64LE(offset).toString(), observed = actual.readBigUInt64LE(offset).toString();
    if (predicted !== observed) differences.push({ callId, stage, field, predicted, observed });
  }
  for (const [start, end] of [[0, 8], [0x54, 0x58], [0x6c, 0x70], [0x8c, 0x90]]) {
    if (!expected.subarray(start, end).equals(actual.subarray(start, end))) differences.push({ callId, stage, field: `immutable_${start}`, predicted: expected.subarray(start, end).toString("hex"), observed: actual.subarray(start, end).toString("hex") });
  }
}
let previousNativeExit;
for (const id of ids) {
  const entry = one("entry", id), exit = one("exit", id), contract = one("entry_contract", id);
  assert.equal(entry.fpcr_bits, "0x00000000");
  assert.equal(exit.fpcr_bits, "0x00000000");
  assert.equal(entry.queue.address, first.queue.address);
  assert.equal(exit.queue.address, first.queue.address);
  assert.equal(entry.thread_id, exit.thread_id);
  assert.equal(contract.included, true);
  const before = rawQueue(entry), after = rawQueue(exit);
  const reconstructedNativeEntry = previousNativeExit ? Buffer.from(previousNativeExit) : Buffer.from(before);
  for (const change of contract.between_call_changes) {
    // This diagnostic supports only the already-traced clearing of timestamp gating.
    assert.equal(change.offset, "0xe0");
    assert.equal(change.before_bytes_le, "01000000");
    assert.equal(change.after_bytes_le, "00000000");
    assert.equal(reconstructedNativeEntry.subarray(0xe0, 0xe4).toString("hex"), change.before_bytes_le);
    reconstructedNativeEntry.writeInt32LE(0, 0xe0);
    replay.raw.writeInt32LE(0, 0xe0);
  }
  assert.deepEqual(reconstructedNativeEntry, before, "unexplained change between captured ingestions");
  compareQueue(id, "entry", replay.raw, before);
  const register = name => BigInt(entry.registers[name].signed_decimal);
  const result = replay.ingest({
    x: entry.floating_registers.d0.value, y: entry.floating_registers.d1.value,
    pressure: entry.floating_registers.d2.value, timestamp: register("x2"),
    phase: entry.phase.value_i32, catchUp: register("x3") !== 0n,
    gating: register("x4") !== 0n, interval: register("x5"), bypass: register("x6") !== 0n,
  });
  compareQueue(id, "exit", replay.raw, after);
  for (const [field, predicted, observed] of [["emitted", result.emitted, exit.emitted], ["phase", result.phase, exit.phase.value_i32]]) {
    if (predicted !== observed) differences.push({ callId: id, stage: "exit", field, predicted, observed });
  }
  if (result.output && exit.emitted) {
    for (const field of ["x", "y", "pressure"]) {
      const resultNumber = compareNumber(result.output[field], exit.output[field].value);
      numeric.push({ callId: id, stage: "output", field, ...resultNumber });
      if (!resultNumber.exact) differences.push({ callId: id, stage: "output", field, ...resultNumber });
    }
  }
  previousNativeExit = after;
}
const report = {
  status: "diagnostic_ingestion_comparison_only", sourceSha256: createHash("sha256").update(text).digest("hex"),
  originalFixtureComplete: summary.fixture_complete, originalStopReason: summary.stop_reason,
  callIds: ids, callCount: ids.length, mismatchCount: differences.length, differences, numeric,
  limitations: ["Does not run the complete capture reader or certify source-handler completion.", "Does not compare the post-ingestion queue reset at native_source_return.", "Excludes allocator metadata, digitizer-only fields and floating-point status effects, as in the main replay tool.", "Raw input and original incomplete summary remain unchanged. This diagnostic does not establish pen feel or post correction."],
};
writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: report.status, calls: ids.length, differences: differences.length, originalFixtureComplete: summary.fixture_complete }));
