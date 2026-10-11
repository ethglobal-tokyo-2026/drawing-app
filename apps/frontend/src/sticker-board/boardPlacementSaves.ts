import {
  MAX_LARGE_LAYOUT_BATCH,
  type StickerBoard as ApiStickerBoard,
  type StickerPlacement,
} from "@drawing-app/api/client";
import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
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
}
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
  private snapshot: BoardPlacementState = { version: 0, unsaved: new Map() };
  private clock = 0;
  private active = false;
  private checkpoints = new WeakMap<ApiStickerBoard, Checkpoint>();
  private batches: DerivedBatch[] = [];
  private derived = new WeakMap<readonly LargeSpot[], Promise<StickerPlacement[]>>();
  private api: ApiClient;
  private accountId: string;

  constructor(api: ApiClient, accountId: string) {
    this.api = api;
    this.accountId = accountId;
  }

  subscribe = (changed: () => void): (() => void) => {
    this.listeners.add(changed);
    return () => {
      this.listeners.delete(changed);
    };
  };
  read = (): BoardPlacementState => this.snapshot;

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

  private changed(): void {
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
    this.snapshot = { version: this.snapshot.version + 1, unsaved };
    for (const changed of this.listeners) changed();
  }

  save(sticker: Pick<BoardSticker, "id" | "no">, spots: Spots): void {
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
