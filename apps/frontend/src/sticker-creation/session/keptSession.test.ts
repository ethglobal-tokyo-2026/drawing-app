// @vitest-environment happy-dom
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Op } from "../canvas/ops";
import {
  firstChanged,
  forgetKeptSession,
  keptColor,
  loadKeptSession,
  LOAD_TIMEOUT_MS,
  SessionKeeper,
} from "./keptSession";

const stroke = (color: string): Op => ({ tool: "brush", color, pts: [], T: 0 });

// The module keeps its connections for the page's life, so each test draws as someone new.
let people = 0;
const someone = () => `person-${++people}`;

beforeEach(() => {
  vi.stubGlobal("indexedDB", new FakeIndexedDB());
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** `userId` starts a session on ticket 7 and draws `ops`. */
function draw(userId: string, ops: Op[], onKept?: (kept: boolean) => void) {
  const keeper = new SessionKeeper(userId, onKept);
  keeper.start(7);
  keeper.save(ops, 1000);
  return keeper;
}

/** The ops kept for `userId`; the load also waits for every write started before it. */
async function keptOps(userId: string) {
  const kept = await loadKeptSession(userId);
  return kept.status === "found" ? kept.ops : kept.status;
}

/** Holds the one database's stores in a transaction until the returned release, as a slow disk would. */
async function holdStores() {
  const [{ name } = {}] = await indexedDB.databases();
  if (!name) throw new Error("Nothing is kept to hold");
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const stores = [...db.objectStoreNames];
  const store = db.transaction(stores, "readwrite").objectStore(stores[0]);
  let held = true;
  const spin = () => {
    if (held) store.count().onsuccess = spin;
  };
  spin();
  return () => {
    held = false;
    db.close();
  };
}

describe("keptColor", () => {
  it("picks a drawing back up in the color it was last drawn in", () => {
    const fill: Op = { tool: "fill", x: 0, y: 0, color: "#00868B", T: 0 };
    const erase: Op = { tool: "eraser", color: "#E8484F", pts: [], T: 0 };
    expect(keptColor([stroke("#1478C8"), stroke("#B4299A")])).toBe("#B4299A");
    // A fill counts; the eraser doesn't draw in a color.
    expect(keptColor([stroke("#1478C8"), fill, erase])).toBe("#00868B");
    // Nothing drawn: it keeps the color a fresh sheet starts in.
    expect(keptColor([])).toBeNull();
  });
});

describe("firstChanged", () => {
  it("starts a save at the first op that isn't the one written there last", () => {
    const [a, b, c, d] = ["a", "b", "c", "d"].map(stroke);
    // A new stroke, and a redo: only the new last op.
    expect(firstChanged([a, b], [a, b, c])).toBe(2);
    // An undo: no ops, only the count.
    expect(firstChanged([a, b, c], [a, b])).toBe(2);
    // A stroke after an undo takes the undone one's place.
    expect(firstChanged([a, b, c], [a, b, d])).toBe(2);
    // Nothing written yet, or a write that failed: every op.
    expect(firstChanged([], [a, b])).toBe(0);
  });
});

describe("the drawing kept on this device", () => {
  it("is the signed-in person's alone, and goes when they log out", async () => {
    const [mine, theirs] = [someone(), someone()];
    const [a, b, c] = ["a", "b", "c"].map(stroke);
    draw(mine, [a, b]);
    expect(await keptOps(theirs)).toBe("none");
    draw(theirs, [c]);
    expect(await keptOps(mine)).toEqual([a, b]);
    await forgetKeptSession(mine);
    expect(await keptOps(mine)).toBe("none");
    expect(await keptOps(theirs)).toEqual([c]);
  });

  it("clears nothing when its ops are only slow to read, and still finds them", async () => {
    const userId = someone();
    const ops = ["a", "b"].map(stroke);
    draw(userId, ops);
    expect(await keptOps(userId)).toEqual(ops);
    const release = await holdStores();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const loading = loadKeptSession(userId);
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
    const kept = await loading;
    if (kept.status !== "unread") throw new Error(`A slow read came back ${kept.status}`);
    // The drawing screen carries the ticket over to a fresh sheet while the read goes on.
    new SessionKeeper(userId).carry(kept.ticket);
    release();
    vi.useRealTimers();
    expect(await kept.later).toMatchObject({ status: "found", ops });
    expect(await keptOps(userId)).toEqual(ops);
  });

  it("goes on keeping strokes after the browser closes its connection, and says while it can't", async () => {
    const userId = someone();
    const [a, b, c] = ["a", "b", "c"].map(stroke);
    const onKept = vi.fn();
    const open = vi.spyOn(indexedDB, "open");
    /** Closes the connection opened last, as WebKit does when its IndexedDB server goes. */
    const closeLast = () => {
      const opened = open.mock.results.at(-1);
      if (opened?.type !== "return") throw new Error("Nothing was opened");
      opened.value.result.close();
    };
    const keeper = draw(userId, [a], onKept);
    expect(await keptOps(userId)).toEqual([a]);
    closeLast();
    keeper.save([a, b], 2000);
    expect(await keptOps(userId)).toEqual([a, b]);
    expect(onKept).not.toHaveBeenCalled();

    closeLast();
    open.mockImplementation(() => {
      throw new DOMException("Connection to Indexed Database server lost", "UnknownError");
    });
    keeper.save([a, b, c], 3000);
    await vi.waitFor(() => expect(onKept).toHaveBeenLastCalledWith(false));
    open.mockRestore();
    keeper.save([a, b, c], 4000);
    await vi.waitFor(() => expect(onKept).toHaveBeenLastCalledWith(true));
    expect(await keptOps(userId)).toEqual([a, b, c]);
  });
});
