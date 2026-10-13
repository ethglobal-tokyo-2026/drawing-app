import assert from "node:assert/strict";
import test from "node:test";
import { fixtureText, boundary } from "../post-replay/fixture.ts";
import { sourceDetails } from "./source-fixture.ts";
import { joinedUpstreamFixture } from "./upstream-fixture.ts";
import { replayJoinedCapture } from "./replay.ts";

test("literal upstream, constructed source and correction all agree before joined match", () => {
  const report = replayJoinedCapture(fixtureText(joinedUpstreamFixture()));
  assert.equal(report.status, "match", JSON.stringify(report));
  assert.equal(report.provenance, "synthetic");
  assert.equal(report.upstream.status, "match");
  assert.equal(report.source.status, "match");
  assert.equal(report.post.status, "match");
  assert.equal(report.wholeFeatureEquivalence, "not-established");
});

test("missing upstream never hides independently available source and post comparisons", () => {
  const rows = joinedUpstreamFixture();
  delete sourceDetails(rows, "append").upstream;
  const report = replayJoinedCapture(fixtureText(rows));
  assert.equal(report.status, "incomplete");
  assert.equal(report.upstream.status, "incomplete");
  assert.equal(report.source.status, "match");
  assert.equal(report.post.status, "match");
});

test("each independently mismatched stage prevents joined match", () => {
  const upstreamRows = joinedUpstreamFixture();
  const up = sourceDetails(upstreamRows, "append").upstream as Record<string, unknown>;
  const event = up.eventFields as Record<string, unknown>;
  const pressure = Buffer.from(String(event["0xa0"]), "hex");
  pressure.writeDoubleLE(0.6);
  event["0xa0"] = pressure.toString("hex");
  const upstream = replayJoinedCapture(fixtureText(upstreamRows));
  assert.equal(upstream.status, "mismatch");
  assert.equal(upstream.upstream.status, "mismatch");
  assert.equal(upstream.source.status, "match");
  assert.equal(upstream.post.status, "match");

  for (const phase of ["entry", "return"] as const) {
    const rows = joinedUpstreamFixture();
    const node = boundary(rows, phase).path.nodes[0];
    const raw = Buffer.from(node.bytesHex, "hex");
    raw[8] ^= 1;
    node.bytesHex = raw.toString("hex");
    const report = replayJoinedCapture(fixtureText(rows));
    assert.notEqual(report.status, "match");
    assert.equal(report.upstream.status, "match");
    assert.equal(report[phase === "entry" ? "source" : "post"].status, "mismatch");
  }
});

test("source configuration rejection still retains a valid post-only comparison", () => {
  const rows = joinedUpstreamFixture();
  sourceDetails(rows, "append").scaleBits = "0000000000000000";
  const report = replayJoinedCapture(fixtureText(rows));
  assert.equal(report.status, "incomplete");
  assert.equal(report.source.status, "incomplete");
  assert.equal(report.post.status, "match");
});

test("invalid capture is an explicit incomplete report, not a thrown or successful result", () => {
  const report = replayJoinedCapture("{invalid");
  assert.equal(report.status, "incomplete");
  assert.equal(report.source.status, "incomplete");
  assert.equal(report.post.status, "incomplete");
  assert.equal(report.upstream.status, "incomplete");
});
