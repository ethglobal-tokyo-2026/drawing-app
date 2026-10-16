// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DevicePose } from "./light";
import traces from "./lightTraces.json";
import type { MotionPermissionStore } from "../ui/motionPermission";
import type { ViewingClass } from "./viewing";

/**
 * The light's modules as a device of `viewingClass` loads them. A device reads its class once, as
 * the app starts, so each class gets its own copy; happy-dom's window, a fine pointer on a laptop's
 * screen, would read as a tablet.
 */
const loadLightAs = async (viewingClass: ViewingClass) => {
  vi.resetModules();
  vi.doMock("./viewing", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./viewing")>()),
    VIEWING_CLASS: viewingClass,
  }));
  return {
    viewingClass,
    ...(await import("./light")),
    ...(await import("./lightMode")),
    roomFrame: (await import("./sharedRoom")).roomFrame,
    motionPermission: await import("../ui/motionPermission"),
  };
};

describe.each([await loadLightAs("phone"), await loadLightAs("tablet")])(
  "on a $viewingClass",
  ({
    acquireLight,
    currentLight,
    installLight,
    MAX_PUBLISHES_PER_SECOND,
    RECENTER,
    reflectionPx,
    subscribeLight,
    angleBetween,
    attitudeOf,
    FALLBACK_PERIOD_MS,
    IDENTITY,
    multiply,
    inverse,
    rotate,
    STILL_POSE,
    upOnScreen,
    roomFrame,
    motionPermission,
  }) => {
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
    /** Long enough for the light to land on a held reading; shorter than every re-centering hold. */
    const settle = () => vi.advanceTimersByTime(2000);
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
    /** A published pose's angles, without the viewer's turn. */
    const angles = ({ beta, gamma, screenAngle }: DevicePose): DevicePose => ({
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
    const usePermission = (store: MotionPermissionStore) => {
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
    const landAt = (beta: number, gamma: number, alpha = 0) => {
      uninstall = installLight(root);
      const close = showScreen();
      tiltTo(beta, gamma, alpha);
      settle();
      expect(angles(currentLight())).toEqual(pose(beta, gamma));
      return close;
    };

    /** A new visible document: a fresh start for the light, which keeps its state per document. */
    const openDocument = () => {
      document = browserDocument.implementation.createHTMLDocument();
      root = document.documentElement;
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
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
      openDocument();
      published = [];
      stopRecording = subscribeLight((pose) => published.push(pose));
      usePermission(permissionStore());
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
        expect(angles(currentLight())).toEqual(STILL_POSE);
        expect(published).toHaveLength(0);
        expect(vi.getTimerCount()).toBe(0);
      });

      it("moves from the still pose to the device's real pose on the first reading, and lands", () => {
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
        expect(angles(currentLight())).toEqual(pose(30, 10));
        for (let i = 1; i < published.length; i++)
          expect(published[i].beta).toBeLessThan(published[i - 1].beta);
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
        expect(angles(currentLight())).toEqual(pose(40, -30));
      });

      it("takes the short way round when the device turns face down past upside down", () => {
        landAt(175, 0);
        const before = published.length;
        tiltTo(-175, 0);
        settle();
        // The long way round would turn the screen face up on its way.
        expect(published.slice(before).every((p) => upOnScreen(p)[2] < -0.99)).toBe(true);
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
        // Any redraw shows the still pose's light, from the reading's own angles.
        const still = roomFrame(STILL_POSE);
        for (const shown of published) {
          const frame = roomFrame(shown);
          for (const key of ["up", "light", "eye"] as const)
            frame[key].forEach((v, i) => expect(v).toBeCloseTo(still[key][i], 6));
        }
        tiltTo(0, -30);
        settle();
        expect(angles(currentLight())).toEqual(pose(0, -30, 90));
      });

      it("turns the room at once when the screen turns under a still device", () => {
        landAt(40, 0);
        screenAt(90);
        tiltTo(40, 0);
        vi.advanceTimersByTime(FRAME_MS);
        const turned = currentLight();
        expect(turned.screenAngle).toBe(90);
        expect(turned.beta).toBeCloseTo(40, 9);
        expect(turned.gamma).toBeCloseTo(0, 9);
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
        expect(angles(currentLight())).toEqual(STILL_POSE);
        expect(published).toHaveLength(0);
        tiltTo(40, 20);
        settle();
        const count = published.length;
        pointAt(0, window.innerHeight, pointerType, type);
        vi.advanceTimersByTime(100);
        expect(published).toHaveLength(count);
        expect(angles(currentLight())).toEqual(pose(40, 20));
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
        expect(angles(currentLight())).toEqual(STILL_POSE);
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
        expect(angles(currentLight())).toEqual(pose(40, 20));
      });

      it("starts still under reduced motion", () => {
        // A query that always matches stands in for the reduced-motion setting.
        vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
        uninstall = installLight(root);
        showScreen();
        tiltTo(30, 20);
        vi.advanceTimersByTime(1000);
        expect(angles(currentLight())).toEqual(STILL_POSE);
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
        expect(angles(currentLight())).toEqual(STILL_POSE);
        expect(published).toHaveLength(0);
      });

      it.each(["release", "hide", "reduce", "deny"])(
        "holds where it was, mid-turn, on %s, whatever the device does after",
        (pause) => {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
          vi.spyOn(window, "matchMedia").mockReturnValue(reduced);
          const permission = permissionStore();
          usePermission(permission);
          const close = landAt(40, 0);
          for (let i = 1; i <= 10; i++) {
            tiltTo(40 + 3 * i, 3 * i);
            vi.advanceTimersByTime(FRAME_MS);
          }
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
        expect(angles(currentLight())).toEqual(pose(40, 20));
        tiltTo(60, -20);
        vi.advanceTimersByTime(FRAME_MS);
        expect(currentLight().beta).toBeGreaterThan(40);
        expect(currentLight().beta).toBeLessThan(60);
        settle();
        expect(angles(currentLight())).toEqual(pose(60, -20));
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
        if (kind === "touch-desktop")
          vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(5);
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
        expect(angles(currentLight())).toEqual(STILL_POSE);
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
        expect(angles(currentLight())).toEqual(pose(30, 5));
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
        expect(angles(currentLight())).toEqual(pose(40, 20));
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
        expect(angles(currentLight())).toEqual(STILL_POSE);
        expect(vi.getTimerCount()).toBe(0);
        tiltTo(70, -20);
        settle();
        expect(angles(currentLight())).toEqual(pose(70, -20));
      });

      it("keeps usable orientation moving when the devicemotion permission check becomes unasked", () => {
        usePermission(permissionStore("granted", true));
        landAt(40, 20);
        tiltTo(60, -20);
        settle();
        expect(angles(currentLight())).toEqual(pose(60, -20));
      });
    });

    describe("the viewer", () => {
      const turned = () => angleBetween(currentLight().turn ?? IDENTITY, IDENTITY);
      /**
       * The least turn angleBetween reads above none, from a dot product one double below 1: a viewer
       * centered on the device reads no more, whatever its pose's rounding.
       */
      const TURN_FLOOR = angleBetween(IDENTITY, [1 - Number.EPSILON / 2, 0, 0, 0]);
      /** The re-centering tier for a slight turn, which waits longer, and the one for a wide turn. */
      const [slight, wide] = RECENTER.tiers;
      /** Expects the published turn to carry the world's axes from `from`'s device axes into `to`'s. */
      const expectTurnBetween = (from: readonly number[], to: readonly number[]) => {
        const turn = currentLight().turn ?? IDENTITY;
        for (const axis of [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]) {
          const carried = rotate(
            turn,
            rotate(inverse(attitudeOf(from[0], from[1], from[2])), axis),
          );
          const now = rotate(inverse(attitudeOf(to[0], to[1], to[2])), axis);
          carried.forEach((v, i) => expect(v).toBeCloseTo(now[i], 9));
        }
      };

      it("stays where it was through a playful tilt and back", () => {
        landAt(STILL_POSE.beta, 0);
        const before = roomFrame();
        tiltTo(STILL_POSE.beta + 12, 8, 5);
        settle();
        expect(turned()).toBeGreaterThan(10);
        expectTurnBetween([0, STILL_POSE.beta, 0], [5, STILL_POSE.beta + 12, 8]);
        tiltTo(STILL_POSE.beta, 0);
        settle();
        expect(turned()).toBeLessThanOrEqual(TURN_FLOOR);
        expect(roomFrame()).toEqual(before);
      });

      it("is centered on the first reading, however far from the still pose it lands", () => {
        landAt(10, 20, 30);
        expect(turned()).toBeLessThan(0.01);
      });

      it("eases onto a device held past a release in a fixed time, then holds still", () => {
        landAt(STILL_POSE.beta, 0);
        tiltTo(STILL_POSE.beta, 0, 60);
        vi.advanceTimersByTime(wide.holdMs - FRAME_MS);
        expect(turned()).toBeCloseTo(60, 6);
        const before = published.length;
        const eased: { at: number; turn: number }[] = [];
        const stop = subscribeLight(() => eased.push({ at: performance.now(), turn: turned() }));
        try {
          vi.advanceTimersByTime(2 * RECENTER.easeMs);
        } finally {
          stop();
        }
        expect(turned()).toBeLessThanOrEqual(TURN_FLOOR);
        // It lands within the ease's time, never backs off, and each redraw but the landing moves the
        // reflection visibly.
        expect(eased[eased.length - 1].at - eased[0].at).toBeLessThanOrEqual(RECENTER.easeMs);
        for (let i = 1; i < eased.length; i++) {
          expect(eased[i].turn).toBeLessThan(eased[i - 1].turn);
          if (i < eased.length - 1)
            expect(reflectionPx(eased[i - 1].turn - eased[i].turn)).toBeGreaterThanOrEqual(0.5);
        }
        expect(published.length - before).toBeLessThan(RECENTER.easeMs / FRAME_MS + 8);
        const held = currentLight();
        const count = published.length;
        for (let i = 0; i < 50; i++) {
          tiltTo(STILL_POSE.beta, 0, 60);
          vi.advanceTimersByTime(200);
        }
        expect(currentLight()).toEqual(held);
        expect(published).toHaveLength(count);
        expect(vi.getTimerCount()).toBe(0);
      });

      it("goes on re-centering after a pause, on a device lying still", () => {
        const close = landAt(STILL_POSE.beta, 0);
        tiltTo(STILL_POSE.beta, 0, 60);
        vi.advanceTimersByTime(wide.holdMs + RECENTER.easeMs / 2);
        expect(turned()).toBeGreaterThan(10);
        expect(turned()).toBeLessThan(50);
        close();
        vi.advanceTimersByTime(5000);
        expect(turned()).toBeGreaterThan(10);
        showScreen();
        for (let i = 0; i < 20; i++) {
          tiltTo(STILL_POSE.beta, 0, 60);
          vi.advanceTimersByTime(200);
        }
        expect(turned()).toBeLessThan(1e-3);
      });

      /** How far behind its clock the light may step: the frames after a reading, a hold and the ease. */
      const LATE_MS = 3 * FRAME_MS;
      let tiltedAt = 0;
      /** Tilts the device `degrees` forward of the still pose. */
      const tiltBy = (degrees: number) => tiltTo(STILL_POSE.beta + degrees, 0);
      /** Lands the viewer at the still pose, then tilts; returns what closes the screen. */
      const tiltFromStill = (degrees: number) => {
        const close = landAt(STILL_POSE.beta, 0);
        tiltBy(degrees);
        tiltedAt = performance.now();
        return close;
      };
      /** The viewer's turn, in degrees, `ms` after the tilt from the still pose. */
      const turnAt = (ms: number) => {
        vi.advanceTimersByTime(tiltedAt + ms - performance.now());
        return turned();
      };
      /** Expects the viewer to keep the room `holdMs` into the tilt, then ease onto the device. */
      const expectRecenteredAfter = (holdMs: number, degrees: number) => {
        expect(turnAt(holdMs - FRAME_MS)).toBeCloseTo(degrees, 6);
        const halfway = turnAt(holdMs + RECENTER.easeMs / 2) / degrees;
        expect(halfway).toBeGreaterThan(0.45);
        expect(halfway).toBeLessThan(0.55);
        expect(turnAt(holdMs + RECENTER.easeMs + LATE_MS)).toBeLessThanOrEqual(TURN_FLOOR);
      };

      it("keeps the room through a wide turn for the wide tier's hold, then eases onto the device", () => {
        tiltFromStill(wide.release + 5);
        expectRecenteredAfter(wide.holdMs, wide.release + 5);
      });

      it("keeps the room through a slight turn for the slight tier's longer hold", () => {
        tiltFromStill(slight.release + 2.5);
        expectRecenteredAfter(slight.holdMs, slight.release + 2.5);
      });

      it("never re-centers on a turn that comes back inside before its hold, however long it then lasts", () => {
        tiltFromStill(wide.release + 5);
        turnAt(wide.holdMs - 1000);
        tiltBy(slight.release - 2.5);
        expect(turnAt(2 * slight.holdMs)).toBeCloseTo(slight.release - 2.5, 6);
      });

      it("counts a slight turn's hold from when it first went past, through a wide turn before it", () => {
        tiltFromStill(wide.release + 5);
        turnAt(wide.holdMs - 2000);
        tiltBy(wide.release - 5);
        expectRecenteredAfter(slight.holdMs, wide.release - 5);
      });

      it("goes on counting a hold through a pause and a reinstalled controller", () => {
        const close = tiltFromStill(wide.release + 5);
        turnAt(wide.holdMs / 2);
        close();
        uninstall();
        uninstall = installLight(root);
        showScreen();
        expectRecenteredAfter(wide.holdMs, wide.release + 5);
      });

      it("maps the room as a fresh start does once re-centered on a device tilted past upright", () => {
        landAt(STILL_POSE.beta, 0);
        // A hand tilting the device back past upright over two seconds, then holding it there.
        const sweepMs = 2000;
        for (let t = 0; t < sweepMs; t += FRAME_MS) {
          tiltTo(STILL_POSE.beta + ((135 - STILL_POSE.beta) * t) / sweepMs, 0);
          vi.advanceTimersByTime(FRAME_MS);
        }
        tiltTo(135, 0);
        vi.advanceTimersByTime(wide.holdMs + RECENTER.easeMs + LATE_MS);
        expect(turned()).toBeLessThanOrEqual(TURN_FLOOR);
        const recentered = roomFrame();
        uninstall();
        openDocument();
        landAt(135, 0);
        const fresh = roomFrame();
        for (const key of ["up", "light", "eye"] as const)
          fresh[key].forEach((v, i) => expect(recentered[key][i]).toBeCloseTo(v, 9));
      });

      it("settles on the same frame for one pose, whichever side the device turned to it from", () => {
        const settleAt = (alpha: number) => {
          tiltTo(STILL_POSE.beta, 0, alpha);
          vi.advanceTimersByTime(30000);
          expect(turned()).toBeLessThanOrEqual(TURN_FLOOR);
          return roomFrame();
        };
        landAt(STILL_POSE.beta, 0);
        const fromBelow = settleAt(60);
        settleAt(120);
        expect(settleAt(60)).toEqual(fromBelow);
      });

      it("keeps its heading when the listener restarts with alpha counted from elsewhere", () => {
        const close = landAt(STILL_POSE.beta, 0, 40);
        close();
        showScreen();
        tiltTo(STILL_POSE.beta, 0, 130);
        settle();
        expect(turned()).toBeLessThan(0.01);
        tiltTo(STILL_POSE.beta, 0, 140);
        settle();
        expect(turned()).toBeCloseTo(10, 6);
      });

      it("turns the gravity it was given without alpha the smallest way, keeping its heading", () => {
        landAt(STILL_POSE.beta, 0, 40);
        tiltTo(STILL_POSE.beta + 10, 15, null);
        settle();
        const frame = roomFrame();
        const [a, b] = [upOnScreen(STILL_POSE), upOnScreen(pose(STILL_POSE.beta + 10, 15))];
        const gravityMoved = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.PI / 180);
        expect(turned()).toBeCloseTo(gravityMoved, 6);
        tiltTo(STILL_POSE.beta, 0, null);
        settle();
        expect(turned()).toBeLessThanOrEqual(TURN_FLOOR);
        expect(frame.up).not.toEqual(roomFrame().up);
      });
    });

    describe("following the hand", () => {
      /** A deviceorientation reading at `t` ms: alpha, beta and gamma in degrees. */
      type Reading = readonly [t: number, alpha: number, beta: number, gamma: number];
      type Frame = { at: number; redrew: boolean; reading: Reading; shown: DevicePose };
      /** How far the reflection moves, in CSS px, between two readings, or two poses the light showed. */
      const readingPx = (a: Reading, b: Reading) =>
        reflectionPx(angleBetween(attitudeOf(a[1], a[2], a[3]), attitudeOf(b[1], b[2], b[3])));
      const shownPx = (a: DevicePose, b: DevicePose) =>
        reflectionPx(
          angleBetween(
            multiply(attitudeOf(0, a.beta, a.gamma), a.turn ?? IDENTITY),
            multiply(attitudeOf(0, b.beta, b.gamma), b.turn ?? IDENTITY),
          ),
        );
      const rms = (xs: number[]) => Math.sqrt(xs.reduce((sum, x) => sum + x * x, 0) / xs.length);

      /**
       * Plays `readings` at their times, on a screen that draws a frame every `frameMs`, and returns each
       * display frame the light ran: its time, whether it redrew, the reading it had and the pose it showed.
       */
      const replay = (readings: readonly Reading[], frameMs = FRAME_MS) => {
        uninstall = installLight(root);
        showScreen();
        const frames: Frame[] = [];
        let latest = readings[0];
        const raf = (run: (now: number) => void) =>
          window.setTimeout(() => run(performance.now()), frameMs - (performance.now() % frameMs));
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) =>
          window.clearTimeout(id),
        );
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((run) =>
          raf((now) => {
            const before = published.length;
            run(now);
            frames.push({
              at: now,
              redrew: published.length > before,
              reading: latest,
              shown: currentLight(),
            });
          }),
        );
        const start = performance.now() - readings[0][0];
        for (const reading of readings) {
          vi.advanceTimersByTime(Math.max(0, start + reading[0] - performance.now()));
          latest = reading;
          tiltTo(reading[2], reading[3], reading[1]);
        }
        vi.advanceTimersByTime(FRAME_MS);
        return frames;
      };
      /** Frames from `fromMs` into the replay, while readings still arrived. */
      const during = (frames: Frame[], fromMs: number) =>
        frames.filter(
          (f) => f.at - frames[0].at >= fromMs && f.reading !== frames[frames.length - 1].reading,
        );
      /** Redraws per second over `frames`. */
      const redrawRate = (frames: Frame[]) =>
        frames.filter((f) => f.redrew).length /
        ((frames[frames.length - 1].at - frames[0].at) / 1000);
      /** A seeded normal distribution, so a synthetic hand is the same on every run. */
      const normal = (seed: number) => {
        const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        return () => Math.sqrt(-2 * Math.log(next() + 1e-12)) * Math.cos(2 * Math.PI * next());
      };
      /**
       * Readings every `everyMs` for `seconds`: tremor of `tremor`° rms on each angle from four tones in
       * the hand's 6–11 Hz band, sensor noise of `noise`° rms, and a tilt of `degreesPerSecond`.
       */
      const hand = ({
        seconds = 3,
        everyMs = 1000 / 60,
        tremor = 0,
        noise = 0,
        degreesPerSecond = 0,
      }) => {
        const gauss = normal(7);
        const tones = [6.5, 8.3, 9.7, 11.2].map(() => [gauss(), gauss(), gauss()]);
        const wobble = (axis: number, s: number) =>
          [6.5, 8.3, 9.7, 11.2].reduce(
            (sum, hz, k) => sum + Math.sin(2 * Math.PI * hz * s + Math.PI * tones[k][axis]),
            0,
          ) *
          (tremor / Math.sqrt(2));
        const readings: Reading[] = [];
        for (let t = 0; t <= seconds * 1000; t += everyMs) {
          const s = t / 1000;
          readings.push([
            Math.round(t),
            20 + wobble(0, s) + noise * gauss(),
            STILL_POSE.beta + degreesPerSecond * s + wobble(1, s) + noise * gauss(),
            wobble(2, s) + noise * gauss(),
          ]);
        }
        return readings;
      };

      it("redraws on every frame in which a recorded hand moved the reflection a pixel", () => {
        screenAt(90);
        for (const trace of traces.traces.map((rows) =>
          rows.map(([t, a, b, g]): Reading => [t, a, b, g]),
        )) {
          // Each trace is a separate recording: a fresh document, so none starts from another's viewer.
          openDocument();
          const frames = replay(trace);
          const moving = frames.filter(
            (f, i) => i > 0 && readingPx(frames[i - 1].reading, f.reading) >= 1,
          );
          expect(moving.length).toBeGreaterThan(0);
          expect(moving.filter((f) => !f.redrew).map((f) => f.at)).toEqual([]);
          uninstall();
          uninstall = () => {};
        }
      });

      it("shows the hand's tremor", () => {
        const frames = during(replay(hand({ tremor: 0.025, noise: 0.003 })), 500);
        const shown = frames.slice(1).map((f, i) => shownPx(frames[i].shown, f.shown));
        const real = frames.slice(1).map((f, i) => readingPx(frames[i].reading, f.reading));
        expect(rms(shown) / rms(real)).toBeGreaterThan(0.5);
      });

      it("stops redrawing for a device held still", () => {
        expect(redrawRate(during(replay(hand({ noise: 0.003 })), 1000))).toBeLessThan(1);
        // Once the readings stop, it lands on the last one and stops.
        vi.advanceTimersByTime(1000);
        const count = published.length;
        vi.advanceTimersByTime(5000);
        expect(published).toHaveLength(count);
        expect(vi.getTimerCount()).toBe(0);
      });

      it("redraws a hand's tremor at most at the cap on a fast screen", () => {
        const frames = during(replay(hand({ tremor: 0.025, noise: 0.003 }), FRAME_MS / 2), 500);
        // Every other frame of a 125 Hz screen, the nearest it comes to the cap.
        expect(redrawRate(frames)).toBeLessThan(MAX_PUBLISHES_PER_SECOND * 1.1);
        expect(redrawRate(frames)).toBeGreaterThan(MAX_PUBLISHES_PER_SECOND / 2);
      });

      it("advances on every frame of a slow tilt", () => {
        const frames = during(
          replay(hand({ everyMs: FRAME_MS, degreesPerSecond: 1, seconds: 2 })),
          250,
        );
        expect(frames.length).toBeGreaterThan(80);
        expect(frames.filter((f) => !f.redrew).map((f) => f.at)).toEqual([]);
      });
    });
  },
);
