import { StrokeBuilder } from "./brush";
import { TapRecognizer } from "./gestures";
import { History, type Surface } from "./history";
import { LazyBrush } from "./lazyBrush";
import type { FillOp, Op, Step, StrokeOp, Tool } from "./ops";
import { areaFrame, frameFor, type SheetArea, type SheetFrame } from "./sheetFrame";

/** A fill takes a tap: a pointer that lifts within this many sheet units of where it landed. */
const TAP_SLOP = 10;
/** A touch on a paused sheet that drags this many CSS px gets the paused hint before it lifts. */
const BLOCKED_DRAG = 8;
/** When the browser takes a pointer mid-stroke, the stroke stays if it had gone this many units. */
const CANCEL_KEEPS = 4;
/** The catch-up on lift moves like a steady hand, so its width follows the same speed model. */
const CATCH_UP_MS = 8;

/** What the engine paints on: the ink canvas in the app, a record of calls in tests. */
export interface InkLayer extends Surface<unknown> {
  /** Sizes the ink to a frame, which clears it; says whether its size changed. */
  setFrame: (frame: SheetFrame) => boolean;
  /** Paints points [from, to) of a stroke in progress. */
  paint: (op: StrokeOp, from: number, to: number) => void;
  /** Floods from the op's point; false when nothing changed. */
  fill: (op: FillOp) => boolean;
}

/** What the drawing screen has set; the engine reads it as each pointer lands. */
export interface InkSettings {
  tool: Tool;
  color: string;
  /** Brush or eraser width, in sheet units. */
  size: number;
  /** How far the brush trails the finger, in sheet units. */
  lazyRadius: number;
  /** No input at all: sealing, sealed, or the ticket card is up. */
  locked: boolean;
  /** The person paused the clock: the sheet takes no marks. */
  paused: boolean;
  /** A tool panel is open: a touch on the sheet closes it and draws nothing. */
  panelOpen: boolean;
  /** ms into the session, to stamp each op with. */
  sessionMs: () => number;
}

/** What undo and redo can do, and whether there's ink on the sheet. */
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  /** There are ops on the ink: the seal key shows, and the sheet can be cleared. */
  hasInk: boolean;
}

export interface InkEvents {
  onHistory: (state: HistoryState) => void;
  /** A stroke or fill landed. */
  onCommit: (op: Op) => void;
  /** Someone tried to draw on a paused sheet. */
  onBlocked: () => void;
  onDismissPanel: () => void;
}

/** The parts of a PointerEvent the engine reads. */
export interface PointerInput {
  pointerId: number;
  pointerType: string;
  button: number;
  clientX: number;
  clientY: number;
  pressure: number;
  timeStamp: number;
  getCoalescedEvents?: () => PointerInput[];
  preventDefault: () => void;
}

/** Where the sheet's paper is on screen, in CSS px. */
interface PaperRect {
  left: number;
  top: number;
  width: number;
}

/** Asks for one animation frame; returns a function that withdraws the request. */
export type RequestFrame = (frame: () => void) => () => void;

const browserFrame: RequestFrame = (frame) => {
  const id = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(id);
};

interface LiveStroke {
  id: number;
  pointerType: string;
  builder: StrokeBuilder;
  lazy: LazyBrush;
  /** Samples since the last frame, flat: x, y, pressure, t. */
  queue: number[];
  /** Points already on the ink. */
  painted: number;
  /** When and where it landed. */
  t0: number;
  x0: number;
  y0: number;
  /** The furthest it has gone from where it landed, in sheet units. */
  moved: number;
  /** The latest sample: where the stroke ends if the pointer lifts now. */
  x: number;
  y: number;
  pressure: number;
  t: number;
}

/**
 * Turns pointer input into ink. Pointer events only queue samples; one animation frame at a time
 * feeds them through the lazy brush and the width model and paints just the new segments. It never
 * touches React: it reads `settings` as pointers land and reports through `events`.
 *
 * Ink is in sheet units: a pointer's offset on the paper over the CSS px a unit spans there. The
 * sheet's frame follows its area while the sheet is blank, and is fixed from the first mark.
 *
 * Touch: two fingers tap to undo, three to redo, and a second finger landing early takes back the
 * first one's stroke. Once a pen has drawn, fingers only tap, and a finger stroke a pen interrupts
 * was a resting palm.
 */
export class InkEngine {
  settings: InkSettings;
  private readonly layer: InkLayer;
  private readonly history: History<unknown>;
  private readonly events: InkEvents;
  private readonly requestFrame: RequestFrame;
  private readonly taps = new TapRecognizer();
  private live: LiveStroke | null = null;
  private fillTap: { id: number; x: number; y: number } | null = null;
  /** Pointers that closed a panel or met a paused sheet: they do nothing more until they lift. */
  private readonly swallowed = new Set<number>();
  /** A touch on a paused sheet, waiting a beat before the hint in case a second finger makes a tap. */
  private blocked: { id: number; cx: number; cy: number } | null = null;
  private penSeen = false;
  /** Every finger left the screen: the next touch to land is the only one down. */
  private fingersGone = false;
  private cancelFrame: (() => void) | null = null;
  /** The sheet's frame; null until its area is measured or a kept drawing brings one. */
  private sheet: SheetFrame | null = null;
  /**
   * How the frame is decided at the next measure: it follows the area while the sheet is blank,
   * takes the area itself for a drawing kept without one, and stays once the drawing has marks.
   */
  private frameRule: "follows" | "area" | "fixed" = "follows";
  private locate: () => PaperRect = () => ({ left: 0, top: 0, width: this.sheet?.w ?? 1 });
  /** Where the paper was and how many CSS px a unit spanned there, as the pointer landed. */
  private origin = { left: 0, top: 0, scale: 1 };

  constructor(
    layer: InkLayer,
    settings: InkSettings,
    events: InkEvents,
    requestFrame: RequestFrame = browserFrame,
  ) {
    this.layer = layer;
    this.settings = settings;
    this.events = events;
    this.requestFrame = requestFrame;
    this.history = new History(layer);
  }

  /** Listens for pointers on the sheet; returns the detach. */
  attach(sheet: HTMLElement): () => void {
    this.locate = () => sheet.getBoundingClientRect();
    const onDown = (e: PointerEvent) => {
      this.down(e);
      if (!this.tracks(e.pointerId)) return;
      try {
        sheet.setPointerCapture(e.pointerId);
      } catch {
        // The pointer already lifted, or never existed (a synthetic event): nothing left to capture.
      }
    };
    const onMove = (e: PointerEvent) => this.move(e);
    const onUp = (e: PointerEvent) => this.up(e);
    const onCancel = (e: PointerEvent) => this.cancel(e);
    // Capture ends with every lift; losing it without one means the pointer is gone for good.
    const onLostCapture = (e: PointerEvent) => {
      if (this.tracks(e.pointerId)) this.cancel(e);
    };
    const prevent = (e: Event) => e.preventDefault();
    const touch = { passive: false };
    // The screen's own count of fingers, heard wherever they lift, outlasts a lift the sheet missed.
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) this.screenClear();
    };
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    sheet.addEventListener("pointerdown", onDown);
    sheet.addEventListener("pointermove", onMove);
    sheet.addEventListener("pointerup", onUp);
    sheet.addEventListener("pointercancel", onCancel);
    sheet.addEventListener("lostpointercapture", onLostCapture);
    sheet.addEventListener("contextmenu", prevent);
    // iOS can still start a scroll or a text selection from a touch, whatever touch-action says.
    sheet.addEventListener("touchstart", prevent, touch);
    sheet.addEventListener("touchmove", prevent, touch);
    // Safari's own pinch zoom.
    document.addEventListener("gesturestart", prevent);
    return () => {
      sheet.removeEventListener("pointerdown", onDown);
      sheet.removeEventListener("pointermove", onMove);
      sheet.removeEventListener("pointerup", onUp);
      sheet.removeEventListener("pointercancel", onCancel);
      sheet.removeEventListener("lostpointercapture", onLostCapture);
      sheet.removeEventListener("contextmenu", prevent);
      sheet.removeEventListener("touchstart", prevent);
      sheet.removeEventListener("touchmove", prevent);
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      this.cancelFrame?.();
      this.cancelFrame = null;
    };
  }

  /** Every finger left the screen, so whatever lifts went missing, the next touch is the only one down. */
  screenClear(): void {
    this.fingersGone = true;
  }

  down(e: PointerInput): void {
    const s = this.settings;
    const { pointerId: id, pointerType } = e;
    if (s.locked || !this.sheet || (pointerType === "mouse" && e.button !== 0)) return;
    // Pointer ids come back; one that lifted where we couldn't see it starts over.
    this.swallowed.delete(id);
    if (pointerType === "touch") {
      if (this.fingersGone) this.forgetTouches();
      if (this.live?.pointerType === "pen") return;
      const stroke = this.live?.pointerType === "touch" ? this.live : null;
      // The tap recognizer judges fingers on the glass, so the stroke's reach goes to it in CSS px.
      const result = this.taps.down(
        id,
        e.clientX,
        e.clientY,
        e.timeStamp,
        stroke
          ? { age: e.timeStamp - stroke.t0, moved: stroke.moved * this.origin.scale }
          : undefined,
      );
      if (result === "cancel-stroke") this.endStroke(true);
      if (result === "cancel-stroke" || result === "gesture") {
        this.fillTap = null;
        this.blocked = null;
      }
      if (result !== "draw") return;
    } else if (pointerType === "pen") {
      this.penSeen = true;
      if (this.live && this.live.pointerType !== "pen") this.endStroke(true);
    }
    if (this.live || this.fillTap) return;
    if (s.panelOpen) {
      this.swallowed.add(id);
      this.events.onDismissPanel();
      return;
    }
    if (pointerType === "touch" && this.penSeen) return;
    e.preventDefault();
    if (s.paused) {
      this.swallowed.add(id);
      if (pointerType === "touch") this.blocked = { id, cx: e.clientX, cy: e.clientY };
      else this.events.onBlocked();
      return;
    }
    this.origin = this.place();
    const [x, y] = this.toSheet(e);
    if (s.tool === "fill") this.fillTap = { id, x, y };
    else this.beginStroke(e, x, y);
  }

  move(e: PointerInput): void {
    const id = e.pointerId;
    if (e.pointerType === "touch") this.taps.move(id, e.clientX, e.clientY);
    const blocked = this.blocked;
    if (
      blocked?.id === id &&
      Math.hypot(e.clientX - blocked.cx, e.clientY - blocked.cy) > BLOCKED_DRAG
    ) {
      this.blocked = null;
      this.events.onBlocked();
    }
    const live = this.live;
    if (live?.id !== id) return;
    const coalesced = e.getCoalescedEvents?.() ?? [];
    for (const sample of coalesced.length ? coalesced : [e]) {
      const [x, y] = this.toSheet(sample);
      live.queue.push(x, y, sample.pressure, sample.timeStamp);
      live.moved = Math.max(live.moved, Math.hypot(x - live.x0, y - live.y0));
      live.x = x;
      live.y = y;
      live.pressure = sample.pressure;
      live.t = sample.timeStamp;
    }
    if (!this.cancelFrame) this.cancelFrame = this.requestFrame(this.paintFrame);
  }

  up(e: PointerInput): void {
    this.lift(e, false);
  }

  /** The browser took the pointer: a scroll, a system gesture, or a lost capture. */
  cancel(e: PointerInput): void {
    this.lift(e, true);
  }

  /** Nothing while the sheet is locked: a seal is cut from the ink as it stands. */
  undo(): void {
    if (this.settings.locked) return;
    this.endStroke(true);
    if (this.history.undo()) this.notifyHistory();
  }

  redo(): void {
    if (this.settings.locked) return;
    this.endStroke(true);
    if (this.history.redo()) this.notifyHistory();
  }

  /**
   * Sets the drawing aside for a blank sheet; undo brings it back. A stroke still in progress goes
   * with it, and a fill whose finger hasn't lifted is dropped. Nothing while the sheet is locked.
   */
  clear(): void {
    if (this.settings.locked) return;
    this.endStroke(false);
    this.fillTap = null;
    if (!this.history.hasInk) return;
    this.history.clear();
    this.notifyHistory();
  }

  /** Ends a stroke in progress as if the pointer lifted, as time running out does. */
  finishStroke(): void {
    this.endStroke(false);
  }

  /** The ops on the ink, oldest first. */
  get ops(): readonly Op[] {
    return this.history.committed;
  }

  /** Every step, oldest first, clears included: what the drawing kept on the device holds. */
  get steps(): readonly Step[] {
    return this.history.steps;
  }

  /**
   * The sheet's size in units and its ink's density; null until its area is measured or a kept
   * drawing brings one.
   */
  get frame(): SheetFrame | null {
    return this.sheet;
  }

  /**
   * The sheet's area was measured on screen, in CSS px. A blank sheet's frame follows it, and a
   * drawing kept without a frame takes it as its own. A drawing with marks keeps its frame: the
   * paper only rescales, so nothing clears or replays.
   */
  fit(area: SheetArea, devicePixelRatio: number): void {
    if (this.frameRule === "fixed") return;
    if (this.frameRule === "follows") {
      this.useFrame(frameFor(area, devicePixelRatio));
      return;
    }
    this.frameRule = "fixed";
    this.useFrame(areaFrame(area, devicePixelRatio));
  }

  /** Where a point on screen falls on the sheet, in units; null until the sheet has a frame. */
  screenToSheet(clientX: number, clientY: number): [x: number, y: number] | null {
    if (!this.sheet) return null;
    const { left, top, scale } = this.place();
    return [(clientX - left) / scale, (clientY - top) / scale];
  }

  /** A fresh sheet: no ink, nothing to undo or redo, its frame following its area again. */
  reset(): void {
    this.load([], null);
  }

  /**
   * A sheet with these steps on it and nothing to redo, as a drawing picked up after a reload has,
   * in the frame it was drawn in. A drawing kept without a frame has none until the next measure
   * takes its area as its frame, so a save can't keep the last sheet's with it; with no steps, the
   * frame follows the area.
   */
  load(steps: readonly Step[], frame: SheetFrame | null): void {
    this.endStroke(true);
    this.fillTap = null;
    this.blocked = null;
    this.swallowed.clear();
    this.taps.clear();
    if (steps.length === 0) this.frameRule = "follows";
    else if (frame) {
      this.frameRule = "fixed";
      this.useFrame(frame);
    } else {
      this.frameRule = "area";
      this.sheet = null;
    }
    this.history.load(steps);
    this.notifyHistory();
  }

  /** The sheet is going: its undo snapshots are freed now rather than when they're collected. */
  dispose(): void {
    this.history.release();
  }

  /** Every touch pointer is taken as lifted: a finger's stroke stays, and a tap or fill in progress goes. */
  private forgetTouches(): void {
    this.fingersGone = false;
    for (const id of this.taps.clear()) {
      this.swallowed.delete(id);
      if (this.fillTap?.id === id) this.fillTap = null;
    }
    this.blocked = null;
    if (this.live?.pointerType === "touch") this.endStroke(false);
  }

  // Every finger the tap recognizer holds is captured too, so its lift or lost capture comes here.
  private tracks(id: number): boolean {
    return (
      this.live?.id === id ||
      this.fillTap?.id === id ||
      this.blocked?.id === id ||
      this.swallowed.has(id) ||
      this.taps.holds(id)
    );
  }

  /** Sizes the ink to a new frame; sized afresh, it clears, so what was on it goes back on. */
  private useFrame(frame: SheetFrame): void {
    const was = this.sheet;
    if (was?.w === frame.w && was.h === frame.h && was.density === frame.density) return;
    this.sheet = frame;
    if (this.layer.setFrame(frame)) this.history.invalidate();
  }

  /** Where the paper is now, and how many CSS px a unit spans on it. */
  private place(): { left: number; top: number; scale: number } {
    const paper = this.locate();
    return {
      left: paper.left,
      top: paper.top,
      scale: paper.width / (this.sheet?.w ?? paper.width),
    };
  }

  private toSheet(e: PointerInput): [number, number] {
    const { left, top, scale } = this.origin;
    return [(e.clientX - left) / scale, (e.clientY - top) / scale];
  }

  private lift(e: PointerInput, cancelled: boolean): void {
    const id = e.pointerId;
    if (e.pointerType === "touch") {
      const tapping = this.taps.inGesture(id);
      let gesture = null;
      if (cancelled) this.taps.cancel(id);
      else gesture = this.taps.up(id, e.timeStamp);
      if (this.blocked?.id === id) {
        this.blocked = null;
        if (!tapping && !cancelled) this.events.onBlocked();
      }
      if (gesture === "undo") this.undo();
      else if (gesture === "redo") this.redo();
      // A finger of a tap is never a stroke or a fill.
      if (tapping) {
        this.swallowed.delete(id);
        return;
      }
    }
    if (this.swallowed.delete(id)) return;
    const tap = this.fillTap;
    if (tap?.id === id) {
      this.fillTap = null;
      const [x, y] = this.toSheet(e);
      if (!cancelled && Math.hypot(x - tap.x, y - tap.y) < TAP_SLOP) this.applyFill(tap.x, tap.y);
      return;
    }
    const live = this.live;
    if (live?.id !== id) return;
    if (!cancelled) [live.x, live.y] = this.toSheet(e);
    this.endStroke(cancelled && live.moved < CANCEL_KEEPS);
  }

  private beginStroke(e: PointerInput, x: number, y: number): void {
    const s = this.settings;
    // The first mark fixes the frame for the life of the drawing.
    this.frameRule = "fixed";
    const builder = new StrokeBuilder({
      tool: s.tool === "eraser" ? "eraser" : "brush",
      color: s.color,
      size: s.size,
      x,
      y,
      t: e.timeStamp,
      T: s.sessionMs(),
    });
    this.live = {
      id: e.pointerId,
      pointerType: e.pointerType,
      builder,
      lazy: new LazyBrush(x, y, s.lazyRadius),
      queue: [],
      painted: 1,
      t0: e.timeStamp,
      x0: x,
      y0: y,
      moved: 0,
      x,
      y,
      pressure: e.pressure,
      t: e.timeStamp,
    };
    // The dot shows as the pointer lands, not a frame later.
    this.layer.paint(builder.op, 0, 1);
  }

  private readonly paintFrame = (): void => {
    this.cancelFrame = null;
    if (this.live) this.paintNew(this.live);
  };

  /** Feeds the queued samples through the lazy brush and paints the segments they add. */
  private paintNew(live: LiveStroke): void {
    const { queue, lazy, builder } = live;
    for (let i = 0; i < queue.length; i += 4) {
      if (lazy.follow(queue[i], queue[i + 1]))
        builder.add(lazy.x, lazy.y, queue[i + 2], live.pointerType, queue[i + 3]);
    }
    queue.length = 0;
    if (builder.count > live.painted) {
      this.layer.paint(builder.op, live.painted, builder.count);
      live.painted = builder.count;
    }
  }

  /** Commits the stroke in progress, or takes it back off the ink. */
  private endStroke(takeBack: boolean): void {
    const live = this.live;
    if (!live) return;
    this.live = null;
    this.cancelFrame?.();
    this.cancelFrame = null;
    if (takeBack) {
      this.history.repaint();
      return;
    }
    this.paintNew(live);
    let t = live.t;
    for (const [x, y] of live.lazy.catchUp(live.x, live.y))
      live.builder.add(x, y, live.pressure, live.pointerType, (t += CATCH_UP_MS));
    this.paintNew(live);
    this.history.commit(live.builder.op);
    this.events.onCommit(live.builder.op);
    this.notifyHistory();
  }

  private applyFill(x: number, y: number): void {
    const op: FillOp = {
      tool: "fill",
      x,
      y,
      color: this.settings.color,
      T: this.settings.sessionMs(),
    };
    if (!this.layer.fill(op)) return;
    this.frameRule = "fixed";
    this.history.commit(op);
    this.events.onCommit(op);
    this.notifyHistory();
  }

  private notifyHistory(): void {
    const { canUndo, canRedo, hasInk } = this.history;
    this.events.onHistory({ canUndo, canRedo, hasInk });
  }
}
