import { useRef, useState, type CSSProperties, type DOMAttributes } from "react";

/** How far a sheet or a card must be dragged down before it lets go, px. */
export const DISMISS_PX = 40;
/** How far a finger may wander, any way, and still tap rather than drag. */
const TAP_SLOP_PX = 8;

/**
 * A finger's drag down a sheet by its perforation, or a card by its head: the paper follows the
 * finger down, and let go past DISMISS_PX it closes, leaving from where the drag left it. The
 * pointer is held only once the press moves past the slop, so a tap on a button in a head presses it.
 */
export function useSheetDrag(close: () => void) {
  const press = useRef<{ x: number; y: number; dy: number; moved: boolean } | null>(null);
  // A drag's release is its own; the click the browser sends after it isn't a tap.
  const dragged = useRef(false);
  const [dy, setDy] = useState(0);
  // Where a drag left the paper, so it slides away from there rather than jumping back first.
  const [leaveFrom, setLeaveFrom] = useState(0);
  const handlers: DOMAttributes<HTMLElement> = {
    onPointerDown: (e) => {
      press.current = { x: e.clientX, y: e.clientY, dy: 0, moved: false };
      dragged.current = false;
    },
    onPointerMove: (e) => {
      const held = press.current;
      if (!held) return;
      const x = e.clientX - held.x;
      const y = e.clientY - held.y;
      if (!held.moved && Math.hypot(x, y) > TAP_SLOP_PX) {
        held.moved = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      held.dy = Math.max(0, y);
      setDy(held.dy);
    },
    onPointerUp: () => {
      const held = press.current;
      press.current = null;
      setDy(0);
      // A tap closes on the click that follows it, as a screen reader's activation does.
      if (!held?.moved) return;
      dragged.current = true;
      if (held.dy <= DISMISS_PX) return;
      setLeaveFrom(held.dy);
      close();
    },
    onPointerCancel: () => {
      press.current = null;
      setDy(0);
    },
  };
  const style: CSSProperties = dy
    ? { transform: `translateY(${dy}px)` }
    : { "--leave-from": `${leaveFrom}px` };
  return {
    handlers,
    /** The paper's offset while dragged, else where it leaves from. */
    style,
    /** True once, for the click that follows a drag's release, which isn't a tap. */
    tookClick: () => {
      const was = dragged.current;
      dragged.current = false;
      return was;
    },
    /** A sheet opened again leaves from where it rests. */
    reset: () => setLeaveFrom(0),
  };
}
