import { personKey, parseStored, readStored, writeStored } from "../../ui/deviceStorage";
import { STRIDE, type Op } from "../canvas/ops";

/*
 * The session in progress, kept on this device for the person signed in, so a reload doesn't lose it,
 * and wiped once it's over or they log out. Each person's is their own: someone else signing in on
 * this device never gets it, and theirs leaves it be. The ops live in IndexedDB, one record per op, so
 * a stroke writes only itself. The ticket the session spent and the time drawn live in localStorage:
 * it writes at once, where an IndexedDB write started as the page unloads never lands, and it can
 * still be read when the ops can't, so a drawing that can't be picked back up can still carry its
 * ticket over to the next sheet.
 */

const dbName = (userId: string) => `drawing-session.${userId}`;
const OPS = "ops";
const PROGRESS = "progress";
/** The progress store holds one record: how many ops are on the sheet. */
const PROGRESS_KEY = 0;
const recordKey = (userId: string) => personKey("draw.session", userId);
/** A kept drawing whose ops haven't loaded by then carries its ticket over, so Draw never waits on it for good. */
export const LOAD_TIMEOUT_MS = 5_000;
/** Logging out waits this long for the kept drawing to go, then goes ahead. */
const FORGET_TIMEOUT_MS = 5_000;

/** The ticket use the session spent (the server's id), the time drawn, and 18+. */
interface SessionRecord {
  ticket: number;
  elapsedMs: number;
  /** The 18+ switch: it seals as an NSFW sticker. */
  nsfw: boolean;
}

/** What's kept of a drawing that was in progress. */
export type KeptDrawing =
  | ({ status: "found"; ops: Op[] } & SessionRecord)
  /** What's kept of it can't be read back. */
  | { status: "lost"; ticket: number | null; error: unknown }
  /**
   * Its ops weren't read: IndexedDB failed, or hadn't answered in time, and then `later` is what the
   * read still finds. Nothing kept is cleared, since the drawing may still be there.
   */
  | { status: "unread"; ticket: number; error: unknown; later: Promise<KeptDrawing> | null };

export type KeptSession = { status: "none" } | KeptDrawing;

/** What's kept can't be a drawing: the read itself worked. */
class UnreadableDrawing extends Error {}

/** Open connections by database. One the browser closes is dropped, so the next write opens another. */
const connections = new Map<string, Promise<IDBDatabase>>();

function dropConnection(name: string, connection: Promise<IDBDatabase>): void {
  if (connections.get(name) === connection) connections.delete(name);
}

function openDb(name: string): Promise<IDBDatabase> {
  const open = connections.get(name);
  if (open) return open;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(OPS);
      req.result.createObjectStore(PROGRESS);
    };
    req.onsuccess = () => {
      const db = req.result;
      // WebKit closes it when its IndexedDB server goes, as it can while LINE is in the background.
      db.onclose = () => dropConnection(name, opening);
      // Logging out deletes the database, which waits on every connection to it.
      db.onversionchange = () => {
        db.close();
        dropConnection(name, opening);
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  connections.set(name, opening);
  // Whether the open threw or failed, the next call tries again.
  opening.catch(() => dropConnection(name, opening));
  return opening;
}

/**
 * Runs `fill` in one transaction over `userId`'s stores, on a connection opened again if the browser
 * closed the last one; settles when it commits or aborts.
 */
async function transact(
  userId: string,
  mode: IDBTransactionMode,
  fill: (ops: IDBObjectStore, progress: IDBObjectStore) => void,
): Promise<void> {
  const name = dbName(userId);
  const connection = openDb(name);
  const db = await connection;
  let tx: IDBTransaction;
  try {
    tx = db.transaction([OPS, PROGRESS], mode);
  } catch (error) {
    // A connection closed without a close event refuses new transactions.
    if (!(error instanceof DOMException) || error.name !== "InvalidStateError") throw error;
    dropConnection(name, connection);
    tx = (await openDb(name)).transaction([OPS, PROGRESS], mode);
  }
  await new Promise<void>((resolve, reject) => {
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

/** The color a kept drawing was last drawn in, which it picks back up in; null when nothing was drawn. */
export function keptColor(ops: readonly Op[]): string | null {
  return ops.findLast((op) => op.tool !== "eraser")?.color ?? null;
}

/** Keeps the session in progress on this device, for the person signed in, as it changes. */
export class SessionKeeper {
  private readonly userId: string;
  private readonly onKept: (kept: boolean) => void;
  private ticket: number | null = null;
  private nsfw = false;
  private elapsedMs = 0;
  /** The ops as last written, by reference; null when a write failed and what landed is unknown. */
  private written: readonly Op[] | null = [];
  /** Whether the last record written landed. */
  private recordKept = true;
  /** Whether the ops kept are the session's; after a failed write, not until one writing every op lands. */
  private opsKept = true;
  private kept = true;
  /** A stretch of failed writes is logged once. */
  private reported = false;

  /** `onKept` hears whether the session is kept on this device, each time that changes. */
  constructor(userId: string, onKept: (kept: boolean) => void = () => {}) {
    this.userId = userId;
    this.onKept = onKept;
  }

  /** A new session: the ticket it spent, and nothing drawn yet. */
  start(ticket: number | null): void {
    this.ticket = ticket;
    this.nsfw = false;
    this.elapsedMs = 0;
    this.written = [];
    this.keepRecord();
    this.write(
      true,
      transact(this.userId, "readwrite", (ops, progress) => {
        clearStores(ops, progress);
        progress.put(0, PROGRESS_KEY);
      }),
    );
  }

  /** A session picked back up after a reload, whose ops are already kept. */
  resume(ticket: number, ops: readonly Op[], elapsedMs: number, nsfw: boolean): void {
    this.ticket = ticket;
    this.elapsedMs = elapsedMs;
    this.nsfw = nsfw;
    this.written = [...ops];
  }

  /**
   * A session whose kept drawing couldn't be read yet: its ticket goes on to a fresh sheet, and what's
   * kept stays as it is until that sheet is drawn on, so a later read can still pick the drawing up.
   */
  carry(ticket: number): void {
    this.ticket = ticket;
    this.nsfw = false;
    this.elapsedMs = 0;
    // The ops kept are the unread drawing's, so the first save writes every op.
    this.written = null;
  }

  /** Keeps the 18+ switch. */
  keepNsfw(nsfw: boolean): void {
    this.nsfw = nsfw;
    this.keepRecord();
  }

  /** Keeps the time drawn, and any ops that changed since the last save. */
  save(ops: readonly Op[], elapsedMs: number): void {
    this.elapsedMs = elapsedMs;
    this.keepRecord();
    const written = this.written;
    const from = written ? firstChanged(written, ops) : 0;
    if (written && from === ops.length && ops.length === written.length) return;
    this.written = [...ops];
    this.write(
      from === 0,
      transact(this.userId, "readwrite", (opStore, progressStore) => {
        for (let i = from; i < ops.length; i++) opStore.put(ops[i], i);
        progressStore.put(ops.length, PROGRESS_KEY);
      }),
    );
  }

  /** Nothing is in progress any more. */
  wipe(): void {
    this.ticket = null;
    this.nsfw = false;
    this.elapsedMs = 0;
    this.written = [];
    removeRecord(this.userId);
    this.recordKept = true;
    this.write(true, transact(this.userId, "readwrite", clearStores));
  }

  private keepRecord(): void {
    // A session with no ticket can't be sealed, so none is kept.
    if (this.ticket === null) removeRecord(this.userId);
    else
      this.recordKept = writeRecord(this.userId, {
        ticket: this.ticket,
        elapsedMs: this.elapsedMs,
        nsfw: this.nsfw,
      });
    this.changed();
  }

  /** `whole`: it writes every op, so once it lands the ops kept are the session's again. */
  private write(whole: boolean, done: Promise<void>): void {
    done.then(
      () => {
        if (whole) this.opsKept = true;
        this.changed();
      },
      (error: unknown) => {
        // It can't tell which of the ops landed, so the next save writes them all.
        this.written = null;
        this.opsKept = false;
        this.changed();
        if (this.reported) return;
        this.reported = true;
        console.error(
          "The drawing in progress can't be kept on this device; a reload loses it",
          error,
        );
      },
    );
  }

  private changed(): void {
    const kept = this.recordKept && this.opsKept;
    if (kept === this.kept) return;
    this.kept = kept;
    if (kept) this.reported = false;
    this.onKept(kept);
  }
}

/** The session kept for `userId` from before a reload, if a drawing was in progress. */
export async function loadKeptSession(userId: string): Promise<KeptSession> {
  const record = readRecord(userId);
  if (record === null) return { status: "none" };
  if (record === "unreadable")
    return { status: "lost", ticket: null, error: new Error("Its record is unreadable") };
  const read = readOps(userId).then(
    (ops): KeptDrawing => ({ status: "found", ops, ...record }),
    (error: unknown): KeptDrawing =>
      error instanceof UnreadableDrawing
        ? { status: "lost", ticket: record.ticket, error }
        : { status: "unread", ticket: record.ticket, error, later: null },
  );
  return within(read, LOAD_TIMEOUT_MS, () => ({
    status: "unread",
    ticket: record.ticket,
    error: new Error(`Its ops didn't load within ${LOAD_TIMEOUT_MS / 1000}s`),
    later: read,
  }));
}

/**
 * Forgets `userId`'s kept session, as logging out does, so a browser handed to someone else holds
 * none of it. It never rejects: a failure is logged, and the kept ops can't be picked up without the
 * record, which goes first.
 */
export async function forgetKeptSession(userId: string): Promise<void> {
  removeRecord(userId);
  const name = dbName(userId);
  const deleted = new Promise<string | null>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve(null);
    req.onerror = () =>
      resolve(`it couldn't be deleted: ${req.error?.message ?? "no reason given"}`);
  }).catch((error: unknown) => `it couldn't be deleted: ${String(error)}`);
  const problem = await within(
    deleted,
    FORGET_TIMEOUT_MS,
    () => `it wasn't deleted within ${FORGET_TIMEOUT_MS / 1000}s`,
  );
  if (problem) console.error(`The drawing kept on this device may stay here: ${problem}`);
}

async function readOps(userId: string): Promise<Op[]> {
  let stored: unknown[] = [];
  let count: unknown;
  await transact(userId, "readonly", (opStore, progressStore) => {
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
    throw new UnreadableDrawing(
      count === undefined ? "No ops were kept" : "Its op count is unreadable",
    );
  if (stored.length < count)
    throw new UnreadableDrawing(`${count - stored.length} of its ${count} ops are missing`);
  const ops: Op[] = [];
  for (const value of stored.slice(0, count)) {
    const op = readOp(value);
    if (!op) throw new UnreadableDrawing(`Op ${ops.length} is unreadable`);
    ops.push(op);
  }
  return ops;
}

/** `work`'s result, or `late()`'s once `ms` pass without one. `work` must not reject. */
function within<T>(work: Promise<T>, ms: number, late: () => T): Promise<T> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(late()), ms);
    void work.then((result) => {
      clearTimeout(id);
      resolve(result);
    });
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
function readRecord(userId: string): SessionRecord | "unreadable" | null {
  const { text: raw } = readStored(
    recordKey(userId),
    "Can't tell whether a drawing was in progress on this device",
  );
  if (raw === null) return null;
  const value = parseStored(raw);
  if (
    typeof value === "object" &&
    value !== null &&
    "ticket" in value &&
    isTicketUseId(value.ticket) &&
    "elapsedMs" in value &&
    isFiniteNumber(value.elapsedMs) &&
    "nsfw" in value &&
    typeof value.nsfw === "boolean"
  )
    return { ticket: value.ticket, elapsedMs: value.elapsedMs, nsfw: value.nsfw };
  console.error("The record of the drawing in progress is unreadable:", raw);
  return "unreadable";
}

/** Whether it's written. */
const writeRecord = (userId: string, record: SessionRecord) =>
  writeStored(
    recordKey(userId),
    JSON.stringify(record),
    "Can't note the drawing in progress on this device; a reload loses it",
  );

const removeRecord = (userId: string) =>
  writeStored(
    recordKey(userId),
    null,
    "Can't clear the note of the drawing in progress on this device",
  );
