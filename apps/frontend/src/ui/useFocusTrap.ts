import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Options {
  active?: boolean;
  onEscape?: () => void;
  /** Where focus goes when it deactivates, when that isn't back where it was. */
  returnFocus?: () => HTMLElement | null;
}

/**
 * Keeps keyboard focus inside a dialog while it's active: focuses its first control, wraps Tab and
 * Shift+Tab at the ends, calls `onEscape` on Escape, and gives focus back to where it was (or to
 * `returnFocus`'s element) when it deactivates. Give the container `tabIndex={-1}` so it can hold
 * focus when it has no controls.
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
    const focusables = () =>
      [...root.querySelectorAll(FOCUSABLE)].filter((el) => el instanceof HTMLElement);
    (focusables()[0] ?? root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        latest.current.onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      (latest.current.returnFocus?.() ?? previous)?.focus({ preventScroll: true });
    };
  }, [active, ref]);
}
