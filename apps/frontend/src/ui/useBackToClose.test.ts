import { describe, expect, it, vi } from "vitest";
import { createBackStack } from "./useBackToClose";

/** A browser's session history: entries, the current one, and traversals that land a task later. */
function fakeWindow() {
  const entries: { state: unknown; url: string }[] = [{ state: { app: "start" }, url: "/g/abc" }];
  let at = 0;
  const listeners: ((e: { state: unknown }) => void)[] = [];
  const traverse = (by: number) =>
    setTimeout(() => {
      const to = at + by;
      if (to < 0 || to >= entries.length) return;
      at = to;
      for (const listener of listeners) listener({ state: entries[at].state });
    });
  return {
    history: {
      get state() {
        return entries[at].state;
      },
      pushState(state: unknown, _unused: string, url?: string | URL | null) {
        entries.splice(at + 1, Infinity, { state, url: url ? String(url) : entries[at].url });
        at++;
      },
      back: () => traverse(-1),
    },
    forward: () => traverse(1),
    addEventListener: (_type: "popstate", listener: (e: { state: unknown }) => void) =>
      void listeners.push(listener),
    /** The current entry, and how many entries lie ahead of it. */
    where: () => ({
      at,
      ahead: entries.length - 1 - at,
      url: entries[at].url,
      state: entries[at].state,
    }),
  };
}

const settle = () => vi.runAllTimersAsync();

describe("createBackStack", () => {
  it("closes the overlay on top with Back, one per press, and never changes the URL", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    const stack = createBackStack(win);
    const closeDetail = vi.fn();
    const closeGiving = vi.fn();
    stack.open(closeDetail);
    stack.open(closeGiving);

    win.history.back();
    await settle();
    expect(closeGiving).toHaveBeenCalledOnce();
    expect(closeDetail).not.toHaveBeenCalled();

    win.history.back();
    await settle();
    expect(closeDetail).toHaveBeenCalledOnce();
    expect(win.where()).toMatchObject({ at: 0, url: "/g/abc", state: { app: "start" } });
    vi.useRealTimers();
  });

  it("takes an overlay's entry off when it closes on its own, even as the next one opens", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    const stack = createBackStack(win);
    const closeDetail = vi.fn();
    const closeGiving = vi.fn();
    // Give on the detail: the detail closes and Giving opens in the same moment.
    const detail = stack.open(closeDetail);
    stack.release(detail);
    stack.open(closeGiving);
    await settle();
    // Giving's entry replaces the detail's rather than sitting ahead of it.
    expect(win.where()).toMatchObject({ at: 1, ahead: 0 });

    win.history.back();
    await settle();
    expect(closeGiving).toHaveBeenCalledOnce();
    expect(closeDetail).not.toHaveBeenCalled();
    expect(win.where().at).toBe(0);
    vi.useRealTimers();
  });

  it("keeps an entry for an overlay that can't close yet, and skips entries it went back past", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    const stack = createBackStack(win);
    let busy = true;
    const close = vi.fn(() => !busy);
    stack.open(close);

    win.history.back();
    await settle();
    expect(close).toHaveBeenCalledOnce();
    expect(win.where().at).toBe(1);

    busy = false;
    win.history.back();
    await settle();
    expect(close).toHaveBeenCalledTimes(2);
    expect(win.where().at).toBe(0);

    // Forward onto the closed overlay's entry doesn't strand anyone there.
    win.forward();
    await settle();
    expect(win.where().at).toBe(0);
    expect(close).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
