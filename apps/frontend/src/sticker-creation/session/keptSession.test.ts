// @vitest-environment happy-dom
import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personKey } from "../../ui/deviceStorage";
import { CHARRED_AT_ROLL } from "../../kyoto-seika/dieMood";
import { REUNION, WIND } from "../../kyoto-seika/testSubjects";
import type { Op, Step } from "../canvas/ops";
import {
  firstChanged,
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

/** `userId` starts a session on ticket 7 and draws `steps`. */
function draw(userId: string, steps: Step[], onKept?: (kept: boolean) => void) {
  const keeper = new SessionKeeper(userId, onKept);
  keeper.start(7);
  keeper.save(steps, 1000);
  return keeper;
}

/** The steps kept for `userId`; the load also waits for every write started before it. */
async function keptSteps(userId: string) {
  const kept = await loadKeptSession(userId);
  return kept.status === "found" ? kept.steps : kept.status;
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
    // A clear draws in no color either.
    expect(keptColor([stroke("#1478C8"), { tool: "clear" }])).toBe("#1478C8");
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
  it("is the signed-in person's alone", async () => {
    const [mine, theirs] = [someone(), someone()];
    const [a, b, c] = ["a", "b", "c"].map(stroke);
    draw(mine, [a, b]);
    expect(await keptSteps(theirs)).toBe("none");
    draw(theirs, [c]);
    expect(await keptSteps(mine)).toEqual([a, b]);
    expect(await keptSteps(theirs)).toEqual([c]);
  });

  it("brings a drawing back with its clears, so undo can still reach what was cleared", async () => {
    const userId = someone();
    const steps: Step[] = [stroke("a"), { tool: "clear" }, stroke("b")];
    draw(userId, steps);
    expect(await keptSteps(userId)).toEqual(steps);
  });

  it("keeps how the tools were set, and a screen's first render clears nothing kept", async () => {
    const userId = someone();
    const tools = { brushSize: 0.7, eraserSize: 0.2, smoothing: 55 };
    draw(userId, [stroke("a")]).keepTools(tools);
    // A screen with no session yet only reports its tools, which mustn't wipe the session kept.
    new SessionKeeper(userId).keepTools({ brushSize: 0.34, eraserSize: 0.52, smoothing: 30 });
    expect(await loadKeptSession(userId)).toMatchObject({ status: "found", tools });
  });

  it("leaves a drawing it couldn't read as it was while the carried sheet is still blank", async () => {
    const userId = someone();
    const ops = [stroke("a")];
    const before = draw(userId, ops);
    before.keepNsfw(true);
    // After a reload whose read was too slow, the screen carries the ticket and sets its tools.
    const after = new SessionKeeper(userId);
    after.carry(7, null);
    after.keepTools({ brushSize: 0.7, eraserSize: 0.2, smoothing: 55 });
    after.keepNsfw(false);
    expect(await loadKeptSession(userId)).toMatchObject({
      status: "found",
      steps: ops,
      elapsedMs: 1000,
      nsfw: true,
    });
  });

  it("brings the drawing back without tools when what's kept has none it can read", async () => {
    const userId = someone();
    draw(userId, [stroke("a")]).keepTools({ brushSize: 0.7, eraserSize: 0.2, smoothing: 55 });
    const key = personKey("draw.session", userId);
    const record: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (typeof record !== "object" || record === null) throw new Error("No record is kept");
    for (const tools of [undefined, { brushSize: 9, eraserSize: 0.2, smoothing: 55 }, "wide"]) {
      localStorage.setItem(key, JSON.stringify({ ...record, tools }));
      const kept = await loadKeptSession(userId);
      expect(kept).toMatchObject({ status: "found" });
      expect(kept).not.toHaveProperty("tools");
    }
  });

  it("clears nothing when its ops are only slow to read, and still finds them", async () => {
    const userId = someone();
    const ops = ["a", "b"].map(stroke);
    draw(userId, ops);
    expect(await keptSteps(userId)).toEqual(ops);
    const release = await holdStores();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const loading = loadKeptSession(userId);
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
    const kept = await loading;
    if (kept.status !== "unread") throw new Error(`A slow read came back ${kept.status}`);
    // The drawing screen carries the ticket over to a fresh sheet while the read goes on.
    new SessionKeeper(userId).carry(kept.ticket, kept.kyotoSeika);
    release();
    vi.useRealTimers();
    expect(await kept.later).toMatchObject({ status: "found", steps: ops });
    expect(await keptSteps(userId)).toEqual(ops);
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
    expect(await keptSteps(userId)).toEqual([a]);
    closeLast();
    keeper.save([a, b], 2000);
    expect(await keptSteps(userId)).toEqual([a, b]);
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
    expect(await keptSteps(userId)).toEqual([a, b, c]);
  });

  it("keeps the pair, rolls and Begin of a sheet in Kyoto Seika Practice Mode with its ticket, and reads them back", async () => {
    const userId = someone();
    const keeper = new SessionKeeper(userId);
    keeper.start(7, { subjects: null, rolls: [0, 0], begun: false });
    const part = { subjects: [WIND, REUNION], rolls: [CHARRED_AT_ROLL, 3], begun: true } as const;
    keeper.keepKyotoSeika(part);
    expect(await loadKeptSession(userId)).toMatchObject({
      status: "found",
      ticket: 7,
      kyotoSeika: part,
    });
  });

  it("keeps no Kyoto Seika Practice Mode part for a regular sheet", async () => {
    const userId = someone();
    draw(userId, [stroke("a")]);
    expect(await loadKeptSession(userId)).toMatchObject({ status: "found", kyotoSeika: null });
    const record: unknown = JSON.parse(
      localStorage.getItem(personKey("draw.session", userId)) ?? "null",
    );
    expect(record).not.toHaveProperty("kyotoSeika");
  });

  it("brings a sheet in Kyoto Seika Practice Mode back in the mode, whatever of its part a later build can read", async () => {
    const userId = someone();
    new SessionKeeper(userId).start(7, { subjects: [WIND, REUNION], rolls: [2, 0], begun: true });
    /** The record as a build that wrote `kyotoSeika` differently would have kept it. */
    const keptAs = (kyotoSeika: unknown) =>
      localStorage.setItem(
        personKey("draw.session", userId),
        JSON.stringify({ ticket: 7, elapsedMs: 0, nsfw: false, kyotoSeika }),
      );
    const sent = ({ ja, reading, en }: KyotoSeikaSubject) => ({ ja, reading, en });

    // Each subject needs only what the seal sends of it: a kind or flag this build can't read is let go.
    keptAs({ subjects: [{ ...WIND, kind: "weather" }, sent(REUNION)], rolls: [2, 0], begun: true });
    expect(await loadKeptSession(userId)).toMatchObject({
      kyotoSeika: { subjects: [sent(WIND), sent(REUNION)], rolls: [2, 0], begun: true },
    });

    // A pair that can't be read at all is dealt again, so the sheet waits for Begin.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    keptAs({ subjects: [{ word: WIND.ja }, REUNION], rolls: [2, 0], begun: true });
    expect(await loadKeptSession(userId)).toMatchObject({
      kyotoSeika: { subjects: null, rolls: [0, 0], begun: false },
    });
    expect(error).toHaveBeenCalledOnce();
  });

  it("carries a ticket's Kyoto Seika Practice Mode part with it when the drawing isn't read", async () => {
    const userId = someone();
    const part = { subjects: [WIND, REUNION], rolls: [2, 0], begun: false };
    const record = { ticket: 7, elapsedMs: 0, nsfw: false, kyotoSeika: part };
    localStorage.setItem(personKey("draw.session", userId), JSON.stringify(record));
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("Connection to Indexed Database server lost", "UnknownError");
    });
    expect(await loadKeptSession(userId)).toMatchObject({
      status: "unread",
      ticket: 7,
      kyotoSeika: part,
    });
  });
});
