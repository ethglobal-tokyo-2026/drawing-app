// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hexToRgb } from "../../sticker-creation/canvas/color";
import {
  STRIDE,
  type FillOp,
  type LayerId,
  type Op,
  type Step,
  type StrokeOp,
} from "../../sticker-creation/canvas/ops";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";
import { LayerInk } from "../../sticker-creation/layers/layerInk";
import {
  FIRST_LAYERS,
  FULL_OPACITY,
  type LayerState,
} from "../../sticker-creation/layers/layerState";
import { addLayer, deleteLayer } from "../../sticker-creation/layers/testLayerSteps";
import { decodeTimelapse, encodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import { notePerformance } from "../../performance/performanceRecorder";
import { contextOf, forgetContexts, madeContexts, type FakeContext } from "./testCanvas";
import { handFrames } from "./testTimelapse";
import { MAX_FRAME_MS, createTimelapsePlayer } from "./timelapsePlayer";
import {
  scheduleTimelapse,
  type ScheduledStroke,
  type TimelapseSchedule,
} from "./timelapseSchedule";

vi.mock(
  "../../sticker-creation/canvas/context2d",
  () => import("../../sticker-creation/canvas/testContext2d"),
);
vi.mock("../../sticker-creation/canvas/paintStroke", async (importOriginal) => {
  const real = await importOriginal<{ paintStroke: typeof paintStroke }>();
  return { paintStroke: vi.fn(real.paintStroke) };
});
vi.mock("../../performance/performanceRecorder", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  notePerformance: vi.fn(),
}));

/** The sheet, 100 sheet units square, drawn at density 1. */
const SHEET = { w: 100, h: 100, density: 1 };
/**
 * Where the sticker's image covers the sheet: as a real one does, it reaches past its marks by more
 * than the frame's margin, since its die-cut border is wider.
 */
const PLACE = { x: 10, y: 10, w: 80, h: 80 };
/** The stage, CSS px, which the figure fills at 2 px per sheet unit. */
const STAGE = { width: 160, height: 160 };
const FIGURE = { x: 0, y: 0, w: STAGE.width, h: STAGE.height };

/** A stroke that stays well inside the sticker's cut, as every mark of one drawn within it does. */
const stroke = (T: number, ms: readonly number[]): StrokeOp => ({
  tool: "brush",
  layer: 1,
  color: "#1c1824",
  T,
  pts: ms.flatMap((t, i) => [35 + (i % 30), 45, 4, t]),
});
const steady = (ms: number, step = 16) =>
  Array.from({ length: Math.floor(ms / step) + 1 }, (_, i) => i * step);
const pointCount = (op: StrokeOp) => op.pts.length / STRIDE;

function setup(
  steps: Step[],
  {
    reduced = false,
    cut,
    layers = FIRST_LAYERS,
  }: { reduced?: boolean; cut?: CanvasImageSource; layers?: LayerState } = {},
) {
  const timelapse = encodeTimelapse({ steps, start: layers, frame: SHEET, place: PLACE });
  const canvas = document.createElement("canvas");
  const clock = handFrames();
  const player = createTimelapsePlayer({
    timelapse,
    canvas,
    stage: STAGE,
    figure: FIGURE,
    cut,
    reduced,
    kyotoSeika: false,
    frames: clock.source,
  });
  const display = contextOf(canvas);
  if (!display) throw new Error("the player made no display");
  const decoded = decodeTimelapse(timelapse).steps;
  const schedule = scheduleTimelapse(decoded, { reduced });
  /** The point ranges painted, in order: the player's, after its prepare pass's when there are fills. */
  const painted = () =>
    vi
      .mocked(paintStroke)
      .mock.calls.map(([, op, from = 0, to = pointCount(op)]) => ({ op, from, to }));
  /** Starts playing, and waits for its first frame to be asked for. */
  const start = async () => {
    const playing = player.play();
    await vi.waitFor(() => expect(clock.waiting()).toBe(true));
    return { playing };
  };
  /** Plays it a frame at a time to the end. */
  const playToEnd = async () => {
    const { playing } = await start();
    clock.advance(schedule.length + 32);
    await expect(playing).resolves.toBe("done");
  };
  return { canvas, player, display, steps: decoded, schedule, painted, start, playToEnd, ...clock };
}

/** The canvas the player plays layer `id` on: where the last stroke on that layer was painted. */
function layerShown(id: LayerId): FakeContext {
  const call = vi.mocked(paintStroke).mock.calls.findLast(([, op]) => op.layer === id);
  const shown = call && contextOf(call[0].canvas);
  if (!shown) throw new Error(`No stroke was painted on layer ${id}`);
  return shown;
}

/** How many of a stroke's points are due by playback time `t`. */
const dueBy = (scheduled: ScheduledStroke, t: number) =>
  scheduled.at.filter((at) => at <= t).length;
const strokeAt = (schedule: TimelapseSchedule, index: number) => {
  const scheduled = schedule.steps[index];
  if (scheduled.kind !== "stroke") throw new Error(`step ${index} isn't a stroke`);
  return scheduled;
};
/** When step `index`'s reveal or beat runs. */
const beatAt = (schedule: TimelapseSchedule, index: number) => {
  const scheduled = schedule.steps[index];
  if (scheduled.kind === "stroke") throw new Error(`step ${index} is a stroke`);
  return scheduled;
};

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  Reflect.deleteProperty(document, "visibilityState");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(paintStroke).mockReset();
  forgetContexts();
});

describe("the timelapse player", () => {
  it.each([
    [2, 2],
    [4, MAX_DPR],
  ])(
    "covers the stage at a screen density of %s, and plays a sticker drawn within its cut in its spot",
    async (screen, density) => {
      vi.stubGlobal("devicePixelRatio", screen);
      const { canvas, player } = setup([stroke(0, steady(100))]);
      expect([canvas.width, canvas.height]).toEqual([
        STAGE.width * density,
        STAGE.height * density,
      ]);
      player.skip();
      await expect(player.play()).resolves.toBe("done");
      const scale = (density * FIGURE.w) / PLACE.w;
      expect(layerShown(1).calls).toContainEqual([
        "setTransform",
        scale,
        0,
        0,
        scale,
        -PLACE.x * scale,
        -PLACE.y * scale,
      ]);
    },
  );

  it("paints each point once, in order, as it comes due, and finishes as the last is painted", async () => {
    const ops = [stroke(0, steady(900)), stroke(1_500, steady(400, 30))];
    const { schedule, painted, start, advance } = setup(ops);
    const { playing } = await start();
    let finished = false;
    void playing.then(() => (finished = true));
    // The first frame starts the clock at 0, so after `ms` of frames it has played `ms - 16`.
    advance(schedule.length - 16);
    await Promise.resolve();
    expect(finished).toBe(false);
    advance(32);
    await expect(playing).resolves.toBe("done");

    const ranges = painted();
    expect(ranges.length).toBeGreaterThan(ops.length);
    for (const op of ops) {
      const own = ranges.filter((r) => r.op.T === op.T);
      expect(own.map((r) => r.from)).toEqual([0, ...own.slice(0, -1).map((r) => r.to)]);
      expect(own.at(-1)?.to).toBe(pointCount(op));
    }
    expect(ranges.map((r) => r.op.T)).toEqual(ranges.map((r) => r.op.T).toSorted((a, b) => a - b));
  });

  it("counts a stalled frame as MAX_FRAME_MS", async () => {
    const { schedule, painted, start, advance } = setup([stroke(0, steady(2_000))]);
    await start();
    advance(16);
    advance(2_000, 2_000);
    expect(painted().at(-1)?.to).toBe(dueBy(strokeAt(schedule, 0), MAX_FRAME_MS));
  });

  it("asks for no frames while the page is hidden, and plays on from where it was", async () => {
    const { schedule, painted, start, advance, waiting } = setup([stroke(0, steady(2_000))]);
    await start();
    advance(16 * 5);
    setVisibility("hidden");
    expect(waiting()).toBe(false);
    advance(10_000);
    const before = painted().length;
    setVisibility("visible");
    expect(waiting()).toBe(true);
    advance(16);
    expect(painted().length).toBe(before);
    advance(16);
    expect(painted().at(-1)?.to).toBe(dueBy(strokeAt(schedule, 0), 16 * 5));
  });

  it("paints the rest at once on skip, and finishes", async () => {
    const ops = [stroke(0, steady(900)), stroke(1_500, steady(400, 30))];
    const { painted, start, advance, waiting, player } = setup(ops);
    const { playing } = await start();
    advance(160);
    const before = painted().length;
    player.skip();
    const rest = painted().slice(before);
    expect(rest.map((r) => r.to)).toEqual(ops.map(pointCount));
    await expect(playing).resolves.toBe("done");
    expect(waiting()).toBe(false);
  });

  it("paints the finished ink as soon as it plays when skipped first", async () => {
    const ops = [stroke(0, steady(900)), stroke(1_500, steady(400, 30))];
    const { painted, player } = setup(ops);
    player.skip();
    await expect(player.play()).resolves.toBe("done");
    expect(painted().map((r) => [r.from, r.to])).toEqual(ops.map((op) => [0, pointCount(op)]));
  });

  it("finishes stopped on stop, and asks for no more frames", async () => {
    const { start, advance, waiting, player } = setup([stroke(0, steady(900))]);
    const { playing } = await start();
    advance(160);
    player.stop();
    await expect(playing).resolves.toBe("stopped");
    expect(waiting()).toBe(false);
  });

  it("fails, saying where it stopped and why, when a frame can't paint", async () => {
    const { start, advance } = setup([stroke(0, steady(900)), stroke(1_500, steady(400))]);
    const { playing } = await start();
    vi.mocked(paintStroke).mockImplementationOnce(() => {
      throw new Error("the canvas is lost");
    });
    advance(16);
    await expect(playing).rejects.toThrow(
      "The timelapse stopped at step 1 of 2: the canvas is lost",
    );
  });

  it("shows a stroke drawn outside the sticker's cut whole, shrinking the sheet to fit the stage", async () => {
    const outside: StrokeOp = {
      ...stroke(0, steady(32)),
      pts: [5, 10, 4, 0, 90, 95, 4, 16, 50, 50, 4, 32],
    };
    const { canvas, player } = setup([outside, stroke(500, steady(100))]);
    const { playing, inSpot } = player.layout();
    expect(playing.scale).toBeLessThan(inSpot.scale);
    player.skip();
    await expect(player.play()).resolves.toBe("done");
    const shown = layerShown(1).calls.findLast(([name]) => name === "setTransform") ?? [];
    const [, a = 0, , , d = 0, e = 0, f = 0] = shown.map(Number);
    for (let i = 0; i < outside.pts.length; i += STRIDE) {
      const x = a * outside.pts[i] + e;
      const y = d * outside.pts[i + 1] + f;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(canvas.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(canvas.height);
    }
  });

  it("ends a stroke run past the sheet's edge there, as the drawing screen's canvas did", async () => {
    const pastTheEdge: StrokeOp = {
      ...stroke(0, steady(32)),
      pts: [40, 45, 4, 0, 5, 45, 4, 16, -30, 45, 4, 32],
    };
    const { player } = setup([pastTheEdge]);
    player.skip();
    await expect(player.play()).resolves.toBe("done");
    const { calls } = layerShown(1);
    const names = calls.map(([name]) => name);
    // The stroke paints inside a clip, made under the frame's transform, to the sheet's own rect.
    const painted = names.indexOf("fill");
    const clip = names.lastIndexOf("clip", painted);
    expect(clip).toBeGreaterThan(names.lastIndexOf("setTransform", painted));
    expect(calls[clip - 1]).toEqual(["rect", 0, 0, SHEET.w, SHEET.h]);
  });

  it("clears the ink inside the sticker's cut when the sticker takes it along, once its cut has loaded", () => {
    const takeWith = (cut: CanvasImageSource) => {
      const { display, player } = setup([stroke(0, steady(100))], { cut });
      const drawn: unknown[][] = [];
      vi.spyOn(display, "drawImage").mockImplementation((...args) => {
        drawn.push([display.globalCompositeOperation, ...args]);
      });
      player.takeInk();
      return drawn;
    };
    const cut = document.createElement("canvas");
    expect(takeWith(cut)).toEqual([["destination-out", cut, PLACE.x, PLACE.y, PLACE.w, PLACE.h]]);
    // An image still loading takes nothing.
    expect(takeWith(new Image())).toEqual([]);
  });

  it("is prepared at once when there are no fills, making no canvas", async () => {
    const { player, display } = setup([stroke(0, steady(900))]);
    await expect(player.prepare()).resolves.toBeUndefined();
    expect(madeContexts()).toEqual([display]);
  });
});

describe("the timelapse player's layers", () => {
  const RED = "#ff0000";
  const BLUE = "#0000ff";
  /** Layer 1, under layer 2. */
  const TWO_LAYERS: LayerState = {
    layers: [1, 2].map((id) => ({ id, opacity: FULL_OPACITY, locked: false, clipped: false })),
    nextId: 3,
  };
  /** A stroke on `layer` in `color`, begun `T` ms into the session. */
  const strokeOn = (layer: LayerId, color: string, T: number): StrokeOp => ({
    ...stroke(T, steady(300)),
    layer,
    color,
  });
  const opaque = (color: string) => [...hexToRgb(color), 255];
  /** The display's pixel in its middle, where the sheet shows. */
  const shownMiddle = (display: FakeContext) => [
    ...display.getImageData(STAGE.width / 2, STAGE.height / 2, 1, 1).data,
  ];

  beforeEach(() => {
    // The fake canvas paints no paths, so each stroke inks its whole layer in its color instead.
    vi.mocked(paintStroke).mockImplementation((g, op) => {
      const pixels = new ImageData(g.canvas.width, g.canvas.height);
      const color = op.tool === "brush" ? opaque(op.color) : [0, 0, 0, 0];
      for (let i = 0; i < pixels.data.length; i += 4) pixels.data.set(color, i);
      g.putImageData(pixels, 0, 0);
    });
  });

  it("plays a stroke on a layer added under another beneath that layer's ink, though drawn after it", async () => {
    const { display, playToEnd } = setup([
      strokeOn(1, BLUE, 0),
      { ...addLayer(2, 0), T: 500 },
      strokeOn(2, RED, 900),
    ]);
    await playToEnd();
    expect(shownMiddle(display)).toEqual(opaque(BLUE));
  });

  it("fades a deleted layer's ink out over its beat, and it's gone by the end", async () => {
    const { display, schedule, start, advance } = setup(
      [strokeOn(1, RED, 0), strokeOn(2, BLUE, 500), { ...deleteLayer(2), T: 1_000 }],
      { layers: TWO_LAYERS },
    );
    const beat = beatAt(schedule, 2);
    const { playing } = await start();
    // The first frame starts the clock at 0, so after `ms` of frames it has played `ms - 16`.
    advance((beat.start + beat.end) / 2 + 16);
    const fading = shownMiddle(display);
    expect(fading).not.toEqual(opaque(BLUE));
    expect(fading).not.toEqual(opaque(RED));
    advance(schedule.length);
    await expect(playing).resolves.toBe("done");
    expect(shownMiddle(display)).toEqual(opaque(RED));
  });
});

describe("the timelapse player's fills", () => {
  /** The middle of a pixel at density 1, as the timelapse stores a tap. */
  const TAP = { x: 40.5, y: 50.5 };
  /** A line, a fill, and a line over it. */
  const sticker = (): Op[] => {
    const fill: FillOp = { tool: "fill", layer: 1, color: "#ff0000", ...TAP, gap: 0, T: 500 };
    return [stroke(0, steady(300)), fill, stroke(800, steady(300))];
  };
  /** The circles a reveal clipped the layer to, in order: the arc just before each such clip. */
  const clips = ({ calls }: FakeContext) =>
    calls.flatMap((call, i) =>
      call[0] === "clip" && calls[i - 1]?.[0] === "arc" ? [calls[i - 1]] : [],
    );
  const draws = ({ calls }: FakeContext) => calls.filter(([name]) => name === "drawImage");
  /** The canvases made that still hold memory. */
  const heldCanvases = () =>
    madeContexts()
      .map((context) => context.canvas)
      .filter((canvas) => canvas.width > 0 || canvas.height > 0);

  it("reveals a fill on its layer inside a circle growing from its tap, then whole", async () => {
    const { player, playToEnd } = setup(sticker());
    await player.prepare();
    await playToEnd();

    const onLayer = layerShown(1);
    const circles = clips(onLayer);
    expect(circles.length).toBeGreaterThan(1);
    // At a screen density of 1, the stage's px are the display's.
    const at = player.layout().playing;
    const tap = [at.left + TAP.x * at.scale, at.top + TAP.y * at.scale];
    for (const [, x, y] of circles) {
      expect(x).toBeCloseTo(tap[0]);
      expect(y).toBeCloseTo(tap[1]);
    }
    const radii = circles.map(([, , , r]) => Number(r));
    expect(radii).toEqual(radii.toSorted((a, b) => a - b));
    expect(draws(onLayer)).toHaveLength(circles.length + 1);
  });

  it("notes how long preparing its fills took, for the performance recorder", async () => {
    const { player } = setup(sticker());
    await player.prepare();
    expect(notePerformance).toHaveBeenCalledWith(
      "timelapse",
      expect.stringMatching(/^prepared 1 fill in \d+ ms/),
    );
  });

  it("reveals fills whole at once under reduced motion, in no beat, so the strokes after start sooner", async () => {
    const { player, start, advance, schedule, steps, painted } = setup(sticker(), {
      reduced: true,
    });
    const after = strokeAt(schedule, 2);
    const withBeat = strokeAt(scheduleTimelapse(steps, { reduced: false }), 2).at[0];
    expect(withBeat).toBeGreaterThan(after.at[0]);
    await player.prepare();
    const { playing } = await start();
    // The first frame starts the clock at 0, so after `ms` of frames it has played `ms - 16`.
    advance((after.at[0] + withBeat) / 2 + 16);
    expect(painted().some((range) => range.op.T === after.op.T)).toBe(true);
    advance(schedule.length);
    await expect(playing).resolves.toBe("done");
    expect(clips(layerShown(1))).toEqual([]);
    expect(draws(layerShown(1))).toHaveLength(1);
  });

  it("reveals its fills whole at once from when reduced motion is turned on mid-play", async () => {
    const { player, start, advance, schedule } = setup(sticker());
    await player.prepare();
    const { playing } = await start();
    advance(32);
    player.setReduced(true);
    advance(schedule.length + 32);
    await expect(playing).resolves.toBe("done");
    expect(clips(layerShown(1))).toEqual([]);
    expect(draws(layerShown(1))).toHaveLength(1);
  });

  it("reveals the fills still to come whole on skip", async () => {
    const { player, start, advance } = setup(sticker());
    await player.prepare();
    const { playing } = await start();
    advance(32);
    player.skip();
    await expect(playing).resolves.toBe("done");
    expect(clips(layerShown(1))).toEqual([]);
    expect(draws(layerShown(1))).toHaveLength(1);
  });

  it("lets go of every canvas it made once done, keeping the display's", async () => {
    const { canvas, player, playToEnd } = setup(sticker());
    await player.prepare();
    await playToEnd();
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("lets go of every canvas it made when stopped mid-reveal", async () => {
    const { canvas, player, start, advance, schedule } = setup(sticker());
    await player.prepare();
    await start();
    const reveal = beatAt(schedule, 1);
    // The first frame starts the clock at 0, so after `ms` of frames it has played `ms - 16`.
    advance((reveal.start + reveal.end) / 2 + 16);
    expect(clips(layerShown(1)).length).toBeGreaterThan(0);
    player.stop();
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("ends the prepare pass when stopped while preparing, and play finishes stopped", async () => {
    const { canvas, player } = setup(sticker());
    const preparing = player.prepare();
    player.stop();
    await expect(preparing).resolves.toBeUndefined();
    await expect(player.play()).resolves.toBe("stopped");
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("fails to prepare and to play, saying which fill failed", async () => {
    vi.spyOn(LayerInk.prototype, "flood").mockImplementation(() => {
      throw new Error("out of memory");
    });
    const { player } = setup(sticker());
    const failure = "Preparing the timelapse's fill 1 of 1 failed: out of memory";
    await expect(player.prepare()).rejects.toThrow(failure);
    await expect(player.play()).rejects.toThrow(failure);
  });
});
