import { useRef, type PointerEvent as ReactPointerEvent } from "react";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pointer drag helper: calls `onMove` with the pointer position (0..1) over `el`. */
export function useDrag(onMove: (fx: number, fy: number) => void, onEnd?: () => void) {
  const dragging = useRef(false);
  const at = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onMove(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height));
  };
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      at(e);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => dragging.current && at(e),
    onPointerUp: () => {
      if (!dragging.current) return;
      dragging.current = false;
      onEnd?.();
    },
    onPointerCancel: () => {
      dragging.current = false;
    },
  };
}
