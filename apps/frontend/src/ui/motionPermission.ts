import { useSyncExternalStore } from "react";

/**
 * The app's one answer about reading the device's motion. iOS asks, from a tap, once for motion and
 * tilt together; other browsers need no permission. The answer is kept on this device.
 */
export type MotionPermission = "not-needed" | "unasked" | "granted" | "denied";

/** What the permission needs from the browser, so a test can stand in for it. */
export interface MotionHost {
  /** iOS's prompt; absent where motion needs no permission. */
  requestPermission?: () => Promise<string>;
  localStorage: Pick<Storage, "getItem" | "setItem">;
  addEventListener: (type: "devicemotion", listener: () => void) => void;
  removeEventListener: (type: "devicemotion", listener: () => void) => void;
  setTimeout: (run: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface MotionPermissionStore {
  get: () => MotionPermission;
  subscribe: (listener: () => void) => () => void;
  /** Asks the platform; call it from a tap. A second call while the first is pending doesn't ask twice. */
  ask: () => Promise<MotionPermission>;
  /** Not now: it won't ask again. */
  decline: () => void;
}

const KEY = "draw.motion";
/** A kept yes that brings no motion this soon has been forgotten by the platform. */
const CHECK_MS = 1000;

export function createMotionPermission(host: MotionHost): MotionPermissionStore {
  const listeners = new Set<() => void>();
  let pending: Promise<MotionPermission> | null = null;

  const kept = (): "granted" | "denied" | null => {
    try {
      const answer = host.localStorage.getItem(KEY);
      return answer === "granted" || answer === "denied" ? answer : null;
    } catch (error) {
      console.error("The motion answer couldn't be read", error);
      return null;
    }
  };
  const keep = (answer: "granted" | "denied") => {
    try {
      host.localStorage.setItem(KEY, answer);
    } catch (error) {
      console.error("The motion answer couldn't be saved", error);
    }
  };

  let state: MotionPermission = host.requestPermission ? (kept() ?? "unasked") : "not-needed";
  const set = (next: MotionPermission) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  if (state === "granted") {
    let timer = 0;
    const heard = () => {
      host.clearTimeout(timer);
      host.removeEventListener("devicemotion", heard);
    };
    timer = host.setTimeout(() => {
      host.removeEventListener("devicemotion", heard);
      set("unasked");
    }, CHECK_MS);
    host.addEventListener("devicemotion", heard);
  }

  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ask: () => {
      const request = host.requestPermission;
      if (!request) return Promise.resolve(state);
      pending ??= request()
        .then(
          (answer): MotionPermission => {
            const kept = answer === "granted" ? "granted" : "denied";
            keep(kept);
            set(kept);
            return kept;
          },
          (error: unknown): MotionPermission => {
            // Not kept: a failed ask says nothing about the person's answer, so the next launch asks.
            console.error("Asking for motion failed, so motion stays off", error);
            set("denied");
            return "denied";
          },
        )
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    decline: () => {
      keep("denied");
      set("denied");
    },
  };
}

/** iPhone and iPad, iPadOS included, which reports itself as a Mac with a touch screen. */
const isAppleMobile = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

/** iOS's motion prompt, which TypeScript's DOM types don't declare. */
function iosMotionPrompt(): (() => Promise<string>) | undefined {
  // Some desktop browsers carry the prompt too; the ask is for the phones and iPads that need it.
  if (!isAppleMobile()) return undefined;
  const motion: unknown = window.DeviceMotionEvent;
  if (typeof motion !== "function" || !("requestPermission" in motion)) return undefined;
  const ask = motion.requestPermission;
  if (typeof ask !== "function") return undefined;
  return async () => {
    const answer: unknown = await Reflect.apply(ask, motion, []);
    return String(answer);
  };
}

let app: MotionPermissionStore | null = null;
const appPermission = () =>
  (app ??= createMotionPermission({
    requestPermission: iosMotionPrompt(),
    // Read when used, inside the store's own guards: some browsers throw on touching blocked storage.
    localStorage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    addEventListener: (type, listener) => window.addEventListener(type, listener),
    removeEventListener: (type, listener) => window.removeEventListener(type, listener),
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  }));

export const askForMotion = () => appPermission().ask();
export const declineMotion = () => appPermission().decline();

export function useMotionPermission(): MotionPermission {
  const store = appPermission();
  return useSyncExternalStore(store.subscribe, store.get);
}
