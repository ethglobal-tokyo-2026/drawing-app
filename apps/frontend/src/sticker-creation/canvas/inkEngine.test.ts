// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { contextOf, forgetContexts, madeContexts } from "../../sticker-board/timelapse/testCanvas";
import { LayerInk } from "../layers/layerInk";
import { FIRST_LAYER, FIRST_LAYERS, MAX_LAYERS, type LayerState } from "../layers/layerState";
import type { SheetDisplay } from "../layers/sheetDisplay";
import { addLayer, deleteLayer } from "../layers/testLayerSteps";
import type { LayerView } from "../layers/layerView";
import type { Rect } from "../sealing/stickerPasses";
import { CanvasUnavailableError } from "./canvasUnavailable";
import { PALM_CONTACT_PX, YOUNG_MS } from "./gestures";
import {
  CANCEL_KEEPS,
  FILL_TAP_SLOP,
  INK_WORK,
  InkEngine,
  type HoverRing,
  type InkSettings,
  type PointerInput,
} from "./inkEngine";
import { STRIDE, type LayerId, type Op, type StrokeOp } from "./ops";
import {
  areaFrame,
  frameFor,
  MAX_INK_PIXELS,
  SHEET_SHORT_UNITS,
  type SheetArea,
  type SheetFrame,
} from "./sheetFrame";
import { FIRST_SMOOTHING, PAUSE_MS, Stabilizer } from "./stabilizer";

vi.mock("./context2d", () => import("./testContext2d"));

/** The labels the engine's work was timed under, as the performance recorder hears them. */
const timed = vi.hoisted((): string[] => []);
vi.mock("../../performance/performanceRecorder", () => ({
  timeOurWork: <T>(label: string, work: () => T): T => {
    timed.push(label);
    return work();
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  forgetContexts();
});

/** Records what the engine asks the display to do; it shows nothing. */
class RecordingDisplay implements SheetDisplay {
  /** Every call, by name, in order. */
  calls: string[] = [];
  /** The stroke the display was handed as it began. */
  stroke: StrokeOp | null = null;
  /** The furthest right any point painted on the wet canvas reached, in sheet units. */
  reach = -Infinity;
  /** The held-back span the last frame painted. */
  tail: readonly number[] = [];
  /** The layers last shown, and the current one among them. */
  shown: { state: LayerState; current: LayerId } | null = null;
  /** Each box the current layer's ink was said to change in, as a fill changes it. */
  changed: Rect[] = [];

  resize() {
    this.calls.push("resize");
  }
  show(state: LayerState, current: LayerId) {
    this.calls.push("show");
    this.shown = { state, current };
  }
  showCurrent() {
    this.calls.push("showCurrent");
  }
  previewOpacity(opacity: number | null) {
    this.calls.push(`previewOpacity:${opacity}`);
  }
  inkChanged(box: Rect) {
    this.calls.push("inkChanged");
    this.changed.push(box);
  }
  beginStroke(op: StrokeOp) {
    this.calls.push("beginStroke");
    this.stroke = op;
  }
  paintStroke(from: number, to: number) {
    this.calls.push("paintStroke");
    const pts = this.stroke?.pts ?? [];
    for (let i = from; i < to; i++) this.reach = Math.max(this.reach, pts[i * STRIDE]);
  }
  paintTail(pts: readonly number[]) {
    this.calls.push("paintTail");
    this.tail = pts;
  }
  endStroke() {
    this.calls.push("endStroke");
  }
  flash() {
    this.calls.push("flash");
  }
  release() {
    this.calls.push("release");
  }
}

/** Smoothing at its Smooth end. */
const SMOOTH = 100;
/** ms between a display's frames. */
const FRAME_MS = 1000 / 60;
/** A row of this many steps, this many sheet units each: a stroke a finger draws quickly or slowly. */
const ROW_STEPS = 24;
const ROW_STEP = 10;
/** ms between a quick finger's samples, and a slow one's. */
const QUICK_MS = 1;
const SLOW_MS = 60;
/** The sheet's room on screen: a sheet that fits it exactly shows at scale 1. */
const AREA: SheetArea = { width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 };
/** The same room with the screen turned. */
const TURNED: SheetArea = { width: AREA.height, height: AREA.width };
/** A stroke kept from before a reload. */
const KEPT: StrokeOp = { tool: "brush", layer: 1, color: "#1C1824", pts: [10, 10, 7, 0], T: 0 };

/** A fingertip's contact, well under a palm's. */
const FINGERTIP = PALM_CONTACT_PX / 4;
const palmSized = (input: PointerInput): PointerInput => ({
  ...input,
  width: PALM_CONTACT_PX,
  height: PALM_CONTACT_PX,
});

const SETTINGS: InkSettings = {
  tool: "brush",
  color: "#1C1824",
  size: 7,
  smoothing: 0,
  locked: false,
  paused: false,
  inputMode: null,
  penPressure: "normal",
  sessionMs: () => 0,
};

function setup(settings: Partial<InkSettings> = {}) {
  const ink = new LayerInk();
  const display = new RecordingDisplay();
  const events = {
    onHistory: vi.fn(),
    onCommit: vi.fn<(op: Op) => void>(),
    onBlocked: vi.fn(),
    onBlockedHidden: vi.fn(),
    onInkFailed: vi.fn(),
    onLayers: vi.fn<(view: LayerView) => void>(),
    onPen: vi.fn(),
    onHover: vi.fn<(ring: HoverRing | null) => void>(),
  };
  let frame: ((time: number) => void) | null = null;
  /** The latest time an input was stamped with: a frame runs at it unless told otherwise. */
  let latest = 0;
  const engine = new InkEngine(ink, display, { ...SETTINGS, ...settings }, events, {
    now: () => latest,
    request(cb) {
      frame = cb;
      return () => (frame = null);
    },
  });
  engine.fit(AREA, 1);
  const at = (
    pointerType: string,
    pointerId: number,
    x: number,
    y: number,
    t: number,
    pressure = pointerType === "pen" ? 0.6 : 0,
  ): PointerInput => {
    latest = Math.max(latest, t);
    return {
      pointerId,
      pointerType,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
      pressure,
      width: pointerType === "touch" ? FINGERTIP : 1,
      height: pointerType === "touch" ? FINGERTIP : 1,
      timeStamp: t,
      preventDefault() {},
    };
  };
  /** Runs the animation frame the engine asked for, if it asked, at `time`. */
  const runFrame = (time = latest) => {
    const run = frame;
    frame = null;
    run?.(time);
  };
  /**
   * A pointer landing at `from`, moving in 10px steps 16ms apart, and lifting at `to`; a pen presses
   * `pressure(step)` at each.
   */
  const stroke = (
    pointerType: string,
    id: number,
    from: [number, number],
    to: [number, number],
    t0 = 0,
    pressure?: (step: number) => number,
  ) => {
    const steps = Math.max(1, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 10));
    engine.down(at(pointerType, id, from[0], from[1], t0, pressure?.(0)));
    for (let i = 1; i <= steps; i++) {
      const x = from[0] + ((to[0] - from[0]) * i) / steps;
      const y = from[1] + ((to[1] - from[1]) * i) / steps;
      engine.move(at(pointerType, id, x, y, t0 + i * 16, pressure?.(i)));
      runFrame();
    }
    engine.up(at(pointerType, id, to[0], to[1], t0 + steps * 16 + 16, pressure?.(steps)));
  };
  /** A pointer landing on the first point, through the rest 16ms apart, lifting on the last. */
  const trace = (pointerType: string, id: number, points: [number, number][]) => {
    points.forEach(([x, y], i) => {
      const sample = at(pointerType, id, x, y, i * 16);
      if (i === 0) engine.down(sample);
      else {
        engine.move(sample);
        runFrame();
      }
    });
    const [x, y] = points[points.length - 1];
    engine.up(at(pointerType, id, x, y, points.length * 16));
  };
  /** Fingers landing together at `t`, 60px apart, and lifting 100ms later. */
  const tap = (fingers: number, t: number) => {
    for (let id = 1; id <= fingers; id++)
      engine.down(at("touch", 100 + id, id * 60, 300, t + id * 10));
    for (let id = 1; id <= fingers; id++) engine.up(at("touch", 100 + id, id * 60, 300, t + 100));
  };
  const committed = () => events.onCommit.mock.calls.map(([op]) => op);
  return { engine, ink, display, events, at, runFrame, trace, stroke, tap, committed };
}

/** The engine's frame, which every sheet here has from the start. */
function framed(engine: InkEngine): SheetFrame {
  const { frame } = engine;
  if (!frame) throw new Error("The sheet has no frame");
  return frame;
}

/** Paper at `left`, `top`, `scale` CSS px to the unit, as the drawing screen shows it. */
function paperAt(frame: SheetFrame, left: number, top: number, scale: number) {
  const paper = document.createElement("div");
  paper.getBoundingClientRect = () => new DOMRect(left, top, frame.w * scale, frame.h * scale);
  return paper;
}

const lastPoint = (op: Op) => {
  if (op.tool === "fill") throw new Error("Expected a stroke, got a fill");
  const { pts } = op;
  return [pts[pts.length - STRIDE], pts[pts.length - STRIDE + 1]];
};

/** What the timelapse would play: the ops since the sheet was last blank. */
const drawn = (engine: InkEngine) => engine.timelapse().steps;

/** Every call painted on the layer's own canvas so far; none while it has no canvas. */
const layerCalls = (ink: LayerInk, layer: LayerId = FIRST_LAYER) => {
  const canvas = ink.layerCanvas(layer);
  return canvas ? [...(contextOf(canvas)?.calls ?? [])] : [];
};

/** What onHistory reports. The sheet has ink whenever there's something to undo, unless said otherwise. */
const state = (canUndo: boolean, canRedo: boolean, hasInk = canUndo) => ({
  canUndo,
  canRedo,
  hasInk,
});

describe("InkEngine", () => {
  it("commits a stroke on lift, ending where the pointer lifted", () => {
    const { stroke, committed, events } = setup({ smoothing: SMOOTH });
    stroke("mouse", 1, [0, 0], [200, 0]);
    expect(committed()).toHaveLength(1);
    expect(lastPoint(committed()[0])).toEqual([200, 0]);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false));
  });

  it("at Smooth, inks nothing past the stabilized line while the pointer moves, and glides the line to it once it stops, pen and finger alike", () => {
    for (const pointerType of ["pen", "touch"]) {
      const { engine, at, runFrame, display, committed } = setup({ smoothing: SMOOTH });
      const stabilized = new Stabilizer(0, 0, 0, SMOOTH);
      engine.down(at(pointerType, 1, 0, 0, 0));
      let t = 0;
      for (let i = 1; i <= 20; i++) {
        t = i * 16;
        engine.move(at(pointerType, 1, i * 10, 0, t));
        runFrame();
        const [line] = stabilized.add(i * 10, 0, t);
        expect(display.reach).toBeLessThanOrEqual(line);
        expect(line).toBeLessThan(i * 10);
      }
      // A frame before the nib has been silent long enough leaves the line where its samples put it.
      const trailing = display.reach;
      runFrame(t + FRAME_MS);
      expect(display.reach).toBe(trailing);
      // Stopped, it glides there with no new sample, and lands on the nib.
      runFrame(t + PAUSE_MS);
      expect(display.reach).toBeGreaterThan(trailing);
      for (let time = t + PAUSE_MS; display.reach < 200 && time < t + 10_000; time += FRAME_MS)
        runFrame(time);
      expect(display.stroke && lastPoint(display.stroke)).toEqual([200, 0]);
      engine.up(at(pointerType, 1, 200, 0, t + 10_000));
      const op = committed()[0];
      expect(op.tool === "fill" ? [] : op.pts.slice(0, 2)).toEqual([0, 0]);
    }
  });

  it("draws a quick finger stroke thinner than a slow one at any Smoothing, and keeps the width it lifted with as the line catches up", () => {
    /** A finger's row of `ROW_STEPS` steps, `ms` apart, under a display's frames: its points' widths and times. */
    const row = (smoothing: number, ms: number) => {
      const { engine, at, runFrame, committed } = setup({ smoothing });
      engine.down(at("touch", 1, 0, 0, 0));
      let frame = 0;
      for (let i = 1; i <= ROW_STEPS; i++) {
        for (; frame + FRAME_MS <= i * ms; frame += FRAME_MS) runFrame(frame + FRAME_MS);
        engine.move(at("touch", 1, i * ROW_STEP, 0, i * ms));
      }
      engine.up(at("touch", 1, ROW_STEPS * ROW_STEP, 0, ROW_STEPS * ms + 1));
      const op = committed()[0];
      if (op.tool === "fill") throw new Error("Expected a stroke, got a fill");
      return Array.from({ length: op.pts.length / STRIDE }, (_, i) => ({
        width: op.pts[i * STRIDE + 2],
        t: op.pts[i * STRIDE + 3],
      }));
    };
    const middle = (widths: number[]) => widths.toSorted((a, b) => a - b)[widths.length >> 1];
    for (const smoothing of [0, FIRST_SMOOTHING, SMOOTH]) {
      const quick = row(smoothing, QUICK_MS);
      const slow = row(smoothing, SLOW_MS);
      expect(middle(quick.map((p) => p.width))).toBeLessThan(middle(slow.map((p) => p.width)));
      // Past the finger's last sample the line only catches up to where it lifted.
      const lifted = ROW_STEPS * QUICK_MS;
      const width = quick.findLast((p) => p.t <= lifted)?.width;
      for (const p of quick.filter((point) => point.t > lifted))
        expect(p.width).toBeCloseTo(width ?? NaN);
    }
  });

  it("records the line's catch-up to where a quick pen lifted at the lift's time, as it shows at once", () => {
    const { engine, at, runFrame, committed } = setup({ smoothing: SMOOTH });
    engine.down(at("pen", 1, 0, 0, 0));
    for (let i = 1; i <= ROW_STEPS; i++) {
      engine.move(at("pen", 1, i * ROW_STEP, 0, i * QUICK_MS));
      runFrame();
    }
    const lifted = (ROW_STEPS + 1) * QUICK_MS;
    engine.up(at("pen", 1, ROW_STEPS * ROW_STEP, 0, lifted));
    const op = committed()[0];
    if (op.tool === "fill") throw new Error("Expected a stroke, got a fill");
    const times = Array.from({ length: op.pts.length / STRIDE }, (_, i) => op.pts[i * STRIDE + 3]);
    expect(Math.max(...times)).toBe(lifted);
    expect(lastPoint(op)).toEqual([ROW_STEPS * ROW_STEP, 0]);
  });

  it("at Raw, hands the display the span the curve holds back each frame, out to the newest sample even between samples, and ends the stroke where it lifted", () => {
    const { engine, at, runFrame, display, committed } = setup();
    const tailEnd = () => display.tail.slice(-STRIDE, -STRIDE + 2);
    engine.down(at("touch", 1, 0, 0, 0));
    for (let i = 1; i <= ROW_STEPS; i++) {
      const sample = [i * ROW_STEP, (i % 2) * ROW_STEP];
      const t = i * FRAME_MS;
      engine.move(at("touch", 1, sample[0], sample[1], t));
      runFrame(t);
      expect(tailEnd()).toEqual(sample);
      runFrame(t + FRAME_MS / 2);
      expect(tailEnd()).toEqual(sample);
    }
    const lifted = [ROW_STEPS * ROW_STEP + ROW_STEP / 2, ROW_STEP * 2];
    engine.up(at("touch", 1, lifted[0], lifted[1], (ROW_STEPS + 1) * FRAME_MS));
    expect(lastPoint(committed()[0])).toEqual(lifted);
  });

  it("makes no copy of the layer for a pen stroke: the stroke is on the display's wet canvas until it lifts", () => {
    const { stroke } = setup();
    stroke("pen", 1, [0, 0], [100, 0]);
    const canvases = madeContexts().length;
    stroke("pen", 2, [0, 50], [100, 50], 1000, (step) => 0.3 + step / 20);
    expect(madeContexts()).toHaveLength(canvases);
  });

  it("paints a pen stroke on its layer whole as it lifts, just as a replay of its op paints it", () => {
    const { engine, ink, stroke, committed } = setup({ smoothing: FIRST_SMOOTHING });
    stroke("pen", 1, [0, 0], [200, 60], 0, (step) => 0.2 + step / 40);
    const [op] = committed();
    const replay = new LayerInk();
    replay.setFrame(framed(engine));
    replay.apply(op, FIRST_LAYERS);
    expect(layerCalls(ink).length).toBeGreaterThan(0);
    expect(layerCalls(ink)).toEqual(layerCalls(replay));
  });

  it("takes a stroke back by clearing the display's wet canvas alone: the layer stays as it was, and nothing replays", () => {
    /** A finger's stroke on a sheet that has one stroke already, which `takeBack` takes back. */
    const takenBack = (takeBack: (sheet: ReturnType<typeof setup>) => void) => {
      const sheet = setup({ inputMode: "pencilAndFinger" });
      const { engine, ink, display, at, runFrame, stroke, events } = sheet;
      stroke("pen", 1, [0, 0], [100, 0]);
      const before = layerCalls(ink);
      const apply = vi.spyOn(ink, "apply");
      const restore = vi.spyOn(ink, "restore");
      events.onHistory.mockClear();
      engine.down(at("touch", 2, 0, 50, 1000));
      engine.move(at("touch", 2, 2, 50, 1016));
      runFrame();
      display.calls = [];
      takeBack(sheet);
      expect(display.calls).toContain("endStroke");
      expect(display.calls).not.toContain("show");
      expect(display.calls).not.toContain("showCurrent");
      expect([apply.mock.calls, restore.mock.calls]).toEqual([[], []]);
      expect(layerCalls(ink)).toEqual(before);
      expect(events.onHistory).not.toHaveBeenCalled();
      expect(drawn(engine)).toHaveLength(1);
    };
    // The finger spreads into a palm.
    takenBack(({ engine, at }) => engine.move(palmSized(at("touch", 2, 3, 50, 1032))));
    // A second finger lands on the young stroke: it was the start of a tap.
    takenBack(({ engine, at }) => engine.down(at("touch", 3, 60, 50, 1040)));
    // A pen lands while the finger draws.
    takenBack(({ engine, at }) => engine.down(at("pen", 4, 200, 200, 1040)));
    // The browser takes the finger before it has gone far enough to keep.
    takenBack(({ engine, at }) => engine.cancel(at("touch", 2, 2, 50, 1040)));
  });

  it("takes back a stroke when a second finger lands on it, and undoes on the tap", () => {
    const { engine, at, stroke, committed, events } = setup();
    stroke("touch", 1, [0, 0], [100, 0]);
    engine.down(at("touch", 2, 50, 50, 1000));
    engine.move(at("touch", 2, 54, 50, 1016));
    engine.down(at("touch", 3, 120, 50, 1040));
    engine.up(at("touch", 2, 54, 50, 1150));
    engine.up(at("touch", 3, 120, 50, 1160));
    expect(committed()).toHaveLength(1);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(false, true));
  });

  it("redoes on a three-finger tap", () => {
    const { engine, stroke, tap, events } = setup();
    stroke("mouse", 1, [0, 0], [100, 0]);
    engine.undo();
    tap(3, 2000);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false));
  });

  it("lets fingers draw in Pencil and finger, only tap in Pencil only, and tells of every pen", () => {
    const { engine, stroke, tap, committed, events } = setup({ inputMode: "pencilAndFinger" });
    stroke("pen", 1, [0, 0], [100, 0]);
    expect(events.onPen).toHaveBeenCalledOnce();
    stroke("touch", 2, [0, 50], [100, 50], 1000);
    expect(committed()).toHaveLength(2);
    engine.settings = { ...engine.settings, inputMode: "pencilOnly" };
    stroke("touch", 3, [0, 100], [100, 100], 2000);
    expect(committed()).toHaveLength(2);
    tap(2, 3000);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
  });

  it("judges a palm-sized touch a palm on a device a pen has drawn on: it never draws, and a finger's stroke that spreads into one is taken back", () => {
    /** One touch stroke, palm-sized from where it lands, or once it has moved with `spreads`. */
    const touchStroke = (sheet: ReturnType<typeof setup>, spreads = false) => {
      const contact = (input: PointerInput, landing: boolean) =>
        spreads && landing ? input : palmSized(input);
      sheet.engine.down(contact(sheet.at("touch", 1, 0, 50, 0), true));
      sheet.engine.move(contact(sheet.at("touch", 1, 30, 50, 16), false));
      sheet.runFrame();
      sheet.engine.up(contact(sheet.at("touch", 1, 40, 50, 32), false));
      return sheet.committed();
    };
    // No pen has drawn on a phone, so size judges nothing there.
    expect(touchStroke(setup())).toHaveLength(1);
    for (const spreads of [false, true])
      expect(touchStroke(setup({ inputMode: "pencilAndFinger" }), spreads)).toEqual([]);
  });

  it("undoes on a two-finger tap while a palm rests on the sheet, whatever its size", () => {
    for (const size of [FINGERTIP, PALM_CONTACT_PX]) {
      const { engine, at, stroke, tap, events } = setup({ inputMode: "pencilOnly" });
      stroke("pen", 1, [0, 0], [100, 0]);
      stroke("pen", 2, [0, 20], [100, 20], 500);
      engine.down({ ...at("touch", 90, 300, 600, 1000), width: size, height: size });
      tap(2, 1000 + YOUNG_MS);
      expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
    }
  });

  it("starts a pen stroke at its first sample's pressure once the pen has shown it senses pressure", () => {
    const LIGHT = 0.1;
    const dot = (op: Op | undefined) => (op?.tool === "brush" ? op.pts[2] : NaN);
    const fresh = setup();
    fresh.stroke("pen", 1, [0, 0], [100, 0], 0, () => LIGHT);
    const sensed = setup();
    sensed.stroke("pen", 1, [0, 0], [100, 0], 0, (step) => LIGHT + step / 20);
    sensed.stroke("pen", 2, [0, 50], [100, 50], 1000, () => LIGHT);
    // Until its pressure moves, a light press can't be told from a pen that senses none.
    expect(dot(sensed.committed()[1])).toBeLessThan(dot(fresh.committed()[0]));
  });

  it("rings where a hovering pen would land, as wide as its stroke on screen, and hides it as the pen lands or leaves", () => {
    const { engine, at, display, events } = setup({ penPressure: "off" });
    const hover = (pointerType: string, x: number, t: number) =>
      engine.move({ ...at(pointerType, 1, x, 40, t), buttons: 0 });
    const ring = () => events.onHover.mock.lastCall?.[0];
    // Paper 100px in, two CSS px to the unit.
    const detach = engine.attach(paperAt(framed(engine), 100, 0, 2));
    hover("mouse", 110, 0);
    expect(events.onHover).not.toHaveBeenCalled();
    hover("pen", 140, 10);
    expect(ring()).toEqual({ x: 40, y: 40, diameter: SETTINGS.size * 2 });
    // Under a curve, a middle pressure: narrower than the brush's full size.
    engine.settings = { ...engine.settings, penPressure: "normal" };
    hover("pen", 140, 20);
    expect(ring()?.diameter).toBeLessThan(SETTINGS.size * 2);
    expect(display.calls).not.toContain("paintStroke");
    engine.down(at("pen", 1, 140, 40, 30));
    expect(ring()).toBeNull();
    engine.up(at("pen", 1, 140, 40, 40));
    hover("pen", 150, 50);
    engine.leave();
    expect(ring()).toBeNull();
    // A paused sheet takes no mark, so a hovering pen shows none.
    hover("pen", 150, 60);
    engine.settings = { ...engine.settings, paused: true };
    hover("pen", 160, 70);
    expect(ring()).toBeNull();
    detach();
  });

  it("names its painting, fills, replays and commits for the performance recorder", () => {
    const { engine, stroke } = setup({ tool: "fill" });
    timed.length = 0;
    stroke("touch", 1, [40, 40], [42, 40]);
    engine.settings = { ...engine.settings, tool: "brush" };
    stroke("pen", 2, [0, 0], [100, 0], 1000);
    engine.undo();
    expect(new Set(timed)).toEqual(new Set(Object.values(INK_WORK)));
  });

  it("marks nothing while paused, hinting at once for a mouse and on lift for a touch", () => {
    const { engine, at, stroke, tap, committed, events } = setup({ paused: true });
    engine.down(at("mouse", 1, 0, 0, 0));
    expect(events.onBlocked).toHaveBeenCalledOnce();
    engine.up(at("mouse", 1, 0, 0, 20));
    engine.down(at("touch", 2, 0, 0, 100));
    expect(events.onBlocked).toHaveBeenCalledOnce();
    engine.up(at("touch", 2, 0, 0, 200));
    expect(events.onBlocked).toHaveBeenCalledTimes(2);
    stroke("touch", 3, [0, 0], [100, 0], 300);
    expect(events.onBlocked).toHaveBeenCalledTimes(3);
    tap(2, 1000);
    expect(events.onBlocked).toHaveBeenCalledTimes(3);
    expect(committed()).toEqual([]);
  });

  it("draws nothing with a press that closed a panel, until it lifts, and draws with the next", () => {
    const { engine, stroke, committed, events } = setup({ paused: true });
    engine.swallow(1);
    stroke("touch", 1, [0, 0], [100, 0]);
    expect(events.onBlocked).not.toHaveBeenCalled();
    engine.settings = { ...engine.settings, paused: false };
    engine.swallow(2);
    stroke("pen", 2, [0, 0], [100, 0], 1000);
    expect(committed()).toEqual([]);
    // Pointer ids come back: the same one draws once a press of its own lands.
    stroke("pen", 2, [0, 0], [100, 0], 2000);
    expect(committed()).toHaveLength(1);
  });

  it("fills on a tap, not on a drag, by how far the finger went on screen whatever the sheet's scale", () => {
    for (const scale of [1, 2.5]) {
      const { engine, at, committed } = setup({ tool: "fill" });
      const detach = engine.attach(paperAt(framed(engine), 0, 0, scale));
      /** A finger landing at 40, 40 on screen and lifting `drift` CSS px to its right. */
      const tapAt = (id: number, drift: number, t: number) => {
        engine.down(at("touch", id, 40, 40, t));
        engine.up(at("touch", id, 40 + drift, 40, t + 50));
      };
      tapAt(1, FILL_TAP_SLOP - 1, 0);
      tapAt(2, FILL_TAP_SLOP, 1000);
      detach();
      expect(committed()).toEqual([
        expect.objectContaining({ tool: "fill", x: 40 / scale, y: 40 / scale }),
      ]);
    }
  });

  it("tells the display where a fill changed the current layer's ink", () => {
    const { engine, ink, display, at } = setup({ tool: "fill" });
    const flood = vi.spyOn(ink, "flood");
    const detach = engine.attach(paperAt(framed(engine), 0, 0, 1));
    engine.down(at("touch", 1, 40, 40, 0));
    engine.up(at("touch", 1, 40, 40, 50));
    detach();
    const [filled] = flood.mock.results;
    expect(filled.value).not.toBeNull();
    expect(display.changed).toEqual([filled.value]);
  });

  it("keeps a stroke the browser takes once it has gone far enough, where it was last seen, and fills or undoes nothing for a touch it takes", () => {
    const { engine, at, runFrame, committed, events } = setup();
    /** A finger going `units` right of where it lands, which the browser then takes. */
    const taken = (id: number, units: number, t: number) => {
      engine.down(at("touch", id, 0, 50, t));
      engine.move(at("touch", id, units, 50, t + 16));
      runFrame();
      engine.cancel(at("touch", id, 0, 0, t + 32));
    };
    taken(1, CANCEL_KEEPS, 0);
    taken(2, CANCEL_KEEPS - 1, 1000);
    expect(committed().map(lastPoint)).toEqual([[CANCEL_KEEPS, 50]]);

    engine.settings = { ...engine.settings, tool: "fill" };
    engine.down(at("touch", 3, 40, 40, 2000));
    engine.cancel(at("touch", 3, 40, 40, 2050));
    expect(committed()).toHaveLength(1);

    // Two fingers tap, and the browser takes one of them.
    engine.down(at("touch", 4, 0, 300, 3000));
    engine.down(at("touch", 5, 60, 300, 3010));
    engine.cancel(at("touch", 4, 0, 300, 3100));
    engine.up(at("touch", 5, 60, 300, 3110));
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false));
  });

  it("lets fingers draw again after a tap finger's lift goes missing", () => {
    const { engine, at, stroke, committed } = setup();
    /** Two fingers land for a tap, and the second one's lift never reaches the sheet. */
    const loseAFinger = (t: number) => {
      engine.down(at("touch", 1, 0, 0, t));
      engine.down(at("touch", 2, 60, 0, t + 10));
      engine.up(at("touch", 1, 0, 0, t + 100));
    };
    loseAFinger(0);
    // The last finger leaves the screen, so the next one to land is the only one down.
    engine.screenClear();
    stroke("touch", 3, [0, 50], [100, 50], 1000);
    expect(committed()).toHaveLength(1);
    loseAFinger(2000);
    engine.reset();
    stroke("touch", 4, [0, 50], [100, 50], 3000);
    expect(committed()).toHaveLength(2);
  });

  it("takes nothing back, brings nothing back and clears nothing while the sheet is locked", () => {
    const { engine, at, stroke, events } = setup();
    stroke("mouse", 1, [0, 0], [100, 0]);
    stroke("mouse", 1, [0, 20], [100, 20], 500);
    engine.undo();
    // Two fingers land for an undo as the sheet locks, and lift within the tap window.
    engine.down(at("touch", 2, 0, 50, 1000));
    engine.down(at("touch", 3, 60, 50, 1010));
    engine.settings = { ...engine.settings, locked: true };
    engine.up(at("touch", 2, 0, 50, 1100));
    engine.up(at("touch", 3, 60, 50, 1110));
    expect(drawn(engine)).toHaveLength(1);
    // The undo and redo tiles, or their keys.
    engine.undo();
    expect(drawn(engine)).toHaveLength(1);
    engine.redo();
    expect(drawn(engine)).toHaveLength(1);
    engine.clearLayer();
    expect(drawn(engine)).toHaveLength(1);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
  });

  it("clears a stroke still in progress with the rest, and undo brings them all back", () => {
    const { engine, at, stroke, events } = setup();
    stroke("mouse", 1, [0, 0], [100, 0]);
    // A finger is still drawing as the clear lands.
    engine.down(at("touch", 2, 0, 50, 1000));
    engine.move(at("touch", 2, 40, 50, 1016));
    engine.clearLayer();
    expect(drawn(engine)).toEqual([]);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false, false));
    engine.undo();
    expect(drawn(engine)).toHaveLength(2);
  });

  it("measures a stroke in sheet units, whatever size the sheet is shown at", () => {
    /** A pen stroke along the same units, on paper shown `scale` CSS px to the unit. */
    const drawnAt = (scale: number) => {
      const { engine, trace, committed } = setup();
      const [left, top] = [30, 40];
      const detach = engine.attach(paperAt(framed(engine), left, top, scale));
      trace(
        "pen",
        1,
        Array.from({ length: 11 }, (_, i) => [left + (20 + 10 * i) * scale, top + 50 * scale]),
      );
      detach();
      return committed();
    };
    const ops = drawnAt(1);
    expect(ops.map(lastPoint)).toEqual([[120, 50]]);
    expect(drawnAt(2.5)).toEqual(ops);
  });

  it("places a stroke's samples where the paper is once it's resized mid-stroke", () => {
    const { engine, at, runFrame, committed } = setup();
    const frame = framed(engine);
    const paper = paperAt(frame, 0, 0, 1);
    const detach = engine.attach(paper);
    engine.down(at("pen", 1, 20, 50, 0));
    engine.move(at("pen", 1, 40, 50, 16));
    runFrame();
    // The screen turns: the paper shows at twice the size, further in.
    const [left, top, scale] = [30, 10, 2];
    paper.getBoundingClientRect = () => new DOMRect(left, top, frame.w * scale, frame.h * scale);
    engine.measurePaper();
    engine.move(at("pen", 1, left + 60 * scale, top + 50 * scale, 32));
    runFrame();
    engine.up(at("pen", 1, left + 80 * scale, top + 50 * scale, 48));
    detach();
    expect(committed().map(lastPoint)).toEqual([[80, 50]]);
  });

  it("lets a blank sheet's frame follow its area until the first mark, and again after a reset", () => {
    const { engine, stroke } = setup();
    engine.fit(TURNED, 1);
    expect(engine.frame).toEqual(frameFor(TURNED, 1));
    stroke("mouse", 1, [0, 0], [100, 0]);
    engine.fit(AREA, 1);
    expect(engine.frame).toEqual(frameFor(TURNED, 1));
    engine.reset();
    engine.fit(AREA, 1);
    expect(engine.frame).toEqual(frameFor(AREA, 1));
  });

  it("keeps a drawing's frame through any change of size, so nothing clears or replays", () => {
    const { engine, ink, display, stroke } = setup();
    stroke("mouse", 1, [0, 0], [100, 0]);
    const frame = engine.frame;
    const [setFrame, apply] = [vi.spyOn(ink, "setFrame"), vi.spyOn(ink, "apply")];
    display.calls = [];
    engine.fit(TURNED, 2);
    engine.fit({ width: AREA.width / 2, height: AREA.height / 2 }, 1);
    expect(engine.frame).toBe(frame);
    expect([setFrame.mock.calls, apply.mock.calls, display.calls]).toEqual([[], [], []]);
    expect(drawn(engine)).toHaveLength(1);
  });

  it("puts a kept drawing back in its own frame, and one kept without a frame in its area", () => {
    const { engine } = setup();
    const own = frameFor(TURNED, 2);
    engine.load([KEPT], own, null);
    engine.fit(AREA, 1);
    expect(engine.frame).toBe(own);

    const area = { width: AREA.width * 1.5, height: AREA.height };
    engine.load([KEPT], null, null);
    engine.fit(area, 2);
    engine.fit(AREA, 1);
    expect(engine.frame).toEqual(areaFrame(area, 2));
    expect(drawn(engine)).toEqual([KEPT]);
  });

  it("gives a drawing kept without a frame none until its area is measured, so a save can't keep a blank sheet's", () => {
    const { engine } = setup();
    // The blank sheet that showed before the drawing was put back.
    expect(engine.frame).toEqual(frameFor(AREA, 1));
    engine.load([KEPT], null, null);
    // What the drawing screen's next save keeps with the steps.
    expect(engine.frame).toBeNull();
  });

  it("picks a drawing back up with its clears, so undo walks back through them", () => {
    const { engine, events } = setup();
    const other: StrokeOp = { ...KEPT, pts: [20, 20, 7, 0] };
    engine.load([KEPT, { tool: "clear", layer: 1, T: 0 }, other], framed(engine), null);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false));
    engine.undo();
    engine.undo();
    expect(drawn(engine)).toEqual([KEPT]);
  });

  it("draws on the front layer once a load leaves the sheet without its first", () => {
    const { engine, display, stroke, committed } = setup();
    const front = FIRST_LAYER + 1;
    engine.load([addLayer(front, 1), deleteLayer(FIRST_LAYER)], framed(engine), null);
    expect(display.shown?.current).toBe(front);
    stroke("mouse", 1, [0, 0], [100, 0]);
    expect(committed().map((op) => op.layer)).toEqual([front]);
  });

  it("ends a stroke in progress where it stands as the sheet locks, and drops a fill tap still down", () => {
    const { engine, at, runFrame, committed } = setup();
    engine.down(at("touch", 1, 0, 0, 0));
    engine.move(at("touch", 1, 50, 0, 16));
    runFrame();
    engine.settings = { ...engine.settings, locked: true };
    expect(committed()).toHaveLength(1);
    // The finger carries on and lifts, as it can under the time's-up sheet.
    engine.move(at("touch", 1, 150, 0, 32));
    runFrame();
    engine.up(at("touch", 1, 150, 0, 48));
    expect(committed().map(lastPoint)).toEqual([[50, 0]]);

    engine.settings = { ...engine.settings, locked: false, tool: "fill" };
    engine.down(at("touch", 2, 40, 40, 1000));
    engine.settings = { ...engine.settings, locked: true };
    engine.up(at("touch", 2, 40, 40, 1050));
    expect(committed()).toHaveLength(1);
  });

  it("ends a pen stroke whose lift went missing where it stood once the pen lands again, and draws the new one", () => {
    // WebKit may give the next landing the lost pointer's id, or a new one.
    for (const id of [1, 2]) {
      const { engine, at, runFrame, stroke, committed } = setup();
      engine.down(at("pen", 1, 0, 0, 0));
      engine.move(at("pen", 1, 50, 0, 16));
      runFrame();
      stroke("pen", id, [0, 50], [100, 50], 1000);
      const [stale, next] = committed();
      expect(lastPoint(stale)).toEqual([50, 0]);
      expect(next?.tool === "fill" ? [] : next?.pts.slice(0, 2)).toEqual([0, 50]);
    }
  });

  it("ends a pen stroke where the Pencil lifted once its touch ends before or without its pointerup, and not when only a finger's does", () => {
    const { engine, at, runFrame, stroke, committed } = setup({ inputMode: "pencilAndFinger" });
    // Paper at the screen's corner, one CSS px to the unit, so the screen's points are the sheet's.
    const detach = engine.attach(paperAt(framed(engine), 0, 0, 1));
    /** The screen's touchend for a touch of this type lifting at x, with no touch left down. */
    const touchEnds = (touchType: string, x: number) =>
      document.dispatchEvent(
        new TouchEvent("touchend", {
          touches: [],
          changedTouches: [
            Object.assign(
              new Touch({ identifier: 1, target: document.body, clientX: x, clientY: 0 }),
              { touchType },
            ),
          ],
        }),
      );
    engine.down(at("pen", 1, 0, 0, 0));
    engine.move(at("pen", 1, 50, 0, 16));
    runFrame();
    touchEnds("direct", 70);
    expect(committed()).toEqual([]);
    touchEnds("stylus", 70);
    expect(committed().map(lastPoint)).toEqual([[70, 0]]);
    // The Pencil's pointerup, coming after its touchend, ends nothing more.
    engine.up(at("pen", 1, 70, 0, 32));
    expect(committed()).toHaveLength(1);
    // Fingers draw again.
    stroke("touch", 2, [0, 50], [100, 50], 1000);
    expect(committed()).toHaveLength(2);
    detach();
  });

  it("takes a two-finger tap begun just before a pen lands as the hand resting: it undoes nothing", () => {
    for (const inputMode of ["pencilOnly", "pencilAndFinger"] as const) {
      const { engine, at, runFrame, stroke, committed, events } = setup({ inputMode });
      stroke("pen", 1, [0, 0], [100, 0]);
      engine.down(at("touch", 2, 300, 600, 1000));
      engine.down(at("touch", 3, 360, 600, 1050));
      engine.down(at("pen", 4, 0, 50, 1100));
      engine.move(at("pen", 4, 50, 50, 1116));
      runFrame();
      engine.up(at("touch", 2, 300, 600, 1250));
      engine.up(at("touch", 3, 360, 600, 1270));
      engine.move(at("pen", 4, 100, 50, 1300));
      runFrame();
      engine.up(at("pen", 4, 100, 50, 1316));
      expect(committed()).toHaveLength(2);
      expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false));
    }
  });

  it("gives a resting finger's fill tap way to a pen landing, and fills nothing where a palm settles", () => {
    const { engine, at, committed } = setup({ tool: "fill", inputMode: "pencilAndFinger" });
    engine.down(at("touch", 1, 300, 600, 0));
    engine.down(at("pen", 2, 100, 100, 50));
    engine.up(at("pen", 2, 100, 100, 100));
    engine.up(at("touch", 1, 300, 600, 200));
    // A fingertip that spreads into a palm as it settles never meant its fill.
    engine.down(at("touch", 3, 200, 200, 1000));
    engine.move(palmSized(at("touch", 3, 201, 200, 1016)));
    engine.up(palmSized(at("touch", 3, 201, 200, 1032)));
    expect(committed()).toEqual([expect.objectContaining({ tool: "fill", x: 100, y: 100 })]);
  });

  it("draws a stroke at Raw the same whatever the display's frame rate", () => {
    /** A finger's quick half circle at Raw, a frame between samples, with `extra` frames more. */
    const arc = (extra: number) => {
      const { engine, at, runFrame, committed } = setup();
      engine.down(at("touch", 1, 200, 100, 0));
      for (let i = 1; i <= ROW_STEPS; i++) {
        const angle = (i / ROW_STEPS) * Math.PI;
        const t = i * FRAME_MS;
        engine.move(at("touch", 1, 100 + 100 * Math.cos(angle), 100 + 100 * Math.sin(angle), t));
        runFrame(t);
        for (let f = 1; f <= extra; f++) runFrame(t + (f * FRAME_MS) / (extra + 1));
      }
      engine.up(at("touch", 1, 0, 100, (ROW_STEPS + 1) * FRAME_MS));
      return committed();
    };
    expect(arc(1)).toEqual(arc(0));
  });

  it("lets a blank sheet's frame follow its area again once its only stroke is taken back", () => {
    const { engine, at, tap } = setup();
    engine.down(at("touch", 1, 0, 0, 0));
    // Two fingers land on the young stroke: it was the start of a tap.
    tap(2, 50);
    engine.fit(TURNED, 1);
    expect(engine.frame).toEqual(frameFor(TURNED, 1));
  });

  it("adds above the current layer and stops at the layer limit", () => {
    const { engine, events } = setup();
    engine.addLayer();
    engine.selectLayer(FIRST_LAYER);
    engine.addLayer();
    expect(engine.steps.at(-1)).toEqual({ tool: "add", layer: 3, at: 1, T: 0 });
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(3);
    for (let layers = 3; layers < MAX_LAYERS; layers++) engine.addLayer();
    const count = engine.steps.length;
    engine.addLayer();
    expect(engine.steps).toHaveLength(count);
  });

  it("deletes toward the layer below, or toward the one above at the back", () => {
    const { engine, events } = setup();
    engine.addLayer();
    engine.addLayer();
    engine.deleteLayer();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
    engine.selectLayer(FIRST_LAYER);
    engine.deleteLayer();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
    const count = engine.steps.length;
    engine.deleteLayer();
    expect(engine.steps).toHaveLength(count);
  });

  it("restores the selected layer through add and delete undo and redo", () => {
    const { engine, events } = setup();
    engine.addLayer();
    engine.undo();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(FIRST_LAYER);
    engine.redo();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
    engine.deleteLayer();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(FIRST_LAYER);
    engine.undo();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
  });

  it("puts the kept current layer back, or the front layer when it is absent", () => {
    const { engine, events } = setup();
    const steps = [addLayer(2, 1), addLayer(3, 2)];
    engine.load(steps, framed(engine), 2);
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
    engine.load(steps, framed(engine), 9);
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(3);
  });

  it("commits a live stroke before changing its layer", () => {
    const { engine, at, events, committed } = setup();
    engine.down(at("mouse", 1, 10, 10, 0));
    engine.addLayer();
    expect(committed()).toHaveLength(1);
    expect(engine.steps.map((step) => step.tool)).toEqual(["brush", "add"]);
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
  });

  it("reports new chip ink after a commit, and refreshes inked chips after undo", () => {
    const { engine, events, stroke } = setup();
    const before = events.onLayers.mock.calls.length;
    stroke("mouse", 1, [10, 10], [50, 10]);
    expect(events.onLayers.mock.calls.length).toBeGreaterThan(before);
    const first = events.onLayers.mock.lastCall?.[0];
    expect(first?.currentInked).toBe(true);
    const version = first?.versions.get(FIRST_LAYER) ?? 0;
    engine.undo();
    expect(events.onLayers.mock.lastCall?.[0].versions.get(FIRST_LAYER)).toBeGreaterThan(version);
  });

  it("swallows a press on a hidden current layer once and gives it no ink", () => {
    const { engine, at, events } = setup();
    engine.setOpacity(0);
    engine.down(at("mouse", 1, 10, 10, 0));
    engine.move(at("mouse", 1, 50, 10, 16));
    engine.up(at("mouse", 1, 50, 10, 32));
    expect(engine.steps.map((step) => step.tool)).toEqual(["opacity"]);
    expect(events.onBlockedHidden).toHaveBeenCalledTimes(1);
  });

  it("ends a live stroke before previewing the current layer's opacity", () => {
    const { engine, at, committed, display } = setup();
    engine.down(at("mouse", 1, 10, 10, 0));
    engine.previewOpacity(50);
    expect(committed()).toHaveLength(1);
    expect(display.calls.at(-1)).toBe("previewOpacity:50");
  });

  it("refreshes every inked layer's chip after undoing a layer property", () => {
    const { engine, events, stroke } = setup();
    stroke("mouse", 1, [10, 10], [50, 10]);
    engine.addLayer();
    stroke("mouse", 2, [10, 30], [50, 30]);
    engine.setLocked(true);
    const before = events.onLayers.mock.lastCall?.[0].versions;
    engine.undo();
    const after = events.onLayers.mock.lastCall?.[0].versions;
    expect(after?.get(1)).toBeGreaterThan(before?.get(1) ?? 0);
    expect(after?.get(2)).toBeGreaterThan(before?.get(2) ?? 0);
  });

  it("releases checkpoint copies and retries a stroke when the first canvas fails", () => {
    const { engine, ink, events, stroke } = setup();
    for (let i = 0; i <= 24; i++) stroke("mouse", i + 1, [10, 10], [50, 10], i * 100);
    expect(ink.copiesHeld).toBeGreaterThan(0);
    const original = ink.apply.bind(ink);
    vi.spyOn(ink, "apply")
      .mockImplementationOnce(() => {
        throw new CanvasUnavailableError();
      })
      .mockImplementation(original);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    stroke("mouse", 100, [10, 20], [50, 20], 3000);
    expect(engine.steps).toHaveLength(26);
    expect(ink.copiesHeld).toBe(0);
    expect(events.onInkFailed).not.toHaveBeenCalled();
  });

  it("drops a stroke without a step when both canvas attempts fail", () => {
    const { engine, ink, events, stroke } = setup();
    const failed = new CanvasUnavailableError();
    vi.spyOn(ink, "apply").mockImplementation(() => {
      throw failed;
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stroke("mouse", 1, [10, 10], [50, 10]);
    expect(engine.steps).toEqual([]);
    expect(events.onInkFailed).toHaveBeenCalledWith(failed);
    expect(error.mock.calls[0]?.[0]).toContain("brush stroke on layer 1");
  });

  it("throws after reporting two refused seal composites and preserves the drawing", () => {
    const { engine, ink, stroke, events } = setup();
    stroke("mouse", 1, [10, 10], [50, 10]);
    const steps = [...engine.steps];
    const failed = new CanvasUnavailableError();
    const composite = vi.spyOn(ink, "composite").mockImplementation(() => {
      throw failed;
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => engine.composite()).toThrow(failed);
    expect(composite).toHaveBeenCalledTimes(2);
    expect(events.onInkFailed).toHaveBeenCalledWith(failed);
    expect(engine.steps).toEqual(steps);
    expect(ink.layerCanvas(1)).not.toBeNull();
  });

  it("cuts a covered drawing from its restored ink and releases that ink again", () => {
    const { engine, ink, stroke } = setup();
    stroke("mouse", 1, [10, 10], [50, 10]);
    const steps = [...engine.steps];
    engine.suspend();
    const composite = engine.composite();
    expect(composite?.width).toBeGreaterThan(0);
    expect(composite?.height).toBeGreaterThan(0);
    expect(ink.layerCanvas(1)).toBeNull();
    expect(engine.steps).toEqual(steps);
    engine.resume();
    expect(ink.layerCanvas(1)).not.toBeNull();
  });

  it("throws when a covered drawing cannot be restored for sealing, keeping its recording", () => {
    const { engine, ink, stroke, events } = setup();
    stroke("mouse", 1, [10, 10], [50, 10]);
    const steps = [...engine.steps];
    engine.suspend();
    vi.spyOn(ink, "apply").mockImplementation(() => {
      throw new CanvasUnavailableError();
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => engine.composite()).toThrow(CanvasUnavailableError);
    expect(events.onInkFailed).toHaveBeenCalledOnce();
    expect(engine.steps).toEqual(steps);
    expect(ink.layerCanvas(1)).toBeNull();
  });

  it("caps a restored frame once without changing the recorded stroke coordinates", () => {
    const { engine, ink } = setup();
    const original = { w: 374, h: 748, density: 3.8 };
    engine.load([KEPT], original, 1);
    const capped = framed(engine);
    expect(ink.width * ink.height).toBeLessThanOrEqual(MAX_INK_PIXELS);
    expect(capped.w).toBe(original.w);
    expect(capped.h).toBe(original.h);
    expect(engine.steps).toEqual([KEPT]);
    engine.load(engine.steps, capped, 1);
    expect(engine.frame).toEqual(capped);
    expect(engine.steps).toEqual([KEPT]);
  });

  it("uses area coordinates for a frame-less clear recording, as the pen-pressure strip does", () => {
    const { engine } = setup();
    engine.load([{ tool: "clear", layer: 1, T: 0 }], null, 1);
    expect(engine.frame).toBeNull();
    const strip = { width: 300, height: 64 };
    engine.fit(strip, 2);
    expect(engine.frame).toEqual(areaFrame(strip, 2));
  });

  it("keeps restored layer setup waiting for its first mark before fixing the sheet frame", () => {
    const { engine, stroke } = setup();
    engine.load([addLayer(2, 1)], framed(engine), 2);
    engine.fit(TURNED, 1);
    expect(engine.frame?.w).toBeGreaterThan(engine.frame?.h ?? Infinity);
    stroke("mouse", 1, [10, 10], [50, 10]);
    const fixed = engine.frame;
    engine.fit(AREA, 1);
    expect(engine.frame).toBe(fixed);
  });

  it("keeps covered loads off canvases until the drawing screen returns", () => {
    const { engine, ink, events } = setup();
    engine.suspend();
    engine.load([KEPT], framed(engine), 1);
    expect(ink.layerCanvas(1)).toBeNull();
    expect(engine.steps).toEqual([KEPT]);
    engine.resume();
    expect(ink.layerCanvas(1)).not.toBeNull();
    expect(events.onLayers.mock.lastCall?.[0].currentInked).toBe(true);
  });

  it("retries opacity preview and reports a persistent canvas failure without changing steps", () => {
    const { engine, display, events } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const preview = vi.spyOn(display, "previewOpacity").mockImplementation(() => {
      throw new CanvasUnavailableError();
    });
    expect(() => engine.previewOpacity(40)).not.toThrow();
    expect(preview).toHaveBeenCalledTimes(2);
    expect(events.onInkFailed).toHaveBeenCalledOnce();
    expect(engine.steps).toEqual([]);
  });

  it("keeps a completed stroke in saved history when its display cannot allocate a canvas", () => {
    const { engine, display, stroke, events } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(display, "showCurrent").mockImplementation(() => {
      throw new CanvasUnavailableError();
    });
    expect(() => stroke("mouse", 1, [10, 10], [50, 10])).not.toThrow();
    expect(engine.steps).toHaveLength(1);
    expect(events.onCommit).toHaveBeenCalledOnce();
    expect(events.onInkFailed).toHaveBeenCalledOnce();
    expect(events.onInkFailed.mock.invocationCallOrder[0]).toBeGreaterThan(
      events.onCommit.mock.invocationCallOrder[0],
    );
  });

  it("keeps the original canvas and complete history after an undo replay runs out of canvases", () => {
    const { engine, ink, stroke, events } = setup();
    for (let i = 0; i < 3; i++) stroke("mouse", i + 1, [10, 10 + i], [50, 10 + i]);
    const before = [...engine.steps];
    const canvas = ink.layerCanvas(1);
    const original = ink.apply.bind(ink);
    let calls = 0;
    const apply = vi.spyOn(ink, "apply").mockImplementation((step, state) => {
      if (++calls % 2 === 0) throw new CanvasUnavailableError();
      original(step, state);
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => engine.undo()).not.toThrow();
    expect(engine.steps).toEqual(before);
    expect(ink.layerCanvas(1)).toBe(canvas);
    expect(events.onInkFailed).toHaveBeenCalledOnce();
    apply.mockRestore();
    engine.undo();
    expect(engine.steps).toEqual(before.slice(0, -1));
    engine.redo();
    expect(engine.steps).toEqual(before);
  });

  it("keeps redo available when both allocation attempts fail", () => {
    const { engine, ink, stroke, events } = setup();
    stroke("mouse", 1, [10, 10], [50, 10]);
    const before = [...engine.steps];
    engine.undo();
    const apply = vi.spyOn(ink, "apply").mockImplementation(() => {
      throw new CanvasUnavailableError();
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => engine.redo()).not.toThrow();
    expect(engine.steps).toEqual([]);
    expect(events.onInkFailed).toHaveBeenCalledOnce();
    apply.mockRestore();
    engine.redo();
    expect(engine.steps).toEqual(before);
  });

  it("releases covered ink and restores its history, current layer and redo on return", () => {
    const { engine, ink, display, stroke, events } = setup();
    stroke("mouse", 1, [10, 10], [50, 10]);
    engine.addLayer();
    stroke("mouse", 2, [10, 30], [50, 30]);
    engine.setLocked(true);
    engine.undo();
    const before = [...engine.steps];
    const canvases = [ink.layerCanvas(1), ink.layerCanvas(2)];
    engine.suspend();
    expect(canvases.every((canvas) => canvas?.width === 0 && canvas.height === 0)).toBe(true);
    expect(ink.layerCanvas(1)).toBeNull();
    expect(ink.layerCanvas(2)).toBeNull();
    expect(display.calls.at(-1)).toBe("release");
    expect(engine.steps).toEqual(before);
    engine.resume();
    expect(ink.layerCanvas(1)?.width).toBeGreaterThan(1);
    expect(ink.layerCanvas(2)?.width).toBeGreaterThan(1);
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(2);
    expect(engine.steps).toEqual(before);
    engine.redo();
    expect(engine.steps.at(-1)?.tool).toBe("lock");
  });

  it("retains all saved steps when loading fails partway, then retries on return", () => {
    const { engine, ink, events } = setup();
    const steps = [
      KEPT,
      addLayer(2, 1),
      { ...KEPT, layer: 2 },
      addLayer(3, 2),
      { ...KEPT, layer: 3 },
      deleteLayer(2),
    ];
    const replayed: HTMLCanvasElement[] = [];
    const original = ink.apply.bind(ink);
    const apply = vi.spyOn(ink, "apply").mockImplementation((step, state) => {
      if (step.layer === 3) throw new CanvasUnavailableError();
      original(step, state);
      if (step.tool === "brush" && step.layer === 2) {
        const canvas = ink.layerCanvas(2);
        if (canvas) replayed.push(canvas);
      }
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    events.onHistory.mockClear();
    expect(() => engine.load(steps, framed(engine), 3)).not.toThrow();
    expect(engine.steps).toEqual(steps);
    expect(events.onHistory).not.toHaveBeenCalled();
    expect(events.onInkFailed).toHaveBeenCalledOnce();
    expect(replayed).toHaveLength(2);
    expect(replayed[0]).not.toBe(replayed[1]);
    apply.mockRestore();
    engine.resume();
    expect(ink.layerCanvas(1)).not.toBeNull();
    expect(ink.layerCanvas(3)).not.toBeNull();
    expect(events.onLayers.mock.lastCall?.[0].current).toBe(3);
  });

  it("flashes the newly selected or moved layer after showing it", () => {
    const { engine, display } = setup();
    engine.addLayer();
    display.calls = [];
    engine.selectLayer(FIRST_LAYER);
    expect(display.calls.slice(-2)).toEqual(["show", "flash"]);
    display.calls = [];
    engine.moveLayer(2, 0);
    expect(display.calls.slice(-2)).toEqual(["show", "flash"]);
  });
});
