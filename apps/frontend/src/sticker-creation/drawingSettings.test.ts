// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { keepInputMode, penDrew, readInputMode } from "./drawingSettings";

afterEach(() => localStorage.clear());

describe("the input mode", () => {
  it("starts every sheet in Pencil only once a pen first draws on this device, and a later pen never undoes the person's choice", () => {
    expect(readInputMode()).toBeNull();
    penDrew();
    expect(readInputMode()).toBe("pencilOnly");
    keepInputMode("pencilAndFinger");
    penDrew();
    expect(readInputMode()).toBe("pencilAndFinger");
  });
});
