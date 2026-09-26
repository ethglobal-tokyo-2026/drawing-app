import { useRef, type PointerEvent as ReactPointerEvent } from "react";

interface Drag {
  /** The drag began. */
  onStart?: () => void;
  /** Each move of the drag, with the element's box as it began. Draws the drag; sets no React state. */
  onMove: (x: number, y: number, box: DOMRect) => void;
  /** The drag ended, lifted or taken by the browser: keep what it showed. */
  onEnd: () => void;
}

/**
 * A pointer dragged over a control, from press to lift. Moves only redraw the control; the value
 * lands in React state once, at the end, so a drag never re-renders the screen.
 */
export function useDrag({ onStart, onMove, onEnd }: Drag) {
  const box = useRef<DOMRect | null>(null);
  const end = () => {
    if (!box.current) return;
    box.current = null;
    onEnd();
  };
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (box.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      box.current = e.currentTarget.getBoundingClientRect();
      e.currentTarget.setPointerCapture(e.pointerId);
      onStart?.();
      onMove(e.clientX, e.clientY, box.current);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (box.current) onMove(e.clientX, e.clientY, box.current);
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}
