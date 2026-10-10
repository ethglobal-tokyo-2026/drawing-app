// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireLight,
  CREASE_SETTLE_MS,
  GLIDE_MS,
  installLight,
  lightUp,
  SWEEP_PAUSE_MS,
  SWEEP_TILT,
} from "./light";

const root = document.documentElement;
let uninstall = () => {};
/** The tilt listeners on the window: the phone's motion sensor runs while there are any. */
const tiltListeners = new Set<EventListenerOrEventListenerObject>();
/** The light's holds a test hasn't released, released after it. */
const held = new Set<() => void>();
/** A sticker's live resin's specular, which reads the light. */
let resin: HTMLElement;

/** A sticker's live resin; returns its specular. */
const addResin = () => {
  const el = document.createElement("span");
  el.className = "live-resin";
  const band = document.createElement("i");
  band.className = "live-resin__spec";
  const spec = document.createElement("b");
  band.append(spec);
  el.append(band);
  document.body.append(el);
  return spec;
};
/** A resin on screen, big enough to sweep; returns its sheen's sweeps. */
const addSweptResin = () => {
  const resin = addResin().closest<HTMLElement>(".live-resin");
  if (!resin) throw new Error("A live resin holds its specular");
  resin.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
  const band = document.createElement("i");
  band.className = "live-resin__sheen";
  const sheen = document.createElement("b");
  band.append(sheen);
  resin.append(band);
  const sweeps = vi.fn<Element["animate"]>();
  sheen.animate = sweeps;
  return sweeps;
};
/** A sensor's frame. */
const FRAME_MS = 16;
/** The phone tilted sideways a degree a frame, each step far short of a sweep's tilt. */
const tiltAcross = (from: number, to: number) => {
  for (let gamma = from; gamma <= to; gamma++) {
    tiltTo(gamma, 40);
    vi.advanceTimersByTime(FRAME_MS);
  }
};
/** A sticker's foil, whose bands and glint read the light. */
const makeFoil = () => {
  const foil = document.createElement("span");
  foil.className = "sticker-foil";
  const parts = ["sticker-foil__sheen", "sticker-foil__glint"].map((className) => {
    const part = document.createElement("i");
    part.className = className;
    foil.append(part);
    return part;
  });
  return { foil, parts };
};
const lightOn = (el: HTMLElement) => [
  el.style.getPropertyValue("--lx"),
  el.style.getPropertyValue("--ly"),
];
const lightAt = () => lightOn(resin);
/** A pointer moved to (x, y): a mouse unless it says it's a pen or a finger. */
const pointAt = (x: number, y: number, pointerType = "mouse", type = "pointermove") =>
  window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType }));
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
  vi.useFakeTimers({
    toFake: [
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "setTimeout",
      "clearTimeout",
    ],
  });
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
  it.each(["mouse", "pen"])(
    "follows a %s to the window's edge on the resins, never the root",
    (pointerType) => {
      uninstall = installLight(root);
      showScreen();
      pointAt(window.innerWidth, window.innerHeight / 2, pointerType);
      vi.advanceTimersByTime(16);
      expect(lightAt()).toEqual(["1.000", "0.000"]);
      expect(lightOn(root)).toEqual(["", ""]);
    },
  );

  it("never follows a finger, which is moving stickers, though the tilt still moves it", () => {
    uninstall = installLight(root);
    showScreen();
    pointAt(window.innerWidth, 0, "touch", "pointerdown");
    pointAt(0, window.innerHeight, "touch");
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["", ""]);

    tiltTo(32, 40);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
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

  it("lights a phone held upright and leaning sideways the same, whichever way the sensor writes it", () => {
    uninstall = installLight(root);
    showScreen();
    // Near upright the sensor can write one tilt two ways: gamma flips as beta passes 90°.
    tiltTo(89.9, 80);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    const before = lightAt();
    tiltTo(-89.9, 100);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(before);
  });

  it("glides to a new tilt rather than jumping, and lands on it", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(100);
    tiltTo(32, 40);
    vi.advanceTimersByTime(60);
    const across = Number(lightAt()[0]);
    expect(across).toBeGreaterThan(0);
    expect(across).toBeLessThan(1);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
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

  it("starts a resin shown after the light moved where the light already is", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(100);
    // As LiveResin does as it mounts.
    const detail = addResin();
    lightUp(detail);
    expect(lightOn(detail)).toEqual(["1.000", "0.000"]);
  });

  it("sweeps a sheen once the phone has tilted far enough, however slowly, and not again until the pause has passed", () => {
    const sweeps = addSweptResin();
    uninstall = installLight(root);
    showScreen();
    tiltAcross(0, SWEEP_TILT);
    expect(sweeps).toHaveBeenCalledTimes(1);

    // Held still through the pause, it doesn't sweep again; tilted on after it, it does.
    for (let t = 0; t <= SWEEP_PAUSE_MS; t += FRAME_MS) {
      tiltTo(SWEEP_TILT, 40);
      vi.advanceTimersByTime(FRAME_MS);
    }
    expect(sweeps).toHaveBeenCalledTimes(1);
    tiltAcross(SWEEP_TILT, 2 * SWEEP_TILT);
    expect(sweeps).toHaveBeenCalledTimes(2);
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

  it("lights each foil's bands and glint, not the foil around them, and one shown later where the light already is", () => {
    const { foil, parts } = makeFoil();
    document.body.append(foil);
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    expect(parts.map(lightOn)).toEqual([lightAt(), lightAt()]);
    expect(lightOn(foil)).toEqual(["", ""]);

    // Shown while the phone is still: no move comes to light it, so it starts from the light.
    const later = makeFoil();
    lightUp(later.foil);
    expect(later.parts.map(lightOn)).toEqual([lightAt(), lightAt()]);
  });

  it("lights a crease only once the light rests, where it rests", () => {
    const crease = document.createElement("span");
    crease.className = "sticker-crease";
    document.body.append(crease);
    uninstall = installLight(root);
    showScreen();
    // A pointer that keeps moving, never resting as long as a crease waits.
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      pointAt(x * window.innerWidth, 0);
      vi.advanceTimersByTime(CREASE_SETTLE_MS / 2);
      expect(lightOn(crease)).toEqual(["", ""]);
    }
    expect(lightAt()).toEqual(["1.000", "-1.000"]);

    vi.advanceTimersByTime(CREASE_SETTLE_MS);
    expect(lightOn(crease)).toEqual(lightAt());
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
