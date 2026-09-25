import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import { hexToRgba } from "./color";
import { TapRecognizer } from "./gestures";
import { History } from "./history";
import { clearCanvas, context2d, drawStroke, sizeCanvas } from "./renderer";
import { ExpStabilizer, type Stabilizer } from "./stabilizer";
import { CanvasSurface } from "./surface";
import type { Point, Stroke, Tool } from "./types";
import "./DrawingCanvas.css";

export interface CanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  /** Wipe everything, including undo history. */
  reset: () => void;
  /** The committed drawing (transparent background). Read-only. */
  surface: () => HTMLCanvasElement | null;
}

interface DrawingSettings {
  tool: Tool;
  color: string;
  size: number;
  stabilization: number;
  pressure: boolean;
  fingerDraws: boolean;
  /** Ignore all input (time's up / sealed). */
  locked: boolean;
}

interface Props {
  settings: DrawingSettings;
  ref?: Ref<CanvasHandle>;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  onPenDetected: () => void;
}

interface ActiveStroke {
  pointerId: number;
  stroke: Stroke;
  stabilizer: Stabilizer;
}

export function DrawingCanvas({ settings, ref, onHistoryChange, onPenDetected }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Handlers read the latest props through refs so listeners bind once.
  const settingsRef = useRef(settings);
  const callbacksRef = useRef({ onHistoryChange, onPenDetected });
  useLayoutEffect(() => {
    settingsRef.current = settings;
    callbacksRef.current = { onHistoryChange, onPenDetected };
  });

  const engineRef = useRef<{
    history: History<HTMLCanvasElement>;
    render: () => void;
    cancelStroke: () => void;
    committed: HTMLCanvasElement;
  } | null>(null);

  useImperativeHandle(ref, () => {
    const withEngine = (fn: (h: History<HTMLCanvasElement>) => void) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.cancelStroke();
      fn(engine.history);
      engine.render();
      callbacksRef.current.onHistoryChange(engine.history.canUndo, engine.history.canRedo);
    };
    return {
      undo: () => withEngine((h) => h.undo()),
      redo: () => withEngine((h) => h.redo()),
      clear: () =>
        withEngine((h) => {
          if (h.length > 0 && h.last?.kind !== "clear") h.push({ kind: "clear" });
        }),
      reset: () => withEngine((h) => h.reset()),
      surface: () => engineRef.current?.committed ?? null,
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const display = canvasRef.current;
    if (!container || !display) return;
    const displayCtx = context2d(display);
    const committed = document.createElement("canvas");
    const surface = new CanvasSurface(committed);
    // Fills are slow to replay, so snapshot more often than the default.
    const history = new History(surface, { interval: 10 });
    const recognizer = new TapRecognizer();

    let active: ActiveStroke | null = null;
    // Bucket taps apply on release, so a two-finger undo tap never fills.
    let pendingFill: { pointerId: number; x: number; y: number } | null = null;
    let rect = display.getBoundingClientRect();
    let frame = 0;
    let penActive = false;

    const notify = () => callbacksRef.current.onHistoryChange(history.canUndo, history.canRedo);

    const render = () => {
      clearCanvas(displayCtx);
      displayCtx.save();
      displayCtx.setTransform(1, 0, 0, 1, 0, 0);
      displayCtx.drawImage(committed, 0, 0);
      displayCtx.restore();
      if (active) drawStroke(displayCtx, active.stroke);
    };

    const loop = () => {
      frame = 0;
      if (!active) return;
      active.stroke.points.push(...active.stabilizer.tick(performance.now()));
      render();
      frame = requestAnimationFrame(loop);
    };

    const toPoint = (e: PointerEvent): Point => ({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pointerType === "pen" ? e.pressure : 0.5,
      t: e.timeStamp,
    });

    const startStroke = (e: PointerEvent) => {
      const s = settingsRef.current;
      if (s.tool === "bucket") return;
      const stabilizer = new ExpStabilizer(s.stabilization);
      rect = display.getBoundingClientRect();
      active = {
        pointerId: e.pointerId,
        stabilizer,
        stroke: {
          tool: s.tool,
          color: s.color,
          size: s.size,
          usePressure: s.pressure && e.pointerType === "pen",
          points: stabilizer.begin(toPoint(e)),
        },
      };
      try {
        display.setPointerCapture(e.pointerId);
      } catch {
        // Pointer may already be gone.
      }
      if (!frame) frame = requestAnimationFrame(loop);
    };

    const finishStroke = () => {
      if (!active) return;
      active.stroke.points.push(...active.stabilizer.end());
      const { stroke } = active;
      active = null;
      penActive = false;
      history.push({ kind: "stroke", stroke });
      render();
      notify();
    };

    const cancelStroke = () => {
      pendingFill = null;
      if (!active) return;
      active = null;
      penActive = false;
      render();
    };

    const applyFill = (x: number, y: number) => {
      const color = settingsRef.current.color;
      const current = surface.pixelAt(x, y);
      const [r, g, b] = hexToRgba(color);
      if (current[3] === 255 && current[0] === r && current[1] === g && current[2] === b) return;
      history.push({ kind: "fill", x, y, color });
      render();
      notify();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (settingsRef.current.locked) return;
      if (e.pointerType === "touch") {
        const result = recognizer.down(e.pointerId, e.clientX, e.clientY, e.timeStamp);
        if (result === "cancel-stroke") {
          if (active && !penActive) cancelStroke();
          return;
        }
        if (result === "ignore" || !settingsRef.current.fingerDraws || penActive) return;
      } else {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.pointerType === "pen") {
          callbacksRef.current.onPenDetected();
          // The pen always wins over a finger stroke (likely a resting palm).
          if (active && !penActive) cancelStroke();
          penActive = true;
        }
      }
      if (active || pendingFill) return;
      e.preventDefault();
      if (settingsRef.current.tool === "bucket") {
        rect = display.getBoundingClientRect();
        const { x, y } = toPoint(e);
        pendingFill = { pointerId: e.pointerId, x, y };
        return;
      }
      startStroke(e);
    };

    const updateCursor = (e: PointerEvent) => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      if (
        e.pointerType === "touch" ||
        settingsRef.current.tool === "bucket" ||
        settingsRef.current.locked
      ) {
        cursor.style.opacity = "0";
        return;
      }
      const size = Math.max(4, settingsRef.current.size);
      const r = display.getBoundingClientRect();
      cursor.style.opacity = "1";
      cursor.style.width = cursor.style.height = `${size}px`;
      cursor.style.transform = `translate(${e.clientX - r.left - size / 2}px, ${e.clientY - r.top - size / 2}px)`;
    };

    const onPointerMove = (e: PointerEvent) => {
      updateCursor(e);
      if (e.pointerType === "touch") recognizer.move(e.pointerId, e.clientX, e.clientY);
      if (!active || e.pointerId !== active.pointerId) return;
      const events = e.getCoalescedEvents?.() ?? [];
      for (const ev of events.length ? events : [e]) {
        active.stroke.points.push(...active.stabilizer.push(toPoint(ev)));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        const gesture = recognizer.up(e.pointerId, e.timeStamp);
        if (gesture) {
          cancelStroke();
          if (gesture === "undo" ? history.undo() : history.redo()) {
            render();
            notify();
          }
          return;
        }
      }
      if (pendingFill && e.pointerId === pendingFill.pointerId) {
        const { x, y } = pendingFill;
        pendingFill = null;
        penActive = false;
        applyFill(x, y);
        return;
      }
      if (active && e.pointerId === active.pointerId) finishStroke();
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerType === "touch") recognizer.cancel(e.pointerId);
      if (pendingFill?.pointerId === e.pointerId) pendingFill = null;
      if (active && e.pointerId === active.pointerId) finishStroke();
    };

    const onPointerLeave = () => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      cursor.style.opacity = "0";
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      display.style.width = `${width}px`;
      display.style.height = `${height}px`;
      sizeCanvas(display, width, height, dpr);
      sizeCanvas(committed, width, height, dpr);
      rect = display.getBoundingClientRect();
      history.invalidate();
      render();
    };

    const preventGesture = (e: Event) => e.preventDefault();

    engineRef.current = { history, render, cancelStroke, committed };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    display.addEventListener("pointerdown", onPointerDown);
    display.addEventListener("pointermove", onPointerMove);
    display.addEventListener("pointerup", onPointerUp);
    display.addEventListener("pointercancel", onPointerCancel);
    display.addEventListener("pointerleave", onPointerLeave);
    // Safari-only pinch events; block page zoom while drawing.
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    // iOS may start a scroll/selection on touchstart despite touch-action.
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    display.addEventListener("touchstart", preventTouch, { passive: false });
    display.addEventListener("touchmove", preventTouch, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      display.removeEventListener("pointerdown", onPointerDown);
      display.removeEventListener("pointermove", onPointerMove);
      display.removeEventListener("pointerup", onPointerUp);
      display.removeEventListener("pointercancel", onPointerCancel);
      display.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      display.removeEventListener("touchstart", preventTouch);
      display.removeEventListener("touchmove", preventTouch);
      engineRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className={`canvas-container tool-${settings.tool}`}>
      <canvas ref={canvasRef} className="drawing-canvas" />
      <div ref={cursorRef} className={`brush-cursor ${settings.tool}`} />
    </div>
  );
}
