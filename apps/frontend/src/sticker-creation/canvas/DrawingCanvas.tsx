import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react";
import { useTranslation } from "../../i18n/react";
import { InkEngine, type InkEvents, type InkSettings } from "./inkEngine";
import { InkSurface } from "./inkSurface";
import type { Op, Step } from "./ops";
import "./DrawingCanvas.css";

export interface DrawingCanvasHandle {
  undo: () => void;
  redo: () => void;
  /** Sets the drawing aside for a blank sheet; undo brings it back. */
  clear: () => void;
  /** A fresh sheet, with nothing to undo. */
  reset: () => void;
  /** A sheet with these steps on it, as a drawing picked up after a reload has. */
  load: (steps: readonly Step[]) => void;
  /** The ops on the ink, oldest first. */
  ops: () => readonly Op[];
  /** Every step, oldest first, clears included: what the drawing kept on the device holds. */
  steps: () => readonly Step[];
  /** Ends a stroke in progress as if the pointer lifted. */
  finishStroke: () => void;
  /** A copy of the ink, transparent where nothing is drawn, to read pixels from. */
  inkForReading: () => HTMLCanvasElement | null;
  /** Device pixels per sheet pixel: the ink canvas's density. */
  inkDensity: () => number;
}

interface Props extends InkEvents {
  ref?: Ref<DrawingCanvasHandle>;
  settings: InkSettings;
  /** The drawing screen shows, not covered by another screen. */
  active: boolean;
}

/**
 * The white sheet and the ink on it. Pointer input goes straight to the ink engine and never through
 * React state; the engine reads the settings as each pointer lands and reports back through the events.
 */
export function DrawingCanvas({ ref, settings, active, ...events }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ink = useRef<{ engine: InkEngine; surface: InkSurface } | null>(null);
  const showing = useRef(active);
  const measureAgain = useRef<(() => void) | null>(null);

  const onHistory = useEffectEvent(events.onHistory);
  const onCommit = useEffectEvent(events.onCommit);
  const onBlocked = useEffectEvent(events.onBlocked);
  const onDismissPanel = useEffectEvent(events.onDismissPanel);
  const onDisarm = useEffectEvent(events.onDisarm);
  const initialSettings = useEffectEvent(() => settings);

  useEffect(() => {
    const sheet = sheetRef.current;
    const canvas = canvasRef.current;
    if (!sheet || !canvas) return;
    const surface = new InkSurface(canvas);
    const engine = new InkEngine(surface, initialSettings(), {
      onHistory: (state) => onHistory(state),
      onCommit: (op) => onCommit(op),
      onBlocked: () => onBlocked(),
      onDismissPanel: () => onDismissPanel(),
      onDisarm: () => onDisarm(),
    });
    ink.current = { engine, surface };
    const detach = engine.attach(sheet);
    const observer = new ResizeObserver(([entry]) => {
      if (!showing.current) return;
      const { width, height } = entry.contentRect;
      if (surface.resize(width, height, devicePixelRatio)) engine.resized();
    });
    observer.observe(sheet);
    // Observing afresh reports the sheet's size at the next frame, even when it hasn't changed.
    measureAgain.current = () => {
      observer.unobserve(sheet);
      observer.observe(sheet);
    };
    return () => {
      observer.disconnect();
      measureAgain.current = null;
      detach();
      engine.dispose();
      ink.current = null;
    };
  }, []);

  // Covered, the sheet changes height with the tab bar, and resizing the ink replays the whole
  // drawing. So the ink keeps its size until the drawing screen shows again, then measures.
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
      reset: () => ink.current?.engine.reset(),
      load: (steps) => ink.current?.engine.load(steps),
      ops: () => ink.current?.engine.ops ?? [],
      steps: () => ink.current?.engine.steps ?? [],
      finishStroke: () => ink.current?.engine.finishStroke(),
      inkForReading: () => ink.current?.surface.copyForReading() ?? null,
      inkDensity: () => ink.current?.surface.density ?? 1,
    }),
    [],
  );

  return (
    <div ref={sheetRef} className="ink-sheet" data-tool={settings.tool}>
      <canvas
        ref={canvasRef}
        className="ink-canvas"
        aria-label={t(($) => $.stickerCreation.canvas)}
      />
    </div>
  );
}
