import { useEffect, type RefObject } from "react";
import { tabStops, wrapTarget } from "../ui/tabStops";
import { focusTrapped } from "../ui/useFocusTrap";

/**
 * Keeps keyboard focus on `root`'s controls while `active`, for a screen with nothing else on the
 * page: focus moves in as it activates, unless something inside (a dialog) already took it, and Tab
 * and Shift+Tab wrap at the ends instead of falling to the page body. While a dialog's trap holds
 * focus, Tab is the dialog's.
 */
export function useFocusLoop(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    if (!root.contains(document.activeElement))
      tabStops(root).at(0)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented || focusTrapped()) return;
      const to = wrapTarget(root, document.activeElement, e.shiftKey);
      if (!to) return;
      e.preventDefault();
      to.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, ref]);
}
