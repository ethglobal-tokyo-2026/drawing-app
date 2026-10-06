import { StrokeBuilder } from "./brush";
import { TapRecognizer } from "./gestures";
import { History, type Surface } from "./history";
import { LazyBrush } from "./lazyBrush";
import type { FillOp, Op, Step, StrokeOp, Tool } from "./ops";

/** A fill takes a tap: a pointer that lifts within this many px of where it landed. */
const TAP_SLOP = 10;
/** A touch on a paused sheet that drags this far gets the paused hint without waiting to lift. */
const BLOCKED_DRAG = 8;
/** When the browser takes a pointer away mid-stroke, the stroke stays if it had gone this far. */
const CANCEL_KEEPS = 4;
/** The catch-up on lift moves like a steady hand, so its width follows the same speed model. */
const CATCH_UP_MS = 8;

/** What the engine paints on: the ink canvas in the app, a record of calls in tests. */
export interface InkLayer extends Surface<unknown> {
  /** Paints points [from, to) of a stroke in progress. */
  paint: (op: StrokeOp, from: number, to: number) => void;
  /** Floods from the op's point; false when nothing changed. */
  fill: (op: FillOp) => boolean;
}

/** What the drawing screen has set; the engine reads it as each pointer lands. */
export interface InkSettings {
  tool: Tool;
  color: string;
  /** Brush or eraser width, in px. */
  size: number;
  /** How far the brush trails the finger, in px. */
  lazyRadius: number;
  /** No input at all: sealing, sealed, or the ticket card is up. */
  locked: boolean;
  /** The person paused the clock: the sheet takes no marks. */
  paused: boolean;
  /** A tool panel is open: a touch on the sheet closes it and draws nothing. */
  panelOpen: boolean;
  /** The seal key took its first tap: any touch disarms it. */
  armed: boolean;
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
  onDisarm: () => void;
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
  /** The furthest it has gone from where it landed, in px. */
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
  private fillTap: { id: number; x: number; y: number; cx: number; cy: number } | null = null;
  /** Pointers that closed a panel or met a paused sheet: they do nothing more until they lift. */
  private readonly swallowed = new Set<number>();
  /** A touch on a paused sheet, waiting a beat before the hint in case a second finger makes a tap. */
  private blocked: { id: number; cx: number; cy: number } | null = null;
  private penSeen = false;
  /** Every finger left the screen: the next touch to land is the only one down. */
  private fingersGone = false;
  private cancelFrame: (() => void) | null = null;
  private locate: () => { left: number; top: number } = () => ({ left: 0, top: 0 });
  private origin = { left: 0, top: 0 };

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
    if (s.locked || (pointerType === "mouse" && e.button !== 0)) return;
    // Pointer ids come back; one that lifted where we couldn't see it starts over.
    this.swallowed.delete(id);
    if (s.armed) this.events.onDisarm();
    if (pointerType === "touch") {
      if (this.fingersGone) this.forgetTouches();
      if (this.live?.pointerType === "pen") return;
      const stroke = this.live?.pointerType === "touch" ? this.live : null;
      const result = this.taps.down(
        id,
        e.clientX,
        e.clientY,
        e.timeStamp,
        stroke ? { age: e.timeStamp - stroke.t0, moved: stroke.moved } : undefined,
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
    this.origin = this.locate();
    const [x, y] = this.toSheet(e);
    if (s.tool === "fill") this.fillTap = { id, x, y, cx: e.clientX, cy: e.clientY };
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

  /** A fresh sheet: no ink, nothing to undo or redo. */
  reset(): void {
    this.load([]);
  }

  /** A sheet with these steps on it and nothing to redo, as a drawing picked up after a reload has. */
  load(steps: readonly Step[]): void {
    this.endStroke(true);
    this.fillTap = null;
    this.blocked = null;
    this.swallowed.clear();
    this.taps.clear();
    this.history.load(steps);
    this.notifyHistory();
  }

  /** The layer was resized, which cleared it: every op goes back on. */
  resized(): void {
    this.history.invalidate();
    if (this.live) this.layer.paint(this.live.builder.op, 0, this.live.painted);
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

  private toSheet(e: PointerInput): [number, number] {
    return [e.clientX - this.origin.left, e.clientY - this.origin.top];
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
      if (!cancelled && Math.hypot(e.clientX - tap.cx, e.clientY - tap.cy) < TAP_SLOP)
        this.applyFill(tap.x, tap.y);
      return;
    }
    const live = this.live;
    if (live?.id !== id) return;
    if (!cancelled) [live.x, live.y] = this.toSheet(e);
    this.endStroke(cancelled && live.moved < CANCEL_KEEPS);
  }

  private beginStroke(e: PointerInput, x: number, y: number): void {
    const s = this.settings;
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
    this.history.commit(op);
    this.events.onCommit(op);
    this.notifyHistory();
  }

  private notifyHistory(): void {
    const { canUndo, canRedo, hasInk } = this.history;
    this.events.onHistory({ canUndo, canRedo, hasInk });
  }
}
