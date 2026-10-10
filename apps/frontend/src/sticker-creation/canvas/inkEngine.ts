import { timeOurWork } from "../../performance/performanceRecorder";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import { previewWidth, StrokeBuilder, type PenPressure } from "./brush";
import { FILL_GAP } from "./fill";
import { isPalm, TapRecognizer, type TapGesture } from "./gestures";
import { History, type Surface } from "./history";
import type { FillOp, Op, Step, StrokeOp, Tool } from "./ops";
import { areaFrame, frameFor, type SheetArea, type SheetFrame } from "./sheetFrame";
import { PAUSE_MS, Stabilizer } from "./stabilizer";

/** A fill takes a tap: a pointer that lifts within this many CSS px of where it landed. */
export const FILL_TAP_SLOP = 10;
/** A touch on a paused sheet that drags this many CSS px gets the paused hint before it lifts. */
const BLOCKED_DRAG = 8;
/** When the browser takes a pointer mid-stroke, the stroke stays if it had gone this many units. */
export const CANCEL_KEEPS = 4;

/** How the sheet takes input: Pencil only, where fingers only tap, or Pencil and finger. */
export const INPUT_MODES = ["pencilOnly", "pencilAndFinger"] as const;
export type InputMode = (typeof INPUT_MODES)[number];

/**
 * The ink's work as the performance recorder's report names it, so a slow Pencil stroke can be told:
 * a commit takes an undo checkpoint now and then, apart from a pen's snapshot at every landing.
 */
export const INK_WORK = {
  paint: "ink paint",
  fill: "ink fill",
  replay: "ink replay",
  snapshot: "ink snapshot",
  commit: "ink commit",
} as const;

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
  /** Smoothing, from 0 (Raw) to 100 (Smooth). */
  smoothing: number;
  /** No input at all: sealing, sealed, or the ticket card is up. */
  locked: boolean;
  /** The person paused the clock: the sheet takes no marks. */
  paused: boolean;
  /** A tool panel is open: a touch on the sheet closes it and draws nothing. */
  panelOpen: boolean;
  /**
   * Pencil only: fingers tap, to undo and redo, and never draw. Pencil and finger: both draw. Null on
   * a device no pen has drawn on: fingers draw, and no contact is judged a palm by its size.
   */
  inputMode: InputMode | null;
  /** How a pen's pressure sets its width. */
  penPressure: PenPressure;
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

/** Where a hovering pen would land on the paper, and how wide its stroke would show, in CSS px. */
export interface HoverRing {
  x: number;
  y: number;
  diameter: number;
}

export interface InkEvents {
  onHistory: (state: HistoryState) => void;
  /** A stroke or fill landed. */
  onCommit: (op: Op) => void;
  /** Someone tried to draw on a paused sheet. */
  onBlocked: () => void;
  onDismissPanel: () => void;
  /** A pen touched the sheet. */
  onPen: () => void;
  /** A pen hovering over the sheet; null once it lands or leaves, or the sheet takes no mark. */
  onHover: (ring: HoverRing | null) => void;
}

/** The parts of a PointerEvent the engine reads. */
export interface PointerInput {
  pointerId: number;
  pointerType: string;
  button: number;
  /** The buttons held: none for a pen hovering over the sheet. */
  buttons: number;
  clientX: number;
  clientY: number;
  pressure: number;
  /** The contact's size in CSS px: a palm's is far wider than a fingertip's. */
  width: number;
  height: number;
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

interface LiveStroke {
  id: number;
  pointerType: string;
  builder: StrokeBuilder;
  stabilizer: Stabilizer;
  /** Samples since the last frame, flat: x, y, pressure, t; its first `queued` numbers, written in place. */
  queue: number[];
  queued: number;
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
  /** A pen's brush stroke: the ink as it landed, which goes back on lift under its narrowed tail. */
  before: { ink: unknown } | null;
}

/** What a pointer down on the sheet does until it lifts, decided as it lands. */
type PointerRole = { pointerType: string } &
  /** It draws the stroke in progress. */
  (
    | { kind: "stroke" }
    /** It fills where it landed, in sheet units, if it lifts close by. */
    | { kind: "fill"; x: number; y: number; cx: number; cy: number }
    /** A touch on a paused sheet: the paused hint waits a beat in case a second finger makes a tap. */
    | { kind: "blocked"; cx: number; cy: number }
    /** A touch held for the tap recognizer alone. */
    | { kind: "tap" }
    /** It closed a panel, met a paused sheet, spread into a palm, or lost its stroke or fill: it draws, fills and hints nothing more. */
    | { kind: "swallowed" }
  );

const swallowed = (pointerType: string): PointerRole => ({ pointerType, kind: "swallowed" });

/**
 * WebKit marks an Apple Pencil's touch, which lib.dom's Touch leaves out; another browser may not
 * list a stylus among the touches at all, so only this mark ends a pen stroke.
 */
const isStylus = (touch: Touch) => "touchType" in touch && touch.touchType === "stylus";

/**
 * Turns pointer input into ink. Pointer events only queue samples; one animation frame at a time
 * feeds them through Smoothing's stabilizer and the width model and paints just the new segments.
 * Ink lies only where the stabilized line has reached, never ahead of it toward the nib. It never
 * touches React: it reads `settings` as pointers land and reports through `events`.
 *
 * Ink is in sheet units: a pointer's offset on the paper over the CSS px a unit spans there. The
 * sheet's frame follows its area while the sheet is blank, and is fixed from the first mark.
 */
export class InkEngine {
  private current: InkSettings;
  private readonly layer: InkLayer;
  private readonly history: History<unknown>;
  private readonly events: InkEvents;
  private readonly frames: FrameSource;
  private readonly taps = new TapRecognizer();
  private live: LiveStroke | null = null;
  /**
   * Each pointer down on the sheet, by id; every one is captured, so its lift reaches the sheet.
   * Every touch is the tap recognizer's too, whatever its role, until a pen lands.
   */
  private readonly pointers = new Map<number, PointerRole>();
  /** Every finger left the screen: the next touch to land is the only one down. */
  private fingersGone = false;
  /** This page's pen has shown its pressure moving: its strokes start at their first sample's width. */
  private pressurePen = false;
  /** A hover ring shows. */
  private hovering = false;
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
    frames: FrameSource = browserFrames,
  ) {
    this.layer = layer;
    this.current = settings;
    this.events = events;
    this.frames = frames;
    this.history = new History(layer);
  }

  get settings(): InkSettings {
    return this.current;
  }

  /** A sheet that locks ends the stroke in progress where it stands, and drops a fill tap still down. */
  set settings(next: InkSettings) {
    const locking = next.locked && !this.current.locked;
    this.current = next;
    if (!locking) return;
    this.endStroke(false);
    this.swallowWhere((role) => role.kind === "fill");
  }

  /** Listens for pointers on the sheet; returns the detach. */
  attach(sheet: HTMLElement): () => void {
    this.locate = () => sheet.getBoundingClientRect();
    const onDown = (e: PointerEvent) => {
      this.down(e);
      if (!this.pointers.has(e.pointerId)) return;
      try {
        sheet.setPointerCapture(e.pointerId);
      } catch {
        // The pointer already lifted, or never existed (a synthetic event): nothing left to capture.
      }
    };
    const onMove = (e: PointerEvent) => this.move(e);
    const onUp = (e: PointerEvent) => this.up(e);
    const onCancel = (e: PointerEvent) => this.cancel(e);
    const onLeave = () => this.leave();
    // Capture ends with every lift; losing it without one means the pointer is gone for good.
    const onLostCapture = (e: PointerEvent) => {
      if (this.pointers.has(e.pointerId)) this.cancel(e);
    };
    const prevent = (e: Event) => e.preventDefault();
    const touch = { passive: false };
    // The screen's own count of fingers, heard wherever they lift, outlasts a lift the sheet missed.
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) this.screenClear();
      const pencil = Array.from(e.changedTouches).find(isStylus);
      if (pencil) this.pencilLifted(pencil);
    };
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    sheet.addEventListener("pointerdown", onDown);
    sheet.addEventListener("pointermove", onMove);
    sheet.addEventListener("pointerup", onUp);
    sheet.addEventListener("pointercancel", onCancel);
    sheet.addEventListener("lostpointercapture", onLostCapture);
    sheet.addEventListener("pointerleave", onLeave);
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
      sheet.removeEventListener("pointerleave", onLeave);
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

  /**
   * The Pencil's touch ended with its pen stroke still live: its pointerup is late or lost, so the
   * stroke ends where the touch lifted, whichever of the two the browser sends first.
   */
  private pencilLifted(touch: Touch): void {
    const live = this.live;
    if (live?.pointerType !== "pen") return;
    this.pointers.delete(live.id);
    [live.x, live.y] = this.toSheet(touch);
    this.endStroke(false);
  }

  down(e: PointerInput): void {
    this.hideHover();
    const s = this.settings;
    const { pointerId: id, pointerType } = e;
    if (s.locked || !this.sheet || (pointerType === "mouse" && e.button !== 0)) return;
    // Pointer ids come back: one still here lifted where the sheet couldn't hear, its stroke where it stood.
    if (this.pointers.get(id)?.kind === "stroke") this.endStroke(false);
    this.pointers.delete(id);
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
        this.palmContact(e),
      );
      this.pointers.set(id, { pointerType, kind: "tap" });
      if (result === "cancel-stroke") this.endStroke(true);
      // Fingers down as a tap begins neither fill nor hint.
      if (result === "cancel-stroke" || result === "gesture")
        this.swallowWhere((role) => role.kind === "fill" || role.kind === "blocked");
      if (result !== "draw") return;
    } else if (pointerType === "pen") {
      this.events.onPen();
      // A pen is one contact, so landing while its stroke is live, it lifted where the sheet couldn't hear.
      if (this.live?.pointerType === "pen") this.endStroke(false);
      else if (this.live) this.endStroke(true);
      // Fingers down as a pen lands are the hand resting: no tap, fill or hint of theirs counts.
      this.taps.clear();
      for (const [other, role] of this.pointers) {
        if (role.pointerType === "pen") this.pointers.delete(other);
        else this.pointers.set(other, swallowed(role.pointerType));
      }
    }
    if (this.live || this.filling()) return;
    if (s.panelOpen) {
      this.pointers.set(id, swallowed(pointerType));
      this.events.onDismissPanel();
      return;
    }
    if (pointerType === "touch" && s.inputMode === "pencilOnly") return;
    e.preventDefault();
    if (s.paused) {
      if (pointerType === "touch")
        this.pointers.set(id, { pointerType, kind: "blocked", cx: e.clientX, cy: e.clientY });
      else {
        this.pointers.set(id, swallowed(pointerType));
        this.events.onBlocked();
      }
      return;
    }
    this.origin = this.place();
    const [x, y] = this.toSheet(e);
    if (s.tool === "fill")
      this.pointers.set(id, { pointerType, kind: "fill", x, y, cx: e.clientX, cy: e.clientY });
    else this.beginStroke(e, x, y);
  }

  move(e: PointerInput): void {
    const id = e.pointerId;
    const role = this.pointers.get(id);
    // A pen with nothing pressed hovers: a ring shows where it would land, and it never draws.
    if (e.pointerType === "pen" && e.buttons === 0 && role?.kind !== "stroke") {
      this.hover(e);
      return;
    }
    if (!role) return;
    if (e.pointerType === "touch") {
      const palm = this.palmContact(e);
      this.taps.move(id, e.clientX, e.clientY, palm);
      // A fingertip that spreads into a palm as it settles never meant its stroke or its fill.
      if (palm && (role.kind === "stroke" || role.kind === "fill")) {
        if (role.kind === "stroke") this.endStroke(true);
        this.pointers.set(id, swallowed(role.pointerType));
        return;
      }
    }
    if (role.kind === "blocked") {
      if (Math.hypot(e.clientX - role.cx, e.clientY - role.cy) <= BLOCKED_DRAG) return;
      this.pointers.set(id, swallowed(role.pointerType));
      this.events.onBlocked();
      return;
    }
    const live = this.live;
    if (role.kind !== "stroke" || !live) return;
    const coalesced = e.getCoalescedEvents?.();
    if (coalesced?.length)
      for (let i = 0; i < coalesced.length; i++) this.queue(live, coalesced[i]);
    else this.queue(live, e);
    if (!this.cancelFrame) this.cancelFrame = this.frames.request(this.paintFrame);
  }

  /** Queues a sample for the next frame, in sheet units; a pen sends hundreds a second, so it makes no garbage. */
  private queue(live: LiveStroke, sample: PointerInput): void {
    const { left, top, scale } = this.origin;
    const x = (sample.clientX - left) / scale;
    const y = (sample.clientY - top) / scale;
    const { queue } = live;
    let at = live.queued;
    queue[at++] = x;
    queue[at++] = y;
    queue[at++] = sample.pressure;
    queue[at++] = sample.timeStamp;
    live.queued = at;
    live.moved = Math.max(live.moved, Math.hypot(x - live.x0, y - live.y0));
    live.x = x;
    live.y = y;
    live.pressure = sample.pressure;
    live.t = sample.timeStamp;
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
    if (timeOurWork(INK_WORK.replay, () => this.history.undo())) this.notifyHistory();
  }

  redo(): void {
    if (this.settings.locked) return;
    this.endStroke(true);
    if (timeOurWork(INK_WORK.replay, () => this.history.redo())) this.notifyHistory();
  }

  /**
   * Sets the drawing aside for a blank sheet; undo brings it back. A stroke still in progress goes
   * with it, and a fill whose finger hasn't lifted is dropped. Nothing while the sheet is locked.
   */
  clear(): void {
    if (this.settings.locked) return;
    this.endStroke(false);
    this.swallowWhere((role) => role.kind === "fill");
    if (!this.history.hasInk) return;
    this.history.clear();
    this.notifyHistory();
  }

  /** Ends a stroke in progress as if the pointer lifted, as time running out does. */
  finishStroke(): void {
    this.endStroke(false);
  }

  /** The pointer left the paper: a hovering pen's ring goes. */
  leave(): void {
    this.hideHover();
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
    this.pointers.clear();
    this.taps.clear();
    if (steps.length === 0) this.frameRule = "follows";
    else if (frame) {
      this.frameRule = "fixed";
      this.useFrame(frame);
    } else {
      this.frameRule = "area";
      this.sheet = null;
    }
    timeOurWork(INK_WORK.replay, () => this.history.load(steps));
    this.notifyHistory();
  }

  /** The sheet is going: its undo snapshots are freed now rather than when they're collected. */
  dispose(): void {
    this.history.release();
  }

  /** Every touch is taken as lifted: a finger's stroke stays, and a tap, fill or hint in progress goes. */
  private forgetTouches(): void {
    this.fingersGone = false;
    this.taps.clear();
    if (this.live?.pointerType === "touch") this.endStroke(false);
    for (const [id, role] of this.pointers)
      if (role.pointerType === "touch") this.pointers.delete(id);
  }

  /** The pointers whose roles `which` picks draw, fill and hint nothing more until they lift. */
  private swallowWhere(which: (role: PointerRole) => boolean): void {
    for (const [id, role] of this.pointers)
      if (which(role)) this.pointers.set(id, swallowed(role.pointerType));
  }

  /** A fill tap is down. */
  private filling(): boolean {
    for (const role of this.pointers.values()) if (role.kind === "fill") return true;
    return false;
  }

  /** Sizes the ink to a new frame; sized afresh, it clears, so what was on it goes back on. */
  private useFrame(frame: SheetFrame): void {
    const was = this.sheet;
    if (was?.w === frame.w && was.h === frame.h && was.density === frame.density) return;
    this.sheet = frame;
    timeOurWork(INK_WORK.replay, () => {
      if (this.layer.setFrame(frame)) this.history.invalidate();
    });
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

  private toSheet(e: Pick<PointerInput, "clientX" | "clientY">): [number, number] {
    const { left, top, scale } = this.origin;
    return [(e.clientX - left) / scale, (e.clientY - top) / scale];
  }

  /** A palm-sized contact, judged only on a device a pen has drawn on: before that, size rules nothing. */
  private palmContact(e: PointerInput): boolean {
    return this.settings.inputMode !== null && isPalm(e.width, e.height);
  }

  /** A hovering pen's ring, while the sheet would take its mark. */
  private hover(e: PointerInput): void {
    const s = this.settings;
    if (s.locked || s.paused || s.panelOpen || s.tool === "fill" || this.live || !this.sheet) {
      this.hideHover();
      return;
    }
    const { left, top, scale } = this.place();
    const share = s.tool === "eraser" ? 1 : previewWidth(s.penPressure, this.pressurePen);
    this.hovering = true;
    this.events.onHover({
      x: e.clientX - left,
      y: e.clientY - top,
      diameter: s.size * share * scale,
    });
  }

  private hideHover(): void {
    if (!this.hovering) return;
    this.hovering = false;
    this.events.onHover(null);
  }

  private lift(e: PointerInput, cancelled: boolean): void {
    const id = e.pointerId;
    const role = this.pointers.get(id);
    if (!role) return;
    this.pointers.delete(id);
    if (role.pointerType === "touch") {
      let gesture: TapGesture | null = null;
      if (cancelled) this.taps.cancel(id);
      else gesture = this.taps.up(id, e.timeStamp);
      if (gesture === "undo") this.undo();
      else if (gesture === "redo") this.redo();
    }
    if (role.kind === "blocked") {
      if (!cancelled) this.events.onBlocked();
    } else if (role.kind === "fill") {
      if (!cancelled && Math.hypot(e.clientX - role.cx, e.clientY - role.cy) < FILL_TAP_SLOP)
        this.applyFill(role.x, role.y);
    } else if (role.kind === "stroke" && this.live) {
      const { live } = this;
      if (!cancelled) {
        [live.x, live.y] = this.toSheet(e);
        live.t = e.timeStamp;
      }
      this.endStroke(cancelled && live.moved < CANCEL_KEEPS);
    }
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
      pressure: e.pressure,
      pointerType: e.pointerType,
      pressureVaries: this.pressurePen,
      response: s.penPressure,
    });
    // A copy now costs the same whatever is on the sheet; a replay on lift grows with the strokes.
    const before =
      e.pointerType === "pen" && s.tool !== "eraser"
        ? { ink: timeOurWork(INK_WORK.snapshot, () => this.layer.snapshot()) }
        : null;
    this.pointers.set(e.pointerId, { pointerType: e.pointerType, kind: "stroke" });
    this.live = {
      id: e.pointerId,
      pointerType: e.pointerType,
      builder,
      stabilizer: new Stabilizer(x, y, e.timeStamp, s.smoothing),
      queue: [],
      queued: 0,
      painted: 1,
      t0: e.timeStamp,
      x0: x,
      y0: y,
      moved: 0,
      x,
      y,
      pressure: e.pressure,
      t: e.timeStamp,
      before,
    };
    // The dot shows as the pointer lands, not a frame later.
    timeOurWork(INK_WORK.paint, () => this.layer.paint(builder.op, 0, 1));
  }

  /** `time` is the frame's, on the clock pointer samples are stamped with. */
  private readonly paintFrame = (time: number): void => {
    this.cancelFrame = null;
    const live = this.live;
    if (!live) return;
    timeOurWork(INK_WORK.paint, () => {
      if (live.queued > 0) this.feed(live);
      else this.catchUp(live, time);
      this.paintNew(live);
    });
    // Until the line is on the nib, each frame brings it closer.
    if (!live.stabilizer.settled || !live.builder.settled)
      this.cancelFrame ??= this.frames.request(this.paintFrame);
  };

  /** Feeds the queued samples through the stabilizer to the stroke. */
  private feed(live: LiveStroke): void {
    const { queue, queued, stabilizer, builder } = live;
    for (let i = 0; i < queued; i += 4) {
      // The builder keeps the nib it's given, to measure the next one's speed from.
      const nib = { x: queue[i], y: queue[i + 1], t: queue[i + 3] };
      const [x, y] = stabilizer.add(nib.x, nib.y, nib.t);
      builder.add(x, y, queue[i + 2], stabilizer.time, nib);
    }
    live.queued = 0;
  }

  /**
   * A frame at `time` with no new sample. Frames come between a moving nib's samples too, so only a
   * nib silent for `PAUSE_MS` has stopped: its line glides to it, and once there, curves all the way.
   */
  private catchUp(live: LiveStroke, time: number): void {
    if (time - live.t < PAUSE_MS) return;
    const { stabilizer, builder } = live;
    if (!stabilizer.settled) {
      const [x, y] = stabilizer.hold(time);
      builder.add(x, y, live.pressure, stabilizer.time, null);
    }
    if (stabilizer.settled) builder.settle(live.x, live.y);
  }

  /** Paints the segments the stroke has added since the last paint. */
  private paintNew(live: LiveStroke): void {
    const { builder } = live;
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
    // Its pointer, still down, draws nothing more.
    if (this.pointers.get(live.id)?.kind === "stroke")
      this.pointers.set(live.id, swallowed(live.pointerType));
    this.cancelFrame?.();
    this.cancelFrame = null;
    // A pen whose pressure moved senses it: its next strokes start at their first sample's width.
    if (live.builder.pressured) this.pressurePen = true;
    if (takeBack) {
      if (live.before) this.layer.discard(live.before.ink);
      timeOurWork(INK_WORK.replay, () => this.history.repaint());
      // A sheet left blank follows its area again, as it did before the stroke fixed its frame.
      if (this.history.steps.length === 0) this.frameRule = "follows";
      return;
    }
    timeOurWork(INK_WORK.paint, () => {
      this.feed(live);
      // The way to the lift point is the line catching up, not the pointer moving: it keeps the width,
      // and shows at once, so it's recorded at the lift's time.
      const lifted = Math.max(live.t, live.stabilizer.time);
      for (const [x, y] of live.stabilizer.finish(live.x, live.y))
        live.builder.add(x, y, live.pressure, lifted, null);
      live.builder.settle(live.x, live.y);
      this.paintNew(live);
    });
    // A pen's tail narrows once it's known where the stroke ends, over ink already painted wider.
    const { before } = live;
    if (before) {
      if (live.builder.taperEnd() < live.builder.count)
        timeOurWork(INK_WORK.paint, () => {
          this.layer.restore(before.ink);
          this.layer.paint(live.builder.op, 0, live.builder.count);
        });
      this.layer.discard(before.ink);
    }
    timeOurWork(INK_WORK.commit, () => this.history.commit(live.builder.op));
    this.events.onCommit(live.builder.op);
    this.notifyHistory();
  }

  private applyFill(x: number, y: number): void {
    const op: FillOp = {
      tool: "fill",
      x,
      y,
      color: this.settings.color,
      gap: FILL_GAP,
      T: this.settings.sessionMs(),
    };
    if (!timeOurWork(INK_WORK.fill, () => this.layer.fill(op))) return;
    this.frameRule = "fixed";
    timeOurWork(INK_WORK.commit, () => this.history.commit(op));
    this.events.onCommit(op);
    this.notifyHistory();
  }

  private notifyHistory(): void {
    const { canUndo, canRedo, hasInk } = this.history;
    this.events.onHistory({ canUndo, canRedo, hasInk });
  }
}
