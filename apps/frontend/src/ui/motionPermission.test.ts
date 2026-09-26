// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMotionPermission, type MotionHost } from "./motionPermission";

/** A browser with (or without) iOS's motion prompt, a device store, and a phone that can move. */
function fakeBrowser({
  askable = true,
  kept,
  answer = () => Promise.resolve("granted"),
}: { askable?: boolean; kept?: string; answer?: () => Promise<string> } = {}) {
  const storage = new Map<string, string>();
  if (kept) storage.set("draw.motion", kept);
  const listeners = new Set<() => void>();
  const requestPermission = vi.fn(answer);
  const host: MotionHost = {
    requestPermission: askable ? requestPermission : undefined,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
    },
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };
  return { host, storage, requestPermission, movePhone: () => listeners.forEach((l) => l()) };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createMotionPermission", () => {
  it("needs no asking where the browser has no motion prompt", () => {
    expect(createMotionPermission(fakeBrowser({ askable: false }).host).get()).toBe("not-needed");
  });

  it("asks once, and keeps the answer on the device", async () => {
    const browser = fakeBrowser();
    const permission = createMotionPermission(browser.host);
    expect(permission.get()).toBe("unasked");
    await Promise.all([permission.ask(), permission.ask()]);
    expect(browser.requestPermission).toHaveBeenCalledTimes(1);
    expect(permission.get()).toBe("granted");
    expect(browser.storage.get("draw.motion")).toBe("granted");
  });

  it("doesn't ask again after Not now", () => {
    const browser = fakeBrowser();
    createMotionPermission(browser.host).decline();
    expect(createMotionPermission(browser.host).get()).toBe("denied");
  });

  it("asks again when a kept yes brings no motion, and keeps one that does", () => {
    vi.useFakeTimers();
    const forgotten = createMotionPermission(fakeBrowser({ kept: "granted" }).host);
    const honored = fakeBrowser({ kept: "granted" });
    const still = createMotionPermission(honored.host);
    honored.movePhone();
    vi.advanceTimersByTime(1000);
    expect(forgotten.get()).toBe("unasked");
    expect(still.get()).toBe("granted");
  });

  it("counts a failed ask as no without keeping it, so the next launch asks", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const browser = fakeBrowser({ answer: () => Promise.reject(new Error("Not from a tap")) });
    const permission = createMotionPermission(browser.host);
    await permission.ask();
    expect(permission.get()).toBe("denied");
    expect(browser.storage.has("draw.motion")).toBe(false);
  });
});
