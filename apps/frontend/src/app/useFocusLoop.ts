import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

const visible = (el: HTMLElement) =>
  typeof el.checkVisibility === "function"
    ? el.checkVisibility({ visibilityProperty: true })
    : getComputedStyle(el).visibility !== "hidden";

/** Where Tab stops inside `root`, in order: nothing inert, hidden or taken out of the order. */
function tabStops(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && visible(el),
  );
}

/**
 * Keeps keyboard focus on `root`'s controls while `active`, for a screen with nothing else on the
 * page: focus moves in as it activates, unless something inside (a dialog) already took it, and Tab
 * and Shift+Tab wrap at the ends instead of falling to the page body. A dialog's own trap goes first.
 */
export function useFocusLoop(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    if (!root.contains(document.activeElement))
      tabStops(root).at(0)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      const stops = tabStops(root);
      const first = stops.at(0);
      const last = stops.at(-1);
      if (!first || !last) return;
      const at = document.activeElement;
      const outside = !at || !root.contains(at);
      if (outside || at === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, ref]);
}
