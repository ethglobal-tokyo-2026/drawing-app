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
import type { LayerControls } from "../layers/layerControls";
import { LayerDisplay } from "../layers/layerDisplay";
import { LayerInk } from "../layers/layerInk";
import { FIRST_LAYERS, type LayerState } from "../layers/layerState";
import { InkEngine, type HoverRing, type InkEvents, type InkSettings } from "./inkEngine";
import type { LayerId, Step } from "./ops";
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

export interface DrawingCanvasHandle extends LayerControls {
  undo: () => void;
  redo: () => void;
  /** A fresh sheet, with nothing to undo, whose frame follows its area until the first mark. */
  reset: () => void;
  /**
   * A sheet with these steps on it, as a drawing picked up after a reload has, in the frame they
   * were drawn in; with no frame, the sheet's area is taken as that frame.
   */
  load: (steps: readonly Step[], frame: SheetFrame | null, current: LayerId | null) => void;
  /** The steps the timelapse plays, from the last time no layer had ink, and the layers then. */
  timelapse: () => { steps: readonly Step[]; start: LayerState };
  /** Every step, oldest first, layer changes included: what the drawing kept on the device holds. */
  steps: () => readonly Step[];
  /** Ends a stroke in progress as if the pointer lifted. */
  finishStroke: () => void;
  /** A new canvas of what the sheet shows, transparent where nothing is drawn; the caller releases it. */
  composite: () => HTMLCanvasElement | null;
  /**
   * The sheet's size in units and its ink's density; null until the sheet shows or a kept drawing
   * brings one.
   */
  frame: () => SheetFrame | null;
  /** Where the sheet is on screen, in CSS px; null while it isn't mounted. */
  sheetRect: () => DOMRect | null;
  /** The pointer's press closed a panel: it draws, fills and hints nothing on the sheet until it lifts. */
  swallow: (pointerId: number) => void;
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
  const layersRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const ink = useRef<{ engine: InkEngine; layers: LayerInk } | null>(null);
  const showing = useRef(active);
  const measureAgain = useRef<(() => void) | null>(null);
  const fitAgain = useRef<(() => void) | null>(null);

  const onHistory = useEffectEvent(events.onHistory);
  const onLayers = useEffectEvent(events.onLayers);
  const onBlockedHidden = useEffectEvent(events.onBlockedHidden);
  const onInkFailed = useEffectEvent(events.onInkFailed);
  const onCommit = useEffectEvent(events.onCommit);
  const onBlocked = useEffectEvent(events.onBlocked);
  const onPen = useEffectEvent(events.onPen);
  const onFit = useEffectEvent(events.onFit);
  const initialSettings = useEffectEvent(() => settings);

  useEffect(() => {
    const area = areaRef.current;
    const sheet = sheetRef.current;
    const host = layersRef.current;
    if (!area || !sheet || !host) return;
    const layers = new LayerInk();
    const engine = new InkEngine(layers, new LayerDisplay(host, layers), initialSettings(), {
      onHistory: (state) => onHistory(state),
      onLayers: (view) => onLayers(view),
      onBlockedHidden: () => onBlockedHidden(),
      onInkFailed: (error) => onInkFailed(error),
      onCommit: (op) => onCommit(op),
      onBlocked: () => onBlocked(),
      onPen: () => onPen(),
      onHover: (ring) => showRing(ringRef.current, ring),
    });
    ink.current = { engine, layers };
    if (!showing.current) engine.suspend();
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
      engine.measurePaper();
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
      ink.current = null;
    };
  }, []);

  // Covered, the area changes height with the tab bar, and a blank sheet's frame follows its area.
  // So the sheet is fitted only while the drawing screen shows, and measures again as it shows.
  useLayoutEffect(() => {
    showing.current = active;
    if (active) {
      ink.current?.engine.resume();
      measureAgain.current?.();
    } else ink.current?.engine.suspend();
  }, [active]);

  useLayoutEffect(() => {
    if (ink.current) ink.current.engine.settings = settings;
  });

  useImperativeHandle(
    ref,
    () => ({
      undo: () => ink.current?.engine.undo(),
      redo: () => ink.current?.engine.redo(),
      addLayer: () => ink.current?.engine.addLayer(),
      selectLayer: (id) => ink.current?.engine.selectLayer(id),
      deleteLayer: () => ink.current?.engine.deleteLayer(),
      moveLayer: (id, to) => ink.current?.engine.moveLayer(id, to),
      clearLayer: () => ink.current?.engine.clearLayer(),
      previewOpacity: (opacity) => ink.current?.engine.previewOpacity(opacity),
      setOpacity: (opacity) => ink.current?.engine.setOpacity(opacity),
      setLocked: (on) => ink.current?.engine.setLocked(on),
      setClipped: (on) => ink.current?.engine.setClipped(on),
      thumbnail: (id) => ink.current?.engine.thumbnail(id) ?? null,
      reset: () => {
        ink.current?.engine.reset();
        fitAgain.current?.();
      },
      load: (steps, frame, current) => {
        ink.current?.engine.load(steps, frame, current);
        fitAgain.current?.();
      },
      timelapse: () => ink.current?.engine.timelapse() ?? { steps: [], start: FIRST_LAYERS },
      steps: () => ink.current?.engine.steps ?? [],
      finishStroke: () => ink.current?.engine.finishStroke(),
      composite: () => ink.current?.engine.composite() ?? null,
      frame: () => ink.current?.engine.frame ?? null,
      sheetRect: () => sheetRef.current?.getBoundingClientRect() ?? null,
      swallow: (pointerId) => ink.current?.engine.swallow(pointerId),
    }),
    [],
  );

  return (
    <div ref={areaRef} className="ink-area">
      <div ref={sheetRef} className="ink-sheet" data-tool={settings.tool}>
        {under}
        {/* The display's canvases: the layers below the current one, the current one with the
            stroke being drawn over it, and the layers above. */}
        <div
          ref={layersRef}
          className="ink-layers"
          role="img"
          aria-label={label ?? t(($) => $.stickerCreation.canvas)}
        />
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
