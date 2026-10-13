import {
  MAX_LARGE_LAYOUT_BATCH,
  type StickerBoard as ApiStickerBoard,
  type StickerPlacement,
} from "@drawing-app/api/client";
import { ApiError, apiError, type ApiClient } from "../api/apiClient";
import { toApiPlacement, toApiSpots, toRecordPlacement } from "../api/views";
import type { BoardSticker } from "./boardSticker";
import type { LargeSpot } from "./largeLayout";
import { layoutsIn, type BoardLayout, type Placement, type Spots } from "./placement";

interface BoardPlacementFailure {
  error: ApiError;
  layouts: ReadonlySet<BoardLayout>;
}
export interface BoardPlacementState {
  version: number;
  unsaved: ReadonlyMap<string, BoardPlacementFailure>;
  preservationError: ApiError | null;
}
type JournalStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type KeptPositions = { id: string; no?: number; phone?: Placement; large?: Placement };
const isPosition = (value: unknown): value is Placement => {
  if (!value || typeof value !== "object" || !("on" in value) || typeof value.on !== "boolean")
    return false;
  const finite = (number: unknown) => typeof number === "number" && Number.isFinite(number);
  return (
    "x" in value &&
    finite(value.x) &&
    "y" in value &&
    finite(value.y) &&
    "r" in value &&
    finite(value.r) &&
    "s" in value &&
    finite(value.s) &&
    "z" in value &&
    finite(value.z)
  );
};
const isKeptPositions = (value: unknown): value is KeptPositions[] =>
  Array.isArray(value) &&
  value.every(
    (item: unknown) =>
      item !== null &&
      typeof item === "object" &&
      "id" in item &&
      typeof item.id === "string" &&
      (!("no" in item) || typeof item.no === "number") &&
      (!("phone" in item) || isPosition(item.phone)) &&
      (!("large" in item) || isPosition(item.large)) &&
      ("phone" in item || "large" in item),
  );
interface Revision {
  revision: number;
  spot: Placement;
  acknowledged?: number;
  retired?: boolean;
  error?: ApiError;
}
type Revisions = Partial<Record<BoardLayout, Revision>>;
interface Entry {
  no?: number;
  latest: Revisions;
  queued: boolean;
  busy: boolean;
  reserved: boolean;
}
interface Checkpoint {
  started: number;
  pending: Map<string, Revisions>;
}
interface DerivedBatch {
  entries: readonly LargeSpot[];
  sent: Record<string, Revisions>;
  resolve: (saved: StickerPlacement[]) => void;
  reject: (error: unknown) => void;
}

/** Account-lifetime placement ordering. Keeps positions only; never retains sticker images. */
export class BoardPlacementSaves {
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  private snapshot: BoardPlacementState = {
    version: 0,
    unsaved: new Map(),
    preservationError: null,
  };
  private clock = 0;
  private active = false;
  private writePauses = 0;
  private checkpoints = new WeakMap<ApiStickerBoard, Checkpoint>();
  private batches: DerivedBatch[] = [];
  private derived = new WeakMap<readonly LargeSpot[], Promise<StickerPlacement[]>>();
  private api: ApiClient;
  private accountId: string;
  private journal: JournalStorage | null = null;
  private journalUnreadable = false;
  private preservationError: ApiError | null = null;

  constructor(api: ApiClient, accountId: string, storage?: JournalStorage) {
    this.api = api;
    this.accountId = accountId;
    try {
      // Each tab keeps its own unfinished positions under their original person's ID across Reload.
      this.journal = storage ?? (typeof sessionStorage === "undefined" ? null : sessionStorage);
      this.restoreJournal();
    } catch (error) {
      this.journalUnreadable = true;
      this.journalFailed("read", error);
    }
    this.changed(false);
  }

  private journalKey() {
    return `croquis.board-placement-saves.${this.accountId}`;
  }

  private journalFailed(operation: "read" | "write", error: unknown) {
    const affected = [...this.entries].flatMap(([id, entry]) => {
      const layouts = (["phone", "large"] as const).filter(
        (layout) => entry.latest[layout] && !entry.latest[layout]?.acknowledged,
      );
      return layouts.length ? [`sticker ${entry.no ?? id} (${layouts.join(", ")})`] : [];
    });
    this.preservationError = new ApiError(0, {
      error: "person_switch_placement_preservation_failed",
      detail: `Could not ${operation} unfinished sticker positions for ${this.accountId}${affected.length ? `: ${affected.join("; ")}` : ""}. ${error instanceof Error ? error.message : String(error)}`,
    });
    console.error("Unfinished sticker positions could not be preserved", this.preservationError);
  }

  private restoreJournal() {
    const raw = this.journal?.getItem(this.journalKey());
    if (!raw) return;
    const kept: unknown = JSON.parse(raw);
    if (!isKeptPositions(kept))
      throw new Error("Unfinished sticker positions are not valid placement entries.");
    for (const item of kept) {
      const entry = this.entry(item.id);
      entry.no = item.no;
      for (const layout of ["phone", "large"] as const) {
        const spot = item[layout];
        if (spot && !entry.latest[layout])
          entry.latest[layout] = {
            revision: ++this.clock,
            spot: { ...spot },
            error: new ApiError(409, {
              error: "person_switch_placement_unsaved",
              detail: `sticker ${item.no ?? item.id} (${layout})`,
            }),
          };
      }
    }
  }

  private keepJournal() {
    if (!this.journal || this.journalUnreadable) return;
    const kept: KeptPositions[] = [];
    for (const [id, entry] of this.entries) {
      const item: KeptPositions = { id, ...(entry.no !== undefined && { no: entry.no }) };
      for (const layout of ["phone", "large"] as const) {
        const revision = entry.latest[layout];
        if (revision && !revision.acknowledged) item[layout] = { ...revision.spot };
      }
      if (item.phone || item.large) kept.push(item);
    }
    try {
      if (
        kept.some(
          (item) =>
            (item.phone && !isPosition(item.phone)) || (item.large && !isPosition(item.large)),
        )
      )
        throw new Error("Unfinished sticker positions contain non-finite or invalid values.");
      if (kept.length) this.journal.setItem(this.journalKey(), JSON.stringify(kept));
      else this.journal.removeItem(this.journalKey());
      this.preservationError = null;
    } catch (error) {
      this.journalFailed("write", error);
    }
  }

  /** Explicitly retries preservation after storage was blocked, without sending positions. */
  retryPreservation(): void {
    try {
      this.journal ??= typeof sessionStorage === "undefined" ? null : sessionStorage;
      this.restoreJournal();
      this.journalUnreadable = false;
    } catch (error) {
      this.journalUnreadable = true;
      this.journalFailed("read", error);
    }
    this.changed();
  }

  subscribe = (changed: () => void): (() => void) => {
    this.listeners.add(changed);
    return () => {
      this.listeners.delete(changed);
    };
  };
  read = (): BoardPlacementState => this.snapshot;

  /** Pauses new changes only. Already queued saves keep their immutable client and finish normally. */
  pauseNewWrites(): () => void {
    this.writePauses += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.writePauses -= 1;
      }
    };
  }

  /** Waits for every queued position and derived batch, then reports any positions still unsaved. */
  waitUntilSaved(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      const finish = (error?: ApiError) => {
        unsubscribe();
        signal.removeEventListener("abort", aborted);
        if (error) reject(error);
        else resolve();
      };
      const aborted = () =>
        finish(
          new ApiError(0, {
            error: "timeout",
            detail: "Sticker positions did not finish saving before switching.",
          }),
        );
      const check = () => {
        if (signal.aborted) {
          aborted();
          return;
        }
        if (this.preservationError) {
          finish(this.preservationError);
          return;
        }
        if (
          this.batches.length ||
          [...this.entries.values()].some((entry) => entry.busy || entry.queued || entry.reserved)
        )
          return;
        const affected = [...this.snapshot.unsaved].map(
          ([id, failure]) =>
            `sticker ${this.entries.get(id)?.no ?? id} (${[...failure.layouts].join(", ")})`,
        );
        finish(
          affected.length
            ? new ApiError(409, {
                error: "person_switch_placement_unsaved",
                detail: affected.join("; "),
              })
            : undefined,
        );
      };
      unsubscribe = this.subscribe(check);
      signal.addEventListener("abort", aborted, { once: true });
      check();
    });
  }

  activate(): () => void {
    this.active = true;
    this.dispatch();
    let left = false;
    return () => {
      if (left) return;
      left = true;
      this.active = false;
    };
  }

  private entry(id: string): Entry {
    let entry = this.entries.get(id);
    if (!entry) {
      entry = { latest: {}, busy: false, reserved: false, queued: false };
      this.entries.set(id, entry);
    }
    return entry;
  }

  private changed(persist = true): void {
    if (persist) this.keepJournal();
    const unsaved = new Map<string, BoardPlacementFailure>();
    for (const [id, entry] of this.entries) {
      const layouts = new Set<BoardLayout>();
      let error: ApiError | undefined;
      for (const layout of ["phone", "large"] as const) {
        const revision = entry.latest[layout];
        if (revision?.error) {
          layouts.add(layout);
          error = revision.error;
        }
      }
      if (error) unsaved.set(id, { error, layouts });
    }
    this.snapshot = {
      version: this.snapshot.version + 1,
      unsaved,
      preservationError: this.preservationError,
    };
    for (const changed of this.listeners) changed();
  }

  save(sticker: Pick<BoardSticker, "id" | "no">, spots: Spots): void {
    if (this.writePauses) throw new ApiError(409, { error: "session_account_changed" });
    const entry = this.entry(sticker.id);
    entry.no = sticker.no;
    for (const layout of layoutsIn(spots)) {
      const spot = spots[layout];
      if (!spot) continue;
      entry.latest[layout] = {
        revision: ++this.clock,
        spot: { ...spot },
        error: entry.latest[layout]?.error,
      };
    }
    entry.queued = true;
    this.changed();
    this.dispatch();
  }

  private settle(id: string, sent: Revisions, error?: ApiError, saved?: StickerPlacement): void {
    const entry = this.entry(id);
    for (const layout of ["phone", "large"] as const) {
      const revision = sent[layout];
      if (!revision) continue;
      const latest = entry.latest[layout];
      if (latest?.revision !== revision.revision) continue;
      const returned = layout === "phone" ? saved?.placement : saved?.largePlacement;
      entry.latest[layout] = error
        ? { ...revision, error }
        : {
            ...revision,
            error: undefined,
            spot: returned ? toRecordPlacement(returned) : revision.spot,
            acknowledged: ++this.clock,
          };
    }
    entry.busy = false;
    this.changed();
    this.dispatch();
  }

  private dispatch(): void {
    if (!this.active) return;
    for (const batch of [...this.batches]) {
      if (batch.entries.some(({ id }) => this.entry(id).busy)) continue;
      this.batches.splice(this.batches.indexOf(batch), 1);
      for (const { id } of batch.entries) this.entry(id).busy = true;
      this.api
        .saveLargeLayout(
          batch.entries.map(({ id, placement }) => ({
            stickerId: id,
            largePlacement: toApiPlacement(placement),
          })),
        )
        .then(
          (saved) => {
            for (const { id } of batch.entries) {
              this.entry(id).reserved = false;
              this.settle(
                id,
                batch.sent[id],
                undefined,
                saved.find((s) => s.stickerId === id),
              );
            }
            batch.resolve(saved);
          },
          (error: unknown) => {
            const failure = apiError(error);
            console.error(
              `Saving the derived large layout failed for ${batch.entries.map(({ id }) => id).join(", ")}`,
              failure,
            );
            for (const { id } of batch.entries) {
              this.entry(id).reserved = false;
              this.settle(id, batch.sent[id], failure);
            }
            batch.reject(failure);
          },
        );
    }
    for (const [id, entry] of this.entries) {
      if (entry.busy || entry.reserved || !entry.queued) continue;
      entry.queued = false;
      const sent: Revisions = {};
      const spots: Spots = {};
      for (const layout of ["phone", "large"] as const) {
        const revision = entry.latest[layout];
        if (revision && !revision.acknowledged) {
          sent[layout] = revision;
          spots[layout] = revision.spot;
        }
      }
      if (layoutsIn(spots).length === 0) continue;
      entry.busy = true;
      this.api.saveStickerPlacement(id, toApiSpots(spots)).then(
        (saved) => this.settle(id, sent, undefined, saved),
        (error: unknown) => {
          const failure = apiError(error);
          console.error(`Saving where sticker ${entry.no ?? id} sits failed`, failure);
          this.settle(id, sent, failure);
        },
      );
    }
  }

  saveDerived(derived: readonly LargeSpot[]): Promise<StickerPlacement[]> {
    if (this.writePauses)
      return Promise.reject(new ApiError(409, { error: "session_account_changed" }));
    const previous = this.derived.get(derived);
    if (previous) return previous;
    const batches: Promise<StickerPlacement[]>[] = [];
    for (let i = 0; i < derived.length; i += MAX_LARGE_LAYOUT_BATCH) {
      const entries = derived.slice(i, i + MAX_LARGE_LAYOUT_BATCH);
      const sent: Record<string, Revisions> = {};
      for (const { id, placement } of entries) {
        const entry = this.entry(id);
        const revision = { revision: ++this.clock, spot: { ...placement } };
        entry.latest.large = revision;
        entry.reserved = true;
        sent[id] = { large: revision };
      }
      batches.push(
        new Promise((resolve, reject) => this.batches.push({ entries, sent, resolve, reject })),
      );
    }
    const result = Promise.all(batches).then((saved) => saved.flat());
    this.derived.set(derived, result);
    this.changed();
    this.dispatch();
    return result;
  }

  async readBoard(): Promise<ApiStickerBoard> {
    const checkpoint: Checkpoint = { started: this.clock, pending: new Map() };
    for (const [id, { latest }] of this.entries) {
      const pending: Revisions = {};
      for (const layout of ["phone", "large"] as const) {
        const revision = latest[layout];
        if (revision && !revision.acknowledged) pending[layout] = revision;
      }
      checkpoint.pending.set(id, pending);
    }
    const answer = await this.api.stickerBoard();
    this.checkpoints.set(answer, checkpoint);
    return answer;
  }

  overridesFor(answer: ApiStickerBoard): ReadonlyMap<string, Spots> {
    const overrides = new Map<string, Spots>();
    if (answer.owner.id !== this.accountId) return overrides;
    const checkpoint = this.checkpoints.get(answer);
    for (const sticker of answer.boardStickers) {
      if (!sticker.held) continue;
      const spots: Spots = {};
      for (const layout of ["phone", "large"] as const) {
        const before = checkpoint?.pending.get(sticker.stickerId)?.[layout];
        const latest = this.entries.get(sticker.stickerId)?.latest[layout];
        const needed =
          latest &&
          (!latest.acknowledged ||
            latest.revision > (checkpoint?.started ?? -1) ||
            latest.acknowledged > (checkpoint?.started ?? -1));
        const revision = needed ? latest : before;
        if (revision) spots[layout] = revision.spot;
      }
      if (layoutsIn(spots).length) overrides.set(sticker.stickerId, spots);
    }
    return overrides;
  }

  pendingSpots(): ReadonlyMap<string, Spots> {
    const spots = new Map<string, Spots>();
    for (const [id, { latest }] of this.entries) {
      const pending: Spots = {};
      for (const layout of ["phone", "large"] as const) {
        const revision = latest[layout];
        if (revision && !revision.retired) pending[layout] = revision.spot;
      }
      if (layoutsIn(pending).length) spots.set(id, pending);
    }
    return spots;
  }

  adopted(answer: ApiStickerBoard): void {
    const checkpoint = this.checkpoints.get(answer);
    if (!checkpoint || answer.owner.id !== this.accountId) return;
    for (const entry of this.entries.values()) {
      for (const layout of ["phone", "large"] as const) {
        const revision = entry.latest[layout];
        if (revision?.acknowledged && revision.acknowledged <= checkpoint.started)
          revision.retired = true;
      }
    }
  }
}
