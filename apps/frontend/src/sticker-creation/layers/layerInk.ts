import { releaseCanvas } from "../../ui/releaseCanvas";
import { hexToRgb } from "../canvas/color";
import { blankCanvas } from "../canvas/context2d";
import { findOnSheet, recordFill, replayFill, writeFill, type WrittenFill } from "../canvas/fill";
import { STRIDE, type FillOp, type LayerId, type Step, type StrokeOp } from "../canvas/ops";
import { paintStroke } from "../canvas/paintStroke";
import type { SheetFrame } from "../canvas/sheetFrame";
import type { Rect } from "../sealing/stickerPasses";
import { compositeLayers } from "./composite";
import { baseOf, FIRST_LAYERS, indexOf, type Layer, type LayerState } from "./layerState";
import type { LayerSurface } from "./layerSurface";

/** The most canvas memory a sheet may take, in bytes: the lowest cap old iOS reports. */
export const CANVAS_BYTES_BUDGET = 224_000_000;
/** The canvases that show the sheet: the layers below the current one, the current one, the wet stroke, and the layers above. A clipped current layer's view is one more. */
const DISPLAY_CANVASES = 4;
/** A shown canvas counts as two sheet canvases: the browser keeps more than one copy of it. */
const DISPLAY_CANVAS_COST = 2;
const BYTES_PER_PIXEL = 4;
/** A fill reads, floods and rewrites pixels, far more work than painting a stroke. */
const FILL_COST = 24;
/** Sheet units on a side of the square a fill reads first, around its seed: room for a shape drawn to be filled. */
const FILL_NEAR = 160;

/** A layer's ink: its sheet canvas, the holds sharing it as it is, and where its ink reaches. */
interface Ink {
  readonly canvas: HTMLCanvasElement;
  /** Draws in sheet units. */
  readonly g: CanvasRenderingContext2D;
  /** Holds sharing the canvas as it is now; they're given a copy before it's next written. */
  readonly sharers: Set<Hold>;
  /** Sheet units. */
  box: Rect | null;
}

/** A copy of a layer's canvas, shared by the holds made since the write before it. */
interface HeldCopy {
  readonly canvas: HTMLCanvasElement;
  holds: number;
}

/** A pooled canvas, grown as needed. */
interface Scratch {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
}

/** A layer's pixels as they were when held. */
class Hold {
  /** The layer's ink, shared while the layer is unchanged since the hold. */
  shared: Ink | null;
  /** The copy made before the layer's next write, shared with every hold made since the write before. */
  copy: HeldCopy | null = null;
  /** Where the layer's ink reached when held, in sheet units. */
  readonly box: Rect | null;
  /** The ink's sizing when held: canvases sized or released since can't take its pixels. */
  readonly sizing: number;
  released = false;

  constructor(shared: Ink | null, sizing: number) {
    this.shared = shared;
    this.box = shared?.box ?? null;
    this.sizing = sizing;
  }
}

export type { Hold as InkHold };

const unionOf = (a: Rect | null, b: Rect | null): Rect | null => {
  if (!a || !b) return a ?? b;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

const inUnits = ({ x, y, w, h }: Rect, density: number): Rect => ({
  x: x / density,
  y: y / density,
  w: w / density,
  h: h / density,
});

/** The stroke's points grown by half their width, in sheet units; null with no points. */
function strokeBox({ pts }: StrokeOp): Rect | null {
  if (pts.length < STRIDE) return null;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i += STRIDE) {
    const r = pts[i + 2] / 2;
    x0 = Math.min(x0, pts[i] - r);
    y0 = Math.min(y0, pts[i + 1] - r);
    x1 = Math.max(x1, pts[i] + r);
    y1 = Math.max(y1, pts[i + 1] + r);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The layer `id` in `state`; throws when the sheet has no such layer. */
function layerOf(state: LayerState, id: LayerId): Layer {
  const at = indexOf(state, id);
  if (at < 0) {
    const held = state.layers.map((layer) => layer.id).join(", ");
    throw new Error(`Layer ${id} isn't among the sheet's layers (${held})`);
  }
  return state.layers[at];
}

/** `scratch`, or a new one, at least `width` × `height`. */
function grown(scratch: Scratch | null, width: number, height: number): Scratch {
  if (!scratch) return blankCanvas(width, height);
  const { canvas } = scratch;
  if (canvas.width < width || canvas.height < height) {
    canvas.width = Math.max(canvas.width, width);
    canvas.height = Math.max(canvas.height, height);
  }
  return scratch;
}

/**
 * The layers' ink: a sheet-sized canvas per inked layer, drawn in sheet units at the frame's
 * density; a layer with no canvas is blank. A hold shares its layer's canvas until the layer is next
 * written, which first gives every hold sharing it one copy. A fill finds its region on what's shown
 * and writes it to its own layer, keeping what it wrote, so a replay writes it again from that alone.
 */
export class LayerInk implements LayerSurface<Hold> {
  private dpr = 1;
  private sheetWidth = 1;
  private sheetHeight = 1;
  /** Counts the times every canvas was let go of: holds made before can't be restored. */
  private sizing = 0;
  private shown: LayerState = FIRST_LAYERS;
  private readonly inks = new Map<LayerId, Ink>();
  private readonly copies = new Set<HeldCopy>();
  /** What each fill wrote on its layer, at this density. */
  private fills = new WeakMap<FillOp, WrittenFill>();
  /** Where a fill composites what's shown and reads a layer back: a plain canvas, read once a box. */
  private reader: Scratch | null = null;
  /** Where compositing cuts a clipped layer to its base. */
  private clipper: Scratch | null = null;
  /** The display shows a clipped current layer through its view. */
  private viewShown = false;

  private readonly canvasOf = (id: LayerId) => this.inks.get(id)?.canvas ?? null;

  /** Device px per sheet unit. */
  get density(): number {
    return this.dpr;
  }

  /** Every sheet canvas's width, device px. */
  get width(): number {
    return this.sheetWidth;
  }

  /** Every sheet canvas's height, device px. */
  get height(): number {
    return this.sheetHeight;
  }

  /** The layers last shown. */
  get state(): LayerState {
    return this.shown;
  }

  get copiesHeld(): number {
    return this.copies.size;
  }

  /**
   * Sizes the sheet to the frame, which lets go of every canvas, the holds' copies too, since
   * pixels at another size or density can't be restored; says whether it changed. The caller replays.
   */
  setFrame({ w, h, density }: SheetFrame): boolean {
    const width = Math.max(1, Math.round(w * density));
    const height = Math.max(1, Math.round(h * density));
    if (width === this.sheetWidth && height === this.sheetHeight && density === this.dpr)
      return false;
    this.releaseAll();
    this.dpr = density;
    this.sheetWidth = width;
    this.sheetHeight = height;
    // What a fill wrote at another density isn't what it writes at this one.
    this.fills = new WeakMap();
    return true;
  }

  /** Replays into a replacement canvas; an allocation failure keeps the original canvas intact. */
  rebuild(layer: LayerId, write: () => void): void {
    const original = this.inks.get(layer);
    this.inks.delete(layer);
    try {
      write();
    } catch (error) {
      const partial = this.inks.get(layer);
      if (partial) releaseCanvas(partial.canvas);
      this.inks.delete(layer);
      if (original) this.inks.set(layer, original);
      throw error;
    }
    if (original) this.retire(original);
  }

  show(state: LayerState): void {
    this.shown = state;
  }

  apply(step: Step, before: LayerState): void {
    switch (step.tool) {
      case "brush":
      case "eraser":
        this.stroke(step, before);
        return;
      case "fill": {
        const written = this.fills.get(step);
        if (written) this.replay(step.layer, written, layerOf(before, step.layer).locked);
        else this.flood(step, before);
        return;
      }
      case "clear":
      case "delete":
        this.blank(step.layer);
        return;
      case "add":
      case "move":
      case "opacity":
      case "lock":
      case "clip":
        return;
    }
  }

  cost(step: Step): number {
    switch (step.tool) {
      case "fill":
        return FILL_COST;
      case "brush":
      case "eraser":
      case "clear":
        return 1;
      default:
        return 0;
    }
  }

  hold(layer: LayerId): Hold {
    const ink = this.inks.get(layer) ?? null;
    const hold = new Hold(ink, this.sizing);
    ink?.sharers.add(hold);
    return hold;
  }

  restore(layer: LayerId, hold: Hold | null): void {
    if (hold?.released) throw new Error(`Layer ${layer} can't be restored from a released hold`);
    if (hold && hold.sizing !== this.sizing) {
      throw new Error(
        `Layer ${layer} can't be restored from a hold made before the sheet was last resized or released`,
      );
    }
    const ink = this.inks.get(layer);
    if (hold?.shared && hold.shared === ink) return;
    const pixels = hold?.copy?.canvas ?? hold?.shared?.canvas;
    if (!hold || !pixels) {
      this.blank(layer);
      return;
    }
    const target = this.writable(layer);
    const { g } = target;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "copy";
    g.drawImage(pixels, 0, 0);
    g.restore();
    target.box = hold.box;
  }

  /** Releasing a hold twice does nothing. */
  release(hold: Hold): void {
    if (hold.released) return;
    hold.released = true;
    hold.shared?.sharers.delete(hold);
    hold.shared = null;
    const { copy } = hold;
    hold.copy = null;
    if (!copy) return;
    copy.holds--;
    if (copy.holds === 0 && this.copies.delete(copy)) releaseCanvas(copy.canvas);
  }

  copiesFreedBy(holds: readonly Hold[]): number {
    const letGo = new Map<HeldCopy, number>();
    for (const { copy } of new Set(holds)) {
      if (copy && this.copies.has(copy)) letGo.set(copy, (letGo.get(copy) ?? 0) + 1);
    }
    let freed = 0;
    for (const [copy, holds] of letGo) if (holds === copy.holds) freed++;
    return freed;
  }

  copyBudgetFor(inkedLayers: number): number {
    const canvasBytes = this.sheetWidth * this.sheetHeight * BYTES_PER_PIXEL;
    const canvases = Math.floor(CANVAS_BYTES_BUDGET / canvasBytes);
    const shown = DISPLAY_CANVASES + (this.viewShown ? 1 : 0);
    return Math.max(0, canvases - inkedLayers - shown * DISPLAY_CANVAS_COST);
  }

  /** The display shows a clipped current layer through its view, or stops; holds keep fewer copies while it does. */
  countView(shown: boolean): void {
    this.viewShown = shown;
  }

  /**
   * Fills from the op's point on what `state` shows, writing on the op's layer alone, and keeps what
   * it wrote for a replay. The box it changed, in device px, or null when nothing changed.
   */
  flood(op: FillOp, state: LayerState): Rect | null {
    const { locked } = layerOf(state, op.layer);
    const d = this.dpr;
    const color = hexToRgb(op.color);
    const ids = state.layers.map((layer) => layer.id);
    const sheetFind = findOnSheet(
      { width: this.sheetWidth, height: this.sheetHeight },
      (box) => this.readShown(state, ids, box),
      Math.floor(op.x * d),
      Math.floor(op.y * d),
      color,
      op.gap * d,
      Math.round(FILL_NEAR * d),
    );
    if (!sheetFind) return null;
    const { shown, at, found } = sheetFind;
    const ink = this.inks.get(op.layer);
    const pixels = ink ? this.readLayer(ink, at) : new ImageData(at.w, at.h);
    // Only a locked layer can write nothing: the region holds none of its ink.
    if (!writeFill(pixels, shown, found, color, locked)) return null;
    const written = recordFill(pixels, at, found);
    this.fills.set(op, written);
    this.put(op.layer, pixels, at, found.box, locked);
    return { ...written.box };
  }

  /** A new canvas holding every layer `state` shows, for the seal; the caller releases it. */
  composite(state: LayerState): HTMLCanvasElement {
    // A fill can leave full-sheet reader and clipper canvases. Let them go before making the seal's
    // full-sheet copy; compositing can grow the clipper again, so release it once this copy is made.
    this.releaseScratch();
    const whole = { x: 0, y: 0, w: this.sheetWidth, h: this.sheetHeight };
    const { canvas, g } = blankCanvas(this.sheetWidth, this.sheetHeight);
    const ids = state.layers.map((layer) => layer.id);
    try {
      this.compositeInto(g, state, ids, whole);
      return canvas;
    } catch (error) {
      releaseCanvas(canvas);
      throw error;
    } finally {
      this.releaseScratch();
    }
  }

  /**
   * Draws the layers `ids` of `state` onto `g` within `rect`, device px, as `compositeLayers` does,
   * cutting each clipped layer to its base on the ink's own scratch. `canvasOf` can stand in for a
   * layer's own canvas, as the display does for a layer under a stroke in progress.
   */
  compositeInto(
    g: CanvasRenderingContext2D,
    state: LayerState,
    ids: readonly LayerId[],
    rect: Rect,
    canvasOf: (id: LayerId) => HTMLCanvasElement | null = this.canvasOf,
  ): void {
    compositeLayers(g, state, canvasOf, ids, rect, this.clipScratch(state, rect));
  }

  /** A layer's own ink; null while it has none. */
  layerCanvas(id: LayerId): HTMLCanvasElement | null {
    return this.canvasOf(id);
  }

  /** Where the layer's ops reached, in sheet units; null while it has no ink. */
  inkBox(id: LayerId): Rect | null {
    const box = this.inks.get(id)?.box;
    return box ? { ...box } : null;
  }

  /** Lets go of every canvas: the layers', the holds' copies and the scratches. */
  releaseAll(): void {
    for (const ink of this.inks.values()) releaseCanvas(ink.canvas);
    this.inks.clear();
    for (const copy of this.copies) releaseCanvas(copy.canvas);
    this.copies.clear();
    this.releaseScratch();
    // The full recording rebuilds these regions when the covered drawing returns; keeping them
    // here would retain every fill's pixel arrays while another screen prepares a timelapse.
    this.fills = new WeakMap();
    this.sizing++;
  }

  /** Releases fill and clipping canvases that can grow as large as the whole sheet. */
  private releaseScratch(): void {
    for (const scratch of [this.reader, this.clipper]) if (scratch) releaseCanvas(scratch.canvas);
    this.reader = null;
    this.clipper = null;
  }

  private stroke(op: StrokeOp, before: LayerState): void {
    const { locked } = layerOf(before, op.layer);
    // Only a brush on an unlocked layer can ink where there's none.
    const inks = op.tool === "brush" && !locked;
    if (!inks && !this.inks.has(op.layer)) return;
    const ink = this.writable(op.layer);
    paintStroke(ink.g, op, 0, op.pts.length / STRIDE, locked ? "source-atop" : "source-over");
    if (inks) ink.box = unionOf(ink.box, strokeBox(op));
  }

  /** Writes a kept fill again on its layer, reading that layer alone. */
  private replay(layer: LayerId, written: WrittenFill, locked: boolean): void {
    const { box } = written;
    const ink = this.inks.get(layer);
    const pixels = ink ? this.readLayer(ink, box) : new ImageData(box.w, box.h);
    replayFill(pixels, box, written);
    this.put(layer, pixels, box, { x: 0, y: 0, w: box.w, h: box.h }, locked);
  }

  /**
   * Puts the `dirty` part of `pixels`, read from `at`, back on the layer, and grows its ink box by it
   * unless the layer is locked: a locked layer's ink reaches no further than it did.
   */
  private put(layer: LayerId, pixels: ImageData, at: Rect, dirty: Rect, locked: boolean): void {
    const ink = this.writable(layer);
    ink.g.putImageData(pixels, at.x, at.y, dirty.x, dirty.y, dirty.w, dirty.h);
    if (locked) return;
    const changed = { x: at.x + dirty.x, y: at.y + dirty.y, w: dirty.w, h: dirty.h };
    ink.box = unionOf(ink.box, inUnits(changed, this.dpr));
  }

  /** What `ids` show within `box`, composited on a GPU canvas and read back once. */
  private readShown(state: LayerState, ids: readonly LayerId[], box: Rect): ImageData {
    this.reader = grown(this.reader, box.x + box.w, box.y + box.h);
    const { g } = this.reader;
    g.clearRect(box.x, box.y, box.w, box.h);
    this.compositeInto(g, state, ids, box);
    return g.getImageData(box.x, box.y, box.w, box.h);
  }

  /** A layer's own pixels within `box`, read back through the reader so its canvas is never read. */
  private readLayer(ink: Ink, box: Rect): ImageData {
    this.reader = grown(this.reader, box.x + box.w, box.y + box.h);
    const { g } = this.reader;
    g.clearRect(box.x, box.y, box.w, box.h);
    g.drawImage(ink.canvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    return g.getImageData(box.x, box.y, box.w, box.h);
  }

  /** The scratch compositing cuts clipped layers on, grown to `box` only when a layer has a base. */
  private clipScratch(state: LayerState, box: Rect): CanvasRenderingContext2D {
    const clips = state.layers.some((layer) => baseOf(state, layer.id) !== null);
    this.clipper = grown(this.clipper, clips ? box.x + box.w : 1, clips ? box.y + box.h : 1);
    return this.clipper.g;
  }

  /** The layer's ink, made if it has none, with every hold sharing it given its copy first. */
  private writable(layer: LayerId): Ink {
    const ink = this.inks.get(layer);
    if (ink) {
      this.detach(ink);
      return ink;
    }
    const { canvas, g } = blankCanvas(this.sheetWidth, this.sheetHeight);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const made: Ink = { canvas, g, sharers: new Set(), box: null };
    this.inks.set(layer, made);
    return made;
  }

  /** Gives the holds sharing the ink's canvas one copy of it, before the canvas is written. */
  private detach(ink: Ink): void {
    if (ink.sharers.size === 0) return;
    const { canvas, g } = blankCanvas(this.sheetWidth, this.sheetHeight);
    g.drawImage(ink.canvas, 0, 0);
    const copy: HeldCopy = { canvas, holds: ink.sharers.size };
    for (const hold of ink.sharers) {
      hold.shared = null;
      hold.copy = copy;
    }
    ink.sharers.clear();
    this.copies.add(copy);
  }

  /** Removes the layer, retaining its existing canvas only while undo holds need its pixels. */
  private blank(layer: LayerId): void {
    const ink = this.inks.get(layer);
    if (!ink) return;
    this.retire(ink);
    this.inks.delete(layer);
  }

  /** A removed canvas becomes its holds' copy without allocating another full sheet. */
  private retire(ink: Ink): void {
    if (ink.sharers.size === 0) {
      releaseCanvas(ink.canvas);
      return;
    }
    const copy: HeldCopy = { canvas: ink.canvas, holds: ink.sharers.size };
    for (const hold of ink.sharers) {
      hold.shared = null;
      hold.copy = copy;
    }
    ink.sharers.clear();
    this.copies.add(copy);
  }
}
