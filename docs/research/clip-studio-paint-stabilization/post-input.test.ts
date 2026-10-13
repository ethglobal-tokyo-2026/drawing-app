import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createPostInputRecord, PostMovement } from "./post-input.ts";

const base = {
  enabled: true,
  deviceType: 4,
  window: 20,
  platform: 2,
  magnificationFraction: 1,
  coordinateFactor: 1,
  documentRatio: 1,
};

test("movement initialization uses time only for enabled non-type-1 input with a timestamp", () => {
  const p = { x: 0, y: 0 };
  const timed = new PostMovement(base, p, 100n).snapshot();
  assert.equal(timed.timeMode, true);
  assert.equal(timed.scale, 0.125);
  assert.equal(timed.limit, 10);
  assert.deepEqual(timed.timestamps, [100n]);
  assert.equal(new PostMovement({ ...base, deviceType: 1 }, p, 100n).snapshot().scale, 0.01);
  assert.equal(new PostMovement(base, p, 0n).snapshot().timeMode, false);
});

test("timed movement measures from the point two calls back and reads oldest before popping", () => {
  const movement = new PostMovement({ ...base, window: 0 }, { x: 0, y: 0 }, 100n);
  assert.equal(movement.update({ x: 1, y: 0 }, 101n), 0.125);
  assert.equal(movement.update({ x: 2, y: 0 }, 102n), 0.25);
  assert.equal(movement.update({ x: 3, y: 0 }, 103n), 0.5 / 3);
  assert.deepEqual(movement.snapshot().timestamps, [101n, 102n, 103n]);
});

test("duplicate/backward timestamps do not append but position history still advances", () => {
  const movement = new PostMovement(base, { x: 0, y: 0 }, 100n);
  assert.equal(movement.update({ x: 1, y: 0 }, 100n), 0);
  assert.equal(movement.update({ x: 2, y: 0 }, 99n), 0);
  assert.deepEqual(movement.snapshot().previous, { x: 1, y: 0 });
  assert.deepEqual(movement.snapshot().current, { x: 2, y: 0 });
  assert.deepEqual(movement.snapshot().timestamps, [100n]);
});

test("reuse keeps the scalar but updates point history", () => {
  const movement = new PostMovement({ ...base, deviceType: 1 }, { x: 0, y: 0 }, 1n);
  assert.equal(movement.update({ x: 5, y: 0 }, 2n), 0.05);
  assert.equal(movement.update({ x: 100, y: 0 }, 3n, true), 0.05);
  assert.deepEqual(movement.snapshot().previous, { x: 5, y: 0 });
});

test("short platform branch retains startup count until the five-unit interval expires", () => {
  const movement = new PostMovement({ ...base, platform: 3 }, { x: 0, y: 0 }, 100n);
  assert.equal(movement.update({ x: 1, y: 0 }, 101n), 0.125 * 0.5 * 0.1);
  assert.equal(movement.snapshot().startupRemaining, 1);
  movement.update({ x: 2, y: 0 }, 105n);
  assert.equal(movement.snapshot().startupRemaining, 0);
});

test("record preserves binary64 scalars, signed offsets, optional orientation and original pressure cap", () => {
  const record = createPostInputRecord({
    point: { x: 1.25, y: 2.5 },
    pressure: 0.7,
    tiltDegrees: 45,
    bearingDegrees: 25,
    rotationDegrees: 75,
    movement: 0.2,
    sourceIndex: 8,
    startupPosition: 0,
    startupLength: 0,
    offset: { x: -2, y: 3 },
    angleSource: "bearing",
    reflect360: true,
    reflect180: true,
  });
  assert.deepEqual(record.point, { x: -0.75, y: 5.5 });
  assert.deepEqual(record.scalars, [0.7, 0.5, 0.2, -155, 1, 1, 1]);
  assert.equal(record.sourceIndex, 8);
  assert.equal(record.flags, 0);
  const capped = createPostInputRecord({
    point: { x: 0, y: 0 },
    pressure: 2,
    tiltDegrees: 90,
    bearingDegrees: 0,
    rotationDegrees: 0,
    movement: 0,
    sourceIndex: 0,
    startupPosition: 0,
    startupLength: 5,
    offset: { x: 0, y: 0 },
    angleSource: "none",
    reflect360: false,
    reflect180: false,
  });
  assert.equal(capped.scalars[0], 1);
});

test("6,240 original-instruction cases match every compared movement state and source scalar bit", () => {
  const oracle = JSON.parse(
    readFileSync(new URL("./spikes/post-input/evidence/native.json", import.meta.url), "utf8"),
  );
  const bits = (value: number) => {
    const buffer = new DataView(new ArrayBuffer(8));
    buffer.setFloat64(0, value);
    return buffer.getBigUint64(0).toString(16).padStart(16, "0");
  };
  const integerBits = (value: bigint) => BigInt.asUintN(64, value).toString(16).padStart(16, "0");
  let movement: PostMovement | undefined;
  for (const [index, row] of oracle.cases.entries()) {
    if (row.mode === "R") {
      const result = createPostInputRecord(row.packet);
      assert.deepEqual(
        [result.point.x, result.point.y, ...result.scalars].map(bits),
        row.native.slice(0, 9),
        `record case ${index}`,
      );
      continue;
    }
    if (row.mode === "I") movement = new PostMovement(row.config, row.point, BigInt(row.timestamp));
    else movement!.update(row.point, BigInt(row.timestamp), row.reuse);
    const state = movement!.snapshot();
    const values = [
      String(+state.timeMode),
      bits(state.scale),
      String(state.count),
      String(state.limit),
      integerBits(state.initialTimestamp),
      String(+state.shortInterval),
      String(state.startupRemaining),
      ...[state.current.x, state.current.y, state.previous.x, state.previous.y, state.result].map(
        bits,
      ),
      String(state.timestamps.length),
      ...state.timestamps.map(integerBits),
    ];
    assert.deepEqual(values, row.native, `movement case ${index}`);
  }
  assert.equal(oracle.cases.length, 6240);
});
