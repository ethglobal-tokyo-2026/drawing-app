// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireLight,
  currentLight,
  GLIDE_MS,
  installLight,
  subscribeLight,
  type DevicePose,
} from "./light";
import { FALLBACK_PERIOD_MS, STILL_POSE, upOnScreen } from "./lightMode";
import * as motionPermission from "../ui/motionPermission";

const browserDocument = globalThis.document;
let document: Document;
let root: HTMLElement;
let uninstall = () => {};
/** The tilt listeners on the window: the phone's motion sensor runs while there are any. */
const tiltListeners = new Set<EventListenerOrEventListenerObject>();
/** The light's holds a test hasn't released, released after it. */
const held = new Set<() => void>();
/** The poses the light published to the sticker material during the test. */
let published: DevicePose[] = [];
let stopRecording = () => {};

/** A sensor's frame. */
const FRAME_MS = 16;
/** Long enough for any glide to land. */
const settle = () => vi.advanceTimersByTime(10 * GLIDE_MS);
/** A pointer moved to (x, y): a mouse unless it says it's a pen or a finger. */
const pointAt = (x: number, y: number, pointerType = "mouse", type = "pointermove") =>
  window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType }));
const tiltTo = (beta: number | null, gamma: number | null, alpha: number | null = 0) =>
  window.dispatchEvent(Object.assign(new Event("deviceorientation"), { alpha, beta, gamma }));
const pose = (beta: number, gamma: number, screenAngle = 0): DevicePose => ({
  beta,
  gamma,
  screenAngle,
});
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
/** The light installed with a screen showing it, tilted to `beta`, `gamma` and landed there. */
const landAt = (beta: number, gamma: number) => {
  uninstall = installLight(root);
  const close = showScreen();
  tiltTo(beta, gamma);
  settle();
  expect(currentLight()).toEqual(pose(beta, gamma));
  return close;
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
  published = [];
  stopRecording = subscribeLight((pose) => published.push(pose));
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
  stopRecording();
  held.forEach((release) => release());
  held.clear();
  uninstall();
  tiltListeners.clear();
  Reflect.deleteProperty(document, "permissionsPolicy");
  Reflect.deleteProperty(screen, "orientation");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the shared light", () => {
  it("holds the still pose until the device shares a reading", () => {
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(published).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("glides from the still pose to the device's real pose on the first reading, and lands", () => {
    uninstall = installLight(root);
    showScreen();
    tiltTo(30, 10);
    vi.advanceTimersByTime(FRAME_MS);
    const first = currentLight();
    expect(first.beta).toBeGreaterThan(30);
    expect(first.beta).toBeLessThan(STILL_POSE.beta);
    expect(first.gamma).toBeGreaterThan(0);
    expect(first.gamma).toBeLessThan(10);
    settle();
    expect(currentLight()).toEqual(pose(30, 10));
    for (let i = 1; i < published.length; i++)
      expect(published[i].beta).toBeLessThan(published[i - 1].beta);
  });

  it("publishes every display frame while it glides, then stops where it landed", () => {
    landAt(40, 0);
    const frames: { at: number; pose: DevicePose }[] = [];
    const stop = subscribeLight((pose) => frames.push({ at: performance.now(), pose }));
    try {
      tiltTo(48, -6);
      vi.advanceTimersByTime(256);
      expect(frames.length).toBeGreaterThanOrEqual(12);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i].at - frames[i - 1].at).toBeLessThanOrEqual(20);
        expect(frames[i].pose.beta).toBeGreaterThan(frames[i - 1].pose.beta);
        expect(frames[i].pose.gamma).toBeLessThan(frames[i - 1].pose.gamma);
      }
      settle();
      expect(currentLight()).toEqual(pose(48, -6));
      const count = frames.length;
      vi.advanceTimersByTime(22000);
      expect(frames).toHaveLength(count);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      stop();
    }
  });

  it("combines sensor readings within one display frame toward the latest", () => {
    landAt(40, 0);
    const before = published.length;
    tiltTo(40, 30);
    tiltTo(40, -30);
    expect(published).toHaveLength(before);
    vi.advanceTimersByTime(FRAME_MS);
    expect(published).toHaveLength(before + 1);
    expect(currentLight().gamma).toBeLessThan(0);
    settle();
    expect(currentLight()).toEqual(pose(40, -30));
  });

  it("keeps still for the hand's tremor", () => {
    landAt(40, 16);
    const before = published.length;
    tiltTo(40.2, 16.2);
    vi.advanceTimersByTime(100);
    expect(published).toHaveLength(before);
  });

  it("takes the short way round when the device turns face down past upside down", () => {
    landAt(175, 0);
    tiltTo(-175, 0);
    settle();
    expect(published.slice(-3).every(({ beta }) => beta >= 175)).toBe(true);
    const [x, y, z] = upOnScreen(currentLight());
    const [ux, uy, uz] = upOnScreen(pose(-175, 0));
    expect([x, y, z].map((v, i) => v - [ux, uy, uz][i]).every((d) => Math.abs(d) < 1e-9)).toBe(
      true,
    );
  });

  it("starts at the still pose's light when the first reading comes from a turned screen", () => {
    screenAt(90);
    uninstall = installLight(root);
    showScreen();
    // In landscape, the device's own axes are turned: this reading is the still pose on screen.
    tiltTo(0, -STILL_POSE.beta);
    settle();
    expect(published).toHaveLength(0);
    tiltTo(0, -30);
    settle();
    expect(currentLight()).toEqual(pose(0, -30, 90));
  });

  it("turns the room at once when the screen turns under a still device", () => {
    landAt(40, 0);
    screenAt(90);
    tiltTo(40, 0);
    vi.advanceTimersByTime(FRAME_MS);
    expect(currentLight()).toEqual(pose(40, 0, 90));
  });

  it.each([
    ["mouse", "pointermove"],
    ["mouse", "pointerdown"],
    ["pen", "pointermove"],
    ["pen", "pointerdown"],
    ["touch", "pointermove"],
    ["touch", "pointerdown"],
  ])("never moves for a %s %s, before or after the tilt", (pointerType, type) => {
    uninstall = installLight(root);
    showScreen();
    pointAt(window.innerWidth, 0, pointerType, type);
    vi.advanceTimersByTime(100);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(published).toHaveLength(0);
    tiltTo(40, 20);
    settle();
    const count = published.length;
    pointAt(0, window.innerHeight, pointerType, type);
    vi.advanceTimersByTime(100);
    expect(published).toHaveLength(count);
    expect(currentLight()).toEqual(pose(40, 20));
  });

  it("follows the phone's tilt on a screen with stickers, even in a browser that can also ask", () => {
    // Chrome has requestPermission too, and grants it without asking.
    vi.stubGlobal(
      "DeviceOrientationEvent",
      class {
        static requestPermission = () => Promise.resolve("granted");
      },
    );
    landAt(40, 20);
  });

  it("leaves the motion sensor off while no screen shows stickers", () => {
    uninstall = installLight(root);
    tiltTo(40, 20);
    vi.advanceTimersByTime(100);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(tiltListeners.size).toBe(0);
  });

  it("stops listening for the tilt when the last screen with stickers goes", () => {
    uninstall = installLight(root);
    const closeBoard = showScreen();
    const closeDetail = showScreen();
    closeDetail();
    expect(tiltListeners.size).toBe(1);
    tiltTo(40, 20);
    settle();
    closeBoard();
    expect(tiltListeners.size).toBe(0);
    tiltTo(70, -20);
    vi.advanceTimersByTime(100);
    expect(currentLight()).toEqual(pose(40, 20));
  });

  it("starts still under reduced motion", () => {
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    uninstall = installLight(root);
    showScreen();
    tiltTo(30, 20);
    vi.advanceTimersByTime(1000);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(published).toHaveLength(0);
  });

  it("stays at the still pose once motion permission is denied", () => {
    const permission = permissionStore();
    usePermission(permission);
    permission.decline();
    uninstall = installLight(root);
    showScreen();
    tiltTo(30, 20);
    vi.advanceTimersByTime(1000);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(published).toHaveLength(0);
  });

  it.each(["release", "hide", "reduce", "deny"])(
    "holds where it was, mid-glide, on %s, whatever the device does after",
    (pause) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      vi.spyOn(window, "matchMedia").mockReturnValue(reduced);
      const permission = permissionStore();
      usePermission(permission);
      const close = landAt(40, 0);
      tiltTo(70, 30);
      vi.advanceTimersByTime(64);
      const mid = currentLight();
      expect(mid.beta).toBeGreaterThan(40);
      expect(mid.beta).toBeLessThan(70);
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
      tiltTo(10, -40);
      vi.advanceTimersByTime(3000);
      expect(currentLight()).toEqual(mid);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("resumes from where it held, waiting for a fresh reading", () => {
    const close = landAt(40, 20);
    close();
    vi.advanceTimersByTime(1000);
    showScreen();
    vi.advanceTimersByTime(1000);
    expect(currentLight()).toEqual(pose(40, 20));
    tiltTo(60, -20);
    vi.advanceTimersByTime(FRAME_MS);
    expect(currentLight().beta).toBeGreaterThan(40);
    expect(currentLight().beta).toBeLessThan(60);
    settle();
    expect(currentLight()).toEqual(pose(60, -20));
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
    tiltTo(40, NaN);
    tiltTo(null, null);
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(published).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sweeps the desktop fallback around the still pose", () => {
    noRotationDesktop();
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(FALLBACK_PERIOD_MS);
    const betas = published.map(({ beta }) => beta - STILL_POSE.beta);
    const gammas = published.map(({ gamma }) => gamma);
    expect(Math.max(...betas)).toBeGreaterThan(6);
    expect(Math.min(...betas)).toBeLessThan(-6);
    expect(Math.max(...gammas)).toBeGreaterThan(8);
    expect(Math.min(...gammas)).toBeLessThan(-8);
    expect(betas.every((beta) => Math.abs(beta) <= 8 + 1e-9)).toBe(true);
    expect(gammas.every((gamma) => Math.abs(gamma) <= 10 + 1e-9)).toBe(true);
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
    expect(Math.abs(currentLight().beta - before.beta)).toBeLessThan(0.5);
    expect(Math.abs(currentLight().gamma - before.gamma)).toBeLessThan(0.5);
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
    expect(Math.abs(currentLight().beta - before.beta)).toBeLessThan(0.5);
    expect(Math.abs(currentLight().gamma - before.gamma)).toBeLessThan(0.5);
  });

  it("stops the fallback for good on the first reading, and moves to the device's pose", () => {
    noRotationDesktop();
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(3500);
    tiltTo(30, 5);
    settle();
    expect(currentLight()).toEqual(pose(30, 5));
    const count = published.length;
    vi.advanceTimersByTime(22000);
    expect(published).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("remembers usable rotation across controller reinstallations in the same document", () => {
    noRotationDesktop();
    const close = landAt(40, 20);
    close();
    uninstall();
    uninstall = installLight(root);
    showScreen();
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(pose(40, 20));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("observes usable rotation during reduced motion without replaying it or enabling fallback later", () => {
    noRotationDesktop();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue(reduced);
    vi.spyOn(reduced, "matches", "get").mockReturnValue(true);
    uninstall = installLight(root);
    showScreen();
    tiltTo(30, 20);
    vi.advanceTimersByTime(1000);
    vi.spyOn(reduced, "matches", "get").mockReturnValue(false);
    reduced.dispatchEvent(new Event("change"));
    vi.advanceTimersByTime(22000);
    expect(currentLight()).toEqual(STILL_POSE);
    expect(vi.getTimerCount()).toBe(0);
    tiltTo(70, -20);
    settle();
    expect(currentLight()).toEqual(pose(70, -20));
  });

  it("keeps usable orientation moving when the devicemotion permission check becomes unasked", () => {
    usePermission(permissionStore("granted", true));
    landAt(40, 20);
    tiltTo(60, -20);
    settle();
    expect(currentLight()).toEqual(pose(60, -20));
  });
});
