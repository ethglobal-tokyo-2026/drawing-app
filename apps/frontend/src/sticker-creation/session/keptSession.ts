import { timeOurWork } from "../../performance/performanceRecorder";
import { personKey, parseStored, readStored, writeStored } from "../../ui/deviceStorage";
import { pickedPair, PICKS } from "../../kyoto-seika/deal";
import { KINDS, readDealtSubject, type DealtSubject } from "../../kyoto-seika/subjectList";
import { STRIDE, type FillReference, type LayerId, type Op, type Step } from "../canvas/ops";
import type { SheetFrame } from "../canvas/sheetFrame";
import { FIRST_LAYER, LayerStepError, stateAt } from "../layers/layerState";

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
const IDENTITY_KEY = 2;

export interface KeptIdentity {
  ticket: number;
  generation: string;
}
const recordKey = (userId: string) => personKey("draw.session", userId);
/** A kept drawing whose steps haven't loaded by then carries its ticket over, so Draw never waits on it for good. */
export const LOAD_TIMEOUT_MS = 5_000;
/**
 * A write unanswered this long counts as failed: a healthy one lands in milliseconds, and a reload
 * gives the read no longer, so it wouldn't bring the drawing back either.
 */
export const WRITE_TIMEOUT_MS = 5_000;
/** The keeper's writes as the performance recorder's report names them. */
export const SAVE_WORK = "kept drawing save";

/** What a write makes the stores hold. */
interface PendingWrite {
  identity: KeptIdentity | null;
  /** Start or wipe: the stores are emptied first. */
  clear: boolean;
  /** The latest save's steps, read as the write starts; null when it only empties the stores. */
  steps: readonly Step[] | null;
  frame: SheetFrame | null;
}

/** The remembered Fill reference, brush and eraser sizes (0 to 1), and Smoothing (0 to 100). */
export interface KeptTools {
  fillReference: FillReference;
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

/** The ticket use the session spent (the server's id), the time drawn, 18+, the layer, and the tools' settings. */
interface SessionRecord extends KeptIdentity {
  elapsedMs: number;
  /** The seal sheet's 18+ switch was left on: it seals as an NSFW sticker. */
  nsfw: boolean;
  /** The layer being drawn on; the first layer when the record holds none that can be read. */
  currentLayer: LayerId;
  /** Absent when what's kept holds none, or none that can be read: the drawing still comes back. */
  tools?: KeptTools;
  /** Null exactly for a ticket spent outside Kyoto Seika Practice Mode. */
  kyotoSeika: KeptKyotoSeika | null;
}

/** Old records remain readable without assigning their ink to a generation. */
type LegacySessionRecord = Omit<SessionRecord, "generation"> & { generation: null };

/** What's kept of a drawing that was in progress. */
export type KeptDrawing =
  /** `frame` is null for a drawing kept without one: it was drawn on this device's own sheet. */
  | ({ status: "found"; steps: Step[]; frame: SheetFrame | null } & SessionRecord)
  | {
      status: "unverified";
      ticket: number | null;
      kyotoSeika: KeptKyotoSeika | null;
      reason: "legacy" | "identity-mismatch" | "metadata-unavailable" | "upgrade-failed";
      recovery: { steps: Step[]; frame: SheetFrame | null } | null;
      error: unknown;
    }
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

/** An upgrade failure requires explicit recovery; never carry its ticket to a blank replacement. */
class DrawingUpgradeFailed extends Error {}

/** Open connections by database. One the browser closes is dropped, so the next write opens another. */
const connections = new Map<string, Promise<IDBDatabase>>();

function dropConnection(name: string, connection: Promise<IDBDatabase>): void {
  if (connections.get(name) === connection) connections.delete(name);
}

function openDb(name: string): Promise<IDBDatabase> {
  const open = connections.get(name);
  if (open) return open;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    // Merge steps require a version boundary so older tabs cannot reopen and replace their ink.
    const req = indexedDB.open(name, 3);
    let expired = false;
    let upgradeError: unknown;
    let upgrading = false;
    const deadline = setTimeout(() => {
      expired = true;
      req.transaction?.abort();
      reject(
        new DrawingUpgradeFailed(
          "The saved drawing upgrade timed out. Close other Croquis tabs and reload to recover it; its saved data was kept.",
        ),
      );
      // Resolve before the outer read deadline so the persistent recovery reason reaches the screen.
    }, LOAD_TIMEOUT_MS - 100);
    req.onblocked = () => {
      console.error(
        "The saved drawing upgrade is blocked by another Croquis tab. Close other tabs and reload; saved data is kept.",
      );
    };
    req.onupgradeneeded = (event) => {
      upgrading = true;
      const tx = req.transaction;
      if (!tx) return;
      if (expired) {
        tx.abort();
        return;
      }
      if (event.oldVersion === 0) {
        req.result.createObjectStore(OPS);
        req.result.createObjectStore(PROGRESS);
        return;
      }
      // Version 2 already records Fill references; its rows and progress need no conversion.
      if (event.oldVersion >= 2) return;
      const cursor = tx.objectStore(OPS).openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        try {
          const value: unknown = row.value;
          if (
            typeof value === "object" &&
            value !== null &&
            "tool" in value &&
            value.tool === "fill"
          ) {
            const upgraded = "reference" in value ? value : { ...value, reference: "visible" };
            if (!readStep(upgraded))
              throw new Error(
                `Saved Fill at step ${JSON.stringify(row.key)} is invalid. Its original data was kept; reload Croquis to retry recovery.`,
              );
            row.update(upgraded);
          }
          row.continue();
        } catch (error) {
          upgradeError = error;
          tx.abort();
        }
      };
    };
    req.onsuccess = () => {
      clearTimeout(deadline);
      const db = req.result;
      if (expired) {
        db.close();
        return;
      }
      db.onclose = () => dropConnection(name, opening);
      db.onversionchange = () => {
        db.close();
        dropConnection(name, opening);
      };
      resolve(db);
    };
    req.onerror = () => {
      clearTimeout(deadline);
      const cause = upgradeError ?? req.error;
      reject(
        upgrading
          ? new DrawingUpgradeFailed(
              `The saved drawing upgrade failed: ${cause instanceof Error ? cause.message : JSON.stringify(cause)}. Its original data was kept. Close other Croquis tabs and retry or reload Croquis.`,
              { cause },
            )
          : req.error,
      );
    };
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

/** Web Locks, where the browser has them: WebKit before 15.4 and pages outside a secure context don't. */
function webLocks(): LockManager | null {
  // lib.dom types it as always there.
  const locks: LockManager | null | undefined = navigator.locks;
  return locks ?? null;
}

/**
 * Keeps the session in progress on this device, for the person signed in, as it changes. One tab
 * at a time keeps it: the one where it last started, resumed or carried over, which holds a Web Lock
 * named after the database while it keeps a session.
 */
export class SessionKeeper {
  private readonly userId: string;
  private readonly onKept: (kept: boolean) => void;
  private ticket: number | null = null;
  private generation: string | null = null;
  private writtenIdentity: KeptIdentity | null = null;
  private nsfw = false;
  private currentLayer: LayerId = FIRST_LAYER;
  private kyotoSeika: KeptKyotoSeika | null = null;
  private elapsedMs = 0;
  /** The tools as the artist last set them: they outlast a sheet, so a new session keeps them too. */
  private tools: KeptTools | undefined;
  /** What the stores hold as of the last write started, by reference; null when what landed is unknown. */
  private written: readonly Step[] | null = [];
  /** A write is in flight: the next waits for it, so writes land in order and a late answer lets one go. */
  private writing = false;
  /** The next write, which later saves merge into while one is in flight. */
  private pending: PendingWrite | null = null;
  /** Whether the last record written landed. */
  private recordKept = true;
  /** Whether the steps kept are the session's; after a failed write, not until one writing every step lands. */
  private stepsKept = true;
  private kept = true;
  /** A stretch of failed writes is logged once. */
  private reported = false;
  /** Set by `carry`: what's kept is the unread drawing's, untouched until this sheet is drawn on. */
  private carried = false;
  /** From start, resume or carry until wipe; the lock is held while it is. */
  private keeping = false;
  /** Lets go of the Web Lock; null while this keeper holds none. */
  private releaseLock: (() => void) | null = null;
  /** Another tab took the session over, so this one writes nothing more. */
  private takenOver = false;
  /** Calls off the reload a takeover waits to make when the page is next shown. */
  private stopReload: (() => void) | null = null;

  /** `onKept` hears whether the session is kept on this device, each time that changes. */
  constructor(userId: string, onKept: (kept: boolean) => void = () => {}) {
    this.userId = userId;
    this.onKept = onKept;
  }

  /**
   * A new session: the ticket it spent, its Kyoto Seika Practice Mode part if any, and nothing drawn
   * yet. Says whether its record was written: without it, a reload can't tell the ticket was spent.
   */
  start(ticket: number | null, kyotoSeika: KeptKyotoSeika | null = null): boolean {
    this.takeLock();
    this.ticket = ticket;
    this.generation = crypto.randomUUID();
    this.nsfw = false;
    this.currentLayer = FIRST_LAYER;
    this.kyotoSeika = kyotoSeika;
    this.elapsedMs = 0;
    this.carried = false;
    this.keepRecord();
    this.queue({ clear: true, steps: [], frame: null, identity: this.identity() });
    return this.recordKept;
  }

  /** A session picked back up after a reload, whose steps are already kept. */
  resume(
    ticket: number,
    steps: readonly Step[],
    elapsedMs: number,
    nsfw: boolean,
    tools: KeptTools | undefined,
    kyotoSeika: KeptKyotoSeika | null,
    generation: string,
  ): void {
    this.takeLock();
    this.ticket = ticket;
    this.generation = generation;
    this.writtenIdentity = this.identity();
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
    this.takeLock();
    this.ticket = ticket;
    this.nsfw = false;
    this.currentLayer = FIRST_LAYER;
    this.kyotoSeika = kyotoSeika;
    this.elapsedMs = 0;
    // The steps kept are the unread drawing's, so the first save writes every step.
    this.written = null;
    this.generation = null;
    this.carried = true;
  }

  /** Keeps the 18+ mark; on a carried session's blank sheet, it waits for the first save. */
  keepNsfw(nsfw: boolean): void {
    this.nsfw = nsfw;
    if (!this.carried) this.keepRecord();
  }

  /** Keeps the layer being drawn on; on a carried session's blank sheet, it waits for the first save. */
  keepCurrentLayer(layer: LayerId): void {
    this.currentLayer = layer;
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
    if (this.carried) this.generation = crypto.randomUUID();
    this.carried = false;
    this.keepRecord();
    const pending = this.pending;
    this.queue({
      clear: pending?.clear ?? false,
      steps,
      frame: frame ?? pending?.frame ?? null,
      identity: this.identity(),
    });
  }

  /** Nothing is in progress any more. */
  wipe(): void {
    this.carried = false;
    this.ticket = null;
    this.generation = null;
    this.nsfw = false;
    this.currentLayer = FIRST_LAYER;
    this.kyotoSeika = null;
    this.elapsedMs = 0;
    this.keeping = false;
    if (this.takenOver) return;
    removeRecord(this.userId);
    this.recordKept = true;
    this.queue({ clear: true, steps: null, frame: null, identity: null });
  }

  /** Takes the lock from any other tab, unless this keeper holds it. */
  private takeLock(): void {
    this.keeping = true;
    this.stopReload?.();
    this.stopReload = null;
    if (this.takenOver) {
      this.takenOver = false;
      // The other tab wrote since this one last did.
      this.written = null;
      this.changed();
    }
    const locks = webLocks();
    if (this.releaseLock || !locks) return;
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.releaseLock = release;
    void locks
      .request(dbName(this.userId), { steal: true }, () => held)
      .catch((error: unknown) => {
        release();
        if (this.releaseLock !== release) return;
        this.releaseLock = null;
        if (error instanceof DOMException && error.name === "AbortError") this.giveUpToOtherTab();
        else console.error("Can't hold the drawing in progress for this tab alone", error);
      });
  }

  /** Lets the lock go once no session is kept and nothing is left to write. */
  private releaseIfIdle(): void {
    if (this.keeping || this.writing || this.pending) return;
    const release = this.releaseLock;
    this.releaseLock = null;
    release?.();
  }

  /**
   * Another tab stole the lock: this one writes nothing more, says the drawing isn't kept here, and
   * reloads once shown again, so it picks up what that tab keeps.
   */
  private giveUpToOtherTab(): void {
    this.takenOver = true;
    this.pending = null;
    this.changed();
    console.warn(
      "Another tab took over the drawing in progress, so this one keeps nothing more and reloads when it's next shown",
    );
    const onShown = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onShown);
      location.reload();
    };
    document.addEventListener("visibilitychange", onShown);
    this.stopReload = () => document.removeEventListener("visibilitychange", onShown);
  }

  private identity(): KeptIdentity | null {
    return this.ticket !== null && this.generation !== null
      ? { ticket: this.ticket, generation: this.generation }
      : null;
  }

  private keepRecord(): void {
    if (this.takenOver) return;
    // A session with no ticket can't be sealed, so none is kept.
    if (this.ticket === null || this.generation === null) removeRecord(this.userId);
    else
      this.recordKept = writeRecord(this.userId, {
        ticket: this.ticket,
        generation: this.generation,
        elapsedMs: this.elapsedMs,
        nsfw: this.nsfw,
        currentLayer: this.currentLayer,
        ...(this.tools && { tools: this.tools }),
        ...(this.kyotoSeika && { kyotoSeika: this.kyotoSeika }),
      });
    this.changed();
  }

  private queue(next: PendingWrite): void {
    if (this.takenOver) return;
    this.pending = next;
    this.drain();
  }

  /** Starts the pending write, unless one is in flight: then it starts once that one settles. */
  private drain(): void {
    const next = this.pending;
    if (!next || this.writing) return;
    this.pending = null;
    const before = next.clear ? [] : this.written;
    // History hands over its live steps, so the write takes them as they are now.
    const steps = next.steps && [...next.steps];
    const from = steps && before ? firstChanged(before, steps) : 0;
    if (
      steps &&
      before &&
      !next.clear &&
      sameIdentity(next.identity, this.writtenIdentity) &&
      from === steps.length &&
      steps.length === before.length
    )
      return;
    this.written = steps ?? [];
    this.writtenIdentity = next.identity;
    this.writing = true;
    const fill = (stepStore: IDBObjectStore, progress: IDBObjectStore) => {
      // A takeover while this write waited leaves the stores to the other tab.
      if (this.takenOver) throw new Error("Another tab keeps the drawing in progress now");
      timeOurWork(SAVE_WORK, () => {
        if (next.clear) {
          stepStore.clear();
          progress.clear();
        } else if (!before) {
          // What landed is unknown, so every step is written afresh.
          stepStore.clear();
        }
        if (!steps) return;
        for (let i = from; i < steps.length; i++) stepStore.put(steps[i], i);
        // The steps an undo took back since the last write.
        for (let i = steps.length; i < (before?.length ?? 0); i++) stepStore.delete(i);
        progress.put(steps.length, PROGRESS_KEY);
        if (next.identity) progress.put(next.identity, IDENTITY_KEY);
        else progress.delete(IDENTITY_KEY);
        if (next.frame) progress.put(next.frame, FRAME_KEY);
        else progress.delete(FRAME_KEY);
      });
    };
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const judge = () => {
      // A hidden page's writes can be held up with it, so they're judged once it's shown again.
      if (document.visibilityState === "hidden") deadline = setTimeout(judge, WRITE_TIMEOUT_MS);
      else if (!this.takenOver)
        this.failed(new Error(`A write didn't land within ${WRITE_TIMEOUT_MS / 1000}s`));
    };
    deadline = setTimeout(judge, WRITE_TIMEOUT_MS);
    transact(this.userId, "readwrite", fill).then(
      () => {
        clearTimeout(deadline);
        // Every step written: the steps kept are the session's again.
        if (from === 0) this.stepsKept = true;
        this.settled();
      },
      (error: unknown) => {
        clearTimeout(deadline);
        if (!this.takenOver) this.failed(error);
        this.settled();
      },
    );
  }

  /** A write failed, or is past its deadline though it may still land: the next writes every step. */
  private failed(error: unknown): void {
    this.written = null;
    this.writtenIdentity = null;
    this.stepsKept = false;
    this.changed();
    if (this.reported) return;
    this.reported = true;
    console.error("The drawing in progress can't be kept on this device; a reload loses it", error);
  }

  private settled(): void {
    this.writing = false;
    this.changed();
    this.drain();
    this.releaseIfIdle();
  }

  private changed(): void {
    const kept = this.recordKept && this.stepsKept && !this.takenOver;
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
  const { text, blocked } = readStored(
    recordKey(userId),
    "Can't tell whether a drawing was in progress on this device",
  );
  return blocked || text !== null;
}

/** The session kept for `userId` from before a reload, if a drawing was in progress. */
export async function loadKeptSession(userId: string): Promise<KeptSession> {
  const record = readRecord(userId);
  if (record === null || record === "unreadable") {
    const unresolved = (
      error: unknown,
      recovery: Extract<KeptSession, { status: "unverified" }>["recovery"] = null,
    ): KeptSession => {
      console.error(
        "The saved drawing needs explicit recovery because its metadata cannot be verified",
        error,
      );
      return {
        status: "unverified",
        ticket: null,
        kyotoSeika: null,
        reason: error instanceof DrawingUpgradeFailed ? "upgrade-failed" : "metadata-unavailable",
        recovery,
        error,
      };
    };
    const read = readDrawing(userId).then(
      (drawing): KeptSession => {
        // Both successful reads must still describe empty storage; another tab may have started meanwhile.
        if (drawing === null && record === null && readRecord(userId) === null)
          return { status: "none" };
        return unresolved(
          new Error("The saved drawing's metadata is missing or unreadable; its ticket is unknown"),
          drawing && { steps: drawing.steps, frame: drawing.frame },
        );
      },
      (error: unknown) => unresolved(error),
    );
    return within(read, LOAD_TIMEOUT_MS, () =>
      unresolved(
        new Error(
          `Its steps didn't load within ${LOAD_TIMEOUT_MS / 1000}s; retry to read the saved drawing`,
        ),
      ),
    );
  }
  const read = readDrawing(userId).then(
    (drawing): KeptDrawing => {
      if (drawing === null)
        return {
          status: "lost",
          ticket: record.ticket,
          kyotoSeika: record.kyotoSeika,
          error: new UnreadableDrawing("No steps were kept"),
        };
      const { steps, frame, identity } = drawing;
      const { text } = readStored(recordKey(userId), "Cannot recheck the saved drawing identity");
      const current = text === null ? null : parseStored(text);
      const originalIdentity = record.generation === null ? null : record;
      const currentIdentity = readIdentity(current);
      if (
        record.generation !== null &&
        sameIdentity(originalIdentity, identity) &&
        sameIdentity(originalIdentity, currentIdentity)
      )
        return { status: "found", steps, frame, ...record };
      const error = new Error(
        `Saved drawing identity does not match: record ticket ${record.ticket}, generation ${record.generation}; steps ticket ${identity?.ticket ?? "missing"}, generation ${identity?.generation ?? "missing"}; current ticket ${currentIdentity?.ticket ?? "missing"}, generation ${currentIdentity?.generation ?? "missing"}`,
      );
      console.error(
        "The saved drawing needs explicit recovery before its ticket can be reused",
        error,
      );
      return {
        status: "unverified",
        ticket: record.ticket,
        kyotoSeika: record.kyotoSeika,
        reason: record.generation === null ? "legacy" : "identity-mismatch",
        recovery: { steps, frame },
        error,
      };
    },
    (error: unknown): KeptDrawing =>
      error instanceof DrawingUpgradeFailed
        ? {
            status: "unverified",
            ticket: record.ticket,
            kyotoSeika: record.kyotoSeika,
            reason: "upgrade-failed",
            recovery: null,
            error,
          }
        : error instanceof UnreadableDrawing
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

async function readDrawing(
  userId: string,
): Promise<{ steps: Step[]; frame: SheetFrame | null; identity: KeptIdentity | null } | null> {
  let places: IDBValidKey[] = [];
  let stored: unknown[] = [];
  let count: unknown;
  let frame: unknown;
  let identity: unknown;
  await transact(userId, "readonly", (stepStore, progressStore) => {
    const keys = stepStore.getAllKeys();
    keys.onsuccess = () => {
      places = keys.result;
    };
    const all = stepStore.getAll();
    all.onsuccess = () => {
      stored = all.result;
    };
    const one = progressStore.get(PROGRESS_KEY);
    one.onsuccess = () => {
      count = one.result;
    };
    const savedIdentity = progressStore.get(IDENTITY_KEY);
    savedIdentity.onsuccess = () => {
      identity = savedIdentity.result;
    };
    const drawnIn = progressStore.get(FRAME_KEY);
    drawnIn.onsuccess = () => {
      frame = drawnIn.result;
    };
  });
  if (stored.length === 0 && count === undefined && frame === undefined && identity === undefined)
    return null;
  if (!isCount(count))
    throw new UnreadableDrawing(
      count === undefined ? "No steps were kept" : "Its step count is unreadable",
    );
  // Each step is read at its own place, so one missing below the count can't be filled from past it.
  const atPlace = new Map(places.map((place, i): [IDBValidKey, unknown] => [place, stored[i]]));
  const steps: Step[] = [];
  let missing = 0;
  for (let i = 0; i < count; i++) {
    if (!atPlace.has(i)) {
      missing++;
      continue;
    }
    const step = readStep(atPlace.get(i));
    if (!step) throw new UnreadableDrawing(`Step ${i} is unreadable`);
    steps.push(step);
  }
  if (missing > 0) throw new UnreadableDrawing(`${missing} of its ${count} steps are missing`);
  checkLayers(steps);
  return { steps, frame: readFrame(frame), identity: readIdentity(identity) };
}

/** Every step must fit the layers before it: the engine replays them without checking. */
function checkLayers(steps: readonly Step[]): void {
  try {
    stateAt(steps, steps.length);
  } catch (error) {
    if (!(error instanceof LayerStepError)) throw error;
    const where = error.stepIndex === null ? "A step" : `Step ${error.stepIndex}`;
    throw new UnreadableDrawing(`${where} doesn't fit its layers (${error.message})`);
  }
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
const isLayerId = (v: unknown): v is LayerId => isCount(v) && v >= FIRST_LAYER;

/**
 * A kept step, or undefined when it can't be read: IndexedDB hands back untyped values. Only its
 * shape is read here; whether it fits the layers before it is `checkLayers`'s.
 */
function readStep(v: unknown): Step | undefined {
  if (typeof v !== "object" || v === null || !("tool" in v)) return undefined;
  const { tool } = v;
  // Steps kept before layers named no layer, and their clears no time. T 0 is harmless: a
  // single-layer drawing's timelapse starts after its last clear.
  const beforeLayers = !("layer" in v);
  const layer = beforeLayers ? FIRST_LAYER : v.layer;
  const T = "T" in v ? v.T : beforeLayers && tool === "clear" ? 0 : undefined;
  if (!isLayerId(layer) || !isFiniteNumber(T)) return undefined;
  switch (tool) {
    case "brush":
    case "eraser":
    case "fill":
      return readOp(v, tool, layer, T);
    case "add":
      return "at" in v && isFiniteNumber(v.at) ? { tool, layer, at: v.at, T } : undefined;
    case "merge":
      return "into" in v && isLayerId(v.into) ? { tool, layer, into: v.into, T } : undefined;
    case "delete":
    case "clear":
      return { tool, layer, T };
    case "move":
      return "to" in v && isFiniteNumber(v.to) ? { tool, layer, to: v.to, T } : undefined;
    case "opacity":
      return "opacity" in v && isFiniteNumber(v.opacity)
        ? { tool, layer, opacity: v.opacity, T }
        : undefined;
    case "lock":
    case "clip":
      return "on" in v && typeof v.on === "boolean" ? { tool, layer, on: v.on, T } : undefined;
    default:
      return undefined;
  }
}

/** A kept brush stroke, eraser stroke or fill, once its tool, layer and time are read. */
function readOp(v: object, tool: Op["tool"], layer: LayerId, T: number): Op | undefined {
  if (!("color" in v) || typeof v.color !== "string") return undefined;
  const { color } = v;
  if (tool === "fill") {
    if (!("x" in v) || !isFiniteNumber(v.x) || !("y" in v) || !isFiniteNumber(v.y))
      return undefined;
    if (!("gap" in v) || !isFiniteNumber(v.gap) || v.gap < 0) return undefined;
    if (!("reference" in v) || (v.reference !== "layer" && v.reference !== "visible"))
      return undefined;
    return { tool, layer, x: v.x, y: v.y, color, gap: v.gap, reference: v.reference, T };
  }
  if (!("pts" in v) || !Array.isArray(v.pts)) return undefined;
  const pts: unknown[] = v.pts;
  if (pts.length % STRIDE !== 0 || !pts.every(isFiniteNumber)) return undefined;
  return { tool, layer, color, pts, T };
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

function sameIdentity(a: KeptIdentity | null, b: KeptIdentity | null): boolean {
  return a !== null && b !== null && a.ticket === b.ticket && a.generation === b.generation;
}

function readIdentity(value: unknown): KeptIdentity | null {
  if (value === undefined) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "ticket" in value &&
    isTicketUseId(value.ticket) &&
    "generation" in value &&
    typeof value.generation === "string" &&
    value.generation.length > 0
  )
    return { ticket: value.ticket, generation: value.generation };
  console.error("The saved drawing identity is invalid; its readable steps need explicit recovery");
  return null;
}

/** Null when no drawing is in progress. */
function readRecord(userId: string): SessionRecord | LegacySessionRecord | "unreadable" | null {
  const { text: raw, blocked } = readStored(
    recordKey(userId),
    "Can't tell whether a drawing was in progress on this device",
  );
  if (blocked) return "unreadable";
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
      generation:
        "generation" in value && typeof value.generation === "string" && value.generation.length > 0
          ? value.generation
          : null,
      elapsedMs: value.elapsedMs,
      nsfw: value.nsfw,
      currentLayer: "currentLayer" in value ? readCurrentLayer(value.currentLayer) : FIRST_LAYER,
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
 * The layer a record says was being drawn on. One that can't be read is said, and taken as the
 * first layer: the drawing still comes back.
 */
function readCurrentLayer(v: unknown): LayerId {
  if (isLayerId(v)) return v;
  console.error(
    "The kept drawing's current layer is unreadable, so it opens on the first layer:",
    v,
  );
  return FIRST_LAYER;
}

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
  const fillReference = "fillReference" in v ? v.fillReference : "layer";
  if (fillReference !== "layer" && fillReference !== "visible") return undefined;
  return isBetween(brushSize, 0, 1) && isBetween(eraserSize, 0, 1) && isBetween(smoothing, 0, 100)
    ? { brushSize, eraserSize, smoothing, fillReference }
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
