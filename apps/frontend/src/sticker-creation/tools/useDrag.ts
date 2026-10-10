import { useEffect, useEffectEvent, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { capturePointer } from "../../ui/capturePointer";

interface Drag {
  /** The drag began where the pointer landed, in the element's box. */
  onStart?: (x: number, y: number, box: DOMRect) => void;
  /** Each move of the drag, with the element's box as it began. Draws the drag; sets no React state. */
  onMove: (x: number, y: number, box: DOMRect) => void;
  /** The drag ended, lifted or taken by the browser: keep what it showed. */
  onEnd: () => void;
  /** The control went away mid-drag: let go of what the drag showed, keeping none of it. */
  onAbandon: () => void;
}

/**
 * A pointer dragged over a control, from press to lift. Moves only redraw the control; the value
 * lands in React state once, at the end, so a drag never re-renders the screen.
 */
export function useDrag({ onStart, onMove, onEnd, onAbandon }: Drag) {
  // The box as the drag began, and the pointer that pressed: no other pointer, such as a hovering
  // Pencil, moves or ends the drag.
  const drag = useRef<{ box: DOMRect; pointerId: number } | null>(null);
  const followed = (e: ReactPointerEvent) =>
    drag.current?.pointerId === e.pointerId ? drag.current : null;
  const end = (e: ReactPointerEvent) => {
    if (!followed(e)) return;
    drag.current = null;
    onEnd();
  };
  // A control gone mid-drag never hears the lift, and the browser tells the document of the lost capture.
  const abandon = useEffectEvent(() => {
    if (!drag.current) return;
    drag.current = null;
    onAbandon();
  });
  useEffect(() => () => abandon(), []);
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      const box = e.currentTarget.getBoundingClientRect();
      drag.current = { box, pointerId: e.pointerId };
      capturePointer(e.currentTarget, e.pointerId);
      onStart?.(e.clientX, e.clientY, box);
      onMove(e.clientX, e.clientY, box);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const held = followed(e);
      if (held) onMove(e.clientX, e.clientY, held.box);
    },
    // The value lands where the pointer lifted, which can be past its last move.
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const held = followed(e);
      if (held) onMove(e.clientX, e.clientY, held.box);
      end(e);
    },
    onPointerCancel: end,
    // Capture lost with no lift, as under an inert layer, would otherwise leave the drag open for good.
    onLostPointerCapture: end,
  };
}
