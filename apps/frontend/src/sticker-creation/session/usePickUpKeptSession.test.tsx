// @vitest-environment happy-dom
import { IDBFactory } from "fake-indexeddb";
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { buttonNamed, renderInHost } from "../../ui/testing";
import { loadKeptSession, SessionKeeper } from "./keptSession";
import { usePickUpKeptSession } from "./usePickUpKeptSession";
import { KeptDrawingRecovery } from "./KeptDrawingRecovery";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(["missing", "malformed", "blocked"])(
  "the real pickup hook retains committed ink with %s metadata until explicit discard",
  async (metadata) => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const userId = `pickup-${metadata}`;
    const keeper = new SessionKeeper(userId);
    keeper.start(7);
    keeper.save([{ tool: "brush", layer: 1, color: "red", pts: [10, 10, 2, 0], T: 0 }], 1000, {
      w: 374,
      h: 748,
      density: 1,
    });
    await loadKeptSession(userId);
    expect((await loadKeptSession(userId)).status).toBe("found");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(`drawing-session.${userId}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const steps = () =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction("ops").objectStore("ops").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const original = await steps();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const key = `draw.session.${userId}`;
    const storage = localStorage;
    if (metadata === "missing") localStorage.removeItem(key);
    if (metadata === "malformed") localStorage.setItem(key, "{broken");
    if (metadata === "blocked")
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new Error("Metadata read unavailable");
        },
      });
    const carryOver = vi.fn();
    const putBack = vi.fn();
    function Probe() {
      const picked = usePickUpKeptSession({
        userId,
        keeper,
        tickets: null,
        putBack,
        carryOver,
        primedOn: () => false,
      });
      return (
        <>
          <p>{picked.recovery ? "recovery" : picked.restoring ? "loading" : "blank"}</p>
          <button onClick={picked.discardRecovery}>Discard</button>
        </>
      );
    }
    const view = renderInHost(<Probe />);
    try {
      await vi.waitFor(async () => {
        await act(async () => {});
        expect(view.host.querySelector("p")?.textContent).toBe("recovery");
      });
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("metadata cannot be verified"),
        expect.any(Error),
      );
      expect(await steps()).toEqual(original);
      expect(carryOver).not.toHaveBeenCalled();
      expect(putBack).not.toHaveBeenCalled();
      if (metadata === "blocked") vi.stubGlobal("localStorage", storage);
      act(() => view.host.querySelector("button")?.click());
      await vi.waitFor(async () => expect(await steps()).toEqual([]));
      expect(carryOver).not.toHaveBeenCalled();
      expect(view.host.querySelector("p")?.textContent).toBe("blank");
    } finally {
      view.unmount();
      db.close();
    }
  },
);

it("retries unavailable storage through the real recovery sheet without exporting unread data or reusing a ticket", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const userId = "pickup-retry-unavailable";
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
    throw new Error("Step store unavailable");
  });
  const keeper = new SessionKeeper(userId);
  const carryOver = vi.fn();
  const putBack = vi.fn();
  function Probe() {
    const picked = usePickUpKeptSession({
      userId,
      keeper,
      tickets: null,
      putBack,
      carryOver,
      primedOn: () => false,
    });
    return picked.recovery ? (
      <KeptDrawingRecovery
        recovery={picked.recovery}
        reconciliation={{ status: "unknown" }}
        onRetry={picked.retryRecovery}
        onDiscard={picked.discardRecovery}
        onClose={() => {}}
      />
    ) : (
      <p>{picked.restoring ? "loading" : "blank"}</p>
    );
  }
  const view = renderInHost(<Probe />);
  try {
    await act(async () => {
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
    });
    expect(view.host.textContent).toContain("We couldn’t read your saved drawing.");
    expect(view.host.textContent).not.toContain("Download saved drawing");
    expect(view.host.textContent).not.toContain("Today’s tickets");
    expect(carryOver).not.toHaveBeenCalled();
    open.mockRestore();
    act(() => buttonNamed(view.host, "Try again").click());
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(view.host.textContent).toBe("blank");
    });
    expect(carryOver).not.toHaveBeenCalled();
    expect(putBack).not.toHaveBeenCalled();
  } finally {
    view.unmount();
  }
});

it("does not reopen recovery when a retry finishes after explicit discard", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const userId = "pickup-discard-during-retry";
  const keeper = new SessionKeeper(userId);
  keeper.start(7);
  keeper.save([{ tool: "brush", layer: 1, color: "red", pts: [], T: 0 }], 1000, null);
  await loadKeptSession(userId);
  await loadKeptSession(userId);
  localStorage.setItem(`draw.session.${userId}`, "{broken");
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  function Probe() {
    const picked = usePickUpKeptSession({
      userId,
      keeper,
      tickets: null,
      putBack: () => {},
      carryOver: () => {},
      primedOn: () => false,
    });
    return (
      <>
        <p>{picked.recovery ? "recovery" : picked.restoring ? "loading" : "blank"}</p>
        <button onClick={picked.retryRecovery}>Retry</button>
        <button onClick={picked.discardRecovery}>Discard</button>
      </>
    );
  }
  const view = renderInHost(<Probe />);
  let release = () => {};
  try {
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(view.host.querySelector("p")?.textContent).toBe("recovery");
    });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(`drawing-session.${userId}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const store = db.transaction(["ops", "progress"], "readwrite").objectStore("ops");
    let held = true;
    const spin = () => {
      if (held) store.count().onsuccess = spin;
    };
    spin();
    release = () => {
      held = false;
      db.close();
    };
    act(() => buttonNamed(view.host, "Retry").click());
    act(() => buttonNamed(view.host, "Discard").click());
    expect(view.host.querySelector("p")?.textContent).toBe("blank");
    release();
    await act(async () => {
      await loadKeptSession(userId);
      await loadKeptSession(userId);
    });
    expect(view.host.querySelector("p")?.textContent).toBe("blank");
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("metadata cannot be verified"),
      expect.any(Error),
    );
  } finally {
    release();
    view.unmount();
  }
});
