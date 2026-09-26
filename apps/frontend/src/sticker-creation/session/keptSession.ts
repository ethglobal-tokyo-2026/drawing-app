import { STRIDE, type Op } from "../canvas/ops";

/*
 * The session in progress, kept on this device so a reload doesn't lose it, and wiped once it's
 * over. The ops live in IndexedDB, one record per op, so a stroke writes only itself. The ticket the
 * session spent and the time drawn live in localStorage: it writes at once, where an IndexedDB write
 * started as the page unloads never lands, and it can still be read when the ops can't, so a drawing
 * that can't be picked back up can still carry its ticket over to the next sheet.
 */

const DB_NAME = "drawing-session";
const OPS = "ops";
const PROGRESS = "progress";
/** The progress store holds one record: how many ops are on the sheet. */
const PROGRESS_KEY = 0;
const RECORD_KEY = "draw.session";
/** A kept session that hasn't loaded by then counts as lost, so Draw never waits on it for good. */
const LOAD_TIMEOUT_MS = 5_000;

/** The ticket use the session spent (the server's id), null when none was, and the time drawn. */
interface SessionRecord {
  ticket: number | null;
  elapsedMs: number;
}

export type KeptSession =
  | { status: "none" }
  | { status: "found"; ops: Op[]; elapsedMs: number; ticket: number | null }
  /** A drawing was in progress, but it can't be read back. */
  | { status: "lost"; ticket: number | null; error: unknown };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(OPS);
      req.result.createObjectStore(PROGRESS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((error: unknown) => {
    // Whether the open threw or failed, the next call tries again.
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

/** Runs `fill` in one transaction over both stores; settles when it commits or aborts. */
async function transact(
  mode: IDBTransactionMode,
  fill: (ops: IDBObjectStore, progress: IDBObjectStore) => void,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([OPS, PROGRESS], mode);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("The transaction was aborted"));
    try {
      fill(tx.objectStore(OPS), tx.objectStore(PROGRESS));
    } catch (error) {
      // An op that couldn't be written mustn't leave the others committed without it.
      tx.abort();
      throw error;
    }
  });
}

const clearStores = (ops: IDBObjectStore, progress: IDBObjectStore) => {
  ops.clear();
  progress.clear();
};

/** Where a save starts writing: the first op that isn't the one written there last. */
export function firstChanged(written: readonly Op[], ops: readonly Op[]): number {
  let i = 0;
  while (i < written.length && i < ops.length && written[i] === ops[i]) i++;
  return i;
}

/** Keeps the session in progress on this device as it changes. */
export class SessionKeeper {
  private ticket: number | null = null;
  /** The ops as last written, by reference; null when a write failed and what landed is unknown. */
  private written: readonly Op[] | null = [];
  private reported = false;

  /** A new session: the ticket it spent, and nothing drawn yet. */
  start(ticket: number | null): void {
    this.ticket = ticket;
    this.written = [];
    writeRecord({ ticket, elapsedMs: 0 });
    this.write(
      transact("readwrite", (ops, progress) => {
        clearStores(ops, progress);
        progress.put(0, PROGRESS_KEY);
      }),
    );
  }

  /** A session picked back up after a reload, whose ops are already kept. */
  resume(ticket: number | null, ops: readonly Op[]): void {
    this.ticket = ticket;
    this.written = [...ops];
  }

  /** Keeps the time drawn, and any ops that changed since the last save. */
  save(ops: readonly Op[], elapsedMs: number): void {
    writeRecord({ ticket: this.ticket, elapsedMs });
    const written = this.written;
    const from = written ? firstChanged(written, ops) : 0;
    if (written && from === ops.length && ops.length === written.length) return;
    this.written = [...ops];
    this.write(
      transact("readwrite", (opStore, progressStore) => {
        for (let i = from; i < ops.length; i++) opStore.put(ops[i], i);
        progressStore.put(ops.length, PROGRESS_KEY);
      }),
    );
  }

  /** Nothing is in progress any more. */
  wipe(): void {
    this.ticket = null;
    this.written = [];
    removeRecord();
    this.write(transact("readwrite", clearStores));
  }

  private write(done: Promise<void>): void {
    done.catch((error: unknown) => {
      // It can't tell which of the ops landed, so the next save writes them all.
      this.written = null;
      if (this.reported) return;
      this.reported = true;
      console.error(
        "The drawing in progress can't be kept on this device; a reload loses it",
        error,
      );
    });
  }
}

/** The session kept from before a reload, if a drawing was in progress. */
export async function loadKeptSession(): Promise<KeptSession> {
  const record = readRecord();
  if (record === null) return { status: "none" };
  if (record === "unreadable")
    return { status: "lost", ticket: null, error: new Error("Its record is unreadable") };
  try {
    const ops = await withTimeout(readOps(), LOAD_TIMEOUT_MS);
    return { status: "found", ops, elapsedMs: record.elapsedMs, ticket: record.ticket };
  } catch (error) {
    return { status: "lost", ticket: record.ticket, error };
  }
}

async function readOps(): Promise<Op[]> {
  let stored: unknown[] = [];
  let count: unknown;
  await transact("readonly", (opStore, progressStore) => {
    const all = opStore.getAll();
    all.onsuccess = () => {
      stored = all.result;
    };
    const one = progressStore.get(PROGRESS_KEY);
    one.onsuccess = () => {
      count = one.result;
    };
  });
  if (!isCount(count))
    throw new Error(count === undefined ? "No ops were kept" : "Its op count is unreadable");
  if (stored.length < count)
    throw new Error(`${count - stored.length} of its ${count} ops are missing`);
  const ops: Op[] = [];
  for (const value of stored.slice(0, count)) {
    const op = readOp(value);
    if (!op) throw new Error(`Op ${ops.length} is unreadable`);
    ops.push(op);
  }
  return ops;
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`It didn't load within ${ms / 1000}s`)), ms);
    work.then(resolve, reject).finally(() => clearTimeout(id));
  });
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isCount = (v: unknown): v is number => isFiniteNumber(v) && Number.isInteger(v) && v >= 0;

/** A kept op, or undefined when it can't be read: IndexedDB hands back untyped values. */
function readOp(v: unknown): Op | undefined {
  if (typeof v !== "object" || v === null || !("color" in v) || !("T" in v) || !("tool" in v))
    return undefined;
  const { color, T, tool } = v;
  if (typeof color !== "string" || !isFiniteNumber(T)) return undefined;
  if (tool === "fill")
    return "x" in v && isFiniteNumber(v.x) && "y" in v && isFiniteNumber(v.y)
      ? { tool, x: v.x, y: v.y, color, T }
      : undefined;
  if ((tool !== "brush" && tool !== "eraser") || !("pts" in v) || !Array.isArray(v.pts))
    return undefined;
  const pts: unknown[] = v.pts;
  if (pts.length % STRIDE !== 0 || !pts.every(isFiniteNumber)) return undefined;
  return { tool, color, pts, T };
}

const isTicketUseId = (v: unknown): v is number =>
  Number.isInteger(v) && typeof v === "number" && v > 0;

/** Null when no drawing is in progress. */
function readRecord(): SessionRecord | "unreadable" | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RECORD_KEY);
  } catch (error) {
    console.error("Can't tell whether a drawing was in progress on this device", error);
    return null;
  }
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "ticket" in value &&
    (value.ticket === null || isTicketUseId(value.ticket)) &&
    "elapsedMs" in value &&
    isFiniteNumber(value.elapsedMs)
  )
    return { ticket: value.ticket, elapsedMs: value.elapsedMs };
  console.error("The record of the drawing in progress is unreadable:", raw);
  return "unreadable";
}

function writeRecord(record: SessionRecord): void {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch (error) {
    console.error("Can't note the drawing in progress on this device; a reload loses it", error);
  }
}

function removeRecord(): void {
  try {
    localStorage.removeItem(RECORD_KEY);
  } catch (error) {
    console.error("Can't clear the note of the drawing in progress on this device", error);
  }
}
