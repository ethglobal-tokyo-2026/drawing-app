import { describe, expect, it, vi } from "vitest";
import { createBackStack } from "./useBackToClose";

/** A browser's session history: entries, the current one, and traversals that land a task later. */
function fakeWindow() {
  const entries: { state: unknown; url: string }[] = [{ state: { app: "start" }, url: "/g/abc" }];
  let at = 0;
  const listeners: ((e: { state: unknown }) => void)[] = [];
  // The window's own timers, which closing it cancels, and its history reads once it's closed.
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let made = 0;
  let closed = false;
  let readsAfterClose = 0;
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
        if (closed) readsAfterClose++;
        return entries[at].state;
      },
      pushState(state: unknown, _unused: string, url?: string | URL | null) {
        entries.splice(at + 1, Infinity, { state, url: url ? String(url) : entries[at].url });
        at++;
      },
      replaceState(state: unknown, _unused: string, url?: string | URL | null) {
        entries[at] = { state, url: url ? String(url) : entries[at].url };
      },
      back: () => traverse(-1),
    },
    forward: () => traverse(1),
    setTimeout: (run: () => void, ms: number) => {
      const id = ++made;
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          run();
        }, ms),
      );
      return id;
    },
    clearTimeout: (id: number) => {
      clearTimeout(timers.get(id));
      timers.delete(id);
    },
    /** Closes the window as a test's teardown does: its timers stop. */
    close: () => {
      closed = true;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
    readsAfterClose: () => readsAfterClose,
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

  it("steps back on its window's own timers, so nothing runs once the window is closed", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    const stack = createBackStack(win);
    // An overlay closing on its own holds a step back; the page goes before it's due.
    stack.release(stack.open(vi.fn()));
    win.close();
    await settle();
    expect(win.readsAfterClose()).toBe(0);
    vi.useRealTimers();
  });

  it("closes the overlay that took a closed one's place with a Back pressed at once", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    const stack = createBackStack(win);
    const closeGiving = vi.fn();
    stack.release(stack.open(vi.fn()));
    stack.open(closeGiving);

    win.history.back();
    await settle();
    expect(closeGiving).toHaveBeenCalledOnce();
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

  it("takes one entry when an overlay closes as a Back is already on its way", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    win.history.pushState({ app: "board" }, "");
    const stack = createBackStack(win);
    const close = vi.fn();
    const overlay = stack.open(close);

    win.history.back();
    stack.release(overlay);
    await settle();
    expect(win.where()).toMatchObject({ at: 1, state: { app: "board" } });
    expect(close).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("takes one entry when a Back pressed as an overlay closes lands after the close", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    win.history.pushState({ app: "board" }, "");
    const stack = createBackStack(win);
    const overlay = stack.open(vi.fn());

    // The close's step back is held first; the Back, still on its way, lands a moment later.
    stack.release(overlay);
    win.history.back();
    await settle();
    expect(win.where()).toMatchObject({ at: 1, state: { app: "board" } });
    vi.useRealTimers();
  });
});
