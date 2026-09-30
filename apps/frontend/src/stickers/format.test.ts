import { TOKYO_UTC_OFFSET_MS } from "@drawing-app/api/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { formatDay, formatDuration, formatHandle, formatMonthDay, spokenDuration } from "./format";

const MINUTE = 60;

describe("dates", () => {
  // A phone that isn't on Tokyo time.
  beforeAll(() => vi.stubEnv("TZ", "America/Los_Angeles"));
  afterAll(() => vi.unstubAllEnvs());

  it("print the day in Tokyo, where the app's days turn over, whatever the phone's zone", () => {
    const midnight = Date.parse("2026-09-26") - TOKYO_UTC_OFFSET_MS;
    expect(formatDay(midnight - 1)).toBe("2026.09.25");
    expect(formatDay(midnight)).toBe("2026.09.26");
    expect(formatMonthDay(midnight - 1)).toBe("9.25");
    expect(formatMonthDay(midnight)).toBe("9.26");
  });
});

describe("formatHandle", () => {
  it("prints a handle with one @, however many it came with", () => {
    expect(formatHandle("alice")).toBe("@alice");
    expect(formatHandle("@@alice")).toBe("@alice");
  });
});

describe("formatDuration", () => {
  it("prints minutes and seconds with units, leaving out a part that's zero", () => {
    expect(formatDuration(4 * MINUTE + 52)).toBe("4m 52s");
    expect(formatDuration(5 * MINUTE)).toBe("5m");
    expect(formatDuration(54)).toBe("54s");
    expect(formatDuration(0)).toBe("0s");
  });

  it("reads the same time aloud in words, singular where it's one", () => {
    expect(spokenDuration(4 * MINUTE + 52)).toBe("4 minutes 52 seconds");
    expect(spokenDuration(MINUTE + 1)).toBe("1 minute 1 second");
    expect(spokenDuration(5 * MINUTE)).toBe("5 minutes");
    expect(spokenDuration(54)).toBe("54 seconds");
  });
});

describe("durations in Japanese", () => {
  it("print Japanese units", () => {
    expect(formatDuration(4 * MINUTE + 52, "ja")).toBe("4分52秒");
    expect(formatDuration(5 * MINUTE, "ja")).toBe("5分");
    expect(spokenDuration(MINUTE + 1, "ja")).toBe("1分1秒");
  });
});
