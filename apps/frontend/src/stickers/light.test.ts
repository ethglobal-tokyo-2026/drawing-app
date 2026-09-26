// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireLight, installLight, lightUp } from "./light";

const root = document.documentElement;
let uninstall = () => {};
/** The tilt listeners on the window: the phone's motion sensor runs while there are any. */
const tiltListeners = new Set<EventListenerOrEventListenerObject>();
/** The light's holds a test hasn't released, released after it. */
const held = new Set<() => void>();
/** A sticker's live resin, which reads the light. */
let resin: HTMLElement;

const addResin = () => {
  const el = document.createElement("span");
  el.className = "live-resin";
  document.body.append(el);
  return el;
};
const lightOn = (el: HTMLElement) => [
  el.style.getPropertyValue("--lx"),
  el.style.getPropertyValue("--ly"),
];
const lightAt = () => lightOn(resin);
const pointAt = (x: number, y: number) =>
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }));
const tiltTo = (gamma: number, beta: number) =>
  window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma, beta }));
/** A screen with stickers showing: it holds the light, and returns what closes it. */
const showScreen = () => {
  const release = acquireLight();
  held.add(release);
  return () => {
    held.delete(release);
    release();
  };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  resin = addResin();
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === "deviceorientation") tiltListeners.add(listener);
    add(type, listener, options);
  });
  vi.spyOn(window, "removeEventListener").mockImplementation((type, listener, options) => {
    if (type === "deviceorientation") tiltListeners.delete(listener);
    remove(type, listener, options);
  });
});

afterEach(() => {
  held.forEach((release) => release());
  held.clear();
  uninstall();
  tiltListeners.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the shared light", () => {
  it("follows the pointer to the window's edge on the resins, never the root", () => {
    uninstall = installLight(root);
    showScreen();
    pointAt(window.innerWidth, window.innerHeight / 2);
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    expect(lightOn(root)).toEqual(["", ""]);
  });

  it("ignores the pointer while no screen shows stickers", () => {
    uninstall = installLight(root);
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["", ""]);
  });

  it("writes once for moves that come close together, with the later position", () => {
    uninstall = installLight(root);
    showScreen();
    pointAt(0, 0);
    vi.advanceTimersByTime(16);
    const writes = vi.spyOn(resin.style, "setProperty");
    pointAt(window.innerWidth / 4, 0);
    vi.advanceTimersByTime(16);
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(writes.mock.calls.filter(([name]) => name === "--lx")).toEqual([["--lx", "1.000"]]);
  });

  it("keeps still for the hand's tremor", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(16, 40);
    vi.advanceTimersByTime(100);
    const writes = vi.spyOn(resin.style, "setProperty");
    tiltTo(16.2, 40.2);
    vi.advanceTimersByTime(100);
    expect(writes).not.toHaveBeenCalled();
  });

  it("starts a newly shown screen's resins where the light already is", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(100);
    const detail = addResin();
    showScreen();
    expect(lightOn(detail)).toEqual(["1.000", "0.000"]);
  });

  it("follows the phone's tilt on a screen with stickers, even in a browser that can also ask", () => {
    // Chrome has requestPermission too, and grants it without asking.
    vi.stubGlobal(
      "DeviceOrientationEvent",
      class {
        static requestPermission = () => Promise.resolve("granted");
      },
    );
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
  });

  it("leaves the motion sensor off while no screen shows stickers", () => {
    uninstall = installLight(root);
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["", ""]);
    expect(tiltListeners.size).toBe(0);
  });

  it("stops listening for the tilt when the last screen with stickers goes", () => {
    uninstall = installLight(root);
    const closeBoard = showScreen();
    const closeDetail = showScreen();
    closeDetail();
    expect(tiltListeners.size).toBe(1);
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["1.000", "0.000"]);

    closeBoard();
    expect(tiltListeners.size).toBe(0);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
  });

  it("lights every foil's glint with the resins, and one shown later where the light already is", () => {
    const foil = document.createElement("span");
    foil.className = "sticker-foil";
    document.body.append(foil);
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightOn(foil)).toEqual(["1.000", "0.000"]);
    expect(lightOn(foil)).toEqual(lightAt());

    // Shown while the phone is still: no move comes to light it, so it starts from the light.
    const later = document.createElement("span");
    later.className = "sticker-foil";
    lightUp(later);
    expect(lightOn(later)).toEqual(lightAt());
  });

  it("stays in the middle under reduced motion", () => {
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    uninstall = installLight(root);
    showScreen();
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["", ""]);
  });
});
