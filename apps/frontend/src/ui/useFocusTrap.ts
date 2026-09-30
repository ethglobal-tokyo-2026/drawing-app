import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { tabStops, wrapTarget } from "./tabStops";

interface Options {
  active?: boolean;
  onEscape?: () => void;
  /** Where focus goes when it deactivates, when that isn't back where it was. */
  returnFocus?: () => HTMLElement | null;
}

/** The active traps, oldest first. Only the newest hears keys: its dialog is the one on top. */
const traps: object[] = [];

/** Whether a dialog's trap holds keyboard focus, so a screen's own focus loop stands aside. */
export const focusTrapped = () => traps.length > 0;

/**
 * Keeps keyboard focus inside a dialog while it's active: focuses its first control, wraps Tab and
 * Shift+Tab at the ends, calls `onEscape` on Escape, and gives focus back to where it was (or to
 * `returnFocus`'s element) when it deactivates. It hears keys wherever focus is: focus left on the
 * page, as when the control holding it goes, comes back to the dialog before the key is handled.
 * Give the container `tabIndex={-1}` so it can hold focus when it has no controls.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { active = true, onEscape, returnFocus }: Options = {},
) {
  const latest = useRef({ onEscape, returnFocus });
  useLayoutEffect(() => {
    latest.current = { onEscape, returnFocus };
  });

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (tabStops(root)[0] ?? root).focus();
    const trap = {};
    traps.push(trap);

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key !== "Escape" && e.key !== "Tab") || traps.at(-1) !== trap) return;
      if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
      if (e.key === "Escape") {
        latest.current.onEscape?.();
        return;
      }
      const to = wrapTarget(root, document.activeElement, e.shiftKey);
      // With nothing to Tab to, focus stays on the dialog.
      if (to || !tabStops(root).length) e.preventDefault();
      to?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      traps.splice(traps.indexOf(trap), 1);
      (latest.current.returnFocus?.() ?? previous)?.focus({ preventScroll: true });
    };
  }, [active, ref]);
}
