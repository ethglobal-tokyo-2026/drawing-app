// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireLight,
  currentLight,
  CREASE_SETTLE_MS,
  GLIDE_MS,
  glideOnWithLight,
  installLight,
  lightUp,
  subscribeLight,
} from "./light";
import * as motionPermission from "../ui/motionPermission";

const browserDocument = globalThis.document;
let document: Document;
let root: HTMLElement;
let uninstall = () => {};
/** The tilt listeners on the window: the phone's motion sensor runs while there are any. */
const tiltListeners = new Set<EventListenerOrEventListenerObject>();
/** The light's holds a test hasn't released, released after it. */
const held = new Set<() => void>();
/** A Shop preview film highlight, which reads the light. */
let film: HTMLElement;

/** A Shop preview film; returns its highlight. */
const addFilm = () => {
  const el = document.createElement("span");
  el.className = "laminate-film";
  const band = document.createElement("i");

  const spec = document.createElement("b");
  band.append(spec);
  el.append(band);
  document.body.append(el);
  return spec;
};
/** A sensor's frame. */
const FRAME_MS = 16;
/** The phone tilted sideways a degree per frame. */
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
const lightAt = () => lightOn(film);
/** A pointer moved to (x, y): a mouse unless it says it's a pen or a finger. */
const pointAt = (x: number, y: number, pointerType = "mouse", type = "pointermove") =>
  window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType }));
const tiltTo = (gamma: number | null, beta: number | null, alpha: number | null = 0) =>
  window.dispatchEvent(Object.assign(new Event("deviceorientation"), { alpha, gamma, beta }));
/** Happy DOM has no ScreenOrientation; supply its complete event-target interface. */
const screenAt = (angle: number) => {
  const orientation = Object.assign(new EventTarget(), {
    angle,
    type: angle === 0 ? "portrait-primary" : "landscape-primary",
    onchange: null,
    lock: () => Promise.resolve(),
    unlock: () => {},
  });
  Object.defineProperty(screen, "orientation", { configurable: true, value: orientation });
};

/** A real permission store with platform/storage boundaries supplied by the test. */
const permissionStore = (kept?: "granted" | "denied", askable = false) =>
  motionPermission.createMotionPermission({
    requestPermission: askable ? () => Promise.resolve("granted") : undefined,
    localStorage: { getItem: () => kept ?? null, setItem: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  });
const usePermission = (store: motionPermission.MotionPermissionStore) => {
  vi.spyOn(motionPermission, "getMotionPermission").mockImplementation(store.get);
  vi.spyOn(motionPermission, "subscribeMotionPermission").mockImplementation(store.subscribe);
};

/** Explicitly eligible browser facts; missing facts are tested independently. */
const noRotationDesktop = () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  );
  vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(0);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("DeviceOrientationEvent", undefined);
  Object.defineProperty(document, "permissionsPolicy", {
    configurable: true,
    value: {
      allowsFeature: () => true,
      allowedFeatures: () => ["accelerometer", "gyroscope"],
      features: () => ["accelerometer", "gyroscope"],
      getAllowlistForFeature: () => [location.origin],
    },
  });
};
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
  document = browserDocument.implementation.createHTMLDocument();
  root = document.documentElement;
  film = addFilm();
  usePermission(permissionStore());
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
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
  Reflect.deleteProperty(document, "permissionsPolicy");
  Reflect.deleteProperty(screen, "orientation");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the shared light", () => {
  it("restores the reference after the reported direction changes captured on iPad", () => {
    // Consecutive readings around the direction changes in the October 13 iPad report.
    // The original acquisition was not retained; acquire the first sample here and add a return.
    const readings = [
      [90, 8.723049980578125, 5.249239614053194, 8.339420639645562],
      [0, 8.421645327042885, 6.6965109773356355, 8.63661831165818],
      [0, 356.19771239662595, 54.35496155877835, 11.075429321838536],
      [90, 356.33701522983637, 54.11037737283471, 11.009159243068556],
      [90, 250.01871502971437, -41.168456436411745, -1.7825381754617498],
      [270, 249.89439278707968, -41.609994762136836, -1.9436789870680669],
    ] as const;
    const [angle, alpha, beta, gamma] = readings[0];
    screenAt(angle);
    uninstall = installLight(root);
    showScreen();
    tiltTo(gamma, beta, alpha);
    const first = currentLight();
    for (const [direction, heading, forward, sideways] of readings.slice(1)) {
      screenAt(direction);
      tiltTo(sideways, forward, heading);
      vi.advanceTimersByTime(2000);
    }
    screenAt(angle);
    tiltTo(gamma, beta, alpha);
    vi.advanceTimersByTime(2000);
    expect(currentLight().x).toBeCloseTo(first.x, 10);
    expect(currentLight().y).toBeCloseTo(first.y, 10);
    const turn = ((currentLight().rotationDegrees - first.rotationDegrees) * Math.PI) / 180;
    expect(Math.sin(turn)).toBeCloseTo(0, 10);
    expect(Math.cos(turn)).toBeCloseTo(1, 10);
  });

  it("returns to the same reflection after repeated portrait and landscape round trips", () => {
    screenAt(0);
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40, 123);
    tiltTo(8, 44, 126);
    vi.advanceTimersByTime(2000);
    const first = currentLight();
    for (let repeat = 0; repeat < 3; repeat++) {
      screenAt(90);
      tiltTo(16, 48, 130);
      vi.advanceTimersByTime(2000);
      tiltTo(-12, 36, 120);
      vi.advanceTimersByTime(2000);
      screenAt(0);
      tiltTo(8, 44, 126);
      vi.advanceTimersByTime(2000);
      expect(currentLight().x).toBeCloseTo(first.x, 10);
      expect(currentLight().y).toBeCloseTo(first.y, 10);
      expect(currentLight().rotationDegrees).toBeCloseTo(first.rotationDegrees, 10);
    }
  });

  it("acquires a delayed heading without rotating an already-held reflection", () => {
    screenAt(0);
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40, null);
    tiltTo(8, 40, null);
    vi.advanceTimersByTime(2000);
    const before = currentLight();
    expect(before.x).toBeGreaterThan(0.1);
    tiltTo(8, 40, 123);
    vi.advanceTimersByTime(2000);
    expect(currentLight()).toEqual(before);
    tiltTo(8, 40, 124);
    vi.advanceTimersByTime(2000);
    expect(Math.abs(currentLight().rotationDegrees - before.rotationDegrees)).toBeLessThan(2);
    expect(currentLight().rotationDegrees).not.toBe(before.rotationDegrees);
  });

  it("publishes and then holds a flat wrist rotation without inventing normal tilt", () => {
    screenAt(0);
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 0, 0);
    const frames: ReturnType<typeof currentLight>[] = [];
    const stop = subscribeLight((pose) => frames.push(pose));
    try {
      tiltTo(0, 0, 10);
      vi.advanceTimersByTime(256);
      expect(frames.length).toBeGreaterThanOrEqual(12);
      vi.advanceTimersByTime(2000);
      expect(currentLight()).toEqual({ x: 0, y: 0, rotationDegrees: -10 });
      expect(film.style.getPropertyValue("--light-rotation")).toBe("-10.000");
      const count = frames.length;
      vi.advanceTimersByTime(22000);
      expect(frames).toHaveLength(count);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      stop();
    }
  });

  it("takes the short angular path through the sensor heading wrap", () => {
    screenAt(0);
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 0, 0);
    tiltTo(0, 0, 359);
    vi.advanceTimersByTime(2000);
    expect(currentLight().rotationDegrees).toBeCloseTo(1, 8);
    const rotations: number[] = [];
    const stop = subscribeLight((pose) => rotations.push(pose.rotationDegrees));
    try {
      tiltTo(0, 0, 1);
      vi.advanceTimersByTime(2000);
      expect(currentLight().rotationDegrees).toBeCloseTo(-1, 8);
      expect(rotations.length).toBeGreaterThan(2);
      expect(rotations.every((rotation) => Math.abs(rotation) <= 1)).toBe(true);
    } finally {
      stop();
    }
  });

  it("keeps the physical angular reference through screen rotation and controller reinstall", () => {
    screenAt(0);
    uninstall = installLight(root);
    showScreen();
    const initial = currentLight();
    tiltTo(0, 0, 37);
    vi.advanceTimersByTime(2000);
    expect(currentLight()).toEqual(initial);
    tiltTo(0, 0, 47);
    vi.advanceTimersByTime(2000);
    expect(currentLight().rotationDegrees).toBeCloseTo(-10, 8);
    const before = currentLight();
    screenAt(90);
    tiltTo(0, 0, 47);
    vi.advanceTimersByTime(2000);
    expect(currentLight()).toEqual({ ...before, rotationDegrees: 80 });
    uninstall();
    uninstall = installLight(root);
    tiltTo(0, 0, 47);
    vi.advanceTimersByTime(2000);
    expect(currentLight()).toEqual({ ...before, rotationDegrees: 80 });
    screenAt(0);
    tiltTo(0, 0, 47);
    vi.advanceTimersByTime(2000);
    expect(currentLight()).toEqual(before);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("publishes laminate and foil from the same pose on every moving display frame", () => {
    screenAt(0);
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(1000);
    const frames: { at: number; x: number; y: number }[] = [];
    const cssWrites: number[] = [];
    const setProperty = film.style.setProperty.bind(film.style);
    vi.spyOn(film.style, "setProperty").mockImplementation((name, value, priority) => {
      if (name === "--lx") cssWrites.push(performance.now());
      setProperty(name, value, priority);
    });
    const stop = subscribeLight((pose) => frames.push({ at: performance.now(), ...pose }));
    try {
      tiltTo(8, 40);
      vi.advanceTimersByTime(256);
      expect(frames.length).toBeGreaterThanOrEqual(12);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i].at - frames[i - 1].at).toBeLessThanOrEqual(20);
        expect(frames[i].x).toBeGreaterThan(frames[i - 1].x);
      }
      expect(cssWrites.length).toBe(frames.length);
      for (let i = 1; i < cssWrites.length; i++)
        expect(cssWrites[i] - cssWrites[i - 1]).toBeLessThanOrEqual(20);
      expect(Number(lightAt()[0])).toBeGreaterThan(-0.6);
      vi.advanceTimersByTime(2000);
      const held = currentLight();
      const count = frames.length;
      vi.advanceTimersByTime(22000);
      expect(currentLight()).toEqual(held);
      expect(frames).toHaveLength(count);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      stop();
    }
  });

  it.each([
    ["flat portrait", 0, 0, 0],
    ["reading portrait", 0, 0, 40],
    ["upright portrait", 0, 0, 80],
    ["past upright portrait", 0, 0, 95],
    ["flat landscape", 90, 0, 0],
    ["upright landscape", 90, -80, 0],
    ["upright reversed landscape", 270, 80, 0],
  ] as const)(
    "keeps the displayed laminate when the first reading arrives in %s",
    (_name, angle, gamma, beta) => {
      screenAt(angle);
      uninstall = installLight(root);
      showScreen();
      const before = currentLight();
      tiltTo(gamma, beta);
      vi.advanceTimersByTime(2000);
      expect(currentLight()).toEqual(before);
      vi.advanceTimersByTime(22000);
      expect(currentLight()).toEqual(before);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([
    {
      name: "flat portrait",
      angle: 0,
      origin: [0, 0],
      pitch: [
        [0, 5],
        [0, -5],
      ],
      roll: [
        [5, 0],
        [-5, 0],
      ],
    },
    {
      name: "upright portrait",
      angle: 0,
      origin: [0, 80],
      pitch: [
        [0, 85],
        [0, 75],
      ],
      roll: [
        [5, 80],
        [-5, 80],
      ],
    },
    {
      name: "past upright portrait",
      angle: 0,
      origin: [0, 95],
      pitch: [
        [0, 100],
        [0, 90],
      ],
      roll: [
        [5, 95],
        [-5, 95],
      ],
    },
    {
      name: "flat landscape",
      angle: 90,
      origin: [0, 0],
      pitch: [
        [-5, 0],
        [5, 0],
      ],
      roll: [
        [0, 5],
        [0, -5],
      ],
    },
    {
      name: "upright landscape",
      angle: 90,
      origin: [-80, 0],
      pitch: [
        [-85, 0],
        [-75, 0],
      ],
      roll: [
        [-80, 5],
        [-80, -5],
      ],
    },
    {
      name: "upright reversed landscape",
      angle: 270,
      origin: [80, 0],
      pitch: [
        [85, 0],
        [75, 0],
      ],
      roll: [
        [80, -5],
        [80, 5],
      ],
    },
  ] as const)(
    "responds to five-degree pitch and roll in both directions from $name",
    ({ angle, origin, pitch, roll }) => {
      screenAt(angle);
      uninstall = installLight(root);
      showScreen();
      tiltTo(origin[0], origin[1]);
      vi.advanceTimersByTime(2000);
      const originPose = currentLight();
      for (const [axis, readings] of [
        ["y", pitch],
        ["x", roll],
      ] as const) {
        tiltTo(readings[0][0], readings[0][1]);
        vi.advanceTimersByTime(2000);
        expect(currentLight()[axis] - originPose[axis]).toBeGreaterThan(0.02);
        tiltTo(readings[1][0], readings[1][1]);
        vi.advanceTimersByTime(2000);
        expect(currentLight()[axis] - originPose[axis]).toBeLessThan(-0.02);
        tiltTo(origin[0], origin[1]);
        vi.advanceTimersByTime(2000);
        expect(currentLight()).toEqual(originPose);
      }
    },
  );

  it.each([
    [90, 90],
    [180, -180],
    [270, -90],
  ] as const)(
    "passes the screen turn once to the material consumers at %s degrees",
    (angle, rotation) => {
      screenAt(0);
      uninstall = installLight(root);
      showScreen();
      tiltTo(0, 40);
      vi.advanceTimersByTime(1000);
      tiltTo(8, 40);
      vi.advanceTimersByTime(2000);
      const before = currentLight();
      screenAt(angle);
      tiltTo(8, 40);
      vi.advanceTimersByTime(2000);
      expect(currentLight().x).toBeCloseTo(before.x, 10);
      expect(currentLight().y).toBeCloseTo(before.y, 10);
      expect(currentLight().rotationDegrees).toBeCloseTo(rotation, 10);
      screenAt(0);
      tiltTo(8, 40);
      vi.advanceTimersByTime(2000);
      expect(currentLight().x).toBeCloseTo(before.x, 10);
      expect(currentLight().y).toBeCloseTo(before.y, 10);
      expect(Math.sin((currentLight().rotationDegrees * Math.PI) / 180)).toBeCloseTo(0, 10);
      expect(Math.cos((currentLight().rotationDegrees * Math.PI) / 180)).toBeCloseTo(1, 10);
      vi.advanceTimersByTime(22000);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("continues a reordered preview film from its displayed position when the light moves again", () => {
    if (!film.parentElement) throw new Error("The highlight needs its film layer");
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    let previous = film.animate([{ translate: "0px" }, { translate: "100px" }], {
      duration: 280,
      easing: "ease-out",
    });
    glideOnWithLight(previous, "translate");
    for (const [shown, gamma] of [
      ["37px", -32],
      ["54px", 32],
    ] as const) {
      // Happy DOM does not interpolate CSS, so supply the browser's displayed value.
      film.style.translate = shown;
      tiltTo(gamma, 8);
      vi.advanceTimersByTime(10 * GLIDE_MS);
      expect(previous.playState).toBe("idle");
      const [next] = film.getAnimations();
      expect(film.getAnimations()).toHaveLength(1);
      const effect = next.effect;
      expect(effect).toBeInstanceOf(KeyframeEffect);
      if (!(effect instanceof KeyframeEffect)) throw new Error("The replay needs keyframes");
      expect(effect.getKeyframes()).toEqual([
        expect.objectContaining({ offset: 0, translate: shown }),
      ]);
      expect(effect.getTiming()).toMatchObject({ duration: 280, easing: "ease-out" });
      previous = next;
    }
    expect(lightAt()).toEqual(["1.000", "-1.000"]);
    previous.finish();
  });

  it("ends a reordered highlight's replay when reduced motion is turned on", () => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue(query);
    uninstall = installLight(root);
    showScreen();
    const replay = film.animate([{ translate: "0px" }, { translate: "100px" }], 280);
    glideOnWithLight(replay, "translate");
    vi.spyOn(query, "matches", "get").mockReturnValue(true);
    query.dispatchEvent(new Event("change"));
    expect(replay.playState).toBe("idle");
    tiltTo(32, 8);
    vi.advanceTimersByTime(100);
    expect(film.getAnimations()).toEqual([]);
    expect(lightAt()).toEqual(["", ""]);
  });

  it("ends reordered highlights when the light is uninstalled", () => {
    uninstall = installLight(root);
    showScreen();
    const replay = film.animate([{ translate: "0px" }, { translate: "100px" }], 280);
    glideOnWithLight(replay, "translate");
    uninstall();
    expect(replay.playState).toBe("idle");
  });

  it.each([
    ["mouse", "pointermove"],
    ["mouse", "pointerdown"],
    ["pen", "pointermove"],
    ["pen", "pointerdown"],
    ["touch", "pointermove"],
    ["touch", "pointerdown"],
  ])("ignores %s %s before and after device tilt lights the stickers", (pointerType, type) => {
    const { foil, parts } = makeFoil();
    document.body.append(foil);
    uninstall = installLight(root);
    showScreen();
    pointAt(window.innerWidth, 0, pointerType, type);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["", ""]);
    expect(parts.map(lightOn)).toEqual([
      ["", ""],
      ["", ""],
    ]);

    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    expect(parts.map(lightOn)).toEqual([
      ["1.000", "0.000"],
      ["1.000", "0.000"],
    ]);

    pointAt(0, window.innerHeight, pointerType, type);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    expect(parts.map(lightOn)).toEqual([
      ["1.000", "0.000"],
      ["1.000", "0.000"],
    ]);
    expect(lightOn(root)).toEqual(["", ""]);

    tiltTo(-32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
    expect(parts.map(lightOn)).toEqual([
      ["-1.000", "0.000"],
      ["-1.000", "0.000"],
    ]);
  });

  it("combines sensor readings within one display frame toward the latest position", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(16);
    const writes = vi.spyOn(film.style, "setProperty");
    tiltTo(32, 40);
    tiltTo(-32, 40);
    expect(writes.mock.calls.filter(([name]) => name === "--lx")).toHaveLength(0);
    vi.advanceTimersByTime(16);
    expect(writes.mock.calls.filter(([name]) => name === "--lx")).toHaveLength(1);
    expect(Number(lightAt()[0])).toBeLessThan(0);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
  });

  it("lights a phone held upright and leaning sideways the same, whichever way the sensor writes it", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 90, 0);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    // At beta 90°, alpha + gamma defines this orientation, so both complete readings are equal.
    tiltTo(5, 90, 0);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    const before = lightAt();
    expect(Number(before[0])).toBeGreaterThan(0.02);
    expect(Number(before[0])).toBeLessThan(1);
    tiltTo(-5, 90, 10);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(before);
  });

  it("retains the last yaw reading when a later sensor event temporarily omits alpha", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40, 123);
    tiltTo(2, 42, 128);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    const before = currentLight();
    window.dispatchEvent(
      Object.assign(new Event("deviceorientation"), { alpha: null, beta: 42, gamma: 2 }),
    );
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(currentLight()).toEqual(before);
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
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(16, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    const writes = vi.spyOn(film.style, "setProperty");
    tiltTo(16.2, 40.2);
    vi.advanceTimersByTime(100);
    expect(writes).not.toHaveBeenCalled();
  });

  it("starts a film shown after the light moved where the light already is", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    // As preview film does when it mounts.
    const detail = addFilm();
    lightUp(detail);
    expect(lightOn(detail)).toEqual(["1.000", "0.000"]);
  });

  it("moves persistent light without launching a detached sweep after a large or slow tilt", () => {
    uninstall = installLight(root);
    showScreen();
    tiltAcross(0, 12);
    for (let t = 0; t <= 1400; t += FRAME_MS) {
      tiltTo(12, 40);
      vi.advanceTimersByTime(FRAME_MS);
    }
    tiltAcross(12, 24);
    expect(Number(lightAt()[0])).toBeGreaterThan(0.5);
    vi.advanceTimersByTime(2000);
    const held = lightAt();
    vi.advanceTimersByTime(22000);
    expect(lightAt()).toEqual(held);
    expect(film.getAnimations()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
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
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
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
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
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
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
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
    tiltTo(0, 40);
    vi.advanceTimersByTime(16);
    // A device that keeps tilting, never resting as long as a crease waits.
    for (const gamma of [-32, -16, 0, 16, 32]) {
      tiltTo(gamma, 8);
      vi.advanceTimersByTime(CREASE_SETTLE_MS / 2);
      expect(lightOn(crease)).toEqual(["", ""]);
    }

    vi.advanceTimersByTime(10 * GLIDE_MS + CREASE_SETTLE_MS);
    expect(lightAt()).toEqual(["1.000", "-1.000"]);
    expect(lightOn(crease)).toEqual(lightAt());
  });

  it("holds its initial pose under reduced motion", () => {
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 8);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["", ""]);
  });

  it.each([90, 270, 180])("maps device tilt into displayed axes at %s degrees", (angle) => {
    screenAt(angle);
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 0);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    const [gamma, beta] = angle === 90 ? [0, 32] : angle === 270 ? [0, -32] : [-32, 0];
    tiltTo(gamma, beta);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
  });

  it.each([90, 270])("keeps the reading pose centered in landscape at %s degrees", (angle) => {
    screenAt(angle);
    uninstall = installLight(root);
    showScreen();
    tiltTo(angle === 90 ? -40 : 40, 0);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["0.000", "0.000"]);
  });

  it.each(["release", "hide", "reduce", "deny"])(
    "cancels interpolation and crease settlement on %s",
    (pause) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      vi.spyOn(window, "matchMedia").mockReturnValue(reduced);
      const permission = permissionStore();
      usePermission(permission);
      const crease = document.createElement("i");
      crease.className = "sticker-crease";
      document.body.append(crease);
      uninstall = installLight(root);
      const close = showScreen();
      tiltTo(0, 40);
      vi.advanceTimersByTime(300);
      tiltTo(32, 8);
      vi.advanceTimersByTime(64);
      const published = lightAt();
      const creaseBefore = lightOn(crease);
      if (pause === "release") close();
      if (pause === "hide") {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      }
      if (pause === "reduce") {
        vi.spyOn(reduced, "matches", "get").mockReturnValue(true);
        reduced.dispatchEvent(new Event("change"));
      }
      if (pause === "deny") permission.decline();
      vi.advanceTimersByTime(3000);
      expect(lightAt()).toEqual(published);
      expect(lightOn(crease)).toEqual(creaseBefore);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("resumes rotation at the held pose until a fresh reading and initializes later material there", () => {
    uninstall = installLight(root);
    const close = showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    close();
    vi.advanceTimersByTime(1000);
    showScreen();
    vi.advanceTimersByTime(1000);
    const later = addFilm();
    lightUp(later);
    expect(lightOn(later)).toEqual(["1.000", "0.000"]);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(64);
    expect(Number(lightAt()[0])).toBeGreaterThan(-1);
    vi.advanceTimersByTime(1600);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
  });

  it.each([
    "iPad",
    "iPhone",
    "Android",
    "unknown",
    "touch-desktop",
    "blocked",
    "no-policy",
    "insecure",
    "api-present",
  ])("never enables a timed fallback for %s", (kind) => {
    noRotationDesktop();
    if (["iPad", "iPhone", "Android", "unknown"].includes(kind)) {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(kind);
      vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(5);
    }
    if (kind === "touch-desktop") vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(5);
    if (kind === "blocked")
      Object.defineProperty(document, "permissionsPolicy", {
        configurable: true,
        value: { allowsFeature: () => false },
      });
    if (kind === "no-policy") Reflect.deleteProperty(document, "permissionsPolicy");
    if (kind === "insecure") vi.stubGlobal("isSecureContext", false);
    if (kind === "api-present") vi.stubGlobal("DeviceOrientationEvent", class {});
    uninstall = installLight(root);
    showScreen();
    tiltTo(NaN, 40);
    tiltTo(null, null);
    vi.advanceTimersByTime(22000);
    expect(lightAt()).toEqual(["", ""]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("publishes one shared fallback pose to subscribed material, foil and late mounts", () => {
    noRotationDesktop();
    const { foil, parts } = makeFoil();
    document.body.append(foil);
    const poses: { x: number; y: number }[] = [];
    const stop = subscribeLight((pose) => poses.push(pose));
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(3500);
    expect(poses.length).toBeGreaterThan(2);
    expect(currentLight().x).toBeGreaterThan(0.3);
    expect(parts.map(lightOn)).toEqual([lightAt(), lightAt()]);
    const later = addFilm();
    lightUp(later);
    expect(lightOn(later)).toEqual(lightAt());
    stop();
    const count = poses.length;
    vi.advanceTimersByTime(100);
    expect(poses).toHaveLength(count);
  });

  it("pauses the shared fallback phase while no screen owns it", () => {
    noRotationDesktop();
    uninstall = installLight(root);
    const close = showScreen();
    vi.advanceTimersByTime(2500);
    const before = currentLight();
    close();
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(before);
    expect(vi.getTimerCount()).toBe(0);
    showScreen();
    vi.advanceTimersByTime(64);
    expect(Math.abs(currentLight().x - before.x)).toBeLessThan(0.02);
    expect(Math.abs(currentLight().y - before.y)).toBeLessThan(0.02);
  });

  it("permanently stops fallback on the first usable rotation and holds through later silence", () => {
    noRotationDesktop();
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(3500);
    const before = currentLight();
    const styles = lightAt();
    tiltTo(32, 40);
    vi.advanceTimersByTime(2000);
    expect(currentLight()).toEqual(before);
    expect(lightAt()).toEqual(styles);
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(before);
    expect(lightAt()).toEqual(styles);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains the fallback phase if a reinstalled controller pauses before its first frame", () => {
    noRotationDesktop();
    uninstall = installLight(root);
    const close = showScreen();
    vi.advanceTimersByTime(2500);
    const before = currentLight();
    close();
    uninstall();
    uninstall = installLight(root);
    showScreen()();
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(before);
    showScreen();
    vi.advanceTimersByTime(64);
    expect(Math.abs(currentLight().x - before.x)).toBeLessThan(0.02);
    expect(Math.abs(currentLight().y - before.y)).toBeLessThan(0.02);
  });

  it("remembers usable rotation across controller reinstallations in the same document", () => {
    noRotationDesktop();
    uninstall = installLight(root);
    const close = showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    tiltTo(32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    close();
    uninstall();
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(22000);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("observes usable rotation during reduced motion without replaying it or enabling fallback later", () => {
    noRotationDesktop();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue(reduced);
    vi.spyOn(reduced, "matches", "get").mockReturnValue(true);
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(1000);
    vi.spyOn(reduced, "matches", "get").mockReturnValue(false);
    reduced.dispatchEvent(new Event("change"));
    vi.advanceTimersByTime(22000);
    expect(lightAt()).toEqual(["", ""]);
    expect(vi.getTimerCount()).toBe(0);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
  });

  it("keeps usable orientation moving when the devicemotion permission check becomes unasked", () => {
    usePermission(permissionStore("granted", true));
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    tiltTo(32, 40);
    vi.advanceTimersByTime(1200);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(2000);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
  });
});
