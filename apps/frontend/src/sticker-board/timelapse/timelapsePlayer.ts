import type { TimelapseV1 } from "@drawing-app/api/client";
import { notePerformance, timeOurWork } from "../../performance/performanceRecorder";
import { context2d } from "../../sticker-creation/canvas/context2d";
import { MAX_DPR } from "../../sticker-creation/canvas/inkSurface";
import type { FillOp } from "../../sticker-creation/canvas/ops";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { decodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { prepareFillSnapshots, type FillSnapshot } from "./fillSnapshots";
import { displayCanvas, displayPoint, drawingDensity, revealRadius } from "./timelapseCrop";
import {
  playbackDone,
  scheduleTimelapse,
  startOfPlayback,
  stepsDue,
  type PaintStep,
} from "./timelapseSchedule";

/** A frame counts at most this much playback, so a stalled page picks up where it was. */
export const MAX_FRAME_MS = 50;

export interface TimelapsePlayerOptions {
  timelapse: TimelapseV1;
  /** The canvas the ink plays on. The player sizes its backing store to `width` at the screen's density. */
  canvas: HTMLCanvasElement;
  /** The sticker figure's width, CSS px: the canvas covers the figure's box exactly. */
  width: number;
  /** The sealed image's size, px: estimates the sticker's density when the timelapse has none. */
  image: { width: number; height: number };
  reduced: boolean;
  /** A sticker drawn in Kyoto Seika Manga Expression Practice Mode, whose timelapse may play longer. */
  kyotoSeika: boolean;
  frames?: FrameSource;
}

export interface TimelapsePlayer {
  /** Prepares the fills' snapshots; resolves at once when there are none, rejects saying what failed. */
  prepare: () => Promise<void>;
  /** Paints the ink from blank to finished: "done" when the last op is painted, "stopped" if stopped. */
  play: () => Promise<"done" | "stopped">;
  /** Paints the finished ink at once; a pending `play` resolves "done". */
  skip: () => void;
  /** Stops and releases every canvas it made; a pending `play` resolves "stopped". */
  stop: () => void;
  /** From now on, fills appear whole at once; strokes play on at the same pace. */
  setReduced: (reduced: boolean) => void;
}

type Outcome = { result: "done" | "stopped" } | { error: Error };

const TAU = Math.PI * 2;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Plays a sticker's timelapse on `canvas`, blank to finished, through the sticker's crop. The ink
 * stays transparent, so the paper under the canvas shows where the eraser went. It plays once;
 * skipped before it plays, it paints the finished ink as soon as `play` is called.
 */
export function createTimelapsePlayer(options: TimelapsePlayerOptions): TimelapsePlayer {
  const { canvas, frames = browserFrames } = options;
  const timelapse = decodeTimelapse(options.timelapse);
  const { place } = timelapse;
  const schedule = scheduleTimelapse(timelapse.ops, {
    reduced: options.reduced,
    kyotoSeika: options.kyotoSeika,
  });
  // Turned on mid-play, fills appear whole but keep their beats, so the strokes' pace never jumps.
  let reduced = options.reduced;
  const display = displayCanvas(place, options.width, Math.min(devicePixelRatio || 1, MAX_DPR));
  canvas.width = display.width;
  canvas.height = display.height;
  /** Display px per sheet px. */
  const { scale } = display;
  const g = context2d(canvas);
  g.setTransform(scale, 0, 0, scale, -place.x * scale, -place.y * scale);

  const cursor = startOfPlayback();
  let snapshots = new Map<number, FillSnapshot>();
  let preparing: Promise<void> | null = null;
  let playing: Promise<"done" | "stopped"> | null = null;
  let outcome: Outcome | null = null;
  let settle: ((outcome: Outcome) => void) | null = null;
  let skipped = false;
  let looping = false;
  let cancelFrame: (() => void) | null = null;
  /** When the last frame ran, null before the first and after the page was hidden. */
  let last: number | null = null;
  /** Playback time, ms. */
  let t = 0;

  /** A fill's snapshot inside a circle grown from its tap; whole at 1, when the snapshot goes. */
  const reveal = (index: number, op: FillOp, progress: number) => {
    const snapshot = snapshots.get(index);
    if (!snapshot) return;
    const { box: changed, reach, canvas: pixels } = snapshot;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (progress < 1) {
      const tap = displayPoint(place, scale, op);
      g.beginPath();
      g.arc(tap.x, tap.y, revealRadius(reach, progress), 0, TAU);
      g.clip();
    }
    g.clearRect(changed.x, changed.y, changed.w, changed.h);
    g.drawImage(pixels, changed.x, changed.y);
    g.restore();
    if (progress < 1) return;
    snapshots.delete(index);
    releaseCanvas(pixels);
  };

  const paint = (step: PaintStep) => {
    if (step.kind === "stroke") paintStroke(g, step.op, step.from, step.to);
    else reveal(step.index, step.op, reduced ? 1 : step.progress);
  };

  const letGoOfSnapshots = () => {
    snapshots.forEach((snapshot) => releaseCanvas(snapshot.canvas));
    snapshots.clear();
  };

  const failure = (error: unknown) =>
    new Error(
      `The timelapse stopped at op ${cursor.op + 1} of ${schedule.ops.length}: ${messageOf(error)}`,
      { cause: error },
    );

  const conclude = (next: Outcome) => {
    if (outcome) return;
    outcome = next;
    looping = false;
    cancelFrame?.();
    cancelFrame = null;
    document.removeEventListener("visibilitychange", onVisibility);
    letGoOfSnapshots();
    settle?.(next);
  };

  /** Paints everything still to come, at once. */
  const finishNow = () => {
    try {
      stepsDue(schedule, cursor, Infinity).forEach(paint);
      conclude({ result: "done" });
    } catch (error) {
      conclude({ error: failure(error) });
    }
  };

  const advance = (now: number) => {
    t += last === null ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, now - last));
    last = now;
    stepsDue(schedule, cursor, t).forEach(paint);
    if (playbackDone(schedule, cursor)) conclude({ result: "done" });
  };

  const frame = (now: number) => {
    cancelFrame = frames.request(frame);
    try {
      timeOurWork("timelapse", () => advance(now));
    } catch (error) {
      conclude({ error: failure(error) });
    }
  };

  // Hidden, the loop sleeps; shown again, it plays on from where it was rather than jumping ahead.
  const onVisibility = () => {
    if (!looping) return;
    if (document.visibilityState === "hidden") {
      cancelFrame?.();
      cancelFrame = null;
      last = null;
    } else if (!cancelFrame) cancelFrame = frames.request(frame);
  };

  const prepareFills = async () => {
    const fills = timelapse.ops.filter((op) => op.tool === "fill").length;
    if (fills === 0) return;
    const began = performance.now();
    const prepared = await prepareFillSnapshots(
      {
        ops: timelapse.ops,
        ink: timelapse.ink,
        place,
        density: drawingDensity(timelapse, options.image),
        display,
      },
      { now: () => frames.now(), stopped: () => outcome !== null },
    );
    snapshots = prepared ?? snapshots;
    // Stopped after the pass's last check: nothing will play them.
    if (outcome) letGoOfSnapshots();
    if (prepared) {
      const ms = Math.round(performance.now() - began);
      notePerformance("timelapse", `prepared ${fills} fill${fills === 1 ? "" : "s"} in ${ms} ms`);
    }
  };

  const prepare = () => (preparing ??= prepareFills());

  const run = async (): Promise<Outcome> => {
    await prepare();
    if (outcome) return outcome;
    const finished = new Promise<Outcome>((resolve) => {
      settle = resolve;
    });
    if (skipped) finishNow();
    else {
      looping = true;
      document.addEventListener("visibilitychange", onVisibility);
      if (document.visibilityState !== "hidden") cancelFrame = frames.request(frame);
    }
    return finished;
  };

  return {
    prepare,
    play: () =>
      (playing ??= run().then((o) => ("error" in o ? Promise.reject(o.error) : o.result))),
    skip: () => {
      skipped = true;
      if (looping) finishNow();
    },
    stop: () => conclude({ result: "stopped" }),
    setReduced: (next) => {
      reduced = next;
    },
  };
}
