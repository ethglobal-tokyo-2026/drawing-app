// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installLight } from "./light";

const root = document.documentElement;
let uninstall = () => {};

const lightAt = () => [root.style.getPropertyValue("--lx"), root.style.getPropertyValue("--ly")];
const pointAt = (x: number, y: number) =>
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  root.style.removeProperty("--lx");
  root.style.removeProperty("--ly");
});

afterEach(() => {
  uninstall();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the shared light", () => {
  it("follows the pointer to the window's edge", () => {
    uninstall = installLight(root);
    pointAt(window.innerWidth, window.innerHeight / 2);
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
  });

  it("writes once for moves that come close together, with the later position", () => {
    uninstall = installLight(root);
    pointAt(0, 0);
    vi.advanceTimersByTime(16);
    const writes = vi.spyOn(root.style, "setProperty");
    pointAt(window.innerWidth / 4, 0);
    vi.advanceTimersByTime(16);
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(writes.mock.calls.filter(([name]) => name === "--lx")).toEqual([["--lx", "1.000"]]);
  });

  it("follows the phone's tilt where the browser shares it, even one that can also ask", () => {
    // Chrome has requestPermission too, and grants it without asking.
    vi.stubGlobal(
      "DeviceOrientationEvent",
      class {
        static requestPermission = () => Promise.resolve("granted");
      },
    );
    uninstall = installLight(root);
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma: 32, beta: 40 }));
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
  });

  it("stays in the middle under reduced motion", () => {
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    uninstall = installLight(root);
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["", ""]);
  });
});
