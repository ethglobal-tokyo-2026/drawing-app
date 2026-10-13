import { timeOurWork } from "../../performance/performanceRecorder";
import { capturePointer } from "../../ui/capturePointer";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import type { LayerControls, LayerEvents } from "../layers/layerControls";
import { LayerHistory } from "../layers/layerHistory";
import type { InkHold, LayerInk } from "../layers/layerInk";
import {
  FIRST_LAYER,
  indexOf,
  isHidden,
  MAX_LAYERS,
  type Layer,
  type LayerState,
} from "../layers/layerState";
import type { LayerView, ThumbnailSource } from "../layers/layerView";
import type { SheetDisplay } from "../layers/sheetDisplay";
import { previewWidth, StrokeBuilder, type PenPressure } from "./brush";
import { CanvasUnavailableError } from "./canvasUnavailable";
import { FILL_GAP } from "./fill";
import { isPalm, TapRecognizer, type TapGesture } from "./gestures";
import {
  isOp,
  type FillOp,
  type FillReference,
  type LayerId,
  type Op,
  type Step,
  type StrokeOp,
  type Tool,
} from "./ops";
import { PostCorrectionError } from "./post-correction/errors";
import { PostCorrectionService, type PostCorrectionInput } from "./post-correction/service";
import type { PostCorrectionSettings } from "./post-correction/settings";
import { areaFrame, boundedFrame, frameFor, type SheetArea, type SheetFrame } from "./sheetFrame";
import {
  StabilizationError,
  Stabilizer,
  type StabilizerOutput,
  type SmoothingMode,
} from "./stabilizer";

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
 * a commit paints the whole stroke on its layer, and takes an undo checkpoint now and then.
 */
export const INK_WORK = {
  paint: "ink paint",
  fill: "ink fill",
  replay: "ink replay",
  commit: "ink commit",
} as const;

/** What the drawing screen has set; the engine reads it as each pointer lands. */
export interface InkSettings {
  fillReference: FillReference;
  tool: Tool;
  color: string;
  /** Brush or eraser width, in sheet units. */
  size: number;
  /** Smoothing, from 0 (Raw) to 100 (Smooth). */
  smoothing: number;
  /** Speed adjustment for pen input; mouse and touch retain fixed stabilization. */
  smoothingMode: SmoothingMode;
  /** Curve correction after lift; strength zero keeps the completed preview unchanged. */
  postCorrection: PostCorrectionSettings;
  /** No input at all: sealing, sealed, or the ticket card is up. */
  locked: boolean;
  /** The person paused the clock: the sheet takes no marks. */
  paused: boolean;
  /** A tool panel is open: accepted ink finishes before its controls take input. */
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
  /** Some layer has ink: the seal key shows. */
  hasInk: boolean;
}

/** Where a hovering pen would land on the paper, and how wide its stroke would show, in CSS px. */
export interface HoverRing {
  x: number;
  y: number;
  diameter: number;
}

export interface InkEvents extends LayerEvents {
  onHistory: (state: HistoryState) => void;
  /** A stroke or fill landed. */
  onCommit: (op: Op) => void;
  /** Someone tried to draw on a paused sheet. */
  onBlocked: () => void;
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
  /** Stroke-start settings and every emitted sample, before brush spacing or width smoothing. */
  correction:
    | (Omit<PostCorrectionInput, "renderedPoints" | "packets"> & {
        packets: PostCorrectionInput["packets"][number][];
      })
    | null;
  /** Local CSS samples since the last frame, flat: x, y, pressure, t. */
  queue: number[];
  queued: number;
  /** Points already on the wet canvas. */
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
  /** The same latest position in local CSS pixels, before conversion to sheet coordinates. */
  cssX: number;
  cssY: number;
  /** CSS pixels per sheet unit when this stroke began; queue history always uses this basis. */
  scale: number;
  pressure: number;
  t: number;
}

interface PendingCorrection {
  original: StrokeOp;
  abort: AbortController;
}

/** What stops a pointer marking the sheet, which its hint names: the clock paused, or the current layer hidden. */
type Blocker = "paused" | "hidden";

/** What a pointer down on the sheet does until it lifts, decided as it lands. */
type PointerRole = { pointerType: string } &
  /** It draws the stroke in progress. */
  (
    | { kind: "stroke" }
    /** It fills where it landed, in sheet units, if it lifts close by. */
    | { kind: "fill"; x: number; y: number; cx: number; cy: number }
    /** A touch that met a blocker: its hint waits a beat in case a second finger makes a tap. */
    | { kind: "blocked"; by: Blocker; cx: number; cy: number }
    /** A touch held for the tap recognizer alone. */
    | { kind: "tap" }
    /** It closed a panel, met a blocker, spread into a palm, or lost its stroke or fill: it draws, fills and hints nothing more. */
    | { kind: "swallowed" }
  );

const swallowed = (pointerType: string): PointerRole => ({ pointerType, kind: "swallowed" });

/**
 * WebKit marks an Apple Pencil's touch, which lib.dom's Touch leaves out; another browser may not
 * list a stylus among the touches at all, so only this mark ends a pen stroke.
 */
const isStylus = (touch: Touch) => "touchType" in touch && touch.touchType === "stylus";

const frontOf = (state: LayerState): Layer => state.layers[state.layers.length - 1];

/** The layer that becomes current as `id` goes: the one below it, or the one above when it's at the back. */
function successorOf(state: LayerState, id: LayerId): LayerId {
  const at = indexOf(state, id);
  return (state.layers[at - 1] ?? state.layers[at + 1]).id;
}

/** A step that changes its layer's pixels, as its undo and redo do. */
const changesInk = (step: Step): boolean =>
  isOp(step) || step.tool === "clear" || step.tool === "delete";

/** An op as a console line names it. */
const opName = (op: Op): string => (op.tool === "fill" ? "fill" : `${op.tool} stroke`);

/**
 * Turns pointer input into ink. Pointer events only queue samples; one animation frame at a time
 * feeds them through Smoothing's stabilizer and the width model, and the display paints just the
 * new segments on its wet canvas. Ink lies only where the stabilized line has reached, never ahead
 * of it toward the nib. At lift the whole stroke is painted on its layer, as a replay paints it. It
 * never touches React: it reads `settings` as pointers land and reports through `events`.
 *
 * Ink is in sheet units: a pointer's offset on the paper over the CSS px a unit spans there. The
 * sheet's frame follows its area while the sheet is blank, and is fixed from the first mark.
 *
 * Strokes and fills land on the current layer. Undo never leaves a deleted layer current, and a
 * layer it brings back comes back current.
 */
export class InkEngine implements LayerControls {
  /** What the drawing screen last set. */
  private latest: InkSettings;
  private readonly ink: LayerInk;
  private readonly history: LayerHistory<InkHold>;
  private readonly display: SheetDisplay;
  private readonly events: InkEvents;
  private readonly frames: FrameSource;
  private readonly correction: Pick<PostCorrectionService, "correct" | "dispose">;
  private pendingCorrection: PendingCorrection | null = null;
  private readonly taps = new TapRecognizer();
  /** The layer strokes and fills land on. */
  private current: LayerId = FIRST_LAYER;
  /** Each layer's ink version; a new map at each change, so a view handed out never changes. */
  private versions: ReadonlyMap<LayerId, number> = new Map();
  /** The last version given out. */
  private inkChanges = 0;
  private live: LiveStroke | null = null;
  private suspended = false;
  private needsReplay = false;
  /**
   * Each pointer down on the sheet, by id; every one is captured, so its lift reaches the sheet.
   * Every touch is the tap recognizer's too, whatever its role, until a pen lands.
   */
  private readonly pointers = new Map<number, PointerRole>();
  /** The pointer whose press is closing a panel, until the engine hears it land. */
  private closing: number | null = null;
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
  private captureTarget: HTMLElement | null = null;

  /** The engine owns `ink` and `display` from here on, and lets them go on `dispose`. */
  constructor(
    ink: LayerInk,
    display: SheetDisplay,
    settings: InkSettings,
    events: InkEvents,
    frames: FrameSource = browserFrames,
    correction: Pick<PostCorrectionService, "correct" | "dispose"> = new PostCorrectionService(),
  ) {
    this.ink = ink;
    this.display = display;
    this.latest = settings;
    this.events = events;
    this.frames = frames;
    this.correction = correction;
    this.history = new LayerHistory(ink);
  }

  get settings(): InkSettings {
    return this.latest;
  }

  /** A sheet that stops taking ink ends accepted strokes and drops held contacts. */
  set settings(next: InkSettings) {
    const wasAvailable = !this.latest.locked && !this.latest.paused && !this.latest.panelOpen;
    const unavailable = next.locked || next.paused || next.panelOpen;
    const locking = next.locked && !this.latest.locked;
    this.latest = next;
    if (wasAvailable && unavailable) {
      this.endStroke(false);
      this.taps.clear();
      this.swallowWhere(() => true);
    }
    if (locking && !this.suspended && !this.needsReplay)
      this.withRoom("restoring layer opacity", () => this.display.previewOpacity(null));
  }

  /** Listens for pointers on the sheet; returns the detach. */
  attach(sheet: HTMLElement): () => void {
    this.captureTarget = sheet;
    this.locate = () => sheet.getBoundingClientRect();
    const onDown = (e: PointerEvent) => {
      this.down(e);
      if (this.pointers.has(e.pointerId)) capturePointer(sheet, e.pointerId);
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
      if (pencil) this.pencilLifted(pencil, e.timeStamp, e.type !== "touchcancel");
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
      if (this.captureTarget === sheet) this.captureTarget = null;
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
   * The pointer's press closed a panel: once it lands it draws, fills and hints nothing until it
   * lifts. Called as the press begins, before the sheet hears it.
   */
  swallow(pointerId: number): void {
    this.closing = pointerId;
  }

  /**
   * The Pencil's touch ended with its pen stroke still live: its pointerup is late or lost, so the
   * stroke ends where the touch lifted, whichever of the two the browser sends first.
   */
  private pencilLifted(touch: Touch, time: number, correct: boolean): void {
    const live = this.live;
    if (live?.pointerType !== "pen") return;
    this.pointers.delete(live.id);
    [live.x, live.y] = this.toSheet(touch);
    [live.cssX, live.cssY] = this.toStrokeCss(touch, live.scale);
    live.t = Math.max(live.t, time);
    this.endStroke(false, 0, correct);
  }

  down(e: PointerInput): void {
    if (this.suspended || (this.needsReplay && !this.resume())) return;
    this.hideHover();
    const s = this.settings;
    const { pointerId: id, pointerType } = e;
    // Taken whatever this landing does, so a pointer id that comes back later isn't swallowed.
    const closesPanel = this.closing === id;
    this.closing = null;
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
    if (closesPanel) {
      this.pointers.set(id, swallowed(pointerType));
      return;
    }
    if (pointerType === "touch" && s.inputMode === "pencilOnly") return;
    e.preventDefault();
    // A hidden layer takes no ink, so a stroke, fill or erase on it makes no mark.
    const by: Blocker | null = s.paused ? "paused" : this.currentHidden() ? "hidden" : null;
    if (by) {
      if (pointerType === "touch")
        this.pointers.set(id, { pointerType, kind: "blocked", by, cx: e.clientX, cy: e.clientY });
      else {
        this.pointers.set(id, swallowed(pointerType));
        this.blocked(by);
      }
      return;
    }
    this.origin = this.place();
    this.finishPendingCorrection();
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
      this.blocked(role.by);
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

  /** Queues CSS-pixel samples; queue arithmetic runs before conversion to sheet coordinates. */
  private queue(live: LiveStroke, sample: PointerInput): void {
    const { scale } = live;
    const [x, y] = this.toStrokeCss(sample, scale);
    const { queue } = live;
    let at = live.queued;
    queue[at++] = x;
    queue[at++] = y;
    queue[at++] = sample.pressure;
    queue[at++] = sample.timeStamp;
    live.queued = at;
    live.moved = Math.max(live.moved, Math.hypot(x / scale - live.x0, y / scale - live.y0));
    live.x = x / scale;
    live.y = y / scale;
    live.cssX = x;
    live.cssY = y;
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

  /**
   * Nothing while the sheet is locked: a seal is cut from the ink as it stands. Undoing an add that
   * made the current layer leaves the layer just below it current, and a delete undone makes the
   * layer it brings back current.
   */
  undo(): void {
    if (this.settings.locked || this.suspended || (this.needsReplay && !this.resume())) return;
    this.endStroke(true);
    const step = this.withRoom("undo", () =>
      timeOurWork(INK_WORK.replay, () => this.history.undo()),
    )?.[0];
    if (!step) return;
    const { state } = this.history;
    if (step.tool === "add" && step.layer === this.current)
      this.current = (state.layers[step.at - 1] ?? frontOf(state)).id;
    else if (step.tool === "delete") this.current = step.layer;
    this.bump(new Set([...this.history.inked, ...(changesInk(step) ? [step.layer] : [])]));
    this.changed();
  }

  /** An add redone makes its layer current; a delete redone takes the current layer as a delete does. */
  redo(): void {
    if (this.settings.locked || this.suspended || (this.needsReplay && !this.resume())) return;
    this.endStroke(true);
    const before = this.history.state;
    const step = this.withRoom("redo", () =>
      timeOurWork(INK_WORK.replay, () => this.history.redo()),
    )?.[0];
    if (!step) return;
    if (step.tool === "add") this.current = step.layer;
    else if (step.tool === "delete" && step.layer === this.current)
      this.current = successorOf(before, step.layer);
    this.bump(new Set([...this.history.inked, ...(changesInk(step) ? [step.layer] : [])]));
    this.changed();
  }

  addLayer(): void {
    if (!this.beginChange()) return;
    const { state } = this.history;
    if (state.layers.length >= MAX_LAYERS) return;
    const layer = state.nextId;
    const at = indexOf(state, this.current) + 1;
    this.history.perform({ tool: "add", layer, at, T: this.settings.sessionMs() });
    this.current = layer;
    this.changed();
  }

  selectLayer(id: LayerId): void {
    if (!this.beginChange()) return;
    // A chip shown a moment before an undo took its layer selects nothing.
    if (id === this.current || indexOf(this.history.state, id) < 0) return;
    this.current = id;
    this.changed();
    this.withRoom("flashing the selected layer", () => this.display.flash());
  }

  deleteLayer(): void {
    if (!this.beginChange()) return;
    const { state } = this.history;
    if (state.layers.length === 1) return;
    const next = successorOf(state, this.current);
    if (
      !this.withRoom("deleting a layer", () =>
        this.history.perform({ tool: "delete", layer: this.current, T: this.settings.sessionMs() }),
      )
    )
      return;
    this.current = next;
    this.changed();
  }

  moveLayer(id: LayerId, to: number): void {
    if (!this.beginChange()) return;
    const from = indexOf(this.history.state, id);
    // A chip dropped back where it was moves nothing, nor does one whose layer an undo just took.
    if (from < 0 || from === to) return;
    this.history.perform({ tool: "move", layer: id, to, T: this.settings.sessionMs() });
    this.current = id;
    this.changed();
    this.withRoom("flashing the selected layer", () => this.display.flash());
  }

  /** Sets the current layer's ink aside; undo brings it back. */
  clearLayer(): void {
    if (!this.beginChange() || !this.history.inked.has(this.current)) return;
    if (
      !this.withRoom("clearing a layer", () =>
        this.history.perform({ tool: "clear", layer: this.current, T: this.settings.sessionMs() }),
      )
    )
      return;
    this.bump([this.current]);
    this.changed();
  }

  previewOpacity(opacity: number | null): void {
    if (!this.beginChange()) return;
    this.withRoom("previewing layer opacity", () => this.display.previewOpacity(opacity));
  }

  setOpacity(opacity: number): void {
    if (!this.beginChange()) return;
    if (opacity === this.currentLayer().opacity) {
      this.withRoom("restoring layer opacity", () => this.display.previewOpacity(null));
      return;
    }
    const T = this.settings.sessionMs();
    this.history.performOpacity({ tool: "opacity", layer: this.current, opacity, T });
    this.changed();
  }

  setLocked(on: boolean): void {
    this.setFlag("lock", on);
  }

  /** The bottom layer has nothing below it to clip to, so it takes no clip. */
  setClipped(on: boolean): void {
    this.setFlag("clip", on);
  }

  /** A layer's own canvas and its ink's box there, device px, out to whole pixels and inside the canvas. */
  readonly thumbnail: ThumbnailSource = (id) => {
    const canvas = this.ink.layerCanvas(id);
    const box = this.ink.inkBox(id);
    if (!canvas || !box) return null;
    const { density: d, width, height } = this.ink;
    // A stroke's box reaches past the sheet's edge where its width hangs over.
    const x = Math.max(0, Math.floor(box.x * d));
    const y = Math.max(0, Math.floor(box.y * d));
    const right = Math.min(width, Math.ceil((box.x + box.w) * d));
    const bottom = Math.min(height, Math.ceil((box.y + box.h) * d));
    return { canvas, box: { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) } };
  };

  /** Ends a stroke in progress as if the pointer lifted, as time running out does. */
  finishStroke(): void {
    this.endStroke(false);
  }

  /** The pointer left the paper: a hovering pen's ring goes. */
  leave(): void {
    this.hideHover();
  }

  /** Every step, oldest first, layer changes included: what the drawing kept on the device holds. */
  get steps(): readonly Step[] {
    this.finishPendingCorrection();
    return this.history.steps;
  }

  /** The steps the timelapse plays, from the last time no layer had ink, and the layers then. */
  timelapse(): { steps: readonly Step[]; start: LayerState } {
    this.finishPendingCorrection();
    return this.history.timelapse();
  }

  /** A new visible-ink canvas for sealing; a memory failure throws so the saved drawing is retained. */
  composite(): HTMLCanvasElement {
    this.endStroke(false);
    const covered = this.suspended;
    try {
      // Kyoto Seika's clock can expire with the drawing covered. Restore only long enough to cut
      // its sticker, and keep allocation failure distinct from a successfully composited blank.
      if ((covered || this.needsReplay) && !this.resume()) throw new CanvasUnavailableError();
      return this.withRoom(
        "compositing the sticker",
        () => this.ink.composite(this.history.state),
        true,
      )[0];
    } finally {
      if (covered) this.suspend();
    }
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

  /** The paper moved or changed size on screen: a stroke in progress places its next samples where it is now. */
  measurePaper(): void {
    if (this.live) this.origin = this.place();
  }

  /** A fresh sheet: no ink, nothing to undo or redo, its frame following its area again. */
  reset(): void {
    this.load([], null, null);
  }

  /**
   * A sheet with these steps on it and nothing to redo, as a drawing picked up after a reload has,
   * in the frame it was drawn in, on `current`, or on the front layer when the steps leave no such
   * layer. A drawing kept without a frame has none until the next measure takes its area as its
   * frame, so a save can't keep the last sheet's with it; with no steps, the frame follows the area.
   */
  load(steps: readonly Step[], frame: SheetFrame | null, current: LayerId | null): void {
    this.endStroke(true);
    this.pointers.clear();
    this.taps.clear();
    if (steps.length === 0) this.frameRule = "follows";
    else if (!frame) {
      // A recording without a frame uses its area's coordinates, including the pen-pressure strip.
      this.frameRule = "area";
      this.sheet = null;
    } else if (!steps.some(isOp)) this.frameRule = "follows";
    else {
      this.frameRule = "fixed";
      this.sheet = boundedFrame(frame);
      this.history.dropCheckpoints();
      this.ink.setFrame(this.sheet);
    }
    const loaded = this.withRoom("loading the saved drawing", () => {
      timeOurWork(INK_WORK.replay, () => this.history.load(steps, !this.suspended));
      if (!this.suspended) this.display.resize();
    });
    this.needsReplay = this.suspended || !loaded;
    if (!loaded) this.releaseSurfaces();
    const { state } = this.history;
    this.current = current !== null && indexOf(state, current) >= 0 ? current : frontOf(state).id;
    this.versions = new Map();
    this.bump(this.history.inked);
    this.changed();
  }

  /** The sheet is going: its canvases and undo checkpoints are freed now rather than when they're collected. */
  dispose(): void {
    this.endStroke(true);
    this.correction.dispose();
    this.releaseSurfaces();
  }

  /** Covered by another screen, retain the recording and selection while freeing every canvas. */
  suspend(): void {
    if (this.suspended) return;
    this.endStroke(false);
    this.hideHover();
    this.pointers.clear();
    this.taps.clear();
    this.suspended = true;
    this.needsReplay = true;
    this.releaseSurfaces();
  }

  /** Returns the recording to canvases, including the redo branch, before accepting input again. */
  resume(): boolean {
    this.suspended = false;
    if (!this.needsReplay) return true;
    const restored = this.withRoom("restoring the drawing", () => {
      this.history.invalidate();
      this.display.resize();
      this.display.show(this.history.state, this.current);
    });
    if (!restored) {
      this.releaseSurfaces();
      return false;
    }
    this.needsReplay = false;
    this.bump(this.history.inked);
    this.notify();
    return true;
  }

  private releaseSurfaces(): void {
    this.display.release();
    this.history.dropCheckpoints();
    this.ink.releaseAll();
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

  /** Sizes the ink to a new frame; sized afresh, it lets go of every canvas, so what was on it goes back on. */
  private useFrame(frame: SheetFrame): void {
    frame = boundedFrame(frame);
    const was = this.sheet;
    if (was?.w === frame.w && was.h === frame.h && was.density === frame.density) return;
    this.sheet = frame;
    if (!this.ink.setFrame(frame)) return;
    if (this.suspended) {
      this.needsReplay = true;
      return;
    }
    this.needsReplay = true;
    if (!this.resume()) return;
  }

  /**
   * Whether a layer change can go ahead: never on a locked sheet. A stroke in progress ends first, as
   * if it lifted, and a fill tap still down is dropped, since its layer may be about to change.
   */
  private beginChange(): boolean {
    if (this.settings.locked || this.suspended || (this.needsReplay && !this.resume()))
      return false;
    this.endStroke(false);
    this.swallowWhere((role) => role.kind === "fill");
    return true;
  }

  /** Turns lock or clip on the current layer on or off as one step, when it changes it. */
  private setFlag(tool: "lock" | "clip", on: boolean): void {
    if (!this.beginChange()) return;
    const layer = this.currentLayer();
    if ((tool === "lock" ? layer.locked : layer.clipped) === on) return;
    // Nothing is below the bottom layer to clip to, so its Clip tile takes no change.
    if (tool === "clip" && indexOf(this.history.state, this.current) === 0) return;
    this.history.perform({ tool, layer: this.current, on, T: this.settings.sessionMs() });
    this.changed();
  }

  private currentLayer(): Layer {
    const { state } = this.history;
    return state.layers[indexOf(state, this.current)];
  }

  /** At 0% the current layer is hidden, and takes no ink. */
  private currentHidden(): boolean {
    return isHidden(this.currentLayer());
  }

  /** Raises the hint for what blocked a press. */
  private blocked(by: Blocker): void {
    if (by === "paused") this.events.onBlocked();
    else this.events.onBlockedHidden();
  }

  /**
   * Shows the layers on the current one, or on the front one once the sheet has lost it, then tells
   * the screen. Called after anything that changes the layers, the current layer or a layer's ink.
   */
  private changed(): void {
    const { state } = this.history;
    if (indexOf(state, this.current) < 0) this.current = frontOf(state).id;
    if (this.needsReplay && !this.suspended) {
      // The recording is intact, but no successful change can dismiss the restore failure yet.
      this.events.onLayers(this.view());
      return;
    }
    this.notify();
    if (!this.suspended)
      this.withRoom("showing the layers", () => this.display.show(state, this.current));
  }

  private notify(): void {
    this.events.onLayers(this.view());
    const { canUndo, canRedo, hasInk } = this.history;
    this.events.onHistory({ canUndo, canRedo, hasInk });
  }

  private view(): LayerView {
    const { state, inked } = this.history;
    const { current, versions } = this;
    return { state, current, inked, currentInked: inked.has(current), versions };
  }

  /** Gives these layers new ink versions, so their chips draw again. */
  private bump(ids: Iterable<LayerId>): void {
    const versions = new Map(this.versions);
    for (const id of ids) versions.set(id, ++this.inkChanges);
    this.versions = versions;
  }

  /**
   * A refused canvas frees undo's checkpoint copies and retries once. History movements commit
   * only after their pixels succeed; a failed load retains its complete recording for retry.
   * Persistent failures are reported to the screen and logs; null means the operation failed.
   */
  private withRoom<T>(op: Op | string, write: () => T, rethrow: true): [T];
  private withRoom<T>(op: Op | string, write: () => T, rethrow?: false): [T] | null;
  private withRoom<T>(op: Op | string, write: () => T, rethrow = false): [T] | null {
    const what = typeof op === "string" ? op : `a ${opName(op)} on layer ${op.layer}`;
    try {
      return [write()];
    } catch (error) {
      if (!(error instanceof CanvasUnavailableError)) throw error;
      console.warn(`No canvas for ${what}: letting go of undo's checkpoints to make room`, error);
    }
    this.history.dropCheckpoints();
    try {
      return [write()];
    } catch (error) {
      if (!(error instanceof CanvasUnavailableError)) throw error;
      console.error(
        `No canvas for ${what}, even with undo's checkpoints let go: the operation could not finish`,
        error,
      );
      this.events.onInkFailed(error);
      if (rethrow) throw error;
      return null;
    }
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

  /** Rebase current screen input into the stroke's original CSS-pixel scale. */
  private toStrokeCss(
    e: Pick<PointerInput, "clientX" | "clientY">,
    strokeScale: number,
  ): [number, number] {
    const { left, top, scale } = this.origin;
    const ratio = strokeScale / scale;
    return [(e.clientX - left) * ratio, (e.clientY - top) * ratio];
  }

  /** A palm-sized contact, judged only on a device a pen has drawn on: before that, size rules nothing. */
  private palmContact(e: PointerInput): boolean {
    return this.settings.inputMode !== null && isPalm(e.width, e.height);
  }

  /** A hovering pen's ring, while the sheet would take its mark. */
  private hover(e: PointerInput): void {
    const s = this.settings;
    if (
      s.locked ||
      s.paused ||
      s.tool === "fill" ||
      this.live ||
      !this.sheet ||
      this.currentHidden()
    ) {
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
      if (!cancelled) this.blocked(role.by);
    } else if (role.kind === "fill") {
      if (!cancelled && Math.hypot(e.clientX - role.cx, e.clientY - role.cy) < FILL_TAP_SLOP)
        this.applyFill(role.x, role.y);
    } else if (role.kind === "stroke" && this.live) {
      const { live } = this;
      if (!cancelled) {
        [live.x, live.y] = this.toSheet(e);
        [live.cssX, live.cssY] = this.toStrokeCss(e, live.scale);
        live.pressure = e.pressure;
      }
      live.t = e.timeStamp;
      this.endStroke(
        cancelled && live.moved < CANCEL_KEEPS,
        cancelled ? 0 : e.pressure,
        !cancelled,
      );
    }
  }

  private beginStroke(e: PointerInput, x: number, y: number): void {
    const s = this.settings;
    if (s.tool === "eraser" && this.ink.layerCanvas(this.current) === null) {
      this.pointers.set(e.pointerId, swallowed(e.pointerType));
      return;
    }
    const cssX = e.clientX - this.origin.left;
    const cssY = e.clientY - this.origin.top;
    let stabilizer: Stabilizer;
    try {
      stabilizer = new Stabilizer(
        { x: cssX, y: cssY, pressure: e.pressure, t: e.timeStamp },
        s.smoothing,
        e.pointerType === "pen",
        0n,
        s.smoothingMode,
      );
    } catch (error) {
      if (!(error instanceof StabilizationError)) throw error;
      this.stabilizationFailed(error, e.pointerId);
      return;
    }
    // The first mark fixes the frame for the life of the drawing.
    this.frameRule = "fixed";
    const builder = new StrokeBuilder({
      tool: s.tool === "eraser" ? "eraser" : "brush",
      layer: this.current,
      color: s.color,
      size: s.size,
      x,
      y,
      t: e.timeStamp,
      T: s.sessionMs(),
      pressure: stabilizer.initial.pressure,
      pointerType: e.pointerType,
      pressureVaries: this.pressurePen,
      response: s.penPressure,
    });
    this.pointers.set(e.pointerId, { pointerType: e.pointerType, kind: "stroke" });
    this.live = {
      id: e.pointerId,
      pointerType: e.pointerType,
      builder,
      stabilizer,
      correction:
        s.postCorrection.strength > 0
          ? {
              packets: [{ ...stabilizer.initial, x, y }],
              settings: { ...s.postCorrection },
              stabilization: s.smoothing,
              magnificationFraction: this.origin.scale,
              brushSize: s.size,
              pointerType: e.pointerType,
            }
          : null,
      queue: [],
      queued: 0,
      painted: 1,
      t0: e.timeStamp,
      x0: x,
      y0: y,
      moved: 0,
      x,
      y,
      cssX,
      cssY,
      scale: this.origin.scale,
      pressure: e.pressure,
      t: e.timeStamp,
    };
    // The dot shows as the pointer lands, not a frame later.
    const shown = this.withRoom(builder.op, () =>
      timeOurWork(INK_WORK.paint, () => {
        this.display.beginStroke(builder.op);
        this.display.paintStroke(0, 1);
      }),
    );
    if (!shown) this.endStroke(true);
  }

  /** `time` is the frame's, on the clock pointer samples are stamped with. */
  private readonly paintFrame = (_time: number): void => {
    this.cancelFrame = null;
    const live = this.live;
    if (!live) return;
    try {
      timeOurWork(INK_WORK.paint, () => {
        this.feed(live);
        this.paintNew(live);
        this.display.paintTail(live.builder.provisional());
      });
    } catch (error) {
      if (!(error instanceof StabilizationError)) throw error;
      this.stabilizationFailed(error, live.id);
    }
  };

  /** Feeds the queued samples through the stabilizer to the stroke. */
  private feed(live: LiveStroke): void {
    const { queue, queued, stabilizer, builder } = live;
    const { scale } = live;
    for (let i = 0; i < queued; i += 4) {
      // The builder keeps the nib it's given, to measure the next one's speed from.
      const nib = {
        x: queue[i] / scale,
        y: queue[i + 1] / scale,
        pressure: queue[i + 2],
        t: queue[i + 3],
      };
      for (const output of stabilizer.add({
        x: queue[i],
        y: queue[i + 1],
        pressure: queue[i + 2],
        t: queue[i + 3],
      })) {
        this.retainCorrectionPacket(live, output);
        builder.add(output.x / scale, output.y / scale, output.pressure, output.t, nib);
      }
    }
    live.queued = 0;
  }

  /** Paints the segments the stroke has added since the last paint on the wet canvas. */
  private paintNew(live: LiveStroke): void {
    const { builder } = live;
    if (builder.count > live.painted) {
      this.display.paintStroke(live.painted, builder.count);
      live.painted = builder.count;
    }
  }

  /**
   * Commits the stroke in progress, painting it whole on its layer, or takes it back: the layer
   * never had it, so the wet canvas only clears.
   */
  private endStroke(takeBack: boolean, releasePressure = 0, correct = false): void {
    this.finishPendingCorrection();
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
      this.withRoom("clearing the stroke preview", () => this.display.endStroke());
      this.followIfBlank();
      return;
    }
    const { builder } = live;
    try {
      timeOurWork(INK_WORK.paint, () => {
        this.feed(live);
        if (builder.pressured) this.pressurePen = true;
        const { scale } = live;
        for (const output of live.stabilizer.finish({
          x: live.cssX,
          y: live.cssY,
          pressure: releasePressure,
          t: live.t,
        })) {
          this.retainCorrectionPacket(live, output);
          builder.add(output.x / scale, output.y / scale, output.pressure, output.t, null);
        }
        const last = live.stabilizer.position;
        builder.settle(last.x / scale, last.y / scale);
        // A pen's tail narrows once the queue's terminal endpoint is known.
        builder.taperEnd();
      });
    } catch (error) {
      if (!(error instanceof StabilizationError)) throw error;
      this.stabilizationFailed(error, live.id);
      return;
    }
    const { op } = builder;
    if (correct && live.correction) {
      this.startCorrection(op, live.correction);
      return;
    }
    this.commitStroke(op);
  }

  private retainCorrectionPacket(live: LiveStroke, output: StabilizerOutput): void {
    if (!live.correction) return;
    live.correction.packets.push({ ...output, x: output.x / live.scale, y: output.y / live.scale });
  }

  /** The completed preview stays visible until correction finishes or another command needs it. */
  private startCorrection(
    original: StrokeOp,
    input: Omit<PostCorrectionInput, "renderedPoints">,
  ): void {
    try {
      this.withRoom(
        "showing the stroke awaiting correction",
        () => {
          this.display.beginStroke(original);
          this.display.paintStroke(0, original.pts.length / 4);
        },
        true,
      );
    } catch (error) {
      if (!(error instanceof CanvasUnavailableError)) throw error;
      // No pending preview can be shown. Preserve original ink synchronously and keep the
      // allocation notice after any successful commit/history notifications have run.
      if (this.commitStroke(original)) this.events.onInkFailed(error);
      return;
    }
    const pending = { original, abort: new AbortController() };
    this.pendingCorrection = pending;
    let result: Promise<number[]>;
    try {
      result = this.correction.correct(
        { ...input, renderedPoints: original.pts },
        pending.abort.signal,
      );
    } catch (error) {
      this.correctionFailed(pending, error);
      return;
    }
    void result.then(
      (points) => {
        if (this.pendingCorrection !== pending) return;
        this.pendingCorrection = null;
        // The returned spline samples are already the final geometry, with transferred width/time.
        this.commitStroke({ ...original, pts: points });
      },
      (error: unknown) => this.correctionFailed(pending, error),
    );
  }

  /** Commands remain synchronous: retain original ink before changing layers, history, or exports. */
  private finishPendingCorrection(): void {
    const pending = this.pendingCorrection;
    if (!pending) return;
    this.pendingCorrection = null;
    pending.abort.abort();
    this.commitStroke(pending.original);
  }

  private correctionFailed(pending: PendingCorrection, cause: unknown): void {
    if (this.pendingCorrection !== pending) return;
    this.pendingCorrection = null;
    const restored = this.commitStroke(pending.original);
    if (!restored) {
      console.error(
        "Stroke correction failed, and original ink could not be committed or shown",
        cause,
      );
      return;
    }
    const error =
      cause instanceof PostCorrectionError
        ? cause
        : new PostCorrectionError(
            `Stroke correction failed: ${cause instanceof Error ? cause.message : String(cause)}`,
          );
    console.error("Stroke correction failed; the original ink was retained", error);
    // Successful commit/history notifications may clear earlier notices, so publish this last.
    this.events.onInkFailed(error);
  }

  /** False preserves an already reported failure to commit or display this stroke. */
  private commitStroke(op: StrokeOp): boolean {
    const painted = timeOurWork(INK_WORK.commit, () => {
      // The whole stroke at once, as a replay paints it, so its edges match the replay's.
      const done = this.withRoom(op, () => this.ink.apply(op, this.history.state));
      if (!done) return false;
      this.history.commit(op);
      return true;
    });
    if (painted) this.landed(op);
    else this.followIfBlank();
    const shown = this.withRoom("showing the completed stroke", () => {
      this.display.endStroke();
      if (painted) this.display.showCurrent();
    });
    return painted && shown !== null;
  }

  /** Drop only the uncommitted preview and persist the existing drawing-error notice. */
  private stabilizationFailed(error: StabilizationError, pointerId: number): void {
    this.live = null;
    this.cancelFrame?.();
    this.cancelFrame = null;
    this.pointers.delete(pointerId);
    this.taps.cancel(pointerId);
    const target = this.captureTarget;
    if (target?.hasPointerCapture(pointerId)) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (releaseError) {
        console.error("Could not release pointer capture after stabilization failed", releaseError);
      }
    }
    this.withRoom("clearing the failed stroke preview", () => this.display.endStroke());
    this.followIfBlank();
    console.error("The uncommitted stroke was dropped because stabilization failed", error);
    this.events.onInkFailed(error);
  }

  private applyFill(x: number, y: number): void {
    const op: FillOp = {
      tool: "fill",
      reference: this.settings.fillReference,
      layer: this.current,
      x,
      y,
      color: this.settings.color,
      gap: FILL_GAP,
      T: this.settings.sessionMs(),
    };
    const flooded = timeOurWork(INK_WORK.fill, () =>
      this.withRoom(op, () => this.ink.flood(op, this.history.state)),
    );
    // Dropped for want of a canvas, or it changed nothing.
    const changed = flooded?.[0];
    if (!changed) return;
    this.frameRule = "fixed";
    timeOurWork(INK_WORK.commit, () => this.history.commit(op));
    this.landed(op);
    this.withRoom("showing the completed fill", () => {
      this.display.showCurrent();
      this.display.inkChanged(changed);
    });
  }

  /** An op landed on its layer: its chip draws again. */
  private landed(op: Op): void {
    this.bump([op.layer]);
    this.events.onCommit(op);
    this.notify();
  }

  /** A sheet left blank follows its area again, as it did before a stroke fixed its frame. */
  private followIfBlank(): void {
    if (this.history.steps.length === 0) this.frameRule = "follows";
  }
}
