import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { SLOP_OUT, SWALLOW_MS } from "./press";

/** A held press waits this long before it repeats, so a tap stays one step. */
export const HOLD_DELAY_MS = 400;
/** How often a held press repeats, until it's been held `FAST_AFTER_MS`… */
const REPEAT_MS = 100;
export const FAST_AFTER_MS = 1500;
/** …and how often after that. */
const FAST_REPEAT_MS = 50;

/**
 * Handlers for a button whose press, held, repeats `act`, faster the longer it's held, as iOS's
 * steppers do. A tap, Enter or Space acts once, on click; a hold that repeated swallows the click its
 * release brings. Sliding off, a mouse leaving or a cancelled pointer stops it.
 */
export function useHeldRepeat(act: () => void) {
  const latest = useRef(act);
  useLayoutEffect(() => {
    latest.current = act;
  });
  const timer = useRef<number | undefined>(undefined);
  const repeated = useRef(false);
  /** Until when a click is the release of a hold that repeated. */
  const swallowUntil = useRef(0);

  const stopRepeating = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  const release = () => {
    stopRepeating();
    if (repeated.current) swallowUntil.current = performance.now() + SWALLOW_MS;
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const repeat = (held: number) => {
    repeated.current = true;
    latest.current();
    const next = held < FAST_AFTER_MS ? REPEAT_MS : FAST_REPEAT_MS;
    timer.current = window.setTimeout(() => repeat(held + next), next);
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.button !== 0) return;
      stopRepeating();
      repeated.current = false;
      swallowUntil.current = 0;
      timer.current = window.setTimeout(() => repeat(HOLD_DELAY_MS), HOLD_DELAY_MS);
    },
    // A finger stays on the tile it pressed until it lifts, so sliding off is measured here.
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (timer.current === undefined) return;
      const r = e.currentTarget.getBoundingClientRect();
      const off =
        e.clientX < r.left - SLOP_OUT ||
        e.clientX > r.right + SLOP_OUT ||
        e.clientY < r.top - SLOP_OUT ||
        e.clientY > r.bottom + SLOP_OUT;
      if (off) stopRepeating();
    },
    onPointerLeave: stopRepeating,
    onPointerUp: release,
    onPointerCancel: release,
    // A hold is the point here, so no long-press menu.
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
    onClick: () => {
      if (performance.now() < swallowUntil.current) {
        swallowUntil.current = 0;
        return;
      }
      latest.current();
    },
  };
}
