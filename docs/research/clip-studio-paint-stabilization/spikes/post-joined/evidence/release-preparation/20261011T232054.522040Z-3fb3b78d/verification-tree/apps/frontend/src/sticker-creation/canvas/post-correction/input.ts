/** Source record and movement arithmetic recovered from CSP 5.1.4 ARM64. */
import { fma64 } from "../stabilization/binary64.ts";
import type { Point } from "./reference.ts";
import type { PostScalars } from "./pipeline.ts";
import { startupSineTable } from "./input-table.ts";

export type PostMovementConfig = Readonly<{
  enabled: boolean;
  deviceType: number;
  window: number;
  /** Native platform getter is 2 in the pinned Mac image. */
  platform: number;
  /** Native initializer d0: magnification percent multiplied by 0.01. */
  magnificationFraction: number;
  /** Native initializer d1: 0x1021c7320, external object virtual +0x358. */
  coordinateFactor: number;
  /** Native initializer d2: signed numerator/denominator from 0x103116810. */
  documentRatio: number;
}>;

function integer32(value: number, name: string) {
  if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
    throw new RangeError(`${name} must be a signed 32-bit integer`);
  return value;
}

function finite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}

function point(value: Point): Point {
  return { x: finite(value.x, "x"), y: finite(value.y, "y") };
}

function time(value: bigint) {
  if (BigInt.asIntN(64, value) !== value) throw new RangeError("timestamp must fit signed 64 bits");
  return value;
}

function distance(a: Point, b: Point) {
  const x = a.x - b.x,
    y = a.y - b.y;
  return Math.sqrt(fma64(x, x, y * y));
}

/** 0x1028f2274 constructor, 0x1028f2344 initializer, 0x1028f25b0 update. */
export class PostMovement {
  private readonly config: PostMovementConfig;
  private readonly timeMode: boolean;
  private readonly scale: number;
  private readonly limit: number;
  private readonly initialTimestamp: bigint;
  private readonly shortInterval: boolean;
  private startupRemaining = 0;
  private current: Point;
  private previous: Point;
  private timestamps: bigint[];
  private count = 0;
  private result = 0;

  constructor(config: PostMovementConfig, initialPoint: Point, timestamp: bigint) {
    integer32(config.deviceType, "deviceType");
    integer32(config.window, "window");
    integer32(config.platform, "platform");
    for (const field of ["magnificationFraction", "coordinateFactor", "documentRatio"] as const)
      finite(config[field], field);
    this.config = { ...config };
    this.initialTimestamp = time(timestamp);
    this.current = this.previous = point(initialPoint);
    this.timeMode = config.enabled && config.deviceType !== 1 && timestamp !== 0n;
    this.shortInterval = this.timeMode && config.deviceType === 4 && config.platform === 3;
    if (this.timeMode && config.deviceType === 4)
      this.startupRemaining =
        config.platform === 1 ? 5 : config.platform === 4 ? 3 : config.platform === 3 ? 1 : 0;
    const base = this.timeMode ? 8 : config.deviceType === 1 || config.deviceType === 4 ? 100 : 20;
    const product = (config.enabled ? config.coordinateFactor * config.documentRatio : 1) * base;
    const denominator =
      config.magnificationFraction > 1e-8 ? product / config.magnificationFraction : product;
    // A fresh native object starts at one; initialization leaves it unchanged for this branch.
    this.scale = denominator > 1e-8 ? 1 / denominator : 1;
    this.limit = this.timeMode && config.window >= 4 ? config.window >>> 1 : 2;
    this.timestamps = this.timeMode ? [timestamp] : [];
  }

  update(nextPoint: Point, timestamp: bigint, reuse = false): number {
    const next = point(nextPoint);
    time(timestamp);
    let result = this.result;
    if (!reuse) {
      if (!this.timeMode) result = distance(next, this.current) * this.scale;
      else {
        const travel = distance(next, this.previous);
        const short =
          this.shortInterval && BigInt.asIntN(64, this.initialTimestamp + 5n) > timestamp;
        let factor = this.startupRemaining < 1 ? 1 : 0.5;
        if (this.startupRemaining >= 1 && !short) {
          const candidate = fma64(
            this.startupRemaining,
            this.config.platform === 1 ? -0.15 : -0.25,
            1,
          );
          factor = candidate < 0 ? 0 : candidate;
          this.startupRemaining--;
        }
        if (short) result = travel * this.scale * factor * 0.1;
        else {
          const oldest = this.timestamps[0];
          result = 0;
          if (oldest < timestamp) {
            if (this.timestamps[this.timestamps.length - 1] < timestamp) {
              if (this.count < this.limit) this.count++;
              else this.timestamps.shift();
              this.timestamps.push(timestamp);
            }
            result =
              (travel * this.scale * factor * this.count) /
              Number(BigInt.asIntN(64, timestamp - oldest));
          }
        }
      }
    }
    this.previous = this.current;
    this.current = next;
    this.result = result > 1 ? 1 : result;
    return this.result;
  }

  snapshot() {
    return {
      timeMode: this.timeMode,
      scale: this.scale,
      limit: this.limit,
      initialTimestamp: this.initialTimestamp,
      shortInterval: this.shortInterval,
      startupRemaining: this.startupRemaining,
      current: { ...this.current },
      previous: { ...this.previous },
      timestamps: [...this.timestamps],
      count: this.count,
      result: this.result,
    };
  }
}

export type PostInputPacket = Readonly<{
  point: Point;
  pressure: number;
  tiltDegrees: number;
  bearingDegrees: number;
  rotationDegrees: number;
  movement: number;
  sourceIndex: number;
  startupPosition: number;
  startupLength: number;
  offset: Point;
  angleSource: "none" | "bearing" | "rotation";
  reflect360: boolean;
  reflect180: boolean;
}>;

/** 0x102217e30, supported caller interval [0,90). Uses retained table bytes. */
export function startupSine(degrees: number): number {
  if (!(degrees >= 0 && degrees < 90))
    throw new RangeError("startup lookup requires degrees in [0,90)");
  const index = Math.trunc(degrees);
  const fraction = degrees - index;
  const first = startupSineTable[index];
  return fma64(startupSineTable[index + 1] - first, fraction, first);
}

/** 0x10288cd3c plus caller's movement write to record +0x20. */
export function createPostInputRecord(input: PostInputPacket) {
  const position = point(input.point);
  const xOffset = integer32(input.offset.x, "offset.x"),
    yOffset = integer32(input.offset.y, "offset.y");
  const tilt = integer32(input.tiltDegrees, "tiltDegrees");
  integer32(input.bearingDegrees, "bearingDegrees");
  integer32(input.rotationDegrees, "rotationDegrees");
  const startupLength = integer32(input.startupLength, "startupLength");
  finite(input.startupPosition, "startupPosition");
  finite(input.pressure, "pressure");
  finite(input.movement, "movement");
  let pressure = input.pressure;
  if (startupLength !== 0 && startupLength > input.startupPosition)
    pressure = startupSine((input.startupPosition / startupLength) * 90) * pressure;
  if (input.pressure > 1) pressure = 1;
  let angle = 0;
  if (input.angleSource !== "none") {
    angle = input.angleSource === "bearing" ? input.bearingDegrees : input.rotationDegrees;
    if (input.reflect360) angle = 360 - angle;
    if (input.reflect180) angle = 180 - angle;
  }
  const scalars: PostScalars = [
    pressure,
    tilt * 0.011111111111111112,
    input.movement,
    angle,
    1,
    1,
    1,
  ];
  return {
    point: { x: position.x + xOffset, y: position.y + yOffset },
    scalars,
    flags: 0,
    sourceIndex: input.sourceIndex,
  };
}
