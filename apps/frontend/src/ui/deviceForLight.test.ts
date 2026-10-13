import { describe, expect, it } from "vitest";
import { deviceForLight, isAppleMobile } from "./deviceForLight";

describe("deviceForLight", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5, "phone-or-tablet"],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", 5, "phone-or-tablet"],
    ["Mozilla/5.0 (iPod touch; CPU iPhone OS 18_0 like Mac OS X)", 5, "phone-or-tablet"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5, "phone-or-tablet"],
    ["Mozilla/5.0 (Linux; Android 15; Tablet)", 5, "phone-or-tablet"],
    ["Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile", 0, "phone-or-tablet"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 1, "unknown"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 10, "unknown"],
    ["Mozilla/5.0 (X11; Linux x86_64)", 5, "unknown"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0, "desktop"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0, "desktop"],
    ["Mozilla/5.0 (X11; Linux x86_64)", 0, "desktop"],
    ["Mozilla/5.0 (X11; CrOS x86_64 16000.0.0)", 0, "desktop"],
    ["Unidentified browser", 0, "unknown"],
    ["", 0, "unknown"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", NaN, "unknown"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", -1, "unknown"],
  ] as const)("classifies %s with %s touch points as %s", (userAgent, maxTouchPoints, want) => {
    expect(deviceForLight({ userAgent, maxTouchPoints })).toBe(want);
  });

  it.each([
    ["iPhone", 0, true],
    ["iPad", 0, true],
    ["iPod", 0, true],
    ["Macintosh", 5, true],
    ["Macintosh", 1, false],
    ["Macintosh", 0, false],
    ["Android", 5, false],
  ] as const)("keeps the Apple permission check for %s/%s", (userAgent, maxTouchPoints, want) => {
    expect(isAppleMobile({ userAgent, maxTouchPoints })).toBe(want);
  });
});
