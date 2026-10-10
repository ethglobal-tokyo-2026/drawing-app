import { personKey, parseStored, readStored, writeStored } from "../../ui/deviceStorage";
import { pickedPair, PICKS } from "../../kyoto-seika/deal";
import { KINDS, readDealtSubject, type DealtSubject } from "../../kyoto-seika/subjectList";
import { STRIDE, type Op, type Step } from "../canvas/ops";
import type { SheetFrame } from "../canvas/sheetFrame";

/*
 * The session in progress, kept on this device for the person signed in alone, so a reload doesn't
 * lose it, and wiped once it's over. Its steps live in IndexedDB, one record each, so a stroke writes
 * only itself, beside the frame they're drawn in. The ticket it spent and the time drawn live in
 * localStorage, which lands even as the page unloads, and still reads when the steps can't, so the
 * ticket carries over to the next sheet.
 */

const dbName = (userId: string) => `drawing-session.${userId}`;
/** The store of steps. Renaming it would take a database upgrade. */
const OPS = "ops";
const PROGRESS = "progress";
/** The progress store's records: how many steps are kept, and the frame they were drawn in. */
const PROGRESS_KEY = 0;
const FRAME_KEY = 1;
const recordKey = (userId: string) => personKey("draw.session", userId);
/** A kept drawing whose steps haven't loaded by then carries its ticket over, so Draw never waits on it for good. */
export const LOAD_TIMEOUT_MS = 5_000;

/** How the artist set the size rail, for the brush and for the eraser (0 to 1 along it), and Smoothing (0 to 100). */
export interface KeptTools {
  brushSize: number;
  eraserSize: number;
  smoothing: number;
}

/**
 * The Kyoto Seika Practice Mode part of the record: present exactly when its ticket was spent in that
 * mode, so the sheet keeps its mode whatever of the part a later build can read.
 */
export interface KeptKyotoSeika {
  /**
   * Null until the list loads and deals: then one subject of each kind, until Begin keeps only the
   * picked pair. Whole list entries, so a later build's list can't lose them.
   */
  subjects: readonly DealtSubject[] | null;
  /** The places in `subjects` picked, in the order picked; Begin's pair is [0, 1]. */
  picked: readonly number[];
  /** The die's rolls; at CHARRED_AT_ROLL it's charred. */
  rolls: number;
  /** Begin locked the pair in, and started the clock. */
  begun: boolean;
}

/** A sheet in Kyoto Seika Practice Mode before the list deals. */
export const UNDEALT: KeptKyotoSeika = { subjects: null, picked: [], rolls: 0, begun: false };

/** The ticket use the session spent (the server's id), the time drawn, 18+, and the tools' settings. */
interface SessionRecord {
  ticket: number;
  elapsedMs: number;
  /** The seal sheet's 18+ switch was left on: it seals as an NSFW sticker. */
  nsfw: boolean;
  /** Absent when what's kept holds none, or none that can be read: the drawing still comes back. */
  tools?: KeptTools;
  /** Null exactly for a ticket spent outside Kyoto Seika Practice Mode. */
  kyotoSeika: KeptKyotoSeika | null;
}

/** What's kept of a drawing that was in progress. */
export type KeptDrawing =
  /** `frame` is null for a drawing kept without one: it was drawn on this device's own sheet. */
  | ({ status: "found"; steps: Step[]; frame: SheetFrame | null } & SessionRecord)
  /** What's kept of it can't be read back. */
  | { status: "lost"; ticket: number | null; kyotoSeika: KeptKyotoSeika | null; error: unknown }
  /**
   * Its steps weren't read: IndexedDB failed, or hadn't answered in time, and then `later` is what the
   * read still finds. Nothing kept is cleared, since the drawing may still be there.
   */
  | {
      status: "unread";
      ticket: number;
      kyotoSeika: KeptKyotoSeika | null;
      error: unknown;
      later: Promise<KeptDrawing> | null;
    };

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
      // Another tab upgrading or deleting the database waits on every connection to it.
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

/** Where a save starts writing: the first step that isn't the one written there last. */
export function firstChanged(written: readonly Step[], steps: readonly Step[]): number {
  let i = 0;
  while (i < written.length && i < steps.length && written[i] === steps[i]) i++;
  return i;
}

/** The color a kept drawing was last drawn in, which it picks back up in; null when nothing was drawn. */
export function keptColor(steps: readonly Step[]): string | null {
  // The eraser draws in no color, nor does a clear.
  const drawn = steps.findLast((step): step is Op => step.tool === "brush" || step.tool === "fill");
  return drawn?.color ?? null;
}

/** Keeps the session in progress on this device, for the person signed in, as it changes. */
export class SessionKeeper {
  private readonly userId: string;
  private readonly onKept: (kept: boolean) => void;
  private ticket: number | null = null;
  private nsfw = false;
  private kyotoSeika: KeptKyotoSeika | null = null;
  private elapsedMs = 0;
  /** The tools as the artist last set them: they outlast a sheet, so a new session keeps them too. */
  private tools: KeptTools | undefined;
  /** The steps as last written, by reference; null when a write failed and what landed is unknown. */
  private written: readonly Step[] | null = [];
  /** Whether the last record written landed. */
  private recordKept = true;
  /** Whether the steps kept are the session's; after a failed write, not until one writing every step lands. */
  private stepsKept = true;
  private kept = true;
  /** A stretch of failed writes is logged once. */
  private reported = false;
  /** Set by `carry`: what's kept is the unread drawing's, untouched until this sheet is drawn on. */
  private carried = false;

  /** `onKept` hears whether the session is kept on this device, each time that changes. */
  constructor(userId: string, onKept: (kept: boolean) => void = () => {}) {
    this.userId = userId;
    this.onKept = onKept;
  }

  /** A new session: the ticket it spent, its Kyoto Seika Practice Mode part if any, and nothing drawn yet. */
  start(ticket: number | null, kyotoSeika: KeptKyotoSeika | null = null): void {
    this.ticket = ticket;
    this.nsfw = false;
    this.kyotoSeika = kyotoSeika;
    this.elapsedMs = 0;
    this.written = [];
    this.carried = false;
    this.keepRecord();
    this.write(true, (ops, progress) => {
      clearStores(ops, progress);
      progress.put(0, PROGRESS_KEY);
    });
  }

  /** A session picked back up after a reload, whose steps are already kept. */
  resume(
    ticket: number,
    steps: readonly Step[],
    elapsedMs: number,
    nsfw: boolean,
    tools: KeptTools | undefined,
    kyotoSeika: KeptKyotoSeika | null,
  ): void {
    this.ticket = ticket;
    this.elapsedMs = elapsedMs;
    this.nsfw = nsfw;
    this.kyotoSeika = kyotoSeika;
    this.tools = tools ?? this.tools;
    this.written = [...steps];
    this.carried = false;
  }

  /**
   * A session whose kept drawing couldn't be read yet: its ticket goes on to a fresh sheet, and what's
   * kept stays as it is until that sheet is drawn on, so a later read can still pick the drawing up.
   */
  carry(ticket: number, kyotoSeika: KeptKyotoSeika | null): void {
    this.ticket = ticket;
    this.nsfw = false;
    this.kyotoSeika = kyotoSeika;
    this.elapsedMs = 0;
    // The steps kept are the unread drawing's, so the first save writes every step.
    this.written = null;
    this.carried = true;
  }

  /** Keeps the 18+ mark; on a carried session's blank sheet, it waits for the first save. */
  keepNsfw(nsfw: boolean): void {
    this.nsfw = nsfw;
    if (!this.carried) this.keepRecord();
  }

  /** Keeps the deal, the picks, the rolls and Begin; on a carried session's blank sheet, it waits for the first save. */
  keepKyotoSeika(kyotoSeika: KeptKyotoSeika): void {
    this.kyotoSeika = kyotoSeika;
    if (!this.carried) this.keepRecord();
  }

  /**
   * Keeps how the tools are set, with the session once there is one. Before that, or on a carried
   * session's blank sheet, it only remembers them: what's kept from before a reload mustn't change
   * until the screen draws.
   */
  keepTools(tools: KeptTools): void {
    this.tools = tools;
    if (this.ticket !== null && !this.carried) this.keepRecord();
  }

  /** Keeps the time drawn, the steps changed since the last save, and the frame they're in. */
  save(steps: readonly Step[], elapsedMs: number, frame: SheetFrame | null): void {
    this.elapsedMs = elapsedMs;
    this.carried = false;
    this.keepRecord();
    const written = this.written;
    const from = written ? firstChanged(written, steps) : 0;
    if (written && from === steps.length && steps.length === written.length) return;
    this.written = [...steps];
    this.write(from === 0, (stepStore, progressStore) => {
      for (let i = from; i < steps.length; i++) stepStore.put(steps[i], i);
      progressStore.put(steps.length, PROGRESS_KEY);
      if (frame) progressStore.put(frame, FRAME_KEY);
    });
  }

  /** Nothing is in progress any more. */
  wipe(): void {
    this.carried = false;
    this.ticket = null;
    this.nsfw = false;
    this.kyotoSeika = null;
    this.elapsedMs = 0;
    this.written = [];
    removeRecord(this.userId);
    this.recordKept = true;
    this.write(true, clearStores);
  }

  private keepRecord(): void {
    // A session with no ticket can't be sealed, so none is kept.
    if (this.ticket === null) removeRecord(this.userId);
    else
      this.recordKept = writeRecord(this.userId, {
        ticket: this.ticket,
        elapsedMs: this.elapsedMs,
        nsfw: this.nsfw,
        ...(this.tools && { tools: this.tools }),
        ...(this.kyotoSeika && { kyotoSeika: this.kyotoSeika }),
      });
    this.changed();
  }

  /** `whole`: it writes every step, so once it lands the steps kept are the session's again. */
  private write(
    whole: boolean,
    fill: (ops: IDBObjectStore, progress: IDBObjectStore) => void,
  ): void {
    transact(this.userId, "readwrite", fill).then(
      () => {
        if (whole) this.stepsKept = true;
        this.changed();
      },
      (error: unknown) => {
        // It can't tell which of the steps landed, so the next save writes them all.
        this.written = null;
        this.stepsKept = false;
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
    const kept = this.recordKept && this.stepsKept;
    if (kept === this.kept) return;
    this.kept = kept;
    if (kept) this.reported = false;
    this.onKept(kept);
  }
}

/**
 * Whether this device keeps a session in progress for `userId`, from its record alone: a read the
 * board can make at once, before the drawing screen has loaded the drawing.
 */
export function keepsSession(userId: string): boolean {
  const { text } = readStored(
    recordKey(userId),
    "Can't tell whether a drawing was in progress on this device",
  );
  return text !== null;
}

/** The session kept for `userId` from before a reload, if a drawing was in progress. */
export async function loadKeptSession(userId: string): Promise<KeptSession> {
  const record = readRecord(userId);
  if (record === null) return { status: "none" };
  if (record === "unreadable")
    return {
      status: "lost",
      ticket: null,
      kyotoSeika: null,
      error: new Error("Its record is unreadable"),
    };
  const read = readDrawing(userId).then(
    ({ steps, frame }): KeptDrawing => ({ status: "found", steps, frame, ...record }),
    (error: unknown): KeptDrawing =>
      error instanceof UnreadableDrawing
        ? { status: "lost", ticket: record.ticket, kyotoSeika: record.kyotoSeika, error }
        : {
            status: "unread",
            ticket: record.ticket,
            kyotoSeika: record.kyotoSeika,
            error,
            later: null,
          },
  );
  return within(read, LOAD_TIMEOUT_MS, () => ({
    status: "unread",
    ticket: record.ticket,
    kyotoSeika: record.kyotoSeika,
    error: new Error(`Its steps didn't load within ${LOAD_TIMEOUT_MS / 1000}s`),
    later: read,
  }));
}

async function readDrawing(userId: string): Promise<{ steps: Step[]; frame: SheetFrame | null }> {
  let stored: unknown[] = [];
  let count: unknown;
  let frame: unknown;
  await transact(userId, "readonly", (stepStore, progressStore) => {
    const all = stepStore.getAll();
    all.onsuccess = () => {
      stored = all.result;
    };
    const one = progressStore.get(PROGRESS_KEY);
    one.onsuccess = () => {
      count = one.result;
    };
    const drawnIn = progressStore.get(FRAME_KEY);
    drawnIn.onsuccess = () => {
      frame = drawnIn.result;
    };
  });
  if (!isCount(count))
    throw new UnreadableDrawing(
      count === undefined ? "No steps were kept" : "Its step count is unreadable",
    );
  if (stored.length < count)
    throw new UnreadableDrawing(`${count - stored.length} of its ${count} steps are missing`);
  const steps: Step[] = [];
  for (const value of stored.slice(0, count)) {
    const step = readStep(value);
    if (!step) throw new UnreadableDrawing(`Step ${steps.length} is unreadable`);
    steps.push(step);
  }
  return { steps, frame: readFrame(frame) };
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

/** A kept step, or undefined when it can't be read: IndexedDB hands back untyped values. */
function readStep(v: unknown): Step | undefined {
  if (typeof v !== "object" || v === null || !("tool" in v)) return undefined;
  if (v.tool === "clear") return { tool: "clear" };
  if (!("color" in v) || !("T" in v)) return undefined;
  const { color, T, tool } = v;
  if (typeof color !== "string" || !isFiniteNumber(T)) return undefined;
  if (tool === "fill") {
    if (!("x" in v) || !isFiniteNumber(v.x) || !("y" in v) || !isFiniteNumber(v.y))
      return undefined;
    // A fill kept before fills recorded their gap closed none.
    const gap = "gap" in v ? v.gap : 0;
    return isFiniteNumber(gap) && gap >= 0 ? { tool, x: v.x, y: v.y, color, gap, T } : undefined;
  }
  if ((tool !== "brush" && tool !== "eraser") || !("pts" in v) || !Array.isArray(v.pts))
    return undefined;
  const pts: unknown[] = v.pts;
  if (pts.length % STRIDE !== 0 || !pts.every(isFiniteNumber)) return undefined;
  return { tool, color, pts, T };
}

const isPositive = (v: unknown): v is number => isFiniteNumber(v) && v > 0;

/**
 * The frame a kept drawing was drawn in; null when none was kept. One that can't be read is said,
 * and taken as none: the drawing still comes back, on this device's own sheet.
 */
function readFrame(v: unknown): SheetFrame | null {
  if (v === undefined) return null;
  if (typeof v === "object" && v !== null && "w" in v && "h" in v && "density" in v) {
    const { w, h, density } = v;
    if (isPositive(w) && isPositive(h) && isPositive(density)) return { w, h, density };
  }
  console.error("The kept drawing's frame is unreadable, so it opens on this device's sheet:", v);
  return null;
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
  ) {
    const tools = "tools" in value ? readTools(value.tools) : undefined;
    return {
      ticket: value.ticket,
      elapsedMs: value.elapsedMs,
      nsfw: value.nsfw,
      ...(tools && { tools }),
      kyotoSeika: "kyotoSeika" in value ? readKyotoSeika(value.kyotoSeika) : null,
    };
  }
  console.error("The record of the drawing in progress is unreadable:", raw);
  return "unreadable";
}

const isBetween = (v: unknown, min: number, max: number): v is number =>
  isFiniteNumber(v) && v >= min && v <= max;

/**
 * The record's Kyoto Seika Practice Mode part, its subjects read only as far as the seal needs them. One
 * that can't be read is logged and deals again, so its sheet waits for Begin once more.
 */
function readKyotoSeika(v: unknown): KeptKyotoSeika {
  const part = readKyotoSeikaPart(v);
  if (part) return part;
  console.error(
    "The Kyoto Seika Practice Mode part of the drawing in progress is unreadable, so its sheet deals again:",
    v,
  );
  return UNDEALT;
}

/** The places picked in a deal of `dealt` subjects: distinct, inside the deal, and PICKS at most. */
function readPicked(v: unknown, dealt: number): readonly number[] | undefined {
  if (!Array.isArray(v) || v.length > PICKS) return undefined;
  const places: readonly unknown[] = v;
  const picked = places.filter((p): p is number => isCount(p) && p < dealt);
  return picked.length === places.length && new Set(picked).size === picked.length
    ? picked
    : undefined;
}

function readKyotoSeikaPart(v: unknown): KeptKyotoSeika | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  if (!("subjects" in v && "picked" in v && "rolls" in v && "begun" in v)) return undefined;
  const { subjects, rolls, begun } = v;
  if (typeof begun !== "boolean" || !isCount(rolls)) return undefined;
  // Begin locks a pair in, so a sheet without one hasn't begun.
  if (subjects === null) return begun ? undefined : { ...UNDEALT, rolls };
  if (!Array.isArray(subjects) || subjects.length < PICKS || subjects.length > KINDS.length)
    return undefined;
  const entries: readonly unknown[] = subjects;
  const dealt = entries.flatMap((entry) => readDealtSubject(entry) ?? []);
  if (dealt.length !== entries.length) return undefined;
  const picked = readPicked(v.picked, dealt.length);
  if (!picked) return undefined;
  const part = { subjects: dealt, picked, rolls, begun };
  return begun && !pickedPair(part) ? undefined : part;
}

/** The tools' settings a record holds, or undefined when it holds none it can read. */
function readTools(v: unknown): KeptTools | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  if (!("brushSize" in v) || !("eraserSize" in v) || !("smoothing" in v)) return undefined;
  const { brushSize, eraserSize, smoothing } = v;
  return isBetween(brushSize, 0, 1) && isBetween(eraserSize, 0, 1) && isBetween(smoothing, 0, 100)
    ? { brushSize, eraserSize, smoothing }
    : undefined;
}

/** Whether it's written. A regular sheet's record holds no Kyoto Seika Practice Mode part. */
const writeRecord = (
  userId: string,
  record: Omit<SessionRecord, "kyotoSeika"> & { kyotoSeika?: KeptKyotoSeika },
) =>
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
