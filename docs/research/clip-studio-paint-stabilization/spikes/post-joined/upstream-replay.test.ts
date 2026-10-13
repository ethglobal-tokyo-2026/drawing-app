import assert from "node:assert/strict";
import test from "node:test";
import { fixtureText } from "../post-replay/fixture.ts";
import { sourceDetails } from "./source-fixture.ts";
import { replayJoinedUpstreamCapture } from "./upstream-replay.ts";

import { upstreamFixture, int32Hex as i, timestampHex as t } from "./upstream-fixture.ts";

test("independent constructor inputs and full movement progression match literal ordinary cases", () => {
  for (const rows of [upstreamFixture(), upstreamFixture(true), upstreamFixture(true, true)]) {
    const report = replayJoinedUpstreamCapture(fixtureText(rows));
    assert.equal(report.status, "match", JSON.stringify(report));
    assert.equal(report.provenance, "synthetic");
    assert.equal(report.records.compared, 3);
    assert.equal(report.movement.compared, 2);
    assert.equal(report.wholeFeatureEquivalence, "not-established");
  }
});

test("expected record values never seed predicted pressure, point or movement", () => {
  for (const offset of [0, 0x10, 0x20, 0x48, 0x54]) {
    const rows = upstreamFixture();
    const details = sourceDetails(rows, "append");
    const raw = Buffer.from(String(details.recordHex), "hex");
    raw[offset] ^= 1;
    details.recordHex = raw.toString("hex");
    const report = replayJoinedUpstreamCapture(fixtureText(rows));
    assert.equal(report.status, "mismatch");
    assert.equal(report.records.status, "mismatch");
    assert.equal(report.movement.status, "match");
  }
});

test("all modeled movement state and timestamps participate in comparison", () => {
  for (const offset of [
    8, 0x10, 0x40, 0x48, 0x4c, 0x50, 0x58, 0x5c, 0x68, 0x70, 0x78, 0x80, 0x88,
  ]) {
    const rows = upstreamFixture(true);
    const upstream = sourceDetails(rows, "append").upstream as Record<string, unknown>;
    const movement = upstream.movement as Record<string, unknown>;
    const bytes = Buffer.from(String(movement.bytesHex), "hex");
    bytes[offset] ^= 1;
    movement.bytesHex = bytes.toString("hex");
    assert.notEqual(
      replayJoinedUpstreamCapture(fixtureText(rows)).status,
      "match",
      `offset ${offset}`,
    );
  }
  const rows = upstreamFixture(true);
  const upstream = sourceDetails(rows, "append").upstream as Record<string, unknown>;
  (upstream.movement as Record<string, unknown>).timestamps = [t(99n), t(104n)];
  assert.equal(replayJoinedUpstreamCapture(fixtureText(rows)).movement.status, "mismatch");
});

test("unsupported or missing upstream observations remain incomplete, never matched", () => {
  for (const mutate of [
    (details: Record<string, unknown>) => {
      delete details.upstream;
    },
    (details: Record<string, unknown>) => {
      details.callerReturn = "0x10288dda0";
    },
    (details: Record<string, unknown>) => {
      (details.upstream as Record<string, unknown>).complete = false;
    },
    (details: Record<string, unknown>) => {
      const upstream = details.upstream as Record<string, unknown>;
      (upstream.brushFields as Record<string, unknown>)["0x148"] = "0100000000000000";
    },
    (details: Record<string, unknown>) => {
      delete (details.upstream as Record<string, unknown>).movement;
    },
  ]) {
    const rows = upstreamFixture();
    mutate(sourceDetails(rows, "append"));
    const report = replayJoinedUpstreamCapture(fixtureText(rows));
    assert.equal(report.status, "incomplete");
    assert.ok(report.errors.length > 0);
  }
  const rows = upstreamFixture();
  (sourceDetails(rows, "finish").upstream as Record<string, unknown>).freshRecord = 0;
  assert.equal(replayJoinedUpstreamCapture(fixtureText(rows)).status, "incomplete");
});

test("configuration and sequence mismatches cannot silently pass", () => {
  for (const mutate of [
    (rows: ReturnType<typeof upstreamFixture>) => {
      sourceDetails(rows, "append").sourceSequence = 1;
    },
    (rows: ReturnType<typeof upstreamFixture>) => {
      sourceDetails(rows, "finish").threadId = "8";
    },
    (rows: ReturnType<typeof upstreamFixture>) => {
      (sourceDetails(rows, "append").upstream as Record<string, unknown>).brush = "0x6100";
    },
    (rows: ReturnType<typeof upstreamFixture>) => {
      const up = sourceDetails(rows, "begin").upstream as Record<string, unknown>;
      (up.movementInitializer as Record<string, unknown>).cBits = "0000000000000000";
      (up.movementInitializer as Record<string, unknown>).enabledHex = i(1);
    },
  ]) {
    const rows = upstreamFixture();
    mutate(rows);
    assert.equal(replayJoinedUpstreamCapture(fixtureText(rows)).status, "incomplete");
  }
});

test("runtime input parity requires platform instruction proof and captured floating mode", () => {
  const runtime = () => {
    const rows = upstreamFixture(true);
    const header = rows[0];
    if (header.kind !== "header") throw new Error("Missing header");
    header.provenance = "runtime";
    for (const row of rows) {
      if (row.kind === "boundary") row.fpcr = "00000000";
      if (row.kind === "diagnostic" && row.event.startsWith("source_"))
        (row.details as Record<string, unknown>).fpcr = "00000000";
    }
    const up = sourceDetails(rows, "begin").upstream as Record<string, unknown>;
    (up.movementInitializer as Record<string, unknown>).platformValue = 2;
    rows.splice(
      1,
      0,
      ...[
        ["0x102194e64", 4, "76944184d89426b3385e765455755586150b69c1df1ca6c7280a8b85bec041db"],
        ["0x102072aa4", 8, "0becf359e148792c5ed24ca79a91209e5f15e0f015d2a0b9f4d69c2e82d59f3a"],
      ].map(([file_address, size, sha256]) => ({
        kind: "diagnostic" as const,
        event: "instruction_verified",
        details: { file_address, size, sha256 },
      })),
    );
    return rows;
  };
  assert.equal(replayJoinedUpstreamCapture(fixtureText(runtime())).status, "match");
  for (const mutate of [
    (rows: ReturnType<typeof runtime>) => {
      rows.splice(1, 1);
    },
    (rows: ReturnType<typeof runtime>) => {
      sourceDetails(rows, "append").fpcr = "00400000";
    },
    (rows: ReturnType<typeof runtime>) => {
      const up = sourceDetails(rows, "begin").upstream as Record<string, unknown>;
      (up.movementInitializer as Record<string, unknown>).platformValue = 3;
    },
  ]) {
    const rows = runtime();
    mutate(rows);
    assert.equal(replayJoinedUpstreamCapture(fixtureText(rows)).status, "incomplete");
  }
});

test("begin constructor bytes must be the actual record embedded in its source call", () => {
  const rows = upstreamFixture();
  const begin = sourceDetails(rows, "begin");
  const raw = Buffer.from(String(begin.beginHex), "hex");
  raw[0x50] ^= 1;
  begin.beginHex = raw.toString("hex");
  assert.equal(replayJoinedUpstreamCapture(fixtureText(rows)).status, "incomplete");
});
