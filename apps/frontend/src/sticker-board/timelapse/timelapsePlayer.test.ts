// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { InkSurface } from "../../sticker-creation/canvas/inkSurface";
import { STRIDE, type FillOp, type Op, type StrokeOp } from "../../sticker-creation/canvas/ops";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";
import { decodeTimelapse, encodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import { notePerformance } from "../../performance/performanceRecorder";
import { contextOf, forgetContexts, madeContexts, type FakeContext } from "./testCanvas";
import { handFrames } from "./testTimelapse";
import { MAX_FRAME_MS, createTimelapsePlayer } from "./timelapsePlayer";
import { scheduleTimelapse, type ScheduledStroke } from "./timelapseSchedule";

vi.mock("../../sticker-creation/canvas/context2d", async () => {
  const { fakeContext2d } = await import("./testCanvas");
  return { context2d: fakeContext2d };
});
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
  color: "#1c1824",
  T,
  pts: ms.flatMap((t, i) => [35 + (i % 30), 45, 4, t]),
});
const steady = (ms: number, step = 16) =>
  Array.from({ length: Math.floor(ms / step) + 1 }, (_, i) => i * step);
const pointCount = (op: StrokeOp) => op.pts.length / STRIDE;

const sameObject = (a: object, b: object | undefined) => a === b;

function setup(
  ops: Op[],
  { reduced = false, cut }: { reduced?: boolean; cut?: CanvasImageSource } = {},
) {
  const timelapse = encodeTimelapse({ ops, frame: SHEET, place: PLACE });
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
  const schedule = scheduleTimelapse(decodeTimelapse(timelapse).ops, { reduced });
  /** The point ranges painted on the display, in the order painted. */
  const painted = () =>
    vi
      .mocked(paintStroke)
      .mock.calls.filter(([g]) => sameObject(g, display))
      .map(([, op, from = 0, to = pointCount(op)]) => ({ op, from, to }));
  /** Starts playing, and waits for its first frame to be asked for. */
  const start = async () => {
    const playing = player.play();
    await vi.waitFor(() => expect(clock.waiting()).toBe(true));
    return { playing };
  };
  return { canvas, player, display, schedule, painted, start, ...clock };
}

/** How many of a stroke's points are due by playback time `t`. */
const dueBy = (scheduled: ScheduledStroke, t: number) =>
  scheduled.at.filter((at) => at <= t).length;
const strokeAt = (schedule: ReturnType<typeof scheduleTimelapse>, index: number) => {
  const scheduled = schedule.ops[index];
  if (scheduled.kind !== "stroke") throw new Error(`op ${index} is a fill`);
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
  vi.mocked(paintStroke).mockClear();
  forgetContexts();
});

describe("the timelapse player", () => {
  it.each([
    [2, 2],
    [4, MAX_DPR],
  ])(
    "covers the stage at a screen density of %s, and plays a sticker drawn within its cut in its spot",
    (screen, density) => {
      vi.stubGlobal("devicePixelRatio", screen);
      const { canvas, display } = setup([stroke(0, steady(100))]);
      expect([canvas.width, canvas.height]).toEqual([
        STAGE.width * density,
        STAGE.height * density,
      ]);
      const scale = (density * FIGURE.w) / PLACE.w;
      expect(display?.calls).toContainEqual([
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
    await expect(playing).rejects.toThrow("The timelapse stopped at op 1 of 2: the canvas is lost");
  });

  it("shows a stroke drawn outside the sticker's cut whole, shrinking the sheet to fit the stage", () => {
    const outside: StrokeOp = {
      ...stroke(0, steady(32)),
      pts: [5, 10, 4, 0, 90, 95, 4, 16, 50, 50, 4, 32],
    };
    const { canvas, display, player } = setup([outside, stroke(500, steady(100))]);
    const { playing, inSpot } = player.layout();
    expect(playing.scale).toBeLessThan(inSpot.scale);
    const shown = display?.calls.findLast(([name]) => name === "setTransform") ?? [];
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
    const { display, player } = setup([pastTheEdge]);
    player.skip();
    await expect(player.play()).resolves.toBe("done");
    const calls = display?.calls ?? [];
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
      if (!display) throw new Error("the player made no display");
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

describe("the timelapse player's fills", () => {
  /** The middle of a pixel at density 1, as the timelapse stores a tap. */
  const TAP = { x: 40.5, y: 50.5 };
  /** A line, a fill, and a line over it. */
  const sticker = (): Op[] => {
    const fill: FillOp = { tool: "fill", color: "#ff0000", ...TAP, gap: 0, T: 500 };
    return [stroke(0, steady(300)), fill, stroke(800, steady(300))];
  };
  /** The circles a reveal clipped the display to, in order: the arc just before each such clip. */
  const clips = (display: FakeContext | undefined) =>
    (display?.calls ?? []).flatMap((call, i, calls) =>
      call[0] === "clip" && calls[i - 1]?.[0] === "arc" ? [calls[i - 1]] : [],
    );
  const draws = (display: FakeContext | undefined) =>
    (display?.calls ?? []).filter(([name]) => name === "drawImage");
  /** The canvases made that still hold memory. */
  const heldCanvases = () =>
    madeContexts()
      .map((context) => context.canvas)
      .filter((canvas) => canvas.width > 0 || canvas.height > 0);

  it("reveals a fill inside a circle growing from its tap, then whole", async () => {
    const { display, player, start, advance, schedule } = setup(sticker());
    await player.prepare();
    const { playing } = await start();
    advance(schedule.length + 32);
    await expect(playing).resolves.toBe("done");

    const circles = clips(display);
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
    expect(draws(display)).toHaveLength(circles.length + 1);
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
    const { display, player, start, advance, schedule, painted } = setup(sticker(), {
      reduced: true,
    });
    const after = strokeAt(schedule, 2);
    const ops = schedule.ops.map((scheduled) => scheduled.op);
    const withBeat = strokeAt(scheduleTimelapse(ops, { reduced: false }), 2).at[0];
    expect(withBeat).toBeGreaterThan(after.at[0]);
    await player.prepare();
    const { playing } = await start();
    // The first frame starts the clock at 0, so after `ms` of frames it has played `ms - 16`.
    advance((after.at[0] + withBeat) / 2 + 16);
    expect(painted().some((range) => range.op.T === after.op.T)).toBe(true);
    advance(schedule.length);
    await expect(playing).resolves.toBe("done");
    expect(clips(display)).toEqual([]);
    expect(draws(display)).toHaveLength(1);
  });

  it("reveals its fills whole at once from when reduced motion is turned on mid-play", async () => {
    const { display, player, start, advance, schedule } = setup(sticker());
    await player.prepare();
    const { playing } = await start();
    advance(32);
    player.setReduced(true);
    advance(schedule.length + 32);
    await expect(playing).resolves.toBe("done");
    expect(clips(display)).toEqual([]);
    expect(draws(display)).toHaveLength(1);
  });

  it("reveals the fills still to come whole on skip", async () => {
    const { display, player, start, advance } = setup(sticker());
    await player.prepare();
    const { playing } = await start();
    advance(32);
    player.skip();
    await expect(playing).resolves.toBe("done");
    expect(clips(display)).toEqual([]);
    expect(draws(display)).toHaveLength(1);
  });

  it("lets go of every canvas it made once done, keeping the display's", async () => {
    const { canvas, player, start, advance, schedule } = setup(sticker());
    await player.prepare();
    const { playing } = await start();
    advance(schedule.length + 32);
    await playing;
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("lets go of every canvas it made when stopped mid-reveal", async () => {
    const { canvas, display, player, start, advance } = setup(sticker());
    await player.prepare();
    await start();
    for (let frames = 0; clips(display).length === 0 && frames < 1_000; frames++) advance(16);
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
    vi.spyOn(InkSurface.prototype, "flood").mockImplementation(() => {
      throw new Error("out of memory");
    });
    const { player } = setup(sticker());
    const failure = "Preparing the timelapse's fill 1 of 1 failed: out of memory";
    await expect(player.prepare()).rejects.toThrow(failure);
    await expect(player.play()).rejects.toThrow(failure);
  });
});
