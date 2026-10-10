// @vitest-environment happy-dom
import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import {
  IDBDatabase as FakeDb,
  IDBFactory as FakeIndexedDB,
  IDBObjectStore as FakeStore,
} from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { personKey } from "../../ui/deviceStorage";
import { CHARRED_AT_ROLL } from "../../kyoto-seika/dieMood";
import { REUNION, TEST_SUBJECTS, WIND } from "../../kyoto-seika/testSubjects";
import { FILL_GAP } from "../canvas/fill";
import type { FillOp, Op, Step } from "../canvas/ops";
import { frameFor, SHEET_SHORT_UNITS, type SheetFrame } from "../canvas/sheetFrame";
import {
  firstChanged,
  keptColor,
  loadKeptSession,
  LOAD_TIMEOUT_MS,
  SAVE_WORK,
  SessionKeeper,
  UNDEALT,
  WRITE_TIMEOUT_MS,
} from "./keptSession";

/** The labels work was timed under, as the performance recorder hears them. */
const timed = vi.hoisted((): string[] => []);
vi.mock("../../performance/performanceRecorder", () => ({
  timeOurWork: <T>(label: string, work: () => T): T => {
    timed.push(label);
    return work();
  },
}));

const stroke = (color: string): Op => ({ tool: "brush", color, pts: [], T: 0 });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
/** A deal of five, one of each kind: the first of each in the test list. */
const FIVE = TEST_SUBJECTS.filter((s, i, all) => all.findIndex((o) => o.kind === s.kind) === i);
/** The sheet these drawings are drawn on. */
const FRAME = frameFor({ width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 }, 2);

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

/** `userId` starts a session on ticket 7 and draws `steps`, on `frame`. */
function draw(
  userId: string,
  steps: Step[],
  { frame = FRAME, onKept }: { frame?: SheetFrame | null; onKept?: (kept: boolean) => void } = {},
) {
  const keeper = new SessionKeeper(userId, onKept);
  keeper.start(7);
  keeper.save(steps, 1000, frame);
  return keeper;
}

/**
 * What's kept for `userId` once the writes asked of its keepers have landed: a load waits for the
 * writes started before it, and one merged behind another starts as that one lands, before the
 * second load.
 */
async function loadKept(userId: string) {
  await loadKeptSession(userId);
  return loadKeptSession(userId);
}

/** The steps kept for `userId`, once the writes asked so far have landed. */
async function keptSteps(userId: string) {
  const kept = await loadKept(userId);
  return kept.status === "found" ? kept.steps : kept.status;
}

/**
 * Waits for the steps kept for `userId` to be `expected`: a write merged behind one that failed
 * starts only once that failure reaches its keeper, which no load can wait for.
 */
const untilKept = (userId: string, expected: Step[]) =>
  vi.waitFor(async () => expect(await keptSteps(userId)).toEqual(expected));

/** A second connection to the one database kept, as another tab would open. */
async function openKept(): Promise<IDBDatabase> {
  const [{ name } = {}] = await indexedDB.databases();
  if (!name) throw new Error("Nothing is kept");
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Runs `edit` on the store of steps kept, as another build or a lost write would have left it. */
async function editKeptSteps(edit: (ops: IDBObjectStore) => void) {
  const db = await openKept();
  await new Promise<void>((resolve, reject) => {
    // keptSession.ts's store of steps.
    const tx = db.transaction("ops", "readwrite");
    edit(tx.objectStore("ops"));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Writes `step` as step `i` of the drawing kept, as an older build would have kept it. */
const keepStepAs = (i: number, step: unknown) => editKeptSteps((ops) => ops.put(step, i));

/** The places of the steps kept. */
async function keptPlaces() {
  let places: IDBValidKey[] = [];
  await editKeptSteps((ops) => {
    const keys = ops.getAllKeys();
    keys.onsuccess = () => (places = keys.result);
  });
  return places;
}

/** How many steps are written from now on. */
function countStepPuts() {
  const put = vi.spyOn(FakeStore.prototype, "put");
  return () =>
    put.mock.calls.filter(
      ([value]: unknown[]) => typeof value === "object" && value !== null && "tool" in value,
    ).length;
}

/**
 * `keeper` saves `live` after each of `edits`, while another tab holds the stores; the first of
 * those writes aborts once they're all made, and the stores are let go.
 */
async function abortFirstWrite(keeper: SessionKeeper, live: Step[], edits: (() => void)[]) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const release = await holdStores();
  const transactions = vi.spyOn(FakeDb.prototype, "transaction");
  for (const edit of edits) {
    edit();
    keeper.save(live, 0, FRAME);
    await tick();
  }
  const first = transactions.mock.results[0];
  transactions.mockRestore();
  if (first?.type !== "return") throw new Error("No write was made");
  first.value.abort();
  release();
}

/** Holds the one database's stores in a transaction until the returned release, as a slow disk would. */
async function holdStores() {
  const db = await openKept();
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
    const fill: Op = { tool: "fill", x: 0, y: 0, color: "#00868B", gap: 0, T: 0 };
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

  it("says whether a new session's record was written, which a reload needs to know its ticket was spent", () => {
    expect(new SessionKeeper(someone()).start(7)).toBe(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A stand-in storage: spying on happy-dom's own doesn't reach it.
    vi.stubGlobal("localStorage", {
      removeItem: () => {},
      setItem: () => {
        throw new DOMException("The quota has been exceeded", "QuotaExceededError");
      },
    });
    expect(new SessionKeeper(someone()).start(7)).toBe(false);
  });

  it("brings a drawing back with its clears, so undo can still reach what was cleared", async () => {
    const userId = someone();
    const steps: Step[] = [stroke("a"), { tool: "clear" }, stroke("b")];
    draw(userId, steps);
    expect(await keptSteps(userId)).toEqual(steps);
  });

  it("keeps each fill's gap, and reads a fill kept before fills recorded one as closing none", async () => {
    const userId = someone();
    const fill: FillOp = { tool: "fill", x: 4, y: 5, color: "#00868B", gap: FILL_GAP, T: 0 };
    draw(userId, [fill]);
    expect(await keptSteps(userId)).toEqual([fill]);
    await keepStepAs(0, { tool: "fill", x: 4, y: 5, color: "#00868B", T: 0 });
    expect(await keptSteps(userId)).toEqual([{ ...fill, gap: 0 }]);
  });

  it("keeps the frame a drawing is drawn in with it, and has none for one kept without", async () => {
    const [framed, unframed] = [someone(), someone()];
    draw(framed, [stroke("a")]);
    draw(unframed, [stroke("a")], { frame: null });
    expect(await loadKept(framed)).toMatchObject({ status: "found", frame: FRAME });
    expect(await loadKept(unframed)).toMatchObject({ status: "found", frame: null });
  });

  it("keeps how the tools were set, and a screen's first render clears nothing kept", async () => {
    const userId = someone();
    const tools = { brushSize: 0.7, eraserSize: 0.2, smoothing: 55 };
    draw(userId, [stroke("a")]).keepTools(tools);
    // A screen with no session yet only reports its tools, which mustn't wipe the session kept.
    new SessionKeeper(userId).keepTools({ brushSize: 0.34, eraserSize: 0.52, smoothing: 30 });
    expect(await loadKept(userId)).toMatchObject({ status: "found", tools });
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
    expect(await loadKept(userId)).toMatchObject({
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
      const kept = await loadKept(userId);
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

  it("reads each step at its own place, so one missing below the count loses the drawing, and an undo deletes the steps it took back", async () => {
    const userId = someone();
    const steps = ["a", "b", "c", "d"].map(stroke);
    draw(userId, steps).save(steps.slice(0, 2), 2000, FRAME);
    expect(await keptSteps(userId)).toEqual(steps.slice(0, 2));
    expect(await keptPlaces()).toEqual([0, 1]);
    // A step lost below the count, and a stray one past it.
    await editKeptSteps((ops) => {
      ops.delete(1);
      ops.put(stroke("e"), 2);
    });
    expect(await keptSteps(userId)).toBe("lost");
  });

  it("writes every step again after a write fails, before a save waiting behind it lands", async () => {
    const userId = someone();
    const [s0, s1, s2, s3, s4] = ["s0", "s1", "s2", "s3", "s4"].map(stroke);
    // An undo, then two strokes, the first of whose writes fails.
    const keeper = draw(userId, []);
    const live = [s0, s1, s2, s3, s4];
    keeper.save(live, 0, FRAME);
    live.length = 3;
    keeper.save(live, 0, FRAME);
    expect(await keptSteps(userId)).toEqual(live);
    const [t3, t4] = ["t3", "t4"].map(stroke);
    await abortFirstWrite(keeper, live, [() => live.push(t3), () => live.push(t4)]);
    await untilKept(userId, live);

    // Three strokes on a new sheet, the first of whose writes fails, then an undo.
    const steps = [s0, s1];
    const again = draw(userId, steps);
    await abortFirstWrite(again, steps, [
      () => steps.push(s2),
      () => steps.push(s3),
      () => steps.push(s4),
      () => steps.pop(),
    ]);
    await untilKept(userId, steps);
  });

  it("says the drawing isn't kept once a write hasn't landed in time, and writes what waited once, whole, when it does", async () => {
    const userId = someone();
    const onKept = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const keeper = draw(userId, [], { onKept });
    expect(await keptSteps(userId)).toEqual([]);
    const release = await holdStores();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // The canvas hands over its live steps, as History does.
    const live: Step[] = [];
    for (const color of ["a", "b", "c"]) {
      live.push(stroke(color));
      keeper.save(live, 0, FRAME);
    }
    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(onKept).toHaveBeenLastCalledWith(false);
    expect(error).toHaveBeenCalledOnce();
    const puts = countStepPuts();
    release();
    vi.useRealTimers();
    await vi.waitFor(() => expect(puts()).toBe(live.length));
    expect(await keptSteps(userId)).toEqual(live);
    expect(onKept).toHaveBeenLastCalledWith(true);
  });

  it("times its writes for the performance recorder", async () => {
    const userId = someone();
    timed.length = 0;
    draw(userId, [stroke("a")]);
    expect(await keptSteps(userId)).toEqual([stroke("a")]);
    expect(timed).toContain(SAVE_WORK);
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
    const keeper = draw(userId, [a], { onKept });
    expect(await keptSteps(userId)).toEqual([a]);
    closeLast();
    keeper.save([a, b], 2000, FRAME);
    expect(await keptSteps(userId)).toEqual([a, b]);
    expect(onKept).not.toHaveBeenCalled();

    closeLast();
    open.mockImplementation(() => {
      throw new DOMException("Connection to Indexed Database server lost", "UnknownError");
    });
    keeper.save([a, b, c], 3000, FRAME);
    await vi.waitFor(() => expect(onKept).toHaveBeenLastCalledWith(false));
    open.mockRestore();
    keeper.save([a, b, c], 4000, FRAME);
    await vi.waitFor(() => expect(onKept).toHaveBeenLastCalledWith(true));
    expect(await keptSteps(userId)).toEqual([a, b, c]);
  });

  it("keeps the deal, picks, rolls and Begin of a sheet in Kyoto Seika Practice Mode with its ticket, and reads them back", async () => {
    const userId = someone();
    const keeper = new SessionKeeper(userId);
    keeper.start(7, UNDEALT);
    const dealt = { subjects: FIVE, picked: [3, 0], rolls: 4, begun: false };
    keeper.keepKyotoSeika(dealt);
    expect(await loadKept(userId)).toMatchObject({
      status: "found",
      ticket: 7,
      kyotoSeika: dealt,
    });
    const begun = {
      subjects: [FIVE[3], WIND],
      picked: [0, 1],
      rolls: CHARRED_AT_ROLL,
      begun: true,
    };
    keeper.keepKyotoSeika(begun);
    expect(await loadKept(userId)).toMatchObject({ kyotoSeika: begun });
  });

  it("keeps no Kyoto Seika Practice Mode part for a regular sheet", async () => {
    const userId = someone();
    draw(userId, [stroke("a")]);
    expect(await loadKept(userId)).toMatchObject({ status: "found", kyotoSeika: null });
    const record: unknown = JSON.parse(
      localStorage.getItem(personKey("draw.session", userId)) ?? "null",
    );
    expect(record).not.toHaveProperty("kyotoSeika");
  });

  it("brings a sheet in Kyoto Seika Practice Mode back in the mode, whatever of its part a later build can read", async () => {
    const userId = someone();
    new SessionKeeper(userId).start(7, UNDEALT);
    /** The record as a build that wrote `kyotoSeika` differently would have kept it. */
    const keptAs = (kyotoSeika: unknown) =>
      localStorage.setItem(
        personKey("draw.session", userId),
        JSON.stringify({ ticket: 7, elapsedMs: 0, nsfw: false, kyotoSeika }),
      );
    const sent = ({ ja, reading, en }: KyotoSeikaSubject) => ({ ja, reading, en });

    // Each subject needs only what the seal sends of it: a kind or flag this build can't read is let go.
    keptAs({
      subjects: [{ ...WIND, kind: "weather" }, sent(REUNION)],
      picked: [0, 1],
      rolls: 2,
      begun: true,
    });
    expect(await loadKept(userId)).toMatchObject({
      kyotoSeika: { subjects: [sent(WIND), sent(REUNION)], picked: [0, 1], rolls: 2, begun: true },
    });

    // A deal that can't be read at all is dealt again, so the sheet waits for Begin on its own ticket.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const unreadables = [
      { subjects: [{ word: WIND.ja }, REUNION], picked: [0, 1], rolls: 2, begun: true },
      { subjects: FIVE, picked: [1, 1], rolls: 2, begun: false },
      { subjects: FIVE, picked: [0, FIVE.length], rolls: 2, begun: false },
      { subjects: FIVE, picked: [0, 1, 2], rolls: 2, begun: false },
      { subjects: FIVE, picked: [0], rolls: 2, begun: true },
      // No picks, or a die per subject.
      { subjects: [WIND, REUNION], rolls: 2, begun: true },
      { subjects: [WIND, REUNION], picked: [0, 1], rolls: [3, 7], begun: false },
    ];
    for (const unreadable of unreadables) {
      keptAs(unreadable);
      expect(await loadKeptSession(userId)).toMatchObject({ ticket: 7, kyotoSeika: UNDEALT });
    }
    expect(error).toHaveBeenCalledTimes(unreadables.length);
  });

  it("carries a ticket's Kyoto Seika Practice Mode part with it when the drawing isn't read", async () => {
    const userId = someone();
    const part = { subjects: FIVE, picked: [1], rolls: 2, begun: false };
    const record = { ticket: 7, elapsedMs: 0, nsfw: false, kyotoSeika: part };
    localStorage.setItem(personKey("draw.session", userId), JSON.stringify(record));
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("Connection to Indexed Database server lost", "UnknownError");
    });
    expect(await loadKept(userId)).toMatchObject({
      status: "unread",
      ticket: 7,
      kyotoSeika: part,
    });
  });
});

/**
 * Web Locks for the rest of the test, as the keeper asks for them: each request steals the name's
 * lock, so its holder's request rejects with AbortError. Returns the names held.
 */
function fakeLocks() {
  const holders = new Map<string, (error: DOMException) => void>();
  const locks = {
    request: (name: string, _options: { steal: boolean }, granted: () => Promise<void>) =>
      new Promise<void>((resolve, reject) => {
        holders.get(name)?.(new DOMException("The lock was stolen", "AbortError"));
        holders.set(name, reject);
        void granted().then(() => {
          if (holders.get(name) === reject) holders.delete(name);
          resolve();
        });
      }),
  };
  Object.defineProperty(navigator, "locks", { configurable: true, get: () => locks });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, "locks");
  });
  return holders;
}

describe("a drawing kept open in two tabs", () => {
  it("is kept by the tab that picked it up last: the other writes nothing more, says so once, and reloads once shown", async () => {
    const held = fakeLocks();
    const userId = someone();
    const [a, b, c] = ["a", "b", "c"].map(stroke);
    const onKept = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const stale = draw(userId, [a], { onKept });
    const kept = await loadKept(userId);
    if (kept.status !== "found") throw new Error(`The drawing came back ${kept.status}`);
    const inUse = new SessionKeeper(userId);
    inUse.resume(kept.ticket, kept.steps, kept.elapsedMs, kept.nsfw, kept.tools, kept.kyotoSeika);
    await vi.waitFor(() => expect(onKept).toHaveBeenLastCalledWith(false));
    inUse.save([a, b], 2000, FRAME);

    // The stale tab saves as it's hidden, draws on, and seals.
    stale.save([a], 1000, FRAME);
    stale.save([a, c], 3000, FRAME);
    stale.wipe();
    expect(await loadKept(userId)).toMatchObject({
      status: "found",
      steps: [a, b],
      elapsedMs: 2000,
    });
    expect(warn).toHaveBeenCalledOnce();

    document.dispatchEvent(new Event("visibilitychange"));
    expect(reload).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(reload).toHaveBeenCalledOnce();

    // The tab in use lets the lock go once its session is over.
    inUse.wipe();
    await vi.waitFor(() => expect(held.size).toBe(0));
  });
});
