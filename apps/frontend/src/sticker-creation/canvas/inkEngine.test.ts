// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { PALM_CONTACT_PX, YOUNG_MS } from "./gestures";
import {
  INK_WORK,
  InkEngine,
  type HoverRing,
  type InkLayer,
  type InkSettings,
  type PointerInput,
} from "./inkEngine";
import { STRIDE, type FillOp, type Op, type StrokeOp } from "./ops";
import {
  areaFrame,
  frameFor,
  SHEET_SHORT_UNITS,
  type SheetArea,
  type SheetFrame,
} from "./sheetFrame";
import { FIRST_SMOOTHING, PAUSE_MS, Stabilizer } from "./stabilizer";

/** The labels the engine's work was timed under, as the performance recorder hears them. */
const timed = vi.hoisted((): string[] => []);
vi.mock("../../performance/performanceRecorder", () => ({
  timeOurWork: <T>(label: string, work: () => T): T => {
    timed.push(label);
    return work();
  },
}));

/** Records what reaches the ink; the pixels themselves are the surface's business. */
class FakeLayer implements InkLayer {
  paints = 0;
  /** The stroke last painted, as it stood then. */
  painting: StrokeOp | null = null;
  /** The furthest right any painted point reached, in sheet units. */
  reach = -Infinity;
  /** Every frame the ink was sized to, and how often it was blanked to be rebuilt. */
  frames: SheetFrame[] = [];
  restores = 0;
  setFrame(frame: SheetFrame) {
    this.frames.push(frame);
    return true;
  }
  paint(op: StrokeOp, from: number, to: number) {
    this.paints++;
    this.painting = op;
    for (let i = from; i < to; i++) this.reach = Math.max(this.reach, op.pts[i * STRIDE]);
  }
  fill(_op: FillOp) {
    return true;
  }
  apply() {}
  restore() {
    this.restores++;
  }
  snapshot() {
    return null;
  }
  discard() {}
  cost() {
    return 1;
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
const KEPT: StrokeOp = { tool: "brush", color: "#1C1824", pts: [10, 10, 7, 0], T: 0 };

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
  panelOpen: false,
  inputMode: null,
  penPressure: "normal",
  sessionMs: () => 0,
};

function setup(settings: Partial<InkSettings> = {}) {
  const layer = new FakeLayer();
  const events = {
    onHistory: vi.fn(),
    onCommit: vi.fn<(op: Op) => void>(),
    onBlocked: vi.fn(),
    onDismissPanel: vi.fn(),
    onPen: vi.fn(),
    onHover: vi.fn<(ring: HoverRing | null) => void>(),
  };
  let frame: ((time: number) => void) | null = null;
  /** The latest time an input was stamped with: a frame runs at it unless told otherwise. */
  let latest = 0;
  const engine = new InkEngine(layer, { ...SETTINGS, ...settings }, events, (cb) => {
    frame = cb;
    return () => (frame = null);
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
  return { engine, layer, events, at, runFrame, trace, stroke, tap, committed };
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
      const { engine, at, runFrame, layer, committed } = setup({ smoothing: SMOOTH });
      const stabilized = new Stabilizer(0, 0, 0, SMOOTH);
      engine.down(at(pointerType, 1, 0, 0, 0));
      let t = 0;
      for (let i = 1; i <= 20; i++) {
        t = i * 16;
        engine.move(at(pointerType, 1, i * 10, 0, t));
        runFrame();
        const [line] = stabilized.add(i * 10, 0, t);
        expect(layer.reach).toBeLessThanOrEqual(line);
        expect(line).toBeLessThan(i * 10);
      }
      // A frame before the nib has been silent long enough leaves the line where its samples put it.
      const trailing = layer.reach;
      runFrame(t + FRAME_MS);
      expect(layer.reach).toBe(trailing);
      // Stopped, it glides there with no new sample, and lands on the nib.
      runFrame(t + PAUSE_MS);
      expect(layer.reach).toBeGreaterThan(trailing);
      for (let time = t + PAUSE_MS; layer.reach < 200 && time < t + 10_000; time += FRAME_MS)
        runFrame(time);
      expect(layer.painting && lastPoint(layer.painting)).toEqual([200, 0]);
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
    const { engine, at, layer, events } = setup({ penPressure: "off" });
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
    expect(layer.paints).toBe(0);
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

  it("names its painting, fills, replays and snapshots for the performance recorder", () => {
    const { engine, stroke } = setup({ tool: "fill" });
    timed.length = 0;
    stroke("touch", 1, [40, 40], [42, 40]);
    engine.settings = { ...engine.settings, tool: "brush" };
    stroke("mouse", 2, [0, 0], [100, 0], 1000);
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

  it("closes an open panel with the touch that lands, drawing nothing", () => {
    const { engine, stroke, committed, events } = setup({ panelOpen: true });
    stroke("touch", 1, [0, 0], [100, 0]);
    expect(events.onDismissPanel).toHaveBeenCalledOnce();
    expect(committed()).toEqual([]);
    engine.settings = { ...engine.settings, panelOpen: false };
    stroke("touch", 2, [0, 0], [100, 0], 1000);
    expect(committed()).toHaveLength(1);
  });

  it("fills on a tap, not on a drag", () => {
    const { stroke, committed } = setup({ tool: "fill" });
    stroke("touch", 1, [40, 40], [46, 40]);
    stroke("touch", 2, [40, 40], [80, 40], 1000);
    expect(committed()).toEqual([expect.objectContaining({ tool: "fill", x: 40, y: 40 })]);
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
    expect(engine.ops).toHaveLength(1);
    // The undo and redo tiles, or their keys.
    engine.undo();
    expect(engine.ops).toHaveLength(1);
    engine.redo();
    expect(engine.ops).toHaveLength(1);
    engine.clear();
    expect(engine.ops).toHaveLength(1);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
  });

  it("clears a stroke still in progress with the rest, and undo brings them all back", () => {
    const { engine, at, stroke, events } = setup();
    stroke("mouse", 1, [0, 0], [100, 0]);
    // A finger is still drawing as the clear lands.
    engine.down(at("touch", 2, 0, 50, 1000));
    engine.move(at("touch", 2, 40, 50, 1016));
    engine.clear();
    expect(engine.ops).toEqual([]);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false, false));
    engine.undo();
    expect(engine.ops).toHaveLength(2);
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
    const { engine, layer, stroke } = setup();
    stroke("mouse", 1, [0, 0], [100, 0]);
    const frame = engine.frame;
    const [sized, rebuilt] = [layer.frames.length, layer.restores];
    engine.fit(TURNED, 2);
    engine.fit({ width: AREA.width / 2, height: AREA.height / 2 }, 1);
    expect(engine.frame).toBe(frame);
    expect([layer.frames.length, layer.restores]).toEqual([sized, rebuilt]);
    expect(engine.ops).toHaveLength(1);
  });

  it("puts a kept drawing back in its own frame, and one kept without a frame in its area", () => {
    const { engine } = setup();
    const own = frameFor(TURNED, 2);
    engine.load([KEPT], own);
    engine.fit(AREA, 1);
    expect(engine.frame).toBe(own);

    const area = { width: AREA.width * 1.5, height: AREA.height };
    engine.load([KEPT], null);
    engine.fit(area, 2);
    engine.fit(AREA, 1);
    expect(engine.frame).toEqual(areaFrame(area, 2));
    expect(engine.ops).toEqual([KEPT]);
  });

  it("gives a drawing kept without a frame none until its area is measured, so a save can't keep a blank sheet's", () => {
    const { engine } = setup();
    // The blank sheet that showed before the drawing was put back.
    expect(engine.frame).toEqual(frameFor(AREA, 1));
    engine.load([KEPT], null);
    // What the drawing screen's next save keeps with the steps.
    expect(engine.frame).toBeNull();
  });
});
