import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { linkSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeText } from "./analyze.ts";
import { boundary, fixtureText, replaceBytes, syntheticCapture } from "./fixture.ts";

test("actual geometry change is measured without claiming reconstructed output or node correspondence", () => {
  const report = analyzeText(fixtureText());
  assert.equal(report.integrity.status, "valid");
  const call = report.calls[0];
  assert.ok("classification" in call.deltas);
  assert.equal(call.deltas.classification, "changed");
  assert.equal(call.deltas.nodeCountDelta, -1);
  assert.deepEqual(call.deltas.geometry.beforeBounds, { minX: 0, maxX: 2, minY: 0, maxY: 1 });
  assert.deepEqual(call.deltas.geometry.afterBounds, { minX: 0, maxX: 2, minY: 0, maxY: 0 });
  assert.equal(call.correspondence.status, "not-evaluated");
  assert.equal(call.wholeCurveEquivalence.status, "not-evaluated");
});

test("new addresses alone do not turn identical retained output into observed correction", () => {
  const call = analyzeText(fixtureText(syntheticCapture(true))).calls[0];
  assert.ok("classification" in call.deltas);
  assert.equal(call.deltas.classification, "identity");
  assert.equal(call.deltas.geometry.orderedEqual, true);
});

test("rejects malformed raw bytes, inconsistent counters, broken links and owners", () => {
  for (const mutation of [
    (b: ReturnType<typeof boundary>) => {
      b.path.nodes[0].bytesHex = "gg";
    },
    (b: ReturnType<typeof boundary>) => {
      b.path.headerHex += "00";
    },
    (b: ReturnType<typeof boundary>) => {
      b.path.headerHex = replaceBytes(b.path.headerHex, 0x40, 2, 4);
    },
    (b: ReturnType<typeof boundary>) => {
      b.path.nodes[1].bytesHex = replaceBytes(b.path.nodes[1].bytesHex, 0x30, 0xdead, 8);
    },
    (b: ReturnType<typeof boundary>) => {
      b.path.nodes[1].bytesHex = replaceBytes(b.path.nodes[1].bytesHex, 0x38, 0xbeef, 8);
    },
    (b: ReturnType<typeof boundary>) => {
      b.path.nodes[1].address = b.path.nodes[0].address;
    },
    (b: ReturnType<typeof boundary>) => {
      b.path.complete = false;
      b.path.errors = ["node limit reached"];
    },
  ]) {
    const records = syntheticCapture();
    mutation(boundary(records, "entry"));
    const report = analyzeText(fixtureText(records));
    assert.equal(report.integrity.status, "invalid");
    assert.ok(report.integrity.errors.length > 0);
    assert.equal(report.calls[0].deltas.status, "not-evaluated");
  }
});

test("missing return and drift cannot become valid paired captures", () => {
  const missing = syntheticCapture().slice(0, 2);
  assert.equal(analyzeText(fixtureText(missing)).integrity.status, "invalid");
  for (const field of ["arguments", "configurationFingerprint", "returnedPath"]) {
    const records = structuredClone(syntheticCapture());
    const end = boundary(records, "return");
    if (field === "arguments") end.arguments.k = 11;
    else if (field === "configurationFingerprint") end.configurationFingerprint = "changed";
    else end.returnedPath = "0x9999";
    assert.equal(analyzeText(fixtureText(records)).integrity.status, "invalid");
  }
});

test("sequence reuse and foreign builds fail with retained diagnostics", () => {
  const records = syntheticCapture();
  boundary(records, "return").sequence = 1;
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "invalid");
  const foreign = syntheticCapture();
  (foreign[0] as any).imageSha256 = "0".repeat(64);
  assert.equal(analyzeText(fixtureText(foreign)).integrity.status, "invalid");
  assert.equal(analyzeText("{oops\n").integrity.status, "invalid");
});

test("entry arguments derive exact bounded arithmetic without claiming observed core execution", () => {
  const checks = analyzeText(fixtureText()).calls[0].arithmetic;
  assert.deepEqual(checks.find((x: any) => x.name === "endpointParameter")!.expected, {
    f64: "3fe0000000000000",
  });
  assert.deepEqual(checks.find((x: any) => x.name === "scalarLimits")!.expected, {
    ratio: { f32: "400ccccd" },
    floor: { f32: "3e19999a" },
  });
  assert.equal(checks.find((x: any) => x.name === "scalarLimits")!.status, "derived");
  assert.equal(checks.find((x: any) => x.name === "convertPostSettings")!.status, "not-evaluated");
});

test("helper observations compare exact captured inputs with an independently captured result", () => {
  const records: any[] = syntheticCapture();
  const summary = records.pop();
  records.push({
    kind: "helper",
    sequence: 3,
    callId: "synthetic-1",
    helper: "cornerPredicate",
    inputs: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, 0.1, 1],
    observed: true,
    evidence: "Synthetic inputs and independently chosen right-angle result.",
  });
  records.push(summary);
  const report = analyzeText(fixtureText(records));
  assert.equal(report.calls[0].arithmetic.at(-1)!.status, "match");
  records.at(-2).observed = false;
  assert.equal(analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1)!.status, "mismatch");
  delete records.at(-2).observed;
  assert.equal(
    analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1)!.status,
    "not-evaluated",
  );
});

test("unknown helper names and nonfinite values cannot imply arithmetic validation", () => {
  const records: any[] = syntheticCapture();
  const summary = records.pop();
  records.push({
    kind: "helper",
    sequence: 3,
    callId: "synthetic-1",
    helper: "invented",
    inputs: [],
    observed: true,
    evidence: "Synthetic malformed helper",
  });
  records.push(summary);
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "invalid");
  records.at(-2).helper = "endpointParameter";
  records.at(-2).inputs = [null];
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "invalid");
});

test("closed-path accessor flags do not excuse a circular raw chain", () => {
  const records = syntheticCapture();
  const entry = boundary(records, "entry");
  entry.path.headerHex = replaceBytes(entry.path.headerHex, 0x20, 0x120, 4);
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "valid");
  entry.path.nodes[2].bytesHex = replaceBytes(entry.path.nodes[2].bytesHex, 0x28, 0x1100, 8);
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "invalid");
});

test("unclean detach and incorrect terminal counts suppress field comparisons", () => {
  for (const mutate of [
    (s: any) => {
      s.detachRequestSucceeded = false;
    },
    (s: any) => {
      s.detachedStateObserved = false;
    },
    (s: any) => {
      s.cleanupErrors = ["Failed to remove breakpoint"];
    },
    (s: any) => {
      s.pairs = 2;
    },
    (s: any) => {
      s.captureComplete = false;
    },
    (s: any) => {
      s.unmatchedEntries = 1;
    },
    (s: any) => {
      s.deadlineExceeded = true;
    },
    (s: any) => {
      s.watchdogError = "Watchdog failed";
    },
  ]) {
    const records = syntheticCapture();
    mutate(records.at(-1));
    const report = analyzeText(fixtureText(records));
    assert.equal(report.integrity.status, "invalid");
    assert.equal(report.calls[0].deltas.status, "not-evaluated");
  }
});

test("alternate selector cannot borrow the ordinary core arithmetic", () => {
  const records = syntheticCapture();
  boundary(records, "entry").arguments.selector482 = 1;
  boundary(records, "return").arguments.selector482 = 1;
  const arithmetic = analyzeText(fixtureText(records)).calls[0].arithmetic;
  assert.ok(arithmetic.every((item) => item.status === "not-evaluated"));
});

test("runtime helper comparison requires a captured supported FPCR", () => {
  const records: any[] = syntheticCapture();
  records[0].provenance = "runtime";
  records.splice(3, 0, {
    kind: "helper",
    sequence: 3,
    callId: "synthetic-1",
    helper: "endpointParameter",
    inputs: [10],
    observed: { f64: "3fe0000000000000" },
    evidence: "Constructed runtime-shaped record for parser test.",
  });
  assert.equal(
    analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1)?.status,
    "not-evaluated",
  );
  records[3].fpcr = "00000000";
  assert.equal(analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1)?.status, "match");
  records[3].fpcr = "01000000";
  assert.equal(
    analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1)?.status,
    "not-evaluated",
  );
});

test("CLI persists valid reports and failure reports and exits nonzero for malformed captures", () => {
  const directory = mkdtempSync(join(tmpdir(), "csp-post-replay-test-"));
  try {
    const input = join(directory, "input.jsonl"),
      output = join(directory, "report.json");
    const script = fileURLToPath(new URL("./compare.ts", import.meta.url));
    writeFileSync(input, fixtureText());
    const good = spawnSync(
      process.execPath,
      ["--experimental-strip-types", script, input, "--out", output],
      { encoding: "utf8" },
    );
    assert.equal(good.status, 0, good.stderr);
    assert.equal(
      JSON.parse(readFileSync(output, "utf8")).calls[0].deltas.classification,
      "changed",
    );
    const savedReport = readFileSync(output, "utf8");
    const repeated = spawnSync(
      process.execPath,
      ["--experimental-strip-types", script, input, "--out", output],
      { encoding: "utf8" },
    );
    assert.equal(repeated.status, 2);
    assert.equal(readFileSync(output, "utf8"), savedReport);
    const alias = join(directory, "source-alias.jsonl");
    linkSync(input, alias);
    const aliased = spawnSync(
      process.execPath,
      ["--experimental-strip-types", script, input, "--out", alias],
      { encoding: "utf8" },
    );
    assert.equal(aliased.status, 2);
    assert.equal(readFileSync(input, "utf8"), fixtureText());
    rmSync(output);
    writeFileSync(input, "{broken\n");
    const bad = spawnSync(
      process.execPath,
      ["--experimental-strip-types", script, input, "--out", output],
      { encoding: "utf8" },
    );
    assert.equal(bad.status, 2, bad.stderr);
    assert.equal(JSON.parse(readFileSync(output, "utf8")).integrity.status, "invalid");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("scalar and flag mutations are visible even when positions and node counts are unchanged", () => {
  for (const [offset, value, changedField] of [
    [0x44, 0x3f400000, "scalar44"],
    [0x4c, 0x3f000000, "factor4c"],
    [0x40, 1, "nodeFlags"],
  ] as const) {
    const records = syntheticCapture(true);
    const end = boundary(records, "return");
    end.path.nodes[1].bytesHex = replaceBytes(end.path.nodes[1].bytesHex, offset, value, 4);
    const call = analyzeText(fixtureText(records)).calls[0];
    assert.equal(call.captureIntegrity, "valid");
    assert.ok("classification" in call.deltas);
    assert.equal(call.deltas.classification, "changed");
    assert.equal(call.deltas.geometry?.orderedEqual, true);
    assert.equal(call.deltas[changedField]?.orderedEqual, false);
  }
});

test("node flags remain independent from the class selected by path flags", () => {
  const records = syntheticCapture();
  const entry = boundary(records, "entry");
  for (const node of entry.path.nodes) node.bytesHex = replaceBytes(node.bytesHex, 0x40, 0x401, 4);
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "valid");
});

test("settings arithmetic needs original reader inputs and compares exact returned bits", () => {
  const records: any[] = syntheticCapture();
  records.splice(3, 0, {
    kind: "helper",
    sequence: 3,
    callId: "synthetic-1",
    helper: "convertPostSettings",
    inputs: [
      {
        enabled: true,
        k: 10,
        flag480: false,
        scaleTolerance: true,
        selector482: false,
        fallbackRequested: false,
        magnificationPercent: 400,
        priorFlag480: false,
        priorSelector482: false,
      },
    ],
    observed: {
      k: 10,
      tolerance: { f64: "4004000000000000" },
      lengthScale: { f64: "3fd0000000000000" },
      flag480: false,
      selector482: false,
    },
    evidence: "Synthetic settings case: 10 squared times .1, scaled by .25.",
  });
  const check = analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1);
  assert.equal(check?.status, "match");
  records[3].observed.tolerance.f64 = "4004000000000001";
  assert.equal(analyzeText(fixtureText(records)).calls[0].arithmetic.at(-1)?.status, "mismatch");
});

test("stored controls and endpoint data cannot disappear behind equal anchor positions", () => {
  for (const offset of [0x60, 0x78]) {
    const records = syntheticCapture(true);
    const end = boundary(records, "return");
    end.path.nodes[1].bytesHex = replaceBytes(end.path.nodes[1].bytesHex, offset, 0x3f000000, 4);
    const delta = analyzeText(fixtureText(records)).calls[0].deltas;
    assert.ok("classification" in delta);
    assert.equal(delta.geometry?.orderedEqual, true);
    assert.equal(delta.classification, "changed");
  }
});

test("finite scalar inputs with overflowing intermediate bounds are not reported as helper agreement", () => {
  const records: any[] = syntheticCapture();
  records.splice(3, 0, {
    kind: "helper",
    sequence: 3,
    callId: "synthetic-1",
    helper: "removalScalarAccepted",
    inputs: [3.4e38, 3.4e38, 3.4e38, { ratio: 3, floor: 0.05 }, 0.5],
    observed: true,
    evidence: "Synthetic overflow-domain rejection test.",
  });
  assert.equal(analyzeText(fixtureText(records)).integrity.status, "invalid");
});
