import { describe, expect, it } from "vitest";
import { formatDuration, formatHandle, spokenDuration } from "./format";

const MINUTE = 60;

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
