import { TOKYO_UTC_OFFSET_MS } from "@drawing-app/api/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";
import type { Language } from "../i18n/language";
import { formatDay, formatDuration, formatHandle, formatMonthDay, spokenDuration } from "./format";

const MINUTE = 60;

/** A drawing time as the catalog prints it, in `lng`. */
const printed = {
  both: (minutes: number, seconds: number, lng: Language = "en") =>
    i18next.t(($) => $.stickers.duration.minutesAndSeconds, { minutes, seconds, lng }),
  minutes: (minutes: number, lng: Language = "en") =>
    i18next.t(($) => $.stickers.duration.minutes, { minutes, lng }),
  seconds: (seconds: number, lng: Language = "en") =>
    i18next.t(($) => $.stickers.duration.seconds, { seconds, lng }),
};

/** A drawing time as the catalog reads it aloud, in `lng`. */
const spoken = {
  minutes: (count: number, lng: Language = "en") =>
    i18next.t(($) => $.stickers.spokenDuration.minutes, { count, lng }),
  seconds: (count: number, lng: Language = "en") =>
    i18next.t(($) => $.stickers.spokenDuration.seconds, { count, lng }),
  both: (minutes: number, seconds: number, lng: Language = "en") =>
    i18next.t(($) => $.stickers.spokenDuration.minutesAndSeconds, {
      minutes: spoken.minutes(minutes, lng),
      seconds: spoken.seconds(seconds, lng),
      lng,
    }),
};

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
    expect(formatDuration(4 * MINUTE + 52)).toBe(printed.both(4, 52));
    expect(formatDuration(5 * MINUTE)).toBe(printed.minutes(5));
    expect(formatDuration(54)).toBe(printed.seconds(54));
    expect(formatDuration(0)).toBe(printed.seconds(0));
  });

  it("reads the same time aloud in words, singular where it's one", () => {
    expect(spokenDuration(4 * MINUTE + 52)).toBe(spoken.both(4, 52));
    expect(spokenDuration(MINUTE + 1)).toBe(spoken.both(1, 1));
    expect(spokenDuration(5 * MINUTE)).toBe(spoken.minutes(5));
    expect(spokenDuration(54)).toBe(spoken.seconds(54));
  });
});

describe("durations in Japanese", () => {
  it("print Japanese units", () => {
    expect(formatDuration(4 * MINUTE + 52, "ja")).toBe(printed.both(4, 52, "ja"));
    expect(formatDuration(5 * MINUTE, "ja")).toBe(printed.minutes(5, "ja"));
    expect(spokenDuration(MINUTE + 1, "ja")).toBe(spoken.both(1, 1, "ja"));
  });
});
