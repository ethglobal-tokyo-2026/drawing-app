import type { TimelapseV2 } from "@drawing-app/api/client";
import { messageOf } from "../../i18n/errorMessage";
import { notePerformance, timeOurWork } from "../../performance/performanceRecorder";
import { blankCanvas, context2d } from "../../sticker-creation/canvas/context2d";
import type { FillOp, LayerId, LayerStep, StrokeOp } from "../../sticker-creation/canvas/ops";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";
import { compositeLayers } from "../../sticker-creation/layers/composite";
import {
  applyLayerStep,
  baseOf,
  indexOf,
  type Layer,
  type LayerState,
} from "../../sticker-creation/layers/layerState";
import { decodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import { easeInOutSine } from "../../ui/easing";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { prepareFillSnapshots, type FillSnapshot } from "./fillSnapshots";
import {
  displayBox,
  displayPoint,
  displayView,
  drawingDensity,
  revealRadius,
} from "./timelapseCrop";
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
/** An added layer's sheen: its band's width as a share of the way it crosses the frame, and its brightest alpha. */
const SHEEN_BAND = 0.25;
const SHEEN_ALPHA = 0.35;

export interface TimelapsePlayerOptions {
  timelapse: TimelapseV2;
  /** The canvas the ink plays on, covering the stage: the player sizes its backing store to it. */
  canvas: HTMLCanvasElement;
  /** The detail's stage, CSS px. */
  stage: { width: number; height: number };
  /** The sticker's figure on the stage, CSS px. */
  figure: Rect;
  /** The sticker's cut as alpha, over its image's place: the ink it takes along as it peels away. */
  cut?: CanvasImageSource;
  reduced: boolean;
  /** A sticker drawn in Kyoto Seika Manga Expression Practice Mode, whose timelapse may play longer. */
  kyotoSeika: boolean;
  frames?: FrameSource;
}

export interface TimelapsePlayer {
  /** Prepares the fills' snapshots; resolves at once when there are none, rejects saying what failed. */
  prepare: () => Promise<void>;
  /** Plays the ink from blank to finished: "done" when the last step is played, "stopped" if stopped. */
  play: () => Promise<"done" | "stopped">;
  /** Paints the finished ink at once; a pending `play` resolves "done". */
  skip: () => void;
  /** Stops and releases every canvas it made; a pending `play` resolves "stopped". */
  stop: () => void;
  /** From now on, fills appear whole and layer steps show at once; strokes play on at the same pace. */
  setReduced: (reduced: boolean) => void;
  /** Where the sheet plays on the stage and where the sticker's spot is: final once prepared. */
  layout: () => TimelapseLayout;
  /** Clears the ink inside the sticker's cut, which it takes along as it peels off; until the cut loads, nothing. */
  takeInk: () => void;
}

type Outcome = { result: "done" | "stopped" } | { error: Error };

/** A layer step's beat under way, and how far it has gone, 0 to 1. */
interface Beat {
  step: LayerStep;
  progress: number;
}

const TAU = Math.PI * 2;

/** `state` with layer `id` at `opacity`, which falls between whole numbers mid-beat. */
const withOpacity = (state: LayerState, id: LayerId, opacity: number): LayerState => ({
  ...state,
  layers: state.layers.map((layer) => (layer.id === id ? { ...layer, opacity } : layer)),
});

/**
 * Plays a sticker's timelapse on `canvas`, blank to finished, showing the part of the sheet that was
 * drawn on where its layout puts it on the stage. Each layer plays on a canvas of its own, and each
 * frame composites them onto `canvas` as the layers stood then. The ink stays transparent, so the
 * paper under the canvas shows where the eraser went. It plays once; skipped before it plays, it
 * paints the finished ink as soon as `play` is called.
 */
export function createTimelapsePlayer(options: TimelapsePlayerOptions): TimelapsePlayer {
  const { canvas, frames = browserFrames } = options;
  const { stage, figure } = options;
  const timelapse = decodeTimelapse(options.timelapse);
  const { place, steps } = timelapse;
  const sheet = { width: timelapse.ink.width, height: timelapse.ink.height };
  const schedule = scheduleTimelapse(steps, {
    reduced: options.reduced,
    kyotoSeika: options.kyotoSeika,
  });
  // Turned on mid-play, fills and layer steps show whole at once but keep their beats, so the strokes'
  // pace never jumps.
  let reduced = options.reduced;
  const density = Math.min(devicePixelRatio || 1, MAX_DPR);
  const layoutOf = (frame: Rect) => layoutFor({ frame, place, stage, figure });
  const viewOf = (frame: Rect) => displayView(stage, layoutOf(frame).playing, density);
  // Until the fills are flooded, the frame is the strokes' and the place's.
  let layout = layoutOf(strokeFrame(steps, place, sheet));
  let view = viewOf(layout.frame);
  canvas.width = view.width;
  canvas.height = view.height;
  const g = context2d(canvas);
  /** Sets `to` drawing in sheet units, where the view shows the sheet. */
  const inSheetUnits = (to: CanvasRenderingContext2D) => {
    const { scale, origin } = view;
    to.setTransform(scale, 0, 0, scale, -origin.x * scale, -origin.y * scale);
  };

  /** The layers as played so far. */
  let state = timelapse.layers;
  /** Each layer's ink at the view's size, made as the layer first takes some. */
  const inks = new Map<LayerId, CanvasRenderingContext2D>();
  /** Where compositing cuts a clipped layer to its base. */
  let clipper: CanvasRenderingContext2D | null = null;
  /** The layer step whose beat this frame shows under way. */
  let beat: Beat | null = null;
  /** The last layer step played whole: under reduced motion one plays at once, then sits out its beat. */
  let shifted = -1;
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

  const layerIn = (id: LayerId): Layer => {
    const at = indexOf(state, id);
    if (at < 0) {
      const held = state.layers.map((layer) => layer.id).join(", ");
      throw new Error(`Layer ${id} isn't among the sheet's layers (${held})`);
    }
    return state.layers[at];
  };

  /** The layer's ink, made blank when it has none. */
  const inkOf = (id: LayerId) => {
    const made = inks.get(id);
    if (made) return made;
    const { g: onLayer } = blankCanvas(view.width, view.height);
    inSheetUnits(onLayer);
    // Ink run past the sheet's edge never reached the sticker: the drawing screen's canvas ended there.
    onLayer.beginPath();
    onLayer.rect(0, 0, sheet.width, sheet.height);
    onLayer.clip();
    inks.set(id, onLayer);
    return onLayer;
  };

  const letGoOfLayer = (id: LayerId) => {
    const onLayer = inks.get(id);
    if (!onLayer) return;
    releaseCanvas(onLayer.canvas);
    inks.delete(id);
  };

  const stroke = (op: StrokeOp, from: number, to: number) => {
    const { locked } = layerIn(op.layer);
    // As on the drawing screen, only a brush on an unlocked layer inks where the layer has none.
    if ((op.tool !== "brush" || locked) && !inks.has(op.layer)) return;
    paintStroke(inkOf(op.layer), op, from, to, locked ? "source-atop" : "source-over");
  };

  /** A fill's snapshot on its layer inside a circle grown from its tap; whole at 1, when the snapshot goes. */
  const reveal = (index: number, op: FillOp, progress: number) => {
    const snapshot = snapshots.get(index);
    if (!snapshot) return;
    const onLayer = inkOf(op.layer);
    const { box: changed, reach, canvas: pixels } = snapshot;
    onLayer.save();
    onLayer.setTransform(1, 0, 0, 1, 0, 0);
    if (progress < 1) {
      const tap = displayPoint(view.origin, view.scale, op);
      onLayer.beginPath();
      onLayer.arc(tap.x, tap.y, revealRadius(reach, progress), 0, TAU);
      onLayer.clip();
    }
    onLayer.clearRect(changed.x, changed.y, changed.w, changed.h);
    onLayer.drawImage(pixels, changed.x, changed.y);
    onLayer.restore();
    if (progress < 1) return;
    snapshots.delete(index);
    releaseCanvas(pixels);
  };

  /** A layer step: under way, it marks this frame's beat; whole, it changes the layers. */
  const shift = (index: number, step: LayerStep, progress: number) => {
    if (index <= shifted) return;
    // Checked from its beat's first frame, so a step that doesn't fit the layers fails as it starts.
    const after = applyLayerStep(state, step);
    if (progress < 1 && !reduced) {
      beat = { step, progress };
      return;
    }
    shifted = index;
    if (step.tool === "delete" || step.tool === "clear") letGoOfLayer(step.layer);
    state = after;
  };

  const paint = (step: PaintStep) => {
    if (step.kind === "stroke") stroke(step.op, step.from, step.to);
    else if (step.kind === "reveal") reveal(step.index, step.op, reduced ? 1 : step.progress);
    else shift(step.index, step.step, step.progress);
  };

  /** The layers as this frame shows them: mid-beat, one fading out or easing to its new opacity. */
  const shownLayers = (): LayerState => {
    if (!beat) return state;
    const { step, progress } = beat;
    if (step.tool !== "delete" && step.tool !== "clear" && step.tool !== "opacity") return state;
    const from = layerIn(step.layer).opacity;
    const to = step.tool === "opacity" ? step.opacity : 0;
    return withOpacity(state, step.layer, from + (to - from) * easeInOutSine(progress));
  };

  /** Compositing's scratch: the display's size once a layer clips to another, a pixel until then. */
  const scratchFor = (shown: LayerState) => {
    const clips = shown.layers.some((layer) => baseOf(shown, layer.id) !== null);
    const [width, height] = clips ? [view.width, view.height] : [1, 1];
    if (!clipper) clipper = blankCanvas(width, height).g;
    else if (clipper.canvas.width < width || clipper.canvas.height < height) {
      clipper.canvas.width = width;
      clipper.canvas.height = height;
    }
    return clipper;
  };

  /**
   * An added layer's beat: a faint band of light crosses the frame from its top left, where the app's
   * one light falls from, `progress` of the way.
   */
  const sheen = (progress: number) => {
    const { x, y, w, h } = layout.frame;
    // At 45° down from the top left, whatever the frame's shape, the frame spans this far.
    const across = (w + h) / Math.SQRT2;
    const band = across * SHEEN_BAND;
    // The band's middle runs from just before the frame's top left to just past its bottom right.
    const middle = -band / 2 + (across + band) * easeInOutSine(progress);
    const [from, to] = [middle - band / 2, middle + band / 2].map((d) => d / Math.SQRT2);
    g.save();
    inSheetUnits(g);
    const light = g.createLinearGradient(x + from, y + from, x + to, y + to);
    light.addColorStop(0, "rgba(255, 255, 255, 0)");
    light.addColorStop(0.5, `rgba(255, 255, 255, ${SHEEN_ALPHA})`);
    light.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = light;
    g.fillRect(x, y, w, h);
    g.restore();
  };

  /** Shows the layers as they stand on the display, and an added layer's sheen over them mid-beat. */
  const composite = () => {
    g.clearRect(0, 0, view.width, view.height);
    // Ink is only ever on the sheet, so only the sheet's part of the display is composited.
    const box = displayBox(view, { x: 0, y: 0, w: sheet.width, h: sheet.height });
    if (box) {
      const shown = shownLayers();
      const ids = shown.layers.map((layer) => layer.id);
      const canvasOf = (id: LayerId) => inks.get(id)?.canvas ?? null;
      compositeLayers(g, shown, canvasOf, ids, box, scratchFor(shown));
    }
    if (beat?.step.tool === "add") sheen(beat.progress);
  };

  /** Plays what's due, then shows it; a frame with nothing due keeps showing what it showed. */
  const play = (due: readonly PaintStep[]) => {
    if (due.length === 0) return;
    beat = null;
    due.forEach(paint);
    composite();
  };

  const letGoOfSnapshots = () => {
    snapshots.forEach((snapshot) => releaseCanvas(snapshot.canvas));
    snapshots.clear();
  };

  const letGoOfLayers = () => {
    inks.forEach((onLayer) => releaseCanvas(onLayer.canvas));
    inks.clear();
    if (clipper) releaseCanvas(clipper.canvas);
    clipper = null;
  };

  const failure = (error: unknown) =>
    new Error(
      `The timelapse stopped at step ${cursor.step + 1} of ${schedule.steps.length}: ${messageOf(error)}`,
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
    // The display keeps the finished ink; the layers' own canvases aren't needed past here.
    letGoOfLayers();
    settle?.(next);
  };

  /** Plays everything still to come, at once. */
  const finishNow = () => {
    try {
      play(stepsDue(schedule, cursor, Infinity));
      conclude({ result: "done" });
    } catch (error) {
      conclude({ error: failure(error) });
    }
  };

  const advance = (now: number) => {
    t += last === null ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, now - last));
    last = now;
    play(stepsDue(schedule, cursor, t));
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
    const fills = steps.filter((step) => step.tool === "fill").length;
    if (fills === 0) return;
    const began = performance.now();
    const prepared = await prepareFillSnapshots(
      {
        steps,
        layers: timelapse.layers,
        ink: sheet,
        density: drawingDensity(timelapse),
        frame: layout.frame,
        viewOf,
      },
      { now: () => frames.now(), stopped: () => outcome !== null },
    );
    // The layers' canvases are made as they play, after this, so they take the final view.
    if (prepared) {
      snapshots = prepared.snapshots;
      layout = layoutOf(prepared.frame);
      view = viewOf(prepared.frame);
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
    takeInk: () => {
      const { cut } = options;
      if (!cut || (cut instanceof HTMLImageElement && !(cut.complete && cut.naturalWidth > 0)))
        return;
      // In sheet units, as the strokes are drawn.
      g.save();
      inSheetUnits(g);
      g.globalCompositeOperation = "destination-out";
      g.drawImage(cut, place.x, place.y, place.w, place.h);
      g.restore();
    },
  };
}
