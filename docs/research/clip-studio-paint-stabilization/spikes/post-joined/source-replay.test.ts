import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { CaptureRecord } from "../post-replay/schema.ts";
import { boundary, fixtureText, syntheticCapture } from "../post-replay/fixture.ts";
import { joinedSourceFixture, sourceDetails } from "./source-fixture.ts";
import { replayJoinedSourceCapture } from "./source-replay.ts";

const nativeCapture = () =>
  readFileSync(
    new URL(
      "../../evidence/debugger-access/post-joined-20261011T230556.990852Z-2249f1a0/joined.jsonl",
      import.meta.url,
    ),
    "utf8",
  );

test("native source begin resolves a distinct cached or copied evaluator", () => {
  const report = replayJoinedSourceCapture(nativeCapture());
  assert.equal(report.provenance, "runtime");
  assert.equal(report.status, "match");
  assert.equal(report.source.differenceCount, 0);
  assert.equal(report.post.differenceCount, 0);
  assert.deepEqual(report.source.endpointResolution, {
    inputBrush: "0x7575479800",
    observedEvaluator: "0x75767c9000",
    status: "observed-resolver-output",
    cacheOrCopySelection: "not-replayed",
  });
});

test("null input clears both shared pointers and non-null input requires observed configuration", () => {
  const rows = nativeCapture()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as CaptureRecord);
  const first = sourceDetails(rows, "begin");
  const begin = Buffer.from(String(first.beginHex), "hex");
  begin.writeBigUInt64LE(0n, 0x20);
  first.beginHex = begin.toString("hex");
  assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /Null source brush/);

  const absent = nativeCapture()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as CaptureRecord);
  for (const phase of ["entry", "return"] as const)
    delete boundary(absent, phase).path.endpointEvaluator;
  assert.throws(() => replayJoinedSourceCapture(fixtureText(absent)), /captured resolved/);

  const nullInput = joinedSourceFixture();
  const path = boundary(nullInput, "entry").path;
  const header = Buffer.from(path.headerHex, "hex");
  header.writeBigUInt64LE(0x1000n, 0x90);
  path.headerHex = header.toString("hex");
  assert.throws(() => replayJoinedSourceCapture(fixtureText(nullInput)), /both observed/);
});

test("an explicitly observed null resolver output differs from missing configuration", () => {
  const rows = joinedSourceFixture();
  const first = sourceDetails(rows, "begin");
  const begin = Buffer.from(String(first.beginHex), "hex");
  begin.writeBigUInt64LE(0x6000n, 0x20);
  first.beginHex = begin.toString("hex");
  assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /captured resolved/);
  for (const phase of ["entry", "return"] as const)
    boundary(rows, phase).path.endpointEvaluator = {
      schema: "csp-post-evaluator/v1",
      address: "0x0",
      imageBase: "0x100000000",
      state: "null",
      prefixHex: "",
      main: null,
      secondary: null,
      complete: true,
      errors: [],
    };
  const report = replayJoinedSourceCapture(fixtureText(rows));
  assert.equal(report.status, "match");
  assert.equal(report.source.endpointResolution?.observedEvaluator, "0x0");
  assert.equal(report.source.endpointResolution?.status, "observed-resolver-output");
});

test("independent source records reproduce the ordered source and corrected result", () => {
  const report = replayJoinedSourceCapture(fixtureText(joinedSourceFixture()));
  assert.equal(report.status, "match");
  assert.equal(report.provenance, "synthetic");
  assert.equal(report.source.differenceCount, 0);
  assert.equal(report.post.differenceCount, 0);
  assert.equal(report.source.recordCount, 3);
  assert.equal(report.source.predictedNodes.length, 3);
  assert.equal(report.upstream.status, "not-evaluated");
  assert.equal(report.wholeFeatureEquivalence, "not-established");
});

test("a source mismatch cannot be hidden by a matching source-to-correction replay", () => {
  const records = joinedSourceFixture();
  const append = sourceDetails(records, "append");
  const raw = Buffer.from(String(append.recordHex), "hex");
  raw.writeDoubleLE(3, 0);
  append.recordHex = raw.toString("hex");
  const report = replayJoinedSourceCapture(fixtureText(records));
  assert.equal(report.status, "mismatch");
  assert.ok(report.source.differences.some((d) => d.path === "nodes[1].x"));
  assert.equal(report.post.status, "match");
});

test("historical post-only recordings never pass the joined comparison", () => {
  assert.throws(() => replayJoinedSourceCapture(fixtureText(syntheticCapture())), /source begin/);
});

test("missing records, duplicate identities, wrong holder and thread fail before replay", () => {
  for (const alter of [
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      rows.splice(2, 1);
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      sourceDetails(rows, "append").sourceSequence = 1;
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      sourceDetails(rows, "finish").holder = "0x9000";
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      sourceDetails(rows, "append").threadId = "8";
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      rows.splice(4, 0, rows.splice(3, 1)[0]);
    },
  ]) {
    const rows = joinedSourceFixture();
    alter(rows);
    assert.throws(
      () => replayJoinedSourceCapture(fixtureText(rows)),
      /sequence|holder|thread|before/,
    );
  }
});

test("incomplete snapshots and changed effective source configuration are rejected", () => {
  for (const alter of [
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      sourceDetails(rows, "append").complete = false;
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      sourceDetails(rows, "finish").holderBefore = undefined;
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      const finish = sourceDetails(rows, "finish");
      const state = Buffer.alloc(0x44);
      state.writeUInt32LE(1, 0x20);
      state.writeDoubleLE(0.1, 0x18);
      finish.holderBefore = {
        pathAddress: "0x1000",
        stateHex: state.toString("hex"),
        complete: true,
        errors: [],
      };
    },
    (rows: ReturnType<typeof joinedSourceFixture>) => {
      sourceDetails(rows, "append").scaleBits = "0000000000000000";
    },
  ]) {
    const rows = joinedSourceFixture();
    alter(rows);
    assert.throws(
      () => replayJoinedSourceCapture(fixtureText(rows)),
      /incomplete|missing|configuration|scale/,
    );
  }
});

test("begin record equality, supported class and finite fields are required", () => {
  for (const offset of [0x50, 0xd8]) {
    const rows = joinedSourceFixture();
    const begin = sourceDetails(rows, "begin");
    const raw = Buffer.from(String(begin.beginHex), "hex");
    raw.writeUInt32LE(1, offset);
    begin.beginHex = raw.toString("hex");
    assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /begin record|ordinary/);
  }
  const rows = joinedSourceFixture();
  const record = Buffer.from(String(sourceDetails(rows, "append").recordHex), "hex");
  record.writeDoubleLE(NaN, 0x10);
  sourceDetails(rows, "append").recordHex = record.toString("hex");
  assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /finite/);
});

test("source node flags, scalar bits, controls and endpoint bytes are compared", () => {
  for (const [offset, path] of [
    [0x40, "flags"],
    [0x44, "scalar[0]"],
    [0x78, "control.x"],
    [0x60, "endpointDataHex"],
  ] as const) {
    const rows = joinedSourceFixture();
    const node = boundary(rows, "entry").path.nodes[0];
    const raw = Buffer.from(node.bytesHex, "hex");
    raw[offset] ^= 1;
    node.bytesHex = raw.toString("hex");
    const report = replayJoinedSourceCapture(fixtureText(rows));
    assert.equal(report.status, "mismatch");
    assert.ok(report.source.differences.some((d) => d.path === `nodes[0].${path}`));
  }
});

test("native floating mode and source branch state cannot be ignored", () => {
  for (const [offset, value] of [
    [0x40, 1],
    [0x24, 16],
    [0x10, 1],
  ] as const) {
    const rows = joinedSourceFixture();
    const observed = sourceDetails(rows, "append").holderBefore as Record<string, unknown>;
    const state = Buffer.from(String(observed.stateHex), "hex");
    state.writeUInt32LE(value, offset);
    observed.stateHex = state.toString("hex");
    assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /deferred|marker|distance/);
  }
  const rows = joinedSourceFixture();
  const header = rows[0];
  assert.equal(header.kind, "header");
  if (header.kind !== "header") throw new Error("Missing header");
  header.provenance = "runtime";
  for (const row of rows) {
    if (row.kind === "boundary") Object.assign(row, { fpcr: "00000000" });
    if (row.kind === "diagnostic") Object.assign(row.details as object, { fpcr: "00400000" });
  }
  assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /FPCR/);
});

test("begin configuration must preserve the observed post path parameter", () => {
  const rows = joinedSourceFixture();
  const first = sourceDetails(rows, "begin");
  const begin = Buffer.from(String(first.beginHex), "hex");
  begin.writeDoubleLE(999, 0x10);
  first.beginHex = begin.toString("hex");
  assert.throws(() => replayJoinedSourceCapture(fixtureText(rows)), /path parameter/);
});
