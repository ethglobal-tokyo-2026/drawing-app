// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { InkSurface, MAX_DPR } from "../../sticker-creation/canvas/inkSurface";
import { STRIDE, type FillOp, type Op, type StrokeOp } from "../../sticker-creation/canvas/ops";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { decodeTimelapse, encodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import { notePerformance } from "../../performance/performanceRecorder";
import type { FrameSource } from "../../ui/frameSource";
import { contextOf, forgetContexts, madeContexts, type FakeContext } from "./testCanvas";
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

/** The sheet is 100 sheet px square, drawn at density 1; the sticker's image covers `PLACE`. */
const PLACE = { x: 20, y: 30, w: 60, h: 40 };
/** The figure's box, CSS px: 2 per sheet px. */
const BOX = { width: 120, height: 80 };

const stroke = (T: number, ms: readonly number[]): StrokeOp => ({
  tool: "brush",
  color: "#1c1824",
  T,
  pts: ms.flatMap((t, i) => [30 + i, 40, 4, t]),
});
const steady = (ms: number, step = 16) =>
  Array.from({ length: Math.floor(ms / step) + 1 }, (_, i) => i * step);
const pointCount = (op: StrokeOp) => op.pts.length / STRIDE;

/** Frames a test hands out: `advance(ms)` runs one every `step` ms, up to `ms` later. */
function fakeFrames() {
  let time = 1_000;
  let pending: ((t: number) => void) | null = null;
  const frames: FrameSource = {
    now: () => time,
    request(frame) {
      pending = frame;
      return () => {
        if (pending === frame) pending = null;
      };
    },
  };
  const advance = (ms: number, step = 16) => {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + step);
      const frame = pending;
      pending = null;
      frame?.(time);
    }
  };
  return { frames, advance, waiting: () => pending !== null };
}

const sameObject = (a: object, b: object | undefined) => a === b;

function setup(ops: Op[], { reduced = false } = {}) {
  const timelapse = encodeTimelapse({
    ops,
    ink: { width: 100, height: 100 },
    place: PLACE,
    density: 1,
  });
  const canvas = document.createElement("canvas");
  const clock = fakeFrames();
  const player = createTimelapsePlayer({
    timelapse,
    canvas,
    width: BOX.width,
    image: { width: PLACE.w, height: PLACE.h },
    reduced,
    frames: clock.frames,
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
    "sizes the canvas to its box at a screen density of %s, and draws the sheet through the sticker's crop",
    (screen, density) => {
      vi.stubGlobal("devicePixelRatio", screen);
      const { canvas, display } = setup([stroke(0, steady(100))]);
      expect([canvas.width, canvas.height]).toEqual([BOX.width * density, BOX.height * density]);
      const scale = (density * BOX.width) / PLACE.w;
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

  it("is prepared at once when there are no fills, making no canvas", async () => {
    const { player, display } = setup([stroke(0, steady(900))]);
    await expect(player.prepare()).resolves.toBeUndefined();
    expect(madeContexts()).toEqual([display]);
  });
});

describe("the timelapse player's fills", () => {
  const TAP = { x: 40, y: 50 };
  /** A line, a fill, and a line over it. */
  const drawing = (): Op[] => {
    const fill: FillOp = { tool: "fill", color: "#ff0000", ...TAP, T: 500 };
    return [stroke(0, steady(300)), fill, stroke(800, steady(300))];
  };
  /** The circles the display was clipped to, in order: the arc just before each clip. */
  const clips = (display: FakeContext | undefined) =>
    (display?.calls ?? []).flatMap((call, i, calls) => (call[0] === "clip" ? [calls[i - 1]] : []));
  const draws = (display: FakeContext | undefined) =>
    (display?.calls ?? []).filter(([name]) => name === "drawImage");
  /** The canvases made that still hold memory. */
  const heldCanvases = () =>
    madeContexts()
      .map((context) => context.canvas)
      .filter((canvas) => canvas.width > 0 || canvas.height > 0);

  it("reveals a fill inside a circle growing from its tap, then whole", async () => {
    const { display, player, start, advance, schedule } = setup(drawing());
    await player.prepare();
    const { playing } = await start();
    advance(schedule.length + 32);
    await expect(playing).resolves.toBe("done");

    const circles = clips(display);
    expect(circles.length).toBeGreaterThan(1);
    // At a screen density of 1, the box shows 2 px per sheet px.
    const tap = [(TAP.x - PLACE.x) * 2, (TAP.y - PLACE.y) * 2];
    for (const [, x, y] of circles) expect([x, y]).toEqual(tap);
    const radii = circles.map(([, , , r]) => Number(r));
    expect(radii).toEqual(radii.toSorted((a, b) => a - b));
    expect(draws(display)).toHaveLength(circles.length + 1);
  });

  it("notes how long preparing its fills took, for the performance recorder", async () => {
    const { player } = setup(drawing());
    await player.prepare();
    expect(notePerformance).toHaveBeenCalledWith(
      "timelapse",
      expect.stringMatching(/^prepared 1 fill in \d+ ms$/),
    );
  });

  it("reveals fills whole at once under reduced motion", async () => {
    const { display, player, start, advance, schedule } = setup(drawing(), { reduced: true });
    await player.prepare();
    const { playing } = await start();
    advance(schedule.length + 32);
    await expect(playing).resolves.toBe("done");
    expect(clips(display)).toEqual([]);
    expect(draws(display)).toHaveLength(1);
  });

  it("reveals its fills whole at once from when reduced motion is turned on mid-play", async () => {
    const { display, player, start, advance, schedule } = setup(drawing());
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
    const { display, player, start, advance } = setup(drawing());
    await player.prepare();
    const { playing } = await start();
    advance(32);
    player.skip();
    await expect(playing).resolves.toBe("done");
    expect(clips(display)).toEqual([]);
    expect(draws(display)).toHaveLength(1);
  });

  it("lets go of every canvas it made once done, keeping the display's", async () => {
    const { canvas, player, start, advance, schedule } = setup(drawing());
    await player.prepare();
    const { playing } = await start();
    advance(schedule.length + 32);
    await playing;
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("lets go of every canvas it made when stopped mid-reveal", async () => {
    const { canvas, display, player, start, advance } = setup(drawing());
    await player.prepare();
    await start();
    for (let frames = 0; clips(display).length === 0 && frames < 1_000; frames++) advance(16);
    player.stop();
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("ends the prepare pass when stopped while preparing, and play finishes stopped", async () => {
    const { canvas, player } = setup(drawing());
    const preparing = player.prepare();
    player.stop();
    await expect(preparing).resolves.toBeUndefined();
    await expect(player.play()).resolves.toBe("stopped");
    expect(heldCanvases()).toEqual([canvas]);
  });

  it("fails to prepare and to play, saying which fill failed", async () => {
    vi.spyOn(InkSurface.prototype, "apply").mockImplementation((op) => {
      if (op.tool === "fill") throw new Error("out of memory");
    });
    const { player } = setup(drawing());
    const failure = "Preparing the timelapse's fill 1 of 1 failed: out of memory";
    await expect(player.prepare()).rejects.toThrow(failure);
    await expect(player.play()).rejects.toThrow(failure);
  });
});
