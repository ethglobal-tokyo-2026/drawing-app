import { releaseCanvas } from "../../ui/releaseCanvas";
import { blankCanvas } from "../canvas/context2d";
import { STRIDE, type LayerId, type StrokeOp } from "../canvas/ops";
import { paintedRadius, paintStroke } from "../canvas/paintStroke";
import type { Rect } from "../sealing/stickerPasses";
import { flashLayer, type LayerFlash } from "./layerFlash";
import type { LayerInk } from "./layerInk";
import {
  baseOf,
  FIRST_LAYER,
  FIRST_LAYERS,
  FULL_OPACITY,
  indexOf,
  isHidden,
  type Layer,
  type LayerState,
} from "./layerState";
import type { SheetDisplay } from "./sheetDisplay";
import "./layerDisplay.css";

/** Device px a capsule's antialiased edge can ink past its radius. */
const EDGE_PX = 1;

interface Shown {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
}

/** The stroke in progress, as the wet canvas shows it. */
interface WetStroke {
  /** Its points grow while it goes on. */
  readonly op: StrokeOp;
  /** How the brush meets the pixels under it, as the commit's does; the eraser clears whatever it says. */
  readonly brush: GlobalCompositeOperation;
  /** The layer's canvas, hidden while wet shows a copy of it under the stroke; null when wet starts clear. */
  readonly copied: HTMLCanvasElement | null;
  /** Wet holds points [0, painted). */
  painted: number;
  /** Where the last frame's tail inked, device px; empty while none shows. */
  readonly tail: Rect;
}

/** One of the sheet's canvases: over the paper, and out of the accessibility tree. */
function asInkCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  canvas.classList.add("ink-canvas");
  canvas.setAttribute("aria-hidden", "true");
  return canvas;
}

/** A canvas of the display's own, 0 × 0 until sized. */
function ownCanvas(): Shown {
  const shown = blankCanvas(0, 0);
  asInkCanvas(shown.canvas);
  return shown;
}

/** Clears the whole canvas, whatever transform it draws under. */
function clearAll({ canvas, g }: Shown): void {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.restore();
}

/** Grows `box` to take in `other`; an empty `other` adds nothing, and an empty `box` becomes `other`. */
function takeIn(box: Rect, other: Rect): void {
  if (other.w <= 0 || other.h <= 0) return;
  if (box.w <= 0 || box.h <= 0) {
    box.x = other.x;
    box.y = other.y;
    box.w = other.w;
    box.h = other.h;
    return;
  }
  const right = Math.max(box.x + box.w, other.x + other.w);
  const bottom = Math.max(box.y + box.h, other.y + other.h);
  box.x = Math.min(box.x, other.x);
  box.y = Math.min(box.y, other.y);
  box.w = right - box.x;
  box.h = bottom - box.y;
}

/**
 * Whether segment `i` of `pts` reaches into the box, sheet units: the capsule from point i − 1 to
 * point i, or the first point's dot.
 */
function segmentReaches(
  pts: readonly number[],
  i: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  const a = Math.max(0, i - 1);
  const ra = paintedRadius(pts, a);
  const rb = paintedRadius(pts, i);
  const ax = pts[a * STRIDE];
  const ay = pts[a * STRIDE + 1];
  const bx = pts[i * STRIDE];
  const by = pts[i * STRIDE + 1];
  return (
    Math.min(ax - ra, bx - rb) < right &&
    Math.max(ax + ra, bx + rb) > left &&
    Math.min(ay - ra, by - rb) < bottom &&
    Math.max(ay + ra, by + rb) > top
  );
}

/**
 * Shows the sheet in three canvases: the layers below the current one composited, the current
 * layer's own canvas with the wet stroke over it, and the layers above composited. Each side holds
 * several layers, so their opacities go in through globalAlpha and the sides stay at CSS opacity 1.
 * A current layer clipped to a base shows through a view, cut to the base, and a stroke on a base
 * redraws the layers clipped to it where it paints. No canvas gets `will-change`, for which WebKit
 * holds another copy of it.
 */
export class LayerDisplay implements SheetDisplay {
  private readonly host: HTMLElement;
  private readonly ink: LayerInk;
  private readonly below: Shown;
  private readonly above: Shown;
  /** The current layer's canvas and wet, or its view, faded as one by the layer's opacity. */
  private readonly group: HTMLDivElement;
  private readonly wet: Shown;
  /** The current layer as shown, cut to its base: sized and mounted only while the group shows it. */
  private readonly view: Shown;
  private state: LayerState = FIRST_LAYERS;
  private current: LayerId = FIRST_LAYER;
  /** The canvas of the base the view cuts the current layer to; null while the view isn't shown. */
  private viewBase: HTMLCanvasElement | null = null;
  /** A layer above, clipped to the current one, shows ink: `above` changes with the current layer's ink. */
  private clippedAbove = false;
  private aboveIds: readonly LayerId[] = [];
  /** Where clipping is redrawn next, device px: one box, so a frame makes no garbage. */
  private readonly dirty: Rect = { x: 0, y: 0, w: 0, h: 0 };
  /** The current layer's canvas, mounted under wet; null while the layer has none. */
  private mounted: HTMLCanvasElement | null = null;
  private stroke: WetStroke | null = null;
  /** The current layer's flash while it plays. */
  private flashing: LayerFlash | null = null;
  /** The tail as a stroke from the last settled point: one op, refilled each frame. */
  private readonly tailOp: StrokeOp = {
    tool: "brush",
    layer: FIRST_LAYER,
    color: "#000000",
    pts: [],
    T: 0,
  };

  /**
   * Each layer's canvas, but wet for the current layer during a stroke: the layers clipped to it
   * are cut to wet then, which holds the layer as shown, over a copy of it.
   */
  private readonly shownCanvasOf = (id: LayerId): HTMLCanvasElement | null =>
    id === this.current && this.stroke ? this.wet.canvas : this.ink.layerCanvas(id);

  constructor(host: HTMLElement, ink: LayerInk) {
    this.host = host;
    this.ink = ink;
    this.below = ownCanvas();
    this.wet = ownCanvas();
    this.above = ownCanvas();
    this.view = ownCanvas();
    this.group = document.createElement("div");
    this.group.className = "ink-current";
    this.group.append(this.wet.canvas);
    host.append(this.below.canvas, this.group, this.above.canvas);
    this.resize();
  }

  resize(): void {
    this.stopFlash();
    // A covered sheet releases its canvases; returning mounts them before the ink is shown again.
    this.host.append(this.below.canvas, this.group, this.above.canvas);
    this.group.append(this.wet.canvas);
    const { width, height, density } = this.ink;
    const { canvas, g } = this.wet;
    canvas.width = width;
    canvas.height = height;
    g.setTransform(density, 0, 0, density, 0, 0);
    // Composited at the old size, they wait for the next show.
    releaseCanvas(this.below.canvas);
    releaseCanvas(this.above.canvas);
    this.closeView();
  }

  show(state: LayerState, current: LayerId): void {
    const at = indexOf(state, current);
    if (at < 0) {
      const held = state.layers.map((layer) => layer.id).join(", ");
      throw new Error(`Layer ${current} isn't among the sheet's layers (${held})`);
    }
    this.stopFlash();
    this.state = state;
    this.current = current;
    const layer = state.layers[at];
    const base = baseOf(state, current);
    const baseCanvas = base && !isHidden(base) ? this.ink.layerCanvas(base.id) : null;
    // As compositeLayers skips a clipped layer whose base is hidden or has no ink.
    const shows = !isHidden(layer) && (!base || baseCanvas !== null);
    const above = state.layers.slice(at + 1);
    this.aboveIds = above.map(({ id }) => id);
    this.clippedAbove = shows && above.some((over) => this.showsClippedTo(over, current));
    this.compositeSide(this.below, state.layers.slice(0, at));
    this.compositeSide(this.above, above);
    this.showCurrent();
    if (shows && baseCanvas) this.openView(baseCanvas);
    else this.closeView();
    this.hideCovered();
    this.fade(layer.opacity);
  }

  previewOpacity(opacity: number | null): void {
    this.stopFlash();
    const at = indexOf(this.state, this.current);
    const next = opacity ?? this.state.layers[at].opacity;
    const base = baseOf(this.state, this.current);
    const baseCanvas = base && !isHidden(base) ? this.ink.layerCanvas(base.id) : null;
    if (next > 0 && baseCanvas && !this.viewBase) this.openView(baseCanvas);
    else if (opacity === null && next === 0) this.closeView();
    this.hideCovered();

    const above = this.state.layers.slice(at + 1);
    if (above.some((layer) => this.showsClippedTo(layer, this.current))) {
      // Clipped layers multiply their base's opacity, even before this drag becomes a history step.
      const preview = {
        ...this.state,
        layers: this.state.layers.map((layer) =>
          layer.id === this.current ? { ...layer, opacity: next } : layer,
        ),
      };
      this.compositeSide(this.above, above, preview);
    }
    this.fade(next);
  }

  showCurrent(): void {
    const canvas = this.ink.layerCanvas(this.current);
    if (canvas === this.mounted) return;
    this.mounted?.remove();
    this.mounted = canvas;
    if (!canvas) return;
    this.group.insertBefore(asInkCanvas(canvas), this.wet.canvas);
    this.hideCovered();
  }

  inkChanged(box: Rect): void {
    if (this.clipping) this.redrawClipping(box);
  }

  /** Starts afresh, as if the stroke before it, if any, had ended. */
  beginStroke(op: StrokeOp): void {
    if (op.layer !== this.current) {
      throw new Error(
        `A stroke on layer ${op.layer} can't start while layer ${this.current} is current`,
      );
    }
    this.stopFlash();
    this.endStroke();
    this.showCurrent();
    const { locked } = this.state.layers[indexOf(this.state, op.layer)];
    // An eraser and a locked brush change the layer's own pixels, and the layers clipped to it are
    // cut to it as shown, so wet shows a copy of the layer, in its place, under the stroke.
    const copied = op.tool === "eraser" || locked || this.clippedAbove ? this.mounted : null;
    if (copied) {
      const { g } = this.wet;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "copy";
      g.drawImage(copied, 0, 0);
      g.restore();
    }
    const brush = locked ? "source-atop" : "source-over";
    this.stroke = { op, brush, copied, painted: 0, tail: { x: 0, y: 0, w: 0, h: 0 } };
    if (copied) this.hideCovered();
    this.tailOp.tool = op.tool;
    this.tailOp.layer = op.layer;
    this.tailOp.color = op.color;
  }

  paintStroke(from: number, to: number): void {
    const stroke = this.live();
    paintStroke(this.wet.g, stroke.op, from, to, stroke.brush);
    stroke.painted = Math.max(stroke.painted, to);
    if (to <= from || !this.clipping) return;
    // The new segments run from point from − 1, or start with the first point's dot.
    this.inkedBox(stroke.op.pts, Math.max(0, from - 1), to, this.dirty);
    this.redrawClipping(this.dirty);
  }

  paintTail(pts: readonly number[]): void {
    const stroke = this.live();
    const clipping = this.clipping;
    if (clipping) {
      // The old tail's box changes too, as it's erased.
      this.dirty.w = 0;
      takeIn(this.dirty, stroke.tail);
    }
    if (stroke.tail.w > 0) this.eraseTail(stroke);
    const count = pts.length / STRIDE;
    if (count > 0) {
      // Written in place and painted only up to `count`, so a frame makes no garbage.
      const tail = this.tailOp.pts;
      const last = stroke.op.pts.length - STRIDE;
      for (let j = 0; j < STRIDE; j++) tail[j] = stroke.op.pts[last + j];
      for (let j = 0; j < pts.length; j++) tail[STRIDE + j] = pts[j];
      paintStroke(this.wet.g, this.tailOp, 1, count + 1, stroke.brush);
      this.inkedBox(tail, 0, count + 1, stroke.tail);
    }
    if (!clipping) return;
    takeIn(this.dirty, stroke.tail);
    this.redrawClipping(this.dirty);
  }

  endStroke(): void {
    clearAll(this.wet);
    const stroke = this.stroke;
    this.stroke = null;
    if (!stroke) return;
    if (stroke.copied) this.hideCovered();
    if (!this.clipping) return;
    // Lift can add points wet never painted, so clipping is redrawn over the whole op and the last tail.
    const { pts } = stroke.op;
    this.inkedBox(pts, 0, pts.length / STRIDE, this.dirty);
    takeIn(this.dirty, stroke.tail);
    this.redrawClipping(this.dirty);
  }

  flash(): void {
    this.stopFlash();
    const layer = this.state.layers[indexOf(this.state, this.current)];
    const base = baseOf(this.state, this.current);
    const canvas = base
      ? this.viewBase
        ? this.view.canvas
        : null
      : this.ink.layerCanvas(this.current);
    const box = this.ink.inkBox(this.current);
    // A stroke owns the frames it paints in; a hidden or inkless layer has nothing to light.
    // The view holds only ink visible through the base, so a clipped layer lights only what it shows.
    if (this.stroke || !canvas || !box || isHidden(layer)) return;
    const d = this.ink.density;
    this.flashing = flashLayer({
      layer: canvas,
      inked: { x: box.x * d, y: box.y * d, w: box.w * d, h: box.h * d },
      above: this.above.canvas,
      current: this.group,
      sheet: this.host,
      onEnd: () => {
        this.flashing = null;
      },
    });
  }

  release(): void {
    this.stopFlash();
    this.endStroke();
    this.closeView();
    for (const { canvas } of [this.below, this.wet, this.above]) releaseCanvas(canvas);
    // The layer's canvas is the ink's to keep.
    this.mounted?.remove();
    this.mounted = null;
    this.host.replaceChildren();
  }

  /** Fades the current layer's group at its base's opacity when clipped. */
  private fade(opacity: number): void {
    const base = baseOf(this.state, this.current);
    const baseCanvas = base && !isHidden(base) ? this.ink.layerCanvas(base.id) : null;
    const baseOpacity = base ? base.opacity / FULL_OPACITY : 1;
    this.group.style.opacity = String((opacity / FULL_OPACITY) * baseOpacity);
    this.group.style.visibility = opacity === 0 || (base && !baseCanvas) ? "hidden" : "";
  }

  private stopFlash(): void {
    this.flashing?.cancel();
    this.flashing = null;
  }

  private live(): WetStroke {
    if (!this.stroke) throw new Error("The sheet has no stroke in progress to paint");
    return this.stroke;
  }

  /** A change to the current layer's ink shows elsewhere too: in its view, or in the layers above clipped to it. */
  private get clipping(): boolean {
    return this.viewBase !== null || this.clippedAbove;
  }

  /** Whether `layer` shows ink clipped to layer `base`. */
  private showsClippedTo(layer: Layer, base: LayerId): boolean {
    return (
      !isHidden(layer) &&
      this.ink.layerCanvas(layer.id) !== null &&
      baseOf(this.state, layer.id)?.id === base
    );
  }

  /** Composites `layers` onto a side over the whole sheet; a side where none shows ink is let go of. */
  private compositeSide(side: Shown, layers: readonly Layer[], state = this.state): void {
    const { canvas, g } = side;
    if (!layers.some((layer) => !isHidden(layer) && this.ink.layerCanvas(layer.id))) {
      releaseCanvas(canvas);
      return;
    }
    const { width, height } = this.ink;
    // Sizing a canvas clears it, so only one already at size needs clearing.
    if (canvas.width === width && canvas.height === height) clearAll(side);
    else {
      canvas.width = width;
      canvas.height = height;
    }
    const ids = layers.map((layer) => layer.id);
    this.ink.compositeInto(g, state, ids, { x: 0, y: 0, w: width, h: height });
  }

  /** Redraws what clipping shows of the current layer within `rect`, device px. */
  private redrawClipping(rect: Rect): void {
    if (rect.w <= 0 || rect.h <= 0) return;
    if (this.viewBase) this.cutView(this.viewBase, rect);
    else if (this.clippedAbove) {
      this.above.g.clearRect(rect.x, rect.y, rect.w, rect.h);
      this.ink.compositeInto(this.above.g, this.state, this.aboveIds, rect, this.shownCanvasOf);
    }
  }

  /** Shows the current layer through the view, cut to its base's canvas, over the whole sheet. */
  private openView(baseCanvas: HTMLCanvasElement): void {
    this.viewBase = baseCanvas;
    const { canvas } = this.view;
    const { width, height } = this.ink;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Over the layer's canvas and wet, which hide behind it.
    if (canvas.parentElement !== this.group) this.group.append(canvas);
    this.ink.countView(true);
    this.cutView(baseCanvas, { x: 0, y: 0, w: width, h: height });
  }

  /** Lets go of the view, as the group stops showing it. */
  private closeView(): void {
    if (!this.viewBase) return;
    this.viewBase = null;
    releaseCanvas(this.view.canvas);
    this.view.canvas.remove();
    this.ink.countView(false);
  }

  /** Draws the current layer as shown on the view within `rect`, cut to `baseCanvas`. */
  private cutView(baseCanvas: HTMLCanvasElement, { x, y, w, h }: Rect): void {
    // Over a copy, wet holds the whole layer as shown.
    const layer = this.stroke?.copied ? null : this.ink.layerCanvas(this.current);
    const { g } = this.view;
    g.save();
    // destination-in clears what it covers outside the image it draws: the clip keeps it in the rect.
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.clearRect(x, y, w, h);
    if (layer) g.drawImage(layer, x, y, w, h, x, y, w, h);
    if (this.stroke) g.drawImage(this.wet.canvas, x, y, w, h, x, y, w, h);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(baseCanvas, x, y, w, h, x, y, w, h);
    g.restore();
  }

  /** Hides what the group shows nothing of: under the view, the layer's canvas and wet; under a copy on wet, the layer's canvas. */
  private hideCovered(): void {
    const viewed = this.viewBase !== null;
    this.wet.canvas.style.visibility = viewed ? "hidden" : "";
    if (this.mounted) this.mounted.style.visibility = viewed || this.stroke?.copied ? "hidden" : "";
  }

  /**
   * Takes the last frame's tail off wet: its box goes back to what was under the stroke, and the
   * settled segments reaching into it are painted again. The clip keeps that repaint inside the
   * box, so the ink outside never doubles its edges.
   */
  private eraseTail({ op, brush, copied, painted, tail }: WetStroke): void {
    const { g } = this.wet;
    const { x, y, w, h } = tail;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.clearRect(x, y, w, h);
    if (copied) g.drawImage(copied, x, y, w, h, x, y, w, h);
    const d = this.ink.density;
    g.setTransform(d, 0, 0, d, 0, 0);
    // The box in sheet units, as the stroke's points are.
    const left = x / d;
    const top = y / d;
    const right = (x + w) / d;
    const bottom = (y + h) / d;
    let run = -1;
    for (let i = 0; i <= painted; i++) {
      const reaches = i < painted && segmentReaches(op.pts, i, left, top, right, bottom);
      if (reaches && run < 0) run = i;
      else if (!reaches && run >= 0) {
        paintStroke(g, op, run, i, brush);
        run = -1;
      }
    }
    g.restore();
    tail.w = 0;
    tail.h = 0;
  }

  /**
   * Sets `box` to where points [from, to) of `pts` can ink as capsules: device px, out to whole
   * pixels, on the sheet. Empty when none of it is on the sheet.
   */
  private inkedBox(pts: readonly number[], from: number, to: number, box: Rect): void {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let i = from; i < to; i++) {
      const r = paintedRadius(pts, i);
      const j = i * STRIDE;
      left = Math.min(left, pts[j] - r);
      top = Math.min(top, pts[j + 1] - r);
      right = Math.max(right, pts[j] + r);
      bottom = Math.max(bottom, pts[j + 1] + r);
    }
    const { density: d, width, height } = this.ink;
    box.x = Math.max(0, Math.floor(left * d - EDGE_PX));
    box.y = Math.max(0, Math.floor(top * d - EDGE_PX));
    box.w = Math.min(width, Math.ceil(right * d + EDGE_PX)) - box.x;
    box.h = Math.min(height, Math.ceil(bottom * d + EDGE_PX)) - box.y;
    if (box.w > 0 && box.h > 0) return;
    box.w = 0;
    box.h = 0;
  }
}
