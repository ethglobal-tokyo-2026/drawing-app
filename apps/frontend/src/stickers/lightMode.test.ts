import { describe, expect, it } from "vitest";
import {
  fallbackPose,
  lightMode,
  nearestAngles,
  readAt,
  rotationInputForLight,
  screenLean,
  STILL_POSE,
  upOnScreen,
  type DevicePose,
  type LightInputs,
} from "./lightMode";

const desktop: LightInputs = {
  device: "desktop",
  rotation: "unavailable",
  permission: "not-needed",
  hasUsableReading: false,
  reducedMotion: false,
  visible: true,
  holders: 1,
};

const pose = (beta: number, gamma: number, screenAngle = 0): DevicePose => ({
  beta,
  gamma,
  screenAngle,
});
/** Two poses with the same up on screen. */
const expectSameUp = (a: DevicePose, b: DevicePose) => {
  const [ax, ay, az] = upOnScreen(a);
  const [bx, by, bz] = upOnScreen(b);
  expect(ax).toBeCloseTo(bx, 10);
  expect(ay).toBeCloseTo(by, 10);
  expect(az).toBeCloseTo(bz, 10);
};

describe("upOnScreen", () => {
  it("leans gravity's up toward the screen's top as the device stands up", () => {
    expect(upOnScreen(pose(0, 0))[2]).toBeCloseTo(1, 10);
    expect(upOnScreen(pose(90, 0))[1]).toBeCloseTo(1, 10);
    // Tipped to its right, up points toward the screen's left.
    expect(upOnScreen(pose(30, 20))[0]).toBeLessThan(0);
  });

  it.each([90, 180, 270])("turns with the screen at %s degrees", (angle) => {
    // The device turned under the screen by the same angle shows the portrait reading's up.
    expectSameUp(readAt(pose(40, 15), angle), pose(40, 15));
    expect(readAt(pose(40, 15), angle).screenAngle).toBe(angle);
  });
});

describe("nearestAngles", () => {
  it("wraps beta the short way through upside down", () => {
    expect(nearestAngles(pose(175, 0), pose(-175, 0)).beta).toBeCloseTo(185, 10);
  });

  it("takes the sensor's other branch when the device rolls past sideways", () => {
    const from = pose(30, 89);
    const to = pose(150, -89);
    const near = nearestAngles(from, to);
    expectSameUp(near, to);
    expect(Math.abs(near.beta - from.beta) + Math.abs(near.gamma - from.gamma)).toBeLessThan(5);
  });
});

describe("screenLean", () => {
  it.each([0, 90, 180, 270])("is still at the still pose, read at %s degrees", (angle) => {
    expect(screenLean(readAt(STILL_POSE, angle))).toEqual({ x: 0, y: 0 });
  });

  it("leans across with a sideways tilt and up as the device stands, up to the edge", () => {
    expect(screenLean(pose(55, 10)).x).toBeGreaterThan(0);
    expect(screenLean(pose(55, -10)).x).toBeLessThan(0);
    expect(screenLean(pose(65, 0)).y).toBeGreaterThan(0);
    expect(screenLean(pose(45, 0)).y).toBeLessThan(0);
    expect(screenLean(pose(10, 80))).toEqual({ x: 1, y: -1 });
  });
});

describe("lightMode", () => {
  it.each([
    [{}, "fallback-wave"],
    [{ permission: "granted" }, "fallback-wave"],
    [{ device: "phone-or-tablet" }, "still"],
    [{ device: "unknown" }, "still"],
    [{ rotation: "unknown" }, "still"],
    [{ permission: "unasked" }, "still"],
    [{ permission: "denied" }, "still"],
    [{ visible: false }, "still"],
    [{ holders: 0 }, "still"],
    [{ reducedMotion: true }, "still"],
    [{ rotation: "usable" }, "device-tilt"],
    [{ rotation: "unknown", hasUsableReading: true }, "device-tilt"],
    [{ rotation: "usable", permission: "unasked" }, "device-tilt"],
    [{ hasUsableReading: true, permission: "unasked" }, "device-tilt"],
    [{ rotation: "usable", permission: "denied" }, "still"],
    [{ hasUsableReading: true, permission: "denied" }, "still"],
    [{ rotation: "usable", reducedMotion: true }, "still"],
    [{ hasUsableReading: true, visible: false }, "still"],
  ] satisfies [Partial<LightInputs>, string][])("chooses %s as %s", (changes, want) => {
    expect(lightMode({ ...desktop, ...changes })).toBe(want);
  });
});

describe("rotationInputForLight", () => {
  const facts = {
    device: "desktop" as const,
    secureContext: true,
    orientationApi: "absent" as const,
    sensorPolicy: "allowed" as const,
  };

  it("permits a fallback candidate only with explicit desktop, context, API and policy facts", () => {
    expect(rotationInputForLight(facts)).toBe("unavailable");
  });

  it.each([
    { device: "phone-or-tablet" },
    { device: "unknown" },
    { secureContext: false },
    { secureContext: undefined },
    { orientationApi: "present" },
    { orientationApi: "unknown" },
    { sensorPolicy: "blocked" },
    { sensorPolicy: "unknown" },
  ] as const)("keeps %s unknown", (changes) => {
    expect(rotationInputForLight({ ...facts, ...changes })).toBe("unknown");
  });
});

describe("fallbackPose", () => {
  it("starts at the still pose and sweeps continuously around it, the same each cycle", () => {
    expect(fallbackPose(0)).toEqual(STILL_POSE);
    expect(fallbackPose(0.25)).toEqual(fallbackPose(1.25));
    for (let phase = 0; phase < 1; phase += 0.05) {
      const before = fallbackPose(phase);
      const after = fallbackPose(phase + 0.0001);
      expect(Math.abs(before.beta - after.beta)).toBeLessThan(0.02);
      expect(Math.abs(before.gamma - after.gamma)).toBeLessThan(0.02);
    }
    expect(fallbackPose(0.25).gamma).toBeGreaterThan(5);
    expect(fallbackPose(0.75).gamma).toBeLessThan(-5);
    expect(fallbackPose(0.125).beta).toBeGreaterThan(STILL_POSE.beta + 5);
    expect(fallbackPose(0.375).beta).toBeLessThan(STILL_POSE.beta - 5);
  });
});
