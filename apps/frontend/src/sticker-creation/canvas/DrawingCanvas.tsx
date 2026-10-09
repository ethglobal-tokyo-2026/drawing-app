import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { useTranslation } from "../../i18n/react";
import { InkEngine, type HoverRing, type InkEvents, type InkSettings } from "./inkEngine";
import { InkSurface } from "./inkSurface";
import { PredictionCanvas } from "./predictionCanvas";
import type { Op, Step } from "./ops";
import { fitScale, type SheetArea, type SheetFrame } from "./sheetFrame";
import "./DrawingCanvas.css";

/** A ring narrower than this many CSS px reads as a dot, so a fine brush's ring keeps this width. */
const MIN_RING_PX = 6;

/** Puts the ring where a hovering pen would land, or takes it away: hover comes too often for React state. */
function showRing(el: HTMLElement | null, ring: HoverRing | null) {
  if (!el) return;
  el.hidden = ring === null;
  if (!ring) return;
  const d = Math.max(ring.diameter, MIN_RING_PX);
  el.style.width = `${d}px`;
  el.style.height = `${d}px`;
  el.style.transform = `translate(${ring.x - d / 2}px, ${ring.y - d / 2}px)`;
}

export interface DrawingCanvasHandle {
  undo: () => void;
  redo: () => void;
  /** Sets the drawing aside for a blank sheet; undo brings it back. */
  clear: () => void;
  /** A fresh sheet, with nothing to undo, whose frame follows its area until the first mark. */
  reset: () => void;
  /**
   * A sheet with these steps on it, as a drawing picked up after a reload has, in the frame they
   * were drawn in; with no frame, the sheet's area is taken as that frame.
   */
  load: (steps: readonly Step[], frame: SheetFrame | null) => void;
  /** The ops on the ink, oldest first. */
  ops: () => readonly Op[];
  /** Every step, oldest first, clears included: what the drawing kept on the device holds. */
  steps: () => readonly Step[];
  /** Ends a stroke in progress as if the pointer lifted. */
  finishStroke: () => void;
  /** A copy of the ink, transparent where nothing is drawn, to read pixels from. */
  inkForReading: () => HTMLCanvasElement | null;
  /**
   * The sheet's size in units and its ink's density; null until the sheet shows or a kept drawing
   * brings one.
   */
  frame: () => SheetFrame | null;
  /** Where a point on screen falls on the sheet, in units; null while the sheet has no frame. */
  screenToSheet: (clientX: number, clientY: number) => [x: number, y: number] | null;
}

// The hover ring is the paper's own, so its event stays here.
interface Props extends Omit<InkEvents, "onHover"> {
  ref?: Ref<DrawingCanvasHandle>;
  settings: InkSettings;
  /** The drawing screen shows, not covered by another screen. */
  active: boolean;
  /** Printed on the paper under the ink, so ink covers it. */
  under?: ReactNode;
  /** The canvas's name for screen readers, when the sheet has more to say than the catalog's. */
  label?: string;
  /** The sheet was fitted to its area: how many CSS px a sheet unit spans on screen now. */
  onFit: (scale: number) => void;
}

/**
 * The white sheet and the ink on it, scaled to fit the area the drawing screen gives it. Pointer
 * input goes straight to the ink engine and never through React state; the engine reads the
 * settings as each pointer lands and reports back through the events.
 */
export function DrawingCanvas({ ref, settings, active, under, label, ...events }: Props) {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const predictionRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const ink = useRef<{ engine: InkEngine; surface: InkSurface } | null>(null);
  const showing = useRef(active);
  const measureAgain = useRef<(() => void) | null>(null);
  const fitAgain = useRef<(() => void) | null>(null);

  const onHistory = useEffectEvent(events.onHistory);
  const onCommit = useEffectEvent(events.onCommit);
  const onBlocked = useEffectEvent(events.onBlocked);
  const onDismissPanel = useEffectEvent(events.onDismissPanel);
  const onPen = useEffectEvent(events.onPen);
  const onFit = useEffectEvent(events.onFit);
  const initialSettings = useEffectEvent(() => settings);

  useEffect(() => {
    const area = areaRef.current;
    const sheet = sheetRef.current;
    const canvas = canvasRef.current;
    const predicted = predictionRef.current;
    if (!area || !sheet || !canvas || !predicted) return;
    const surface = new InkSurface(canvas);
    // Sized and scaled as the ink is whenever it paints, so it follows the sheet's frame.
    const prediction = new PredictionCanvas(predicted, () => ({
      width: canvas.width,
      height: canvas.height,
      density: surface.density,
    }));
    const engine = new InkEngine(
      surface,
      initialSettings(),
      {
        onHistory: (state) => onHistory(state),
        onCommit: (op) => onCommit(op),
        onBlocked: () => onBlocked(),
        onDismissPanel: () => onDismissPanel(),
        onPen: () => onPen(),
        onHover: (ring) => showRing(ringRef.current, ring),
      },
      // The browser's frames, then the overlay.
      undefined,
      prediction,
    );
    ink.current = { engine, surface };
    const detach = engine.attach(sheet);
    /** The area the sheet last had on screen, in CSS px. */
    let shown: SheetArea | null = null;
    // The paper takes its frame's shape, as large as the area holds; the ink's pixels never change.
    const fit = () => {
      if (!shown || !showing.current) return;
      engine.fit(shown, devicePixelRatio);
      const { frame } = engine;
      if (!frame) return;
      const scale = fitScale(frame, shown);
      sheet.style.width = `${frame.w * scale}px`;
      sheet.style.height = `${frame.h * scale}px`;
      onFit(scale);
    };
    fitAgain.current = fit;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Covered, or not laid out yet, the area isn't the one the sheet is drawn in.
      if (!showing.current || width <= 0 || height <= 0) return;
      shown = { width, height };
      fit();
    });
    observer.observe(area);
    // Observing afresh reports the area's size at the next frame, even when it hasn't changed.
    measureAgain.current = () => {
      observer.unobserve(area);
      observer.observe(area);
    };
    return () => {
      observer.disconnect();
      measureAgain.current = null;
      fitAgain.current = null;
      detach();
      engine.dispose();
      prediction.release();
      ink.current = null;
    };
  }, []);

  // Covered, the area changes height with the tab bar, and a blank sheet's frame follows its area.
  // So the sheet is fitted only while the drawing screen shows, and measures again as it shows.
  useLayoutEffect(() => {
    showing.current = active;
    if (active) measureAgain.current?.();
  }, [active]);

  useLayoutEffect(() => {
    if (ink.current) ink.current.engine.settings = settings;
  });

  useImperativeHandle(
    ref,
    () => ({
      undo: () => ink.current?.engine.undo(),
      redo: () => ink.current?.engine.redo(),
      clear: () => ink.current?.engine.clear(),
      reset: () => {
        ink.current?.engine.reset();
        fitAgain.current?.();
      },
      load: (steps, frame) => {
        ink.current?.engine.load(steps, frame);
        fitAgain.current?.();
      },
      ops: () => ink.current?.engine.ops ?? [],
      steps: () => ink.current?.engine.steps ?? [],
      finishStroke: () => ink.current?.engine.finishStroke(),
      inkForReading: () => ink.current?.surface.copyForReading() ?? null,
      frame: () => ink.current?.engine.frame ?? null,
      screenToSheet: (x, y) => ink.current?.engine.screenToSheet(x, y) ?? null,
    }),
    [],
  );

  return (
    <div ref={areaRef} className="ink-area">
      <div ref={sheetRef} className="ink-sheet" data-tool={settings.tool}>
        {under}
        <canvas
          ref={canvasRef}
          className="ink-canvas"
          aria-label={label ?? t(($) => $.stickerCreation.canvas)}
        />
        {/* A pen's prediction, one frame at a time: never read, kept or sealed. */}
        <canvas ref={predictionRef} className="ink-canvas ink-prediction" aria-hidden="true" />
        {/* Where a hovering pen would land. */}
        <span
          ref={ringRef}
          className={settings.tool === "eraser" ? "nib-ring is-eraser" : "nib-ring"}
          hidden
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
