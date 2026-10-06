import { describe, expect, it, vi } from "vitest";
import { InkEngine, type InkLayer, type InkSettings, type PointerInput } from "./inkEngine";
import { STRIDE, type FillOp, type Op } from "./ops";

/** Records what reaches the ink; the pixels themselves are the surface's business. */
class FakeLayer implements InkLayer {
  paints = 0;
  paint() {
    this.paints++;
  }
  fill(_op: FillOp) {
    return true;
  }
  apply() {}
  restore() {}
  snapshot() {
    return null;
  }
  discard() {}
  cost() {
    return 1;
  }
}

const SETTINGS: InkSettings = {
  tool: "brush",
  color: "#1C1824",
  size: 7,
  lazyRadius: 0,
  locked: false,
  paused: false,
  panelOpen: false,
  armed: false,
  sessionMs: () => 0,
};

function setup(settings: Partial<InkSettings> = {}) {
  const layer = new FakeLayer();
  const events = {
    onHistory: vi.fn(),
    onCommit: vi.fn<(op: Op) => void>(),
    onBlocked: vi.fn(),
    onDismissPanel: vi.fn(),
    onDisarm: vi.fn(),
  };
  let frame: (() => void) | null = null;
  const engine = new InkEngine(layer, { ...SETTINGS, ...settings }, events, (cb) => {
    frame = cb;
    return () => (frame = null);
  });
  const at = (pointerType: string, pointerId: number, x: number, y: number, t: number) =>
    ({
      pointerId,
      pointerType,
      button: 0,
      clientX: x,
      clientY: y,
      pressure: pointerType === "pen" ? 0.6 : 0,
      timeStamp: t,
      preventDefault() {},
    }) satisfies PointerInput;
  /** A pointer landing at `from`, moving in 10px steps 16ms apart, and lifting at `to`. */
  const stroke = (
    pointerType: string,
    id: number,
    from: [number, number],
    to: [number, number],
    t0 = 0,
  ) => {
    const steps = Math.max(1, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 10));
    engine.down(at(pointerType, id, from[0], from[1], t0));
    for (let i = 1; i <= steps; i++) {
      const x = from[0] + ((to[0] - from[0]) * i) / steps;
      const y = from[1] + ((to[1] - from[1]) * i) / steps;
      engine.move(at(pointerType, id, x, y, t0 + i * 16));
      const run = frame;
      frame = null;
      run?.();
    }
    engine.up(at(pointerType, id, to[0], to[1], t0 + steps * 16 + 16));
  };
  /** Fingers landing together at `t`, 60px apart, and lifting 100ms later. */
  const tap = (fingers: number, t: number) => {
    for (let id = 1; id <= fingers; id++)
      engine.down(at("touch", 100 + id, id * 60, 300, t + id * 10));
    for (let id = 1; id <= fingers; id++) engine.up(at("touch", 100 + id, id * 60, 300, t + 100));
  };
  const committed = () => events.onCommit.mock.calls.map(([op]) => op);
  return { engine, layer, events, at, stroke, tap, committed };
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
    const { stroke, committed, events } = setup({ lazyRadius: 20 });
    stroke("mouse", 1, [0, 0], [200, 0]);
    expect(committed()).toHaveLength(1);
    expect(lastPoint(committed()[0])).toEqual([200, 0]);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, false));
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

  it("stops fingers drawing once a pen has, while they still tap", () => {
    const { stroke, tap, committed, events } = setup();
    stroke("pen", 1, [0, 0], [100, 0]);
    stroke("touch", 2, [0, 50], [100, 50], 1000);
    expect(committed()).toHaveLength(1);
    tap(2, 2000);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(false, true));
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

  it("closes an open panel with the touch that lands, drawing nothing, and disarms the seal", () => {
    const { engine, stroke, committed, events } = setup({ panelOpen: true, armed: true });
    stroke("touch", 1, [0, 0], [100, 0]);
    expect(events.onDismissPanel).toHaveBeenCalledOnce();
    expect(events.onDisarm).toHaveBeenCalledOnce();
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
});
