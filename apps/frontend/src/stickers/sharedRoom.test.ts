import { describe, expect, it } from "vitest";
import {
  attitudeOf,
  IDENTITY,
  inverse,
  multiply,
  poseOf,
  rotate,
  STILL_POSE,
  type DevicePose,
  type Quaternion,
} from "./lightMode";
import { DIFFUSER_RADIUS, LIGHT_AZIMUTH, LIGHT_DISTANCE, LIGHT_ELEVATION } from "./roomGeometry";
import { ROOM, roomFrame } from "./sharedRoom";

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

/**
 * The diffuser's rim, hung where roomGeometry.ts puts it from gravity and the viewer alone, seen from
 * the device on the light's plane, in its axes.
 */
const rimOnPlane = (frame: ReturnType<typeof roomFrame>) => {
  // Shader axes are y down, so this cross product points to the viewer's left.
  const left = cross(frame.up, frame.toward);
  const [e, a] = [LIGHT_ELEVATION * RAD, LIGHT_AZIMUTH * RAD];
  const middle = [0, 1, 2].map(
    (i) =>
      LIGHT_DISTANCE *
      (Math.cos(e) * (Math.cos(a) * frame.toward[i] + Math.sin(a) * left[i]) +
        Math.sin(e) * frame.up[i]),
  );
  return Array.from({ length: 720 }, (_, k) => {
    const t = (k / 2) * RAD;
    const r = unit(
      middle.map(
        (m, i) => m + DIFFUSER_RADIUS * (Math.cos(t) * frame.toward[i] + Math.sin(t) * left[i]),
      ),
    );
    return [dot(r, frame.across), dot(r, frame.down)].map((v) => v / dot(r, frame.light));
  });
};

describe("roomFrame", () => {
  it("keeps the eye in front through a full turn without moving the room", () => {
    const still = roomFrame(turnedBy(IDENTITY));
    for (const degrees of [45, 60, 75, 90, 120, 150, 179.999, 180, 180.001, 210, 270, 315]) {
      for (const by of [attitudeOf(0, degrees, 0), attitudeOf(0, 0, degrees)]) {
        const frame = roomFrame(turnedBy(by));
        expect(frame.eye.every(Number.isFinite)).toBe(true);
        expect(frame.eye[2] / ROOM.eyeDistance).toBeGreaterThan(0.25);
        expect(Math.hypot(...frame.eye)).toBeCloseTo(ROOM.eyeDistance, 8);
        for (const key of ["up", "toward", "light", "across", "down"] as const)
          heldInWorld(still[key], by).forEach((v, i) => expect(frame[key][i]).toBeCloseTo(v, 8));
      }
    }
  });

  it("bends the eye continuously beyond an ordinary inspection angle", () => {
    const eyeAt = (degrees: number) => unit(roomFrame(turnedBy(attitudeOf(0, degrees, 0))).eye);
    for (const degrees of [30, 45, 59]) {
      const expected = heldInWorld([0, 0, 1], attitudeOf(0, degrees, 0));
      eyeAt(degrees).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
    }
    const step = 0.001;
    for (const boundary of [60, 180]) {
      const before = eyeAt(boundary - step);
      const at = eyeAt(boundary);
      const after = eyeAt(boundary + step);
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(after[i] - before[i])).toBeLessThan(0.001);
        expect((after[i] - at[i]) / step).toBeCloseTo((at[i] - before[i]) / step, 4);
      }
    }
  });

  it("lays the light's plane level across and plumb down, where the diffuser's rim spans the shader's ellipse", () => {
    const { radius, aspect } = ROOM.light;
    for (const by of [attitudeOf(0, 0, 0), attitudeOf(0, 25, 0), attitudeOf(15, -10, 12)]) {
      const rim = rimOnPlane(roomFrame(turnedBy(by)));
      const [across, down] = [0, 1].map((i) => rim.map((point) => point[i]));
      const half = (v: number[]) => (Math.max(...v) - Math.min(...v)) / 2;
      const middle = (v: number[]) => (Math.max(...v) + Math.min(...v)) / 2;
      expect(Math.abs(half(across) / radius - 1)).toBeLessThan(0.01);
      expect(Math.abs(half(down) / (radius * aspect) - 1)).toBeLessThan(0.01);
      expect(Math.abs(middle(across))).toBeLessThan(0.01 * radius);
      // The near side of a level disc looks larger, which shifts its middle a little down the plane.
      expect(Math.abs(middle(down))).toBeLessThan(0.1 * radius);
    }
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
