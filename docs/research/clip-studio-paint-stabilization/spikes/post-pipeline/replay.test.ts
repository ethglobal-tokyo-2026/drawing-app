import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { decodePostCapture } from "./replay.ts";
import { boundary, fixtureText, syntheticCapture } from "../post-replay/fixture.ts";
import type { PostEvaluatorSnapshot } from "../post-joined/evaluator.ts";

function configured() {
  const records = syntheticCapture();
  const saved = JSON.parse(
    readFileSync(new URL("../post-joined/evaluator-memory-fixture.json", import.meta.url), "utf8"),
  );
  const evaluator = saved.snapshot as PostEvaluatorSnapshot;
  evaluator.address = "0x9000";
  evaluator.imageBase = "0x100000000";
  const prefix = Buffer.from(evaluator.prefixHex, "hex");
  prefix.writeBigUInt64LE(0x104a495f0n);
  prefix.writeUInt32LE(0, 0x624);
  prefix.writeUInt32LE(0, 0x198);
  assert.ok(evaluator.main && evaluator.secondary && evaluator.main.curves);
  for (const [response, offset] of [
    [evaluator.main, 0x88],
    [evaluator.secondary, 0x630],
  ] as const) {
    response.address = `0x${(0x9000 + offset).toString(16)}`;
    const bytes = Buffer.from(response.bytesHex, "hex");
    bytes.writeBigUInt64LE(0x104a493b0n);
    bytes.writeUInt32LE(1, 8);
    response.bytesHex = bytes.toString("hex");
    if (offset === 0x88) bytes.copy(prefix, offset);
  }
  const curve = evaluator.main.curves[0];
  const header = Buffer.from(curve.headerHex, "hex");
  header.writeBigUInt64LE(0x104a491a0n);
  curve.headerHex = header.toString("hex");
  evaluator.prefixHex = prefix.toString("hex");
  for (const phase of ["entry", "return"] as const) {
    const row = boundary(records, phase);
    const bytes = Buffer.from(row.path.headerHex, "hex");
    bytes.writeBigUInt64LE(0x9000n, 0x88);
    bytes.writeDoubleLE(3, 0x98);
    row.path.headerHex = bytes.toString("hex");
    row.path.endpointEvaluator = structuredClone(evaluator);
  }
  return records;
}

test("replay uses observed configuration to construct the endpoint callback", () => {
  const decoded = decodePostCapture(fixtureText(configured()));
  assert.equal(typeof decoded.evaluator, "function");
  assert.equal(decoded.pathParameter, 3);
  assert.ok(typeof decoded.evaluator === "function");
  assert.equal(decoded.evaluator({ flags: 0, scalars: [0, 0, 0, 0, 0, 1, 0] }, 3), 3);
});

test("historical missing configuration stays unknown for non-null and absent for null", () => {
  const records = configured();
  for (const phase of ["entry", "return"] as const)
    delete boundary(records, phase).path.endpointEvaluator;
  assert.equal(decodePostCapture(fixtureText(records)).evaluator, "unknown");
  assert.equal(decodePostCapture(fixtureText(syntheticCapture())).evaluator, null);
});

test("replay rejects mismatched evaluator pointer, incomplete observations, and configuration drift", () => {
  for (const mutation of ["pointer", "partial", "drift", "missing-return"] as const) {
    const records = configured();
    const entry = boundary(records, "entry"),
      returned = boundary(records, "return");
    assert.ok(entry.path.endpointEvaluator && returned.path.endpointEvaluator);
    if (mutation === "pointer") entry.path.endpointEvaluator.address = "0xa000";
    else if (mutation === "partial") entry.path.endpointEvaluator.complete = false;
    else if (mutation === "missing-return") delete returned.path.endpointEvaluator;
    else if (mutation === "drift") {
      const bytes = Buffer.from(returned.path.endpointEvaluator.prefixHex, "hex");
      bytes.writeDoubleLE(999, 0x628);
      returned.path.endpointEvaluator.prefixHex = bytes.toString("hex");
    }
    assert.throws(() => decodePostCapture(fixtureText(records)), mutation);
  }
});

test("runtime replay requires observed FPCR zero at both post boundaries", () => {
  for (const phase of ["entry", "return"] as const) {
    for (const fpcr of [undefined, "00400000", "0", 0]) {
      const records = syntheticCapture();
      const header = records[0];
      assert.equal(header.kind, "header");
      if (header.kind !== "header") throw new Error("Missing header");
      header.provenance = "runtime";
      for (const at of ["entry", "return"] as const)
        Object.assign(boundary(records, at), { fpcr: "00000000" });
      Object.assign(boundary(records, phase), { fpcr });
      assert.throws(() => decodePostCapture(fixtureText(records)), /FPCR/);
    }
  }
  const records = syntheticCapture();
  const header = records[0];
  if (header.kind !== "header") throw new Error("Missing header");
  header.provenance = "runtime";
  for (const phase of ["entry", "return"] as const)
    Object.assign(boundary(records, phase), { fpcr: "00000000" });
  assert.equal(decodePostCapture(fixtureText(records)).analyzed.provenance, "runtime");
});
