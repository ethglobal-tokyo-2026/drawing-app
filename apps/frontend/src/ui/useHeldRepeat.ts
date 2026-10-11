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
  const generation = useRef(0);
  /** Until when a click is the release of a hold that repeated. */
  const swallowUntil = useRef(0);

  const cancel = (interrupted: boolean) => {
    const swallowRelease = repeated.current || (interrupted && timer.current !== undefined);
    clearTimeout(timer.current);
    timer.current = undefined;
    generation.current++;
    repeated.current = false;
    if (swallowRelease) swallowUntil.current = performance.now() + SWALLOW_MS;
  };
  useEffect(() => {
    const interrupt = () => cancel(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") interrupt();
    };
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancel(true);
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", interrupt);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const repeat = (held: number, press: number) => {
    if (press !== generation.current) return;
    repeated.current = true;
    latest.current();
    if (press !== generation.current) return;
    const next = held < FAST_AFTER_MS ? REPEAT_MS : FAST_REPEAT_MS;
    timer.current = window.setTimeout(() => repeat(held + next, press), next);
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.button !== 0) return;
      cancel(false);
      repeated.current = false;
      swallowUntil.current = 0;
      const press = generation.current;
      timer.current = window.setTimeout(() => repeat(HOLD_DELAY_MS, press), HOLD_DELAY_MS);
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
      if (off) cancel(true);
    },
    onPointerLeave: () => cancel(true),
    onPointerUp: () => cancel(false),
    onPointerCancel: () => cancel(true),
    onLostPointerCapture: () => cancel(true),
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
