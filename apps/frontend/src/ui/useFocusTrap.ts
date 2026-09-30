import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { tabStops, wrapTarget } from "./tabStops";

interface Options {
  active?: boolean;
  onEscape?: () => void;
  /** Where focus goes when it deactivates, when that isn't back where it was. */
  returnFocus?: () => HTMLElement | null;
  /** The dialog's view: a new one puts focus on its first control, since the old view's may be gone. */
  refocus?: unknown;
}

/** The active traps, oldest first. Only the newest hears keys: its dialog is the one on top. */
const traps: object[] = [];

/** Whether a dialog's trap holds keyboard focus, so a screen's own focus loop stands aside. */
export const focusTrapped = () => traps.length > 0;

/** Where focus starts in a dialog: the control marked `data-autofocus`, else its first control. */
function startOf(root: HTMLElement): HTMLElement {
  const stops = tabStops(root);
  return stops.find((el) => el.hasAttribute("data-autofocus")) ?? stops[0] ?? root;
}

/**
 * Keeps keyboard focus inside a dialog while it's active: focuses the control marked `data-autofocus`,
 * or else its first control (again whenever `refocus` changes), wraps Tab and Shift+Tab at the ends,
 * calls `onEscape` on Escape, and gives focus back to where it was (or to `returnFocus`'s element)
 * when it deactivates. It hears keys wherever focus is: focus left on the page, as when the control
 * holding it goes, comes back to the dialog before the key is handled. Give the container
 * `tabIndex={-1}` so it can hold focus when it has no controls.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { active = true, onEscape, returnFocus, refocus }: Options = {},
) {
  const latest = useRef({ onEscape, returnFocus });
  useLayoutEffect(() => {
    latest.current = { onEscape, returnFocus };
  });
  // Read at commit, before an effect moves focus or a modal's `inert` on the page drops it.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (active)
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [active]);

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
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
      (latest.current.returnFocus?.() ?? opener.current)?.focus({ preventScroll: true });
    };
  }, [active, ref]);

  // Apart from the trap, so a new `refocus` moves focus again without registering it afresh.
  useEffect(() => {
    const root = ref.current;
    if (active && root) startOf(root).focus();
  }, [active, ref, refocus]);
}
