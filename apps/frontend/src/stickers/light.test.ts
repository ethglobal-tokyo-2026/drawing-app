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
const tiltTo = (gamma: number | null, beta: number | null) =>
  window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma, beta }));
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
  it("continues a reordered preview film from its displayed position when the light moves again", () => {
    if (!film.parentElement) throw new Error("The highlight needs its film layer");
    uninstall = installLight(root);
    showScreen();
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

  it("combines tilts that come close together into one write toward the latest position", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(0, 40);
    vi.advanceTimersByTime(16);
    const writes = vi.spyOn(film.style, "setProperty");
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(32);
    expect(writes.mock.calls.filter(([name]) => name === "--lx")).toHaveLength(1);
    expect(Number(lightAt()[0])).toBeLessThan(0);
    vi.advanceTimersByTime(10 * GLIDE_MS);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
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
    const writes = vi.spyOn(film.style, "setProperty");
    tiltTo(16.2, 40.2);
    vi.advanceTimersByTime(100);
    expect(writes).not.toHaveBeenCalled();
  });

  it("starts a film shown after the light moved where the light already is", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(100);
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

  it.each([90, 270, 180])("maps device gravity into displayed axes at %s degrees", (angle) => {
    screenAt(angle);
    uninstall = installLight(root);
    showScreen();
    const [gamma, beta] = angle === 90 ? [0, 32] : angle === 270 ? [0, -32] : [-32, 0];
    tiltTo(gamma, beta);
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["1.000", "-1.000"]);
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
    tiltTo(32, 40);
    vi.advanceTimersByTime(300);
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
    tiltTo(32, 40);
    vi.advanceTimersByTime(2000);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
    vi.advanceTimersByTime(22000);
    expect(lightAt()).toEqual(["1.000", "0.000"]);
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
    tiltTo(32, 40);
    vi.advanceTimersByTime(1000);
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
    vi.advanceTimersByTime(100);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
  });

  it("keeps usable orientation moving when the devicemotion permission check becomes unasked", () => {
    usePermission(permissionStore("granted", true));
    uninstall = installLight(root);
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(1200);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(2000);
    expect(lightAt()).toEqual(["-1.000", "0.000"]);
  });
});
