import { describe, expect, it } from "vitest";
import { formatHandle } from "./format";

describe("formatHandle", () => {
  it("prints a handle with one @, however many it came with", () => {
    expect(formatHandle("alice")).toBe("@alice");
    expect(formatHandle("@@alice")).toBe("@alice");
  });
});
