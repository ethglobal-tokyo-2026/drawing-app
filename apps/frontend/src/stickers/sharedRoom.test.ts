import { describe, expect, it } from "vitest";
import {
  attitudeOf,
  inverse,
  multiply,
  poseOf,
  rotate,
  STILL_POSE,
  type DevicePose,
  type Quaternion,
} from "./lightMode";
import { roomFrame } from "./sharedRoom";

type Vec3 = readonly number[];
const RAD = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec3) => a.map((v) => v / Math.hypot(...a));
const angle = (a: Vec3, b: Vec3) =>
  Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) / RAD;
/** A direction's heading on screen, in degrees clockwise from the screen's up (shader y is down). */
const onScreen = (v: Vec3) => Math.atan2(v[0], -v[1]) / RAD;
/** How far a direction's heading on screen turned from `a` to `b`, within half a turn. */
const turnedOnScreen = (a: Vec3, b: Vec3) => ((onScreen(b) - onScreen(a) + 540) % 360) - 180;

/** The viewer is centered on the still pose; the device then turns by `by`, in its own axes. */
const rest = attitudeOf(0, STILL_POSE.beta, STILL_POSE.gamma);
const turnedBy = (by: Quaternion): DevicePose => {
  const now = multiply(rest, by);
  return { ...poseOf(now, STILL_POSE), turn: multiply(inverse(now), rest) };
};
/** A direction in the shader's screen axes, held still in the world while the device turns by `by`. */
const heldInWorld = (v: Vec3, by: Quaternion) => {
  const [x, y, z] = rotate(inverse(by), [v[0], -v[1], v[2]]);
  return [x, -y, z];
};
/** The eye's mirror direction at the screen's center, in the room's axes: side, up, toward. */
const mirrored = (pose: DevicePose) => {
  const frame = roomFrame(pose);
  const eye = unit(frame.eye);
  const mirror = [-eye[0], -eye[1], eye[2]];
  const side = cross(frame.up, frame.toward);
  return [dot(mirror, side), dot(mirror, frame.up), dot(mirror, frame.toward)];
};

/** Where a point on a flat screen, in CSS px from its center, mirrors on the light's plane, in its axes. */
const planeAt = (frame: ReturnType<typeof roomFrame>, x: number, y: number) => {
  const view = unit([frame.eye[0] - x, frame.eye[1] - y, frame.eye[2]]);
  const r = [-view[0], -view[1], view[2]];
  return [dot(r, frame.across), dot(r, frame.down)].map((v) => v / dot(r, frame.light));
};

describe("roomFrame", () => {
  it("squares the light's plane so its across axis reads level and its down axis plumb at the still pose", () => {
    const frame = roomFrame(turnedBy(attitudeOf(0, 0, 0)));
    const step = 60;
    const [acrossX, downX] = [0, 1].map(
      (i) => planeAt(frame, step, 0)[i] - planeAt(frame, -step, 0)[i],
    );
    const [acrossY, downY] = [0, 1].map(
      (i) => planeAt(frame, 0, step)[i] - planeAt(frame, 0, -step)[i],
    );
    expect(Math.abs(Math.atan2(downX, acrossX) / RAD)).toBeLessThan(0.5);
    expect(Math.abs(Math.atan2(acrossY, downY) / RAD)).toBeLessThan(0.5);
  });

  it("turns the reflection twice as far as a forward tilt, up the screen's vertical plane", () => {
    const still = mirrored(turnedBy(attitudeOf(0, 0, 0)));
    for (const tilt of [-12, 6, 15]) {
      const tilted = mirrored(turnedBy(attitudeOf(0, tilt, 0)));
      expect(angle(still, tilted)).toBeCloseTo(2 * Math.abs(tilt), 6);
      expect(tilted[0]).toBeCloseTo(0, 9);
    }
  });

  it("slides the reflection sideways for a tilt about the long axis, with the light held in the world", () => {
    const still = roomFrame(turnedBy(attitudeOf(0, 0, 0)));
    for (const roll of [-10, 10]) {
      const by = attitudeOf(0, 0, roll);
      const rolled = turnedBy(by);
      const [side] = mirrored(rolled);
      expect(Math.abs(side)).toBeCloseTo(Math.sin(2 * Math.abs(roll) * RAD), 6);
      // On screen, the light's plane turns only as far as its axes, still in the world, lean on the rolled screen.
      const frame = roomFrame(rolled);
      for (const axis of ["down", "across"] as const)
        expect(turnedOnScreen(still[axis], frame[axis])).toBeCloseTo(
          turnedOnScreen(still[axis], heldInWorld(still[axis], by)),
          6,
        );
    }
  });

  it("shows the same room whichever way the screen is turned under the device", () => {
    const by = attitudeOf(8, 12, -9);
    const portrait = roomFrame(turnedBy(by));
    // The same screen in the world, with the device turned a quarter under it.
    const quarter = attitudeOf(90, 0, 0);
    const restDevice = multiply(rest, quarter);
    const nowDevice = multiply(multiply(rest, by), quarter);
    const landscape = roomFrame({
      ...poseOf(nowDevice, { ...STILL_POSE, screenAngle: 90 }),
      turn: multiply(inverse(nowDevice), restDevice),
    });
    for (const key of ["up", "toward", "light", "across", "down", "eye"] as const)
      unit(landscape[key]).forEach((v, i) => expect(v).toBeCloseTo(unit(portrait[key])[i], 9));
  });

  it("turns the room on screen as far as the device turns about the screen's normal", () => {
    const still = roomFrame(turnedBy(attitudeOf(0, 0, 0)));
    for (const turn of [-30, 20]) {
      const frame = roomFrame(turnedBy(attitudeOf(turn, 0, 0)));
      expect(turnedOnScreen(still.up, frame.up)).toBeCloseTo(turn, 6);
      expect(turnedOnScreen(still.down, frame.down)).toBeCloseTo(turn, 6);
    }
  });
});
