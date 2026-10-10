import { InkEngine } from "../../../../../apps/frontend/src/sticker-creation/canvas/inkEngine.ts";
import { InkSurface } from "../../../../../apps/frontend/src/sticker-creation/canvas/inkSurface.ts";

const base = [
  { tool: "brush", color: "#db244b", T: 0, pts: [30, 90, 30, 0, 230, 90, 30, 300] },
  { tool: "brush", color: "#207cbe", T: 0, pts: [120, 30, 23, 0, 120, 210, 23, 300] },
];
function make() {
  const canvas = document.createElement("canvas");
  const surface = new InkSurface(canvas);
  return { canvas, surface };
}
const read = (c: HTMLCanvasElement) =>
  c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
const compare = (a: HTMLCanvasElement, b: HTMLCanvasElement) => {
  const aa = read(a),
    bb = read(b);
  let differentChannels = 0,
    maxDelta = 0,
    differentAlpha = 0,
    maxAlphaDelta = 0;
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) differentChannels++;
    maxDelta = Math.max(maxDelta, Math.abs(aa[i] - bb[i]));
    if (i % 4 === 3) {
      if (aa[i] !== bb[i]) differentAlpha++;
      maxAlphaDelta = Math.max(maxAlphaDelta, Math.abs(aa[i] - bb[i]));
    }
  }
  return {
    equal: differentChannels === 0,
    differentChannels,
    maxDelta,
    differentAlpha,
    maxAlphaDelta,
    channels: aa.length,
  };
};
export function runPixels() {
  const results: any[] = [];
  const shape = { w: 374, h: 748, density: 1 };
  for (const tool of ["brush", "eraser"] as const) {
    const live = make(),
      replay = make();
    let commit: any = null;
    let frame: ((t: number) => void) | null = null;
    const engine = new InkEngine(
      live.surface,
      {
        tool,
        color: "#262020",
        size: 16,
        smoothing: 35,
        locked: false,
        paused: false,
        panelOpen: false,
        inputMode: null,
        penPressure: "normal",
        sessionMs: () => 0,
      },
      {
        onHistory() {},
        onCommit(op) {
          commit = structuredClone(op);
        },
        onBlocked() {},
        onDismissPanel() {},
        onPen() {},
        onHover() {},
      },
      (cb) => {
        frame = cb;
        return () => {
          frame = null;
        };
      },
    );
    engine.fit({ width: 374, height: 748 }, 1);
    replay.surface.setFrame(engine.frame!);
    base.forEach((op) => {
      live.surface.apply(op as any);
      replay.surface.apply(op as any);
    });
    const at = (i: number) => ({
      pointerId: 1,
      pointerType: "pen",
      button: 0,
      buttons: 1,
      clientX: 30 + i * 4,
      clientY: 90 + 30 * Math.sin(i / 8),
      pressure: 0.3 + i * 0.01,
      width: 1,
      height: 1,
      timeStamp: i * 8,
      preventDefault() {},
    });
    engine.down(at(0));
    for (let i = 1; i <= 45; i++) {
      engine.move(at(i));
      const cb = frame;
      frame = null;
      cb?.(i * 8);
    }
    engine.up(at(45));
    if (!commit) throw new Error("Missing terminal operation");
    replay.surface.apply(commit);
    results.push({
      test: "current_engine_terminal_vs_final_operation_replay",
      tool,
      ...compare(live.canvas, replay.canvas),
    });
    engine.dispose();
  }
  for (const tool of ["brush", "eraser"] as const) {
    const live = make(),
      replay = make(),
      stale = make();
    [live, replay, stale].forEach(({ surface }) => {
      surface.setFrame(shape);
      base.forEach((op) => surface.apply(op as any));
    });
    const before = live.surface.snapshot();
    const provisional = {
      tool,
      color: "#28201b",
      T: 0,
      pts: [40, 65, 17, 0, 130, 95, 17, 100, 210, 135, 17, 200],
    };
    const corrected = {
      tool,
      color: "#28201b",
      T: 0,
      pts: [40, 65, 17, 0, 130, 115, 17, 100, 210, 135, 17, 200],
    };
    live.surface.apply(provisional);
    stale.surface.apply(provisional);
    live.surface.restore(before);
    live.surface.apply(corrected);
    live.surface.discard(before);
    replay.surface.apply(corrected);
    stale.surface.apply(corrected);
    results.push({
      test: "explicit_terminal_replacement_vs_corrected_replay",
      tool,
      ...compare(live.canvas, replay.canvas),
    });
    results.push({
      test: "negative_control_repaint_without_restore",
      tool,
      ...compare(stale.canvas, replay.canvas),
    });
  }
  return {
    browser: navigator.userAgent,
    results,
    boundary:
      "Real Canvas2D via exported InkEngine/InkSurface/paintStroke. Explicit correction is synthetic; no CSP offline correction or generalized production terminal replacement is implemented. No device input or display timing measured.",
  };
}
(globalThis as any).runPixels = runPixels;
