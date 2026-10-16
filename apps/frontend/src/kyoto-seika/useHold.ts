import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** How long a press on a cloud holds before it marks or unmarks its word, in ms. */
export const HOLD_MS = 3000;
/** How far a held press may wander, in px, before it's a slip rather than a hold. */
export const HOLD_SLOP_PX = 10;

/** The handlers `useHold` gives its element. */
export interface HoldHandlers {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onClickCapture: (event: ReactMouseEvent) => void;
  onContextMenu: (event: ReactMouseEvent) => void;
  onKeyDown: () => void;
}

/**
 * Pointer handlers for one element that call `onHold` once a press has stayed on it for `ms`: pen,
 * finger and mouse alike. Release, a cancel, leaving the element or moving past `HOLD_SLOP_PX` lets
 * the press go, and so does `key` changing. A hold that fired swallows the click its release makes.
 */
export function useHold(ms: number, onHold: () => void, key: unknown): HoldHandlers {
  const latest = useRef(onHold);
  useEffect(() => {
    latest.current = onHold;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const fired = useRef(false);

  const letGo = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    press.current = null;
  };

  // A new word under the press, or the element gone, ends the hold.
  useEffect(() => {
    fired.current = false;
    return letGo;
  }, [key]);

  return {
    onPointerDown: (event) => {
      letGo();
      // A click only ever follows its own press, so an earlier hold's swallow ends here.
      fired.current = false;
      if (event.button !== 0) return;
      press.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        latest.current();
      }, ms);
    },
    onPointerMove: (event) => {
      const at = press.current;
      if (!at || event.pointerId !== at.id) return;
      if (Math.hypot(event.clientX - at.x, event.clientY - at.y) > HOLD_SLOP_PX) letGo();
    },
    onPointerUp: letGo,
    onPointerCancel: letGo,
    onPointerLeave: letGo,
    onClickCapture: (event) => {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    // A long press would raise the browser's own menu over the cloud.
    onContextMenu: (event) => {
      if (press.current || fired.current) event.preventDefault();
    },
    // A hold let go off the element makes no click, so the click a key makes isn't the hold's.
    onKeyDown: () => {
      fired.current = false;
    },
  };
}
