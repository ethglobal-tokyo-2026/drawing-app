// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSetting } from "./deviceSetting";
import { refusingStorage } from "./testing";

/** The setting as a page opens it: what this device keeps, read afresh. */
const opened = () =>
  deviceSetting<"a" | "b">("test.setting", {
    parse: (text) => (text === "b" ? "b" : "a"),
    serialize: (value) => (value === "b" ? "b" : null),
    name: "The test setting",
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("deviceSetting", () => {
  it("keeps a value for the next visit, and tells every screen reading it at once", () => {
    const setting = opened();
    const heard = vi.fn();
    setting.subscribe(heard);
    expect(setting.set("b")).toBe(true);
    expect(heard).toHaveBeenCalledOnce();
    expect(opened().get()).toBe("b");
  });

  it("holds a value storage refused until the page goes, and says it wasn't kept", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    const setting = opened();
    expect(setting.set("b")).toBe(false);
    expect(setting.get()).toBe("b");
    expect(logged).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
    expect(opened().get()).toBe("a");
  });
});
