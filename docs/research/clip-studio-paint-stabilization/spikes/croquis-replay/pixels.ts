import { InkEngine } from "../../../../../apps/frontend/src/sticker-creation/canvas/inkEngine.ts";
import { FIRST_POST_CORRECTION } from "../../../../../apps/frontend/src/sticker-creation/canvas/post-correction/settings.ts";
import { LayerInk } from "../../../../../apps/frontend/src/sticker-creation/layers/layerInk.ts";
import { LayerDisplay } from "../../../../../apps/frontend/src/sticker-creation/layers/layerDisplay.ts";
import {
  FIRST_LAYER,
  FIRST_LAYERS,
} from "../../../../../apps/frontend/src/sticker-creation/layers/layerState.ts";

const base = [
  {
    tool: "brush",
    layer: FIRST_LAYER,
    color: "#db244b",
    T: 0,
    pts: [30, 90, 30, 0, 230, 90, 30, 300],
  },
  {
    tool: "brush",
    layer: FIRST_LAYER,
    color: "#207cbe",
    T: 0,
    pts: [120, 30, 23, 0, 120, 210, 23, 300],
  },
];
function make() {
  const surface = new LayerInk();
  return {
    surface,
    get canvas() {
      const canvas = surface.layerCanvas(FIRST_LAYER);
      if (!canvas) throw new Error("Expected ink on the first layer");
      return canvas;
    },
  };
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
    const host = document.createElement("div");
    document.body.append(host);
    const display = new LayerDisplay(host, live.surface);
    let commit: any = null;
    const scheduled: { frame: ((t: number) => void) | null } = { frame: null };
    const engine = new InkEngine(
      live.surface,
      display,
      {
        tool,
        fillReference: "layer",
        color: "#262020",
        size: 16,
        smoothing: 35,
        postCorrection: FIRST_POST_CORRECTION,
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
        onBlockedHidden() {},
        onLayers() {},
        onInkFailed(error) {
          throw error;
        },
        onPen() {},
        onHover() {},
      },
      {
        now: () => 360,
        request(cb) {
          scheduled.frame = cb;
          return () => {
            scheduled.frame = null;
          };
        },
      },
    );
    engine.fit({ width: 374, height: 748 }, 1);
    replay.surface.setFrame(engine.frame!);
    base.forEach((op) => {
      live.surface.apply(op as any, FIRST_LAYERS);
      replay.surface.apply(op as any, FIRST_LAYERS);
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
      const cb = scheduled.frame;
      scheduled.frame = null;
      cb?.(i * 8);
    }
    engine.up({ ...at(45), pressure: 0, buttons: 0 });
    if (!commit) throw new Error("Missing terminal operation");
    replay.surface.apply(commit, FIRST_LAYERS);
    results.push({
      test: "current_engine_terminal_vs_final_operation_replay",
      tool,
      ...compare(live.canvas, replay.canvas),
    });
    engine.dispose();
    replay.surface.releaseAll();
    host.remove();
  }
  for (const tool of ["brush", "eraser"] as const) {
    const live = make(),
      replay = make(),
      stale = make();
    [live, replay, stale].forEach(({ surface }) => {
      surface.setFrame(shape);
      base.forEach((op) => surface.apply(op as any, FIRST_LAYERS));
    });
    const before = live.surface.hold(FIRST_LAYER);
    const provisional = {
      tool,
      layer: FIRST_LAYER,
      color: "#28201b",
      T: 0,
      pts: [40, 65, 17, 0, 130, 95, 17, 100, 210, 135, 17, 200],
    };
    const corrected = {
      tool,
      layer: FIRST_LAYER,
      color: "#28201b",
      T: 0,
      pts: [40, 65, 17, 0, 130, 115, 17, 100, 210, 135, 17, 200],
    };
    live.surface.apply(provisional, FIRST_LAYERS);
    stale.surface.apply(provisional, FIRST_LAYERS);
    live.surface.restore(FIRST_LAYER, before);
    live.surface.apply(corrected, FIRST_LAYERS);
    live.surface.release(before);
    replay.surface.apply(corrected, FIRST_LAYERS);
    stale.surface.apply(corrected, FIRST_LAYERS);
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
    [live, replay, stale].forEach(({ surface }) => surface.releaseAll());
  }
  return {
    browser: navigator.userAgent,
    results,
    boundary:
      "Real Canvas2D via current InkEngine/LayerInk/LayerDisplay/paintStroke. Comparison reads committed layer pixels, not display screenshots. Explicit correction remains synthetic; it does not run the separate reconstructed post-correction pipeline. No device input or display timing measured.",
  };
}
(globalThis as any).runPixels = runPixels;
