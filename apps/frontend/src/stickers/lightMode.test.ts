import { describe, expect, it } from "vitest";
import {
  fallbackPose,
  lightMode,
  relativeTiltPose,
  rotationInputForLight,
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

describe("the complete relative rotation", () => {
  const origin = {
    alpha: 0,
    beta: 0,
    gamma: 0,
    screenAngle: 0,
    pose: { x: 0, y: 0, rotationDegrees: 0 },
  };

  it("retains a pure in-plane rotation while its surface normal remains unchanged", () => {
    expect(relativeTiltPose(10, 0, 0, origin)).toEqual({ x: 0, y: 0, rotationDegrees: -10 });
  });

  it("includes the coupled twist from Rz alpha, Rx beta, and Ry gamma", () => {
    const rad = Math.PI / 180;
    const pose = relativeTiltPose(10, 5, 5, origin);
    const expected = 10 + (2 * Math.atan(Math.tan(2.5 * rad) ** 2)) / rad;
    expect(pose.rotationDegrees).toBeCloseTo(-expected, 10);
    expect(pose.x).toBeGreaterThan(0);
    expect(pose.y).toBeGreaterThan(0);
  });

  it("expresses a heading turn about a tilted reference frame", () => {
    const rad = Math.PI / 180;
    const pose = relativeTiltPose(10, 40, 0, { ...origin, beta: 40 });
    const expected = (2 * Math.atan(Math.cos(40 * rad) * Math.tan(5 * rad))) / rad;
    expect(pose.rotationDegrees).toBeCloseTo(-expected, 10);
    expect(pose.x).toBeGreaterThan(0);
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
  it("changes one continuous bounded pose and returns to the same position each cycle", () => {
    expect(fallbackPose(0.25).x).toBeGreaterThan(0.3);
    expect(fallbackPose(0.75).x).toBeLessThan(-0.3);
    expect(fallbackPose(0.25).y).toBeCloseTo(0, 8);
    expect(fallbackPose(0)).toEqual(fallbackPose(1));
    for (const phase of [0, 0.1, 0.3, 0.5, 0.7, 0.9]) {
      const before = fallbackPose(phase);
      const after = fallbackPose(phase + 0.0001);
      expect(Math.abs(before.x - after.x)).toBeLessThan(0.002);
      expect(Math.abs(before.y - after.y)).toBeLessThan(0.002);
      expect(Math.abs(before.x)).toBeLessThan(0.7);
      expect(Math.abs(before.y)).toBeLessThan(0.3);
    }
  });
});
