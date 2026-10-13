import { findFill, writeFill } from "../../../apps/frontend/src/sticker-creation/canvas/fill";
import { LayerDisplay } from "../../../apps/frontend/src/sticker-creation/layers/layerDisplay";
import { LayerInk } from "../../../apps/frontend/src/sticker-creation/layers/layerInk";

// Disposable browser experiment: use the existing display canvases without changing product code.
const WIDTH = 320;
const HEIGHT = 400;
const PAINT = "#30bd7a";
const RGB = [48, 189, 122] as const;
const FULL = { x: 0, y: 0, w: WIDTH, h: HEIGHT };

type CaseName = "partialOpacity" | "locked" | "selectedClipped" | "baseWithClippedAbove" | "blank";
type Rect = { x: number; y: number; w: number; h: number };

function fixture(name: CaseName) {
  const ink = new LayerInk();
  ink.setFrame({ w: WIDTH, h: HEIGHT, density: 1 });
  const layer = (id: number, opacity = 100, locked = false, clipped = false) => ({
    id,
    opacity,
    locked,
    clipped,
  });
  const layers =
    name === "partialOpacity"
      ? [layer(1), layer(2, 55)]
      : name === "selectedClipped"
        ? [layer(1, 65), layer(2, 70, false, true)]
        : name === "baseWithClippedAbove"
          ? [layer(1, 75), layer(2, 80, false, true)]
          : [layer(1, 100, name === "locked")];
  const state = { layers, nextId: layers.length + 1 };
  const current = name === "partialOpacity" || name === "selectedClipped" ? 2 : 1;
  const draw = (id: number, color: string, rect: Rect) => {
    const own = (ink as any).writable(id);
    own.g.save();
    own.g.setTransform(1, 0, 0, 1, 0, 0);
    own.g.fillStyle = color;
    own.g.fillRect(rect.x, rect.y, rect.w, rect.h);
    own.g.restore();
    own.box = { ...FULL };
  };
  if (name === "partialOpacity") {
    draw(1, "#455075", FULL);
    draw(2, "rgba(200,50,70,0.65)", { x: 30, y: 40, w: 220, h: 280 });
  } else if (name === "locked") {
    draw(1, "rgba(200,50,70,0.65)", { x: 30, y: 40, w: 220, h: 280 });
  } else if (name === "selectedClipped") {
    draw(1, "#34415b", { x: 30, y: 40, w: 150, h: 280 });
    draw(2, "rgba(200,50,70,0.65)", { x: 50, y: 60, w: 220, h: 250 });
  } else if (name === "baseWithClippedAbove") {
    draw(1, "rgba(200,50,70,0.65)", { x: 30, y: 40, w: 150, h: 280 });
    draw(2, "#536ee8", FULL);
  }
  ink.show(state);
  const seed = name === "baseWithClippedAbove" ? { x: 240, y: 200 } : { x: 90, y: 140 };
  const op = {
    tool: "fill" as const,
    layer: current,
    reference: "layer" as const,
    color: PAINT,
    gap: 2,
    x: seed.x,
    y: seed.y,
    T: 0,
  };
  const host = document.createElement("div");
  host.style.cssText = `position:relative;width:${WIDTH}px;height:${HEIGHT}px`;
  document.body.append(host);
  const display = new LayerDisplay(host, ink);
  display.show(state, current);
  return { ink, state, current, op, seed, host, display };
}

function layerBytes(ink: LayerInk, id: number): Uint8ClampedArray {
  const canvas = ink.layerCanvas(id);
  return canvas
    ? canvas.getContext("2d")!.getImageData(0, 0, WIDTH, HEIGHT).data
    : new Uint8ClampedArray(WIDTH * HEIGHT * 4);
}

function displayedBytes(display: LayerDisplay): Uint8ClampedArray {
  const shown = display as any;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const g = canvas.getContext("2d")!;
  if (shown.below.canvas.width > 1) g.drawImage(shown.below.canvas, 0, 0);
  if (shown.group.style.visibility !== "hidden") {
    g.globalAlpha = Number(shown.group.style.opacity || 1);
    if (shown.viewBase) g.drawImage(shown.view.canvas, 0, 0);
    else {
      if (shown.mounted && shown.mounted.style.visibility !== "hidden")
        g.drawImage(shown.mounted, 0, 0);
      if (shown.wet.canvas.style.visibility !== "hidden") g.drawImage(shown.wet.canvas, 0, 0);
    }
    g.globalAlpha = 1;
  }
  if (shown.above.canvas.width > 1) g.drawImage(shown.above.canvas, 0, 0);
  const pixels = g.getImageData(0, 0, WIDTH, HEIGHT).data;
  canvas.width = canvas.height = 0;
  return pixels;
}

function maximumDifference(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length) throw new Error(`Pixel lengths differ: ${a.length}, ${b.length}`);
  let maximum = 0;
  for (let i = 0; i < a.length; i++) maximum = Math.max(maximum, Math.abs(a[i] - b[i]));
  return maximum;
}

function prepare(
  ink: LayerInk,
  state: any,
  current: number,
  seed: { x: number; y: number },
  locked: boolean,
) {
  const own = (ink as any).inks.get(current);
  const shown = own ? (ink as any).readLayer(own, FULL) : new ImageData(WIDTH, HEIGHT);
  const target = new ImageData(new Uint8ClampedArray(shown.data), WIDTH, HEIGHT);
  const found = findFill(shown, seed.x, seed.y, RGB, 2);
  if (!found) throw new Error("The fixture has no fill region");
  if (!writeFill(target, shown, found, RGB, locked))
    throw new Error("The fixture changed no destination pixels");
  return { target, found };
}

function preview(
  display: LayerDisplay,
  ink: LayerInk,
  current: number,
  target: ImageData,
  dirty: Rect,
) {
  const shown = display as any;
  const wet = shown.wet.canvas as HTMLCanvasElement;
  const g = shown.wet.g as CanvasRenderingContext2D;
  const originalCanvasOf = shown.shownCanvasOf;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, WIDTH, HEIGHT);
  const currentCanvas = ink.layerCanvas(current);
  if (currentCanvas) g.drawImage(currentCanvas, 0, 0);
  g.restore();
  g.putImageData(target, 0, 0, dirty.x, dirty.y, dirty.w, dirty.h);
  if (shown.mounted) shown.mounted.style.visibility = "hidden";
  shown.shownCanvasOf = (id: number) => (id === current ? wet : ink.layerCanvas(id));
  if (shown.viewBase) {
    const view = shown.view.g as CanvasRenderingContext2D;
    view.save();
    view.setTransform(1, 0, 0, 1, 0, 0);
    view.beginPath();
    view.rect(dirty.x, dirty.y, dirty.w, dirty.h);
    view.clip();
    view.clearRect(dirty.x, dirty.y, dirty.w, dirty.h);
    view.drawImage(wet, dirty.x, dirty.y, dirty.w, dirty.h, dirty.x, dirty.y, dirty.w, dirty.h);
    view.globalCompositeOperation = "destination-in";
    view.drawImage(
      shown.viewBase,
      dirty.x,
      dirty.y,
      dirty.w,
      dirty.h,
      dirty.x,
      dirty.y,
      dirty.w,
      dirty.h,
    );
    view.restore();
  } else if (shown.clippedAbove) {
    shown.above.g.clearRect(dirty.x, dirty.y, dirty.w, dirty.h);
    ink.compositeInto(shown.above.g, shown.state, shown.aboveIds, dirty, shown.shownCanvasOf);
  }
  return () => {
    shown.shownCanvasOf = originalCanvasOf;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, WIDTH, HEIGHT);
    g.restore();
    display.show(shown.state, current);
  };
}

export async function verifyWetPreview(): Promise<{ cases: any[]; failures: string[] }> {
  const cases: any[] = [];
  const failures: string[] = [];
  const names: CaseName[] = [
    "partialOpacity",
    "locked",
    "selectedClipped",
    "baseWithClippedAbove",
    "blank",
  ];
  for (const name of names) {
    const live = fixture(name);
    const baseline = fixture(name);
    try {
      const before = layerBytes(live.ink, live.current);
      const beforeDisplay = displayedBytes(live.display);
      const copiesBefore = live.ink.copiesHeld;
      const locked = live.state.layers.find((layer) => layer.id === live.current)!.locked;
      const prepared = prepare(live.ink, live.state, live.current, live.seed, locked);
      const cancel = preview(
        live.display,
        live.ink,
        live.current,
        prepared.target,
        prepared.found.box,
      );
      const during = layerBytes(live.ink, live.current);
      const previewCopies = live.ink.copiesHeld;
      const previewDisplay = displayedBytes(live.display);
      const changed = baseline.ink.flood(baseline.op, baseline.state);
      if (!changed) throw new Error("Baseline flood changed no pixels");
      baseline.display.showCurrent();
      baseline.display.inkChanged(changed);
      const baselineDisplay = displayedBytes(baseline.display);
      const previewDifference = maximumDifference(previewDisplay, baselineDisplay);
      const unchangedDifference = maximumDifference(before, during);
      cancel();
      const canceledDifference = maximumDifference(before, layerBytes(live.ink, live.current));
      const canceledDisplayDifference = maximumDifference(
        beforeDisplay,
        displayedBytes(live.display),
      );
      const cancelAgain = preview(
        live.display,
        live.ink,
        live.current,
        prepared.target,
        prepared.found.box,
      );
      (live.ink as any).put(live.current, prepared.target, FULL, prepared.found.box, locked);
      cancelAgain();
      live.display.showCurrent();
      const acceptedDifference = maximumDifference(
        layerBytes(live.ink, live.current),
        layerBytes(baseline.ink, baseline.current),
      );
      const acceptedDisplayDifference = maximumDifference(
        displayedBytes(live.display),
        baselineDisplay,
      );
      const result = {
        name,
        previewDifference,
        unchangedDifference,
        canceledDifference,
        canceledDisplayDifference,
        acceptedDifference,
        acceptedDisplayDifference,
        copiesBefore,
        previewCopies,
        changed: true,
      };
      cases.push(result);
      for (const [key, value] of Object.entries(result)) {
        if (key.endsWith("Difference") && value !== 0) failures.push(`${name}: ${key} = ${value}`);
      }
      if (previewCopies !== copiesBefore)
        failures.push(`${name}: preview allocated an ink hold copy`);
    } catch (error) {
      failures.push(
        `${name}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    } finally {
      live.display.release();
      baseline.display.release();
      live.ink.releaseAll();
      baseline.ink.releaseAll();
      live.host.remove();
      baseline.host.remove();
    }
  }
  return { cases, failures };
}
