import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stabilizer } from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilizer.ts";
import { StrokeBuilder } from "../../../../../apps/frontend/src/sticker-creation/canvas/brush.ts";
import { StrokeCurve } from "../../../../../apps/frontend/src/sticker-creation/canvas/strokeCurve.ts";
import { InkEngine } from "../../../../../apps/frontend/src/sticker-creation/canvas/inkEngine.ts";
import { FIRST_POST_CORRECTION } from "../../../../../apps/frontend/src/sticker-creation/canvas/post-correction/settings.ts";
import type { LayerInk } from "../../../../../apps/frontend/src/sticker-creation/layers/layerInk.ts";
import {
  configureLiveQueue,
  adjustFixedWindow,
  averageFractionalHistory,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts";

const repo = fileURLToPath(new URL("../../../../../", import.meta.url));
const out = path.resolve(
  process.argv[2] ??
    fileURLToPath(
      new URL(`./results-${new Date().toISOString().replace(/[:.]/g, "-")}/`, import.meta.url),
    ),
);
fs.mkdirSync(out, { recursive: true });
const deadline = performance.now() + 180000;
const checkDeadline = () =>
  assert(performance.now() < deadline, "Replay exceeded its 180-second work limit");
type Sample = { x: number; y: number; t: number; pressure: number };
const fixtures = [
  { name: "line_12", speed: 12, xy: (s: number) => [20 + 12 * s, 80] },
  { name: "line_180", speed: 180, xy: (s: number) => [20 + 180 * s, 80] },
  { name: "line_600", speed: 600, xy: (s: number) => [20 + 600 * s, 80] },
  {
    name: "jitter_12hz",
    speed: null,
    xy: (s: number) => [20 + 60 * s, 80 + 2 * Math.sin(24 * Math.PI * s)],
  },
  {
    name: "corner",
    speed: null,
    xy: (s: number) => [20 + 120 * Math.min(s, 1), 80 + 120 * Math.max(0, s - 1)],
  },
  {
    name: "loop",
    speed: null,
    xy: (s: number) => [120 + 50 * Math.cos(Math.PI * s), 120 + 50 * Math.sin(Math.PI * s)],
  },
  { name: "accelerating", speed: null, xy: (s: number) => [20 + 150 * s * s, 80] },
  { name: "tap_pressure_ramp", speed: null, xy: (_s: number) => [80, 80] },
];
const filters = [
  { name: "raw", smoothing: 0 },
  { name: "queue_S35_T0", smoothing: 35 },
  { name: "queue_S100_T0", smoothing: 100 },
  { name: "fixed_S4_T0", S: 4, T: 0 },
  { name: "fixed_S12_T0", S: 12, T: 0 },
  { name: "fixed_S24_T12", S: 24, T: 12 },
];
const rows: any[] = [];
const summaries: any[] = [];
const savedFixtures: any[] = [];
const last = (pts: number[]) => ({ x: pts.at(-4)!, y: pts.at(-3)! });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const csv = (a: any[]) => {
  const keys = [...new Set(a.flatMap((r) => Object.keys(r)))];
  return [keys.join(","), ...a.map((r) => keys.map((k) => r[k] ?? "").join(","))].join("\n") + "\n";
};
const makeSamples = (fixture: (typeof fixtures)[number], rate: number): Sample[] =>
  Array.from({ length: 2 * rate + 1 }, (_, i) => {
    const [x, y] = fixture.xy(i / rate);
    return { x, y, t: (i * 1000) / rate, pressure: 0.2 + (0.6 * i) / (2 * rate) };
  });
for (const fixture of fixtures)
  for (const rate of [60, 120, 240]) {
    checkDeadline();
    const samples = makeSamples(fixture, rate);
    savedFixtures.push({ name: fixture.name, rate, samples });
    for (const cfg of filters) {
      const start = samples[0];
      const config = cfg.S ? configureLiveQueue(cfg.S, cfg.T!, false, false) : null;
      const stab = config ? null : new Stabilizer(start, cfg.smoothing ?? 0, true);
      let H = config?.initialWindow ?? 0;
      const history: any[] = [];
      const builder = new StrokeBuilder({
        tool: "brush",
        layer: 1,
        color: "#123456",
        size: 7,
        ...start,
        T: 0,
        pointerType: "pen",
        pressureVaries: true,
        response: "off",
      });
      const unspaced = [start.x, start.y, 7, 0];
      const curve = new StrokeCurve(unspaced);
      let latestAccepted = start;
      let accepted = 1;
      let local: any[] = [];
      for (let i = 0; i < samples.length; i++) {
        const raw = samples[i];
        let filtered: { x: number; y: number; pressure: number };
        let outputs: Sample[];
        if (config) {
          // Match the browser adapter's truncation; this synthetic cadence is not a device capture.
          const timestamp = BigInt(Math.trunc(raw.t));
          history.unshift({ ...raw, timestamp });
          H = adjustFixedWindow(H, cfg.S!, config.initialWindow, i === 0 ? 0 : 1);
          const averaged = averageFractionalHistory(history, H, timestamp);
          assert(averaged);
          filtered = averaged;
          outputs = [{ ...filtered, t: raw.t }];
        } else {
          outputs = i === 0 ? [stab!.initial] : stab!.add(raw);
          filtered = stab!.position;
        }
        let didAccept = false;
        if (i > 0) {
          for (const output of outputs) {
            curve.add(output.x, output.y, 7, output.t);
            if (builder.add(output.x, output.y, output.pressure, output.t, raw)) {
              didAccept = true;
              latestAccepted = output;
              accepted++;
            }
          }
        }
        const end = last(builder.op.pts);
        const unspacedEnd = last(unspaced);
        const row = {
          fixture: fixture.name,
          rate,
          filter: cfg.name,
          i,
          t: raw.t,
          raw_x: raw.x,
          raw_y: raw.y,
          filter_x: filtered.x,
          filter_y: filtered.y,
          visible_x: end.x,
          visible_y: end.y,
          H: config ? H : null,
          emitted: outputs.length,
          accepted: didAccept,
          raw_to_filter: dist(raw, filtered),
          filter_to_curve: dist(filtered, end),
          raw_to_curve: dist(raw, end),
          filter_to_unspaced_curve: dist(filtered, unspacedEnd),
          filter_to_last_accepted: dist(filtered, latestAccepted),
          filter_pressure: filtered.pressure,
        };
        rows.push(row);
        local.push(row);
      }
      const steady = local.filter((r) => r.t >= 1000);
      const gap = mean(steady.map((r) => r.raw_to_filter));
      const curveGap = mean(steady.map((r) => r.filter_to_curve));
      const terminal: any = {};
      if (!config) {
        const raw = samples.at(-1)!;
        const before = last(builder.op.pts);
        const finish = stab!.finish({ ...raw, pressure: 0 });
        for (const output of finish)
          builder.add(output.x, output.y, output.pressure, output.t, null);
        const endpoint = stab!.position;
        builder.settle(endpoint.x, endpoint.y);
        builder.taperEnd();
        assert.equal(dist(last(builder.op.pts), endpoint), 0);
        assert(finish.every((output) => output.t === raw.t));
        // Native movement-based ending can retain positive pressure; record the observed scalar.
        terminal.terminal_pressure = endpoint.pressure;
        terminal.finish_samples = finish.length;
        terminal.synthetic_time_extension_ms = endpoint.t - raw.t;
        terminal.raw_to_terminal_endpoint = dist(raw, endpoint);
        terminal.terminal_displacement = dist(before, last(builder.op.pts));
      }
      summaries.push({
        fixture: fixture.name,
        rate,
        filter: cfg.name,
        mean_raw_filter: gap,
        mean_filter_curve: curveGap,
        mean_raw_curve: mean(steady.map((r) => r.raw_to_curve)),
        mean_filter_unspaced_curve: mean(steady.map((r) => r.filter_to_unspaced_curve)),
        mean_filter_last_accepted: mean(steady.map((r) => r.filter_to_last_accepted)),
        raw_filter_equivalent_ms: fixture.speed ? (gap / fixture.speed) * 1000 : null,
        filter_curve_equivalent_ms: fixture.speed ? (curveGap / fixture.speed) * 1000 : null,
        accepted,
        samples: samples.length,
        ...terminal,
      });
    }
  }

// Explicit non-raster recording substitutes; pixel verification uses the real LayerInk separately.
class GeometryInk {
  copiesHeld = 0;
  setFrame() {
    return true;
  }
  show() {}
  apply() {}
  releaseAll() {}
  restore() {}
  release() {}
  hold() {
    return null;
  }
  rebuild(_layer: number, write: () => void) {
    write();
  }
  cost() {
    return 1;
  }
  copyBudgetFor() {
    return 100;
  }
  copiesFreedBy() {
    return 0;
  }
}
class GeometryDisplay {
  paints = 0;
  restores = 0;
  resize() {}
  show() {}
  showCurrent() {}
  previewOpacity() {}
  inkChanged() {}
  beginStroke() {}
  paintStroke() {
    this.paints++;
  }
  paintTail() {}
  endStroke() {
    this.restores++;
  }
  flash() {}
  release() {}
}
const settings = {
  tool: "brush" as const,
  fillReference: "layer" as const,
  color: "#123456",
  size: 7,
  smoothing: 35,
  locked: false,
  paused: false,
  panelOpen: false,
  inputMode: null,
  penPressure: "normal" as const,
  sessionMs: () => 0,
};
function engineReplay(
  samples: Sample[],
  smoothing: number,
  batch: number,
  coalesced: boolean,
  idle = false,
) {
  checkDeadline();
  const layer = new GeometryDisplay();
  let frame: ((t: number) => void) | null = null;
  const commits: any[] = [];
  const events = {
    onHistory() {},
    onCommit(op: any) {
      commits.push(structuredClone(op));
    },
    onBlocked() {},
    onBlockedHidden() {},
    onInkFailed(error: unknown) {
      throw error;
    },
    onLayers() {},
    onPen() {},
    onHover() {},
  };
  const engine = new InkEngine(
    new GeometryInk() as unknown as LayerInk,
    layer,
    { ...settings, smoothing, postCorrection: FIRST_POST_CORRECTION },
    events,
    {
      now: () => samples.at(-1)!.t,
      request(cb) {
        frame = cb;
        return () => {
          frame = null;
        };
      },
    },
  );
  engine.fit({ width: 374, height: 748 }, 1);
  const at = (s: Sample) => ({
    pointerId: 1,
    pointerType: "pen",
    button: 0,
    buttons: 1,
    clientX: s.x,
    clientY: s.y,
    pressure: s.pressure,
    width: 1,
    height: 1,
    timeStamp: s.t,
    preventDefault() {},
  });
  const tick = (t: number) => {
    const cb = frame;
    frame = null;
    cb?.(t);
  };
  engine.down(at(samples[0]));
  for (let i = 1; i < samples.length; i += batch) {
    const chunk = samples.slice(i, i + batch);
    if (coalesced) {
      engine.move({ ...at(chunk.at(-1)!), getCoalescedEvents: () => chunk.map(at) });
    } else chunk.forEach((s) => engine.move(at(s)));
    tick(chunk.at(-1)!.t);
  }
  const end = samples.at(-1)!;
  if (idle) for (let t = end.t + 1000 / 60; t <= end.t + 400; t += 1000 / 60) tick(t);
  engine.up({ ...at(end), pressure: 0, buttons: 0 });
  assert.equal(commits.length, 1);
  engine.dispose();
  return { op: commits[0], paints: layer.paints, restores: layer.restores };
}
const batches: any[] = [];
for (const fixture of fixtures.slice(0, 7))
  for (const rate of [60, 120, 240])
    for (const smoothing of [0, 35, 100]) {
      const samples = makeSamples(fixture, rate);
      const ref = engineReplay(samples, smoothing, 1, false);
      const digest = (op: any) =>
        crypto.createHash("sha256").update(JSON.stringify(op)).digest("hex");
      for (const batch of [1, 2, 4, 8])
        for (const coalesced of [false, true]) {
          const result = engineReplay(samples, smoothing, batch, coalesced);
          assert.deepEqual(result.op, ref.op);
          batches.push({
            fixture: fixture.name,
            rate,
            smoothing,
            batch,
            coalesced,
            equal: true,
            sha256: digest(result.op),
            paints: result.paints,
          });
        }
    }
const idleFixture = makeSamples(fixtures[4], 120);
const noIdle = engineReplay(idleFixture, 100, 1, false);
const idle = engineReplay(idleFixture, 100, 1, false, true);
const idleResult = {
  geometry_equal: JSON.stringify(noIdle.op) === JSON.stringify(idle.op),
  no_idle_last_time: noIdle.op.pts.at(-1),
  idle_last_time: idle.op.pts.at(-1),
  note: "Empty display frames add no stabilization packets; finalized geometry and input timestamps remain identical.",
};
assert.equal(idleResult.geometry_equal, true);
assert.equal(idleResult.no_idle_last_time, idleResult.idle_last_time);
for (const row of rows.filter((r) => r.filter === "raw")) assert.equal(row.raw_to_filter, 0);
for (const row of summaries.filter(
  (r) => r.filter === "fixed_S12_T0" && r.fixture.startsWith("line_"),
))
  assert(Math.abs(row.raw_filter_equivalent_ms - (5.5 * 1000) / row.rate) < 1e-8);
fs.writeFileSync(out + "/fixtures.json", JSON.stringify(savedFixtures, null, 2), { flag: "wx" });
fs.writeFileSync(out + "/samples.csv", csv(rows), { flag: "wx" });
fs.writeFileSync(out + "/summary.csv", csv(summaries), { flag: "wx" });
fs.writeFileSync(out + "/summary.json", JSON.stringify(summaries, null, 2), { flag: "wx" });
fs.writeFileSync(
  out + "/batch-results.json",
  JSON.stringify({ cases: batches, idle: idleResult }, null, 2),
  { flag: "wx" },
);
const validation = {
  sample_rows: rows.length,
  summary_rows: summaries.length,
  engine_batch_checks: batches.length,
  engine_batch_failures: 0,
  raw_bypass_rows: rows.filter((r) => r.filter === "raw").length,
  analytical_fixed_window_checks: 9,
  idle: idleResult,
};
fs.writeFileSync(path.join(out, "validation.json"), JSON.stringify(validation, null, 2), {
  flag: "wx",
});
const sourcePaths = [
  "apps/frontend/src/sticker-creation/canvas/stabilizer.ts",
  "apps/frontend/src/sticker-creation/canvas/brush.ts",
  "apps/frontend/src/sticker-creation/canvas/strokeCurve.ts",
  "apps/frontend/src/sticker-creation/canvas/inkEngine.ts",
  "apps/frontend/src/sticker-creation/layers/layerInk.ts",
  "apps/frontend/src/sticker-creation/layers/layerHistory.ts",
  "apps/frontend/src/sticker-creation/layers/sheetDisplay.ts",
  "apps/frontend/src/sticker-creation/canvas/paintStroke.ts",
  "apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts",
  "apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts",
  "apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts",
];
const provenance = {
  date: new Date().toISOString(),
  implementation:
    "Shared reconstructed CSP queue with browser release adapter; fixed-helper rows isolate only averaging arithmetic",
  node: process.version,
  source_audit_head: "ebe0d143f134d7e28cd2da386044a8327f0fe10b",
  initial_spike_head: "52493b5618ec22291b32caa8fd1f803c15384416",
  replay_head: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    timeout: 5000,
    encoding: "utf8",
  }).trim(),
  files: sourcePaths.map((source) => ({
    path: source,
    sha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(repo, source)))
      .digest("hex"),
  })),
};
fs.writeFileSync(path.join(out, "provenance.json"), JSON.stringify(provenance, null, 2), {
  flag: "wx",
});
console.log(JSON.stringify(validation, null, 2));
console.log("STEADY STRAIGHT LINES: mean lag in ms, filter + curve");
for (const r of summaries.filter(
  (r) => r.fixture.startsWith("line_") && (r.rate === 120 || r.filter === "fixed_S12_T0"),
))
  console.log(
    `${r.fixture} ${r.rate}Hz ${r.filter}: ${r.raw_filter_equivalent_ms.toFixed(3)} + ${r.filter_curve_equivalent_ms.toFixed(3)}`,
  );
