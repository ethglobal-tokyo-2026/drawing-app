import type { FrameSource } from "../../ui/frameSource";
import type { LayerInk } from "../layers/layerInk";
import type { LayerState } from "../layers/layerState";
import type { Rect } from "../sealing/stickerPasses";
import {
  fillReadAreas,
  fillTarget,
  isFillNoOp,
  matchesFillTarget,
  type FillTarget,
  type Pixels,
} from "./fill";
import { FillPath, FillVisits, type FillSample } from "./fillPath";
import { FillError } from "./fill-worker/errors";
import type { FillPatchResult } from "./fill-worker/protocol";
import { hexToRgb } from "./color";
import type { FillWorkerService } from "./fill-worker/service";
import type { FillOp, FillReference, LayerId } from "./ops";
import type { SheetFrame } from "./sheetFrame";

export interface FillGestureSettings {
  layer: LayerId;
  reference: FillReference;
  color: string;
  gap: number;
  frame: SheetFrame;
}

interface FillGestureEvents {
  state: () => LayerState;
  reserve: (copies: number) => void;
  retryCanvas: <T>(op: FillOp | string, write: () => T) => T;
  preview: (layer: LayerId, at: Rect, pixels: Pixels) => void;
  clearPreview: () => void;
  commit: (op: FillOp) => void;
  show: (layer: LayerId, changed: Rect) => void;
  fail: (error: FillError) => void;
  changed: () => void;
}

type Prepared = { op: FillOp; at: Rect; result: Extract<FillPatchResult, { kind: "found" }> };

interface Gesture {
  id: number;
  settings: FillGestureSettings;
  path: FillPath;
  visits: FillVisits | null;
  target: FillTarget | null;
  accepted: boolean;
  closed: boolean;
  completed: number;
  abort: AbortController;
  prepared: Prepared | null;
  pending: FillOp | null;
  waiting: boolean;
  seed: FillSample;
}

const valid = (point: FillSample) =>
  Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.T);

/** Serializes gestures while keeping provisional touch pixels outside committed layer ink. */
export class FillGestureController {
  private readonly inputs = new Map<number, Gesture>();
  private readonly queue: Gesture[] = [];
  private cancelFrame: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private tile: { gesture: Gesture; at: Rect; pixels: Pixels } | null = null;
  private drain: {
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: FillError) => void;
  } | null = null;
  private failure: FillError | null = null;
  private disposed = false;
  private readonly ink: LayerInk;
  private readonly worker: Pick<FillWorkerService, "prepare" | "dispose">;
  private readonly frames: FrameSource;
  private readonly events: FillGestureEvents;

  constructor(
    ink: LayerInk,
    worker: Pick<FillWorkerService, "prepare" | "dispose">,
    frames: FrameSource,
    events: FillGestureEvents,
  ) {
    this.ink = ink;
    this.worker = worker;
    this.frames = frames;
    this.events = events;
  }

  get busy(): boolean {
    return this.queue.length > 0;
  }
  get acceptedPending(): boolean {
    return this.queue.some((gesture) => gesture.accepted);
  }

  begin(id: number, pointerType: string, settings: FillGestureSettings, point: FillSample): void {
    if (this.disposed || this.drain || !valid(point) || this.inputs.has(id)) return;
    this.failure = null;
    const { frame } = settings;
    const path = new FillPath(
      Math.round(frame.w * frame.density),
      Math.round(frame.h * frame.density),
    );
    path.append(point);
    const gesture: Gesture = {
      id,
      settings: { ...settings, frame: { ...frame } },
      path,
      visits: null,
      target: null,
      accepted: pointerType !== "touch",
      closed: false,
      completed: 0,
      abort: new AbortController(),
      prepared: null,
      pending: null,
      waiting: false,
      seed: { ...point },
    };
    this.inputs.set(id, gesture);
    this.queue.push(gesture);
    this.events.changed();
    this.schedule();
  }

  append(id: number, points: readonly FillSample[]): void {
    const gesture = this.inputs.get(id);
    if (!gesture) return;
    for (const point of points) if (valid(point)) gesture.path.append(point);
    this.schedule();
  }

  acceptTouch(id: number): void {
    const gesture = this.inputs.get(id);
    if (!gesture || gesture.accepted) return;
    gesture.accepted = true;
    this.events.changed();
    this.schedule();
  }

  release(id: number, point: FillSample): void {
    const gesture = this.inputs.get(id);
    if (!gesture) return;
    this.append(id, [point]);
    gesture.accepted = true;
    gesture.closed = true;
    this.inputs.delete(id);
    this.progress();
    this.events.changed();
    this.schedule();
  }

  cancel(id: number, reason: string): void {
    const gesture = this.inputs.get(id);
    if (!gesture) return;
    this.recordCancellation(reason, [gesture]);
    this.remove(gesture);
    this.schedule();
  }

  finish(): Promise<void> {
    if (this.drain) return this.drain.promise;
    if (this.failure) {
      const error = this.failure;
      this.failure = null;
      return Promise.reject(error);
    }
    if (!this.busy) return Promise.resolve();
    for (const gesture of this.queue) {
      gesture.accepted = true;
      gesture.closed = true;
    }
    this.inputs.clear();
    let resolve!: () => void;
    let reject!: (error: FillError) => void;
    const promise = new Promise<void>((done, failed) => {
      resolve = done;
      reject = failed;
    });
    this.drain = { promise, resolve, reject };
    this.progress();
    this.events.changed();
    this.schedule();
    return promise;
  }

  abort(reason: string): void {
    this.recordCancellation(reason, this.queue);
    const drain = this.drain;
    this.drain = null;
    const errors: unknown[] = [];
    for (const gesture of [...this.queue]) {
      const error = this.remove(gesture, false);
      if (error !== undefined) errors.push(error);
    }
    this.cancelFrame?.();
    this.cancelFrame = null;
    this.clearTimer();
    this.failure = null;
    drain?.reject(new FillError(`Fill stopped: ${reason}`));
    if (errors.length)
      this.events.fail(
        new FillError("Fill preview cleanup failed", undefined, {
          cause: new AggregateError(errors),
        }),
      );
  }

  dispose(): void {
    this.disposed = true;
    this.abort("sheet disposed");
    this.worker.dispose();
  }

  private recordCancellation(reason: string, gestures: readonly Gesture[]): void {
    if (!gestures.length) return;
    console.info("Fill input cancelled", {
      reason,
      affectedGestures: gestures.length,
      gestures: gestures.map((gesture) => ({
        pointerId: gesture.id,
        accepted: gesture.accepted,
        released: gesture.closed,
        layer: gesture.settings.layer,
        seed: {
          x: gesture.seed.x / gesture.settings.frame.density,
          y: gesture.seed.y / gesture.settings.frame.density,
          T: gesture.seed.T,
        },
        completedRegions: gesture.completed,
      })),
    });
  }

  private schedule(): void {
    const gesture = this.queue[0];
    if (!gesture || this.cancelFrame || gesture.waiting || (gesture.prepared && !gesture.accepted))
      return;
    this.cancelFrame = this.frames.request(() => {
      this.cancelFrame = null;
      try {
        this.scan();
      } catch (error) {
        this.fail(error);
      }
    });
  }

  private scan(started = this.frames.now()): void {
    for (let scanned = 0; scanned < 256 && this.frames.now() - started < 4; scanned++) {
      const gesture = this.queue[0];
      if (!gesture || gesture.waiting) return;
      const { frame } = gesture.settings;
      if (!gesture.visits)
        gesture.visits = new FillVisits(
          Math.round(frame.w * frame.density),
          Math.round(frame.h * frame.density),
        );
      if (gesture.prepared) {
        if (!gesture.accepted) return;
        this.install(gesture, gesture.prepared);
      }
      const sample = gesture.path.next();
      if (!sample) {
        if (gesture.closed) {
          this.remove(gesture);
          continue;
        }
        return;
      }
      gesture.seed = sample;
      this.progress();
      if (gesture.visits.has(sample.x, sample.y)) continue;
      const candidate = this.readTarget(gesture, sample);
      gesture.target ??= candidate;
      if (
        !matchesFillTarget(gesture.target, candidate) ||
        isFillNoOp(candidate, hexToRgb(gesture.settings.color))
      )
        continue;
      gesture.waiting = true;
      void this.prepare(gesture, sample);
      return;
    }
    this.schedule();
  }

  private readTarget(gesture: Gesture, { x, y }: FillSample): FillTarget {
    let tile = this.tile;
    if (
      !tile ||
      tile.gesture !== gesture ||
      x < tile.at.x ||
      y < tile.at.y ||
      x >= tile.at.x + tile.at.w ||
      y >= tile.at.y + tile.at.h
    ) {
      const { settings } = gesture;
      const tx = Math.floor(x / 128) * 128;
      const ty = Math.floor(y / 128) * 128;
      const at = {
        x: tx,
        y: ty,
        w: Math.min(128, Math.round(settings.frame.w * settings.frame.density) - tx),
        h: Math.min(128, Math.round(settings.frame.h * settings.frame.density) - ty),
      };
      const pixels = this.read(gesture, () =>
        this.ink.readFillReference(settings, this.events.state(), at),
      );
      tile = { gesture, at, pixels };
      this.tile = tile;
    }
    return fillTarget(tile.pixels, x - tile.at.x, y - tile.at.y);
  }

  private read<T>(gesture: Gesture, read: () => T): T {
    this.events.reserve(gesture.settings.reference === "visible" ? 2 : 1);
    return this.events.retryCanvas("reading Fill reference", read);
  }

  private async prepare(gesture: Gesture, sample: FillSample): Promise<void> {
    const { settings } = gesture;
    const { density } = settings.frame;
    const op: FillOp = {
      tool: "fill",
      layer: settings.layer,
      reference: settings.reference,
      color: settings.color,
      gap: settings.gap,
      // An interior point keeps replay's floor and timelapse rounding in the accepted pixel.
      x: (sample.x + 0.5) / density,
      y: (sample.y + 0.5) / density,
      T: sample.T,
      ...(gesture.completed > 0 ? { undoWithPrevious: true as const } : {}),
    };
    gesture.pending = op;
    let answeredAt = this.frames.now();
    const deadline = answeredAt + 1000;
    try {
      for (const { at, cut } of fillReadAreas(
        {
          width: Math.round(settings.frame.w * density),
          height: Math.round(settings.frame.h * density),
        },
        sample.x,
        sample.y,
        Math.round(160 * density),
      )) {
        const patch = this.read(gesture, () => this.ink.readFillPatch(op, this.events.state(), at));
        const result = await this.worker.prepare(
          {
            at,
            ...patch,
            sx: sample.x - at.x,
            sy: sample.y - at.y,
            color: hexToRgb(settings.color),
            gap: settings.gap * density,
            cut,
          },
          deadline,
          gesture.abort.signal,
        );
        answeredAt = this.frames.now();
        if (gesture.abort.signal.aborted) return;
        if (this.frames.now() >= deadline)
          throw new FillError("Fill preparation exceeded its region deadline");
        if (result.kind === "past") continue;
        if (result.kind === "found") {
          gesture.visits?.mark(result.interiorSpans);
          const prepared = { op, at, result };
          gesture.prepared = prepared;
          if (gesture.accepted) this.install(gesture, prepared);
          else if (result.written) {
            this.events.reserve(1);
            this.events.retryCanvas(op, () => this.events.preview(op.layer, at, result.pixels));
          }
        } else {
          this.ink.releaseFill(op);
          gesture.pending = null;
        }
        this.progress();
        return;
      }
      throw new FillError("Fill region exceeded the sheet bounds");
    } catch (error) {
      if (!gesture.abort.signal.aborted) this.fail(error);
    } finally {
      gesture.waiting = false;
      if (!gesture.abort.signal.aborted) {
        // Installation and display share this slice; the next worker request yields naturally.
        try {
          this.scan(answeredAt);
        } catch (error) {
          this.fail(error);
        }
      }
    }
  }

  private install(gesture: Gesture, prepared: Prepared): void {
    const { op, at, result } = prepared;
    this.events.reserve(1);
    const changed = this.events.retryCanvas(op, () => this.ink.applyPreparedFill(op, at, result));
    gesture.pending = null;
    gesture.prepared = null;
    this.tile = null;
    if (changed) {
      this.events.commit(op);
      gesture.completed++;
    }
    this.events.reserve(1);
    this.events.retryCanvas(op, () => this.events.clearPreview());
    if (changed) this.events.retryCanvas(op, () => this.events.show(op.layer, changed));
  }

  private remove(gesture: Gesture, report = true): unknown {
    gesture.abort.abort();
    if (gesture.pending) this.ink.releaseFill(gesture.pending);
    const hadPreview = gesture.prepared !== null;
    gesture.pending = null;
    gesture.prepared = null;
    gesture.visits = null;
    if (this.inputs.get(gesture.id) === gesture) this.inputs.delete(gesture.id);
    const index = this.queue.indexOf(gesture);
    if (index >= 0) this.queue.splice(index, 1);
    this.tile = null;
    this.progress();
    if (hadPreview) {
      try {
        this.events.reserve(1);
        this.events.retryCanvas("clearing Fill preview", () => this.events.clearPreview());
      } catch (error) {
        if (report) this.fail(error, gesture);
        return error;
      }
    }
    if (!this.busy) {
      const drain = this.drain;
      this.drain = null;
      drain?.resolve();
    }
    this.events.changed();
    return undefined;
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private progress(): void {
    this.clearTimer();
    if (this.queue.some((gesture) => gesture.closed))
      this.timer = setTimeout(
        () => this.fail(new FillError("Fill drain exceeded its inactivity deadline")),
        2000,
      );
  }

  private fail(cause: unknown, gesture = this.queue[0]): void {
    if (!gesture) return;
    const pendingGestures = Math.max(1, this.queue.length);
    const cleanupErrors: unknown[] = [];
    const drain = this.drain;
    this.drain = null;
    for (const pending of [...this.queue]) {
      const error = this.remove(pending, false);
      if (error !== undefined) cleanupErrors.push(error);
    }
    this.cancelFrame?.();
    this.cancelFrame = null;
    this.clearTimer();
    const error = new FillError(
      cause instanceof Error ? cause.message : "Fill failed",
      {
        layer: gesture.settings.layer,
        x: gesture.seed.x / gesture.settings.frame.density,
        y: gesture.seed.y / gesture.settings.frame.density,
        completedRegions: gesture.completed,
        pendingGestures,
      },
      { cause: cleanupErrors.length ? new AggregateError([cause, ...cleanupErrors]) : cause },
    );
    if (!drain) this.failure = error;
    drain?.reject(error);
    this.events.fail(error);
    this.events.changed();
  }
}
