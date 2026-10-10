import type { TimelapseV1 } from "@drawing-app/api/client";
import { notePerformance, timeOurWork } from "../../performance/performanceRecorder";
import { context2d } from "../../sticker-creation/canvas/context2d";
import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";
import type { FillOp } from "../../sticker-creation/canvas/ops";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { decodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import { releaseCanvas } from "../../ui/releaseCanvas";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import { prepareFillSnapshots, type FillSnapshot } from "./fillSnapshots";
import { displayPoint, displayView, drawingDensity, revealRadius } from "./timelapseCrop";
import { layoutFor, strokeFrame, type TimelapseLayout } from "./timelapseFrame";
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
  /** The canvas the ink plays on, covering the stage: the player sizes its backing store to it. */
  canvas: HTMLCanvasElement;
  /** The detail's stage, CSS px. */
  stage: { width: number; height: number };
  /** The sticker's figure on the stage, CSS px. */
  figure: Rect;
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
  /** Where the sheet plays on the stage and where the sticker's spot is: final once prepared. */
  layout: () => TimelapseLayout;
}

type Outcome = { result: "done" | "stopped" } | { error: Error };

const TAU = Math.PI * 2;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Plays a sticker's timelapse on `canvas`, blank to finished, showing the part of the sheet that was
 * drawn on where its layout puts it on the stage. The ink stays transparent, so the paper under the
 * canvas shows where the eraser went. It plays once; skipped before it plays, it paints the finished
 * ink as soon as `play` is called.
 */
export function createTimelapsePlayer(options: TimelapsePlayerOptions): TimelapsePlayer {
  const { canvas, frames = browserFrames } = options;
  const { stage, figure } = options;
  const timelapse = decodeTimelapse(options.timelapse);
  const { place, ink } = timelapse;
  const sheet = { width: ink.width, height: ink.height };
  const schedule = scheduleTimelapse(timelapse.ops, {
    reduced: options.reduced,
    kyotoSeika: options.kyotoSeika,
  });
  // Turned on mid-play, fills appear whole but keep their beats, so the strokes' pace never jumps.
  let reduced = options.reduced;
  const density = Math.min(devicePixelRatio || 1, MAX_DPR);
  const layoutOf = (frame: Rect) => layoutFor({ frame, place, stage, figure });
  const viewOf = (frame: Rect) => displayView(stage, layoutOf(frame).playing, density);
  // Until the fills are flooded, the frame is the strokes' and the place's.
  let layout = layoutOf(strokeFrame(timelapse.ops, place, sheet));
  let view = viewOf(layout.frame);
  canvas.width = view.width;
  canvas.height = view.height;
  const g = context2d(canvas);
  const showFrame = () => {
    const { scale, origin } = view;
    // Only a restore takes a clip away, so each frame's replaces the last's; with nothing saved, it does nothing.
    g.restore();
    g.save();
    g.setTransform(scale, 0, 0, scale, -origin.x * scale, -origin.y * scale);
    // Ink run past the sheet's edge never reached the sticker: the drawing screen's canvas ended there.
    g.beginPath();
    g.rect(0, 0, sheet.width, sheet.height);
    g.clip();
  };
  showFrame();

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
      const tap = displayPoint(view.origin, view.scale, op);
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
        ink: sheet,
        density: drawingDensity(timelapse),
        frame: layout.frame,
        viewOf,
      },
      { now: () => frames.now(), stopped: () => outcome !== null },
    );
    if (prepared) {
      snapshots = prepared.snapshots;
      layout = layoutOf(prepared.frame);
      view = viewOf(prepared.frame);
      showFrame();
    }
    // Stopped after the pass's last check: nothing will play them.
    if (outcome) letGoOfSnapshots();
    if (prepared) {
      const ms = Math.round(performance.now() - began);
      const twice = prepared.passes > 1 ? ", twice: a fill reached past the strokes" : "";
      notePerformance(
        "timelapse",
        `prepared ${fills} fill${fills === 1 ? "" : "s"} in ${ms} ms${twice}`,
      );
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
    layout: () => layout,
  };
}
