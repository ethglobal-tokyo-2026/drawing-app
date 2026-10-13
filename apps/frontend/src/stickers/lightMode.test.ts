import { describe, expect, it } from "vitest";
import { fallbackPose, lightMode, rotationInputForLight, type LightInputs } from "./lightMode";

const desktop: LightInputs = {
  device: "desktop",
  rotation: "unavailable",
  permission: "not-needed",
  hasUsableReading: false,
  reducedMotion: false,
  visible: true,
  holders: 1,
};

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
