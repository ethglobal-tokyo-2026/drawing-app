const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

const visible = (el: HTMLElement) =>
  typeof el.checkVisibility === "function"
    ? el.checkVisibility({ visibilityProperty: true })
    : getComputedStyle(el).visibility !== "hidden";

/** Where Tab stops inside `root`, in order: nothing inert, hidden or taken out of the order. */
export function tabStops(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && visible(el),
  );
}

/**
 * Where Tab (Shift+Tab, `back`) from `from` must go to stay inside `root`: its first stop (its last,
 * going back) from `root` itself, from outside it, or past its end. Null when the browser's own move
 * stays inside, or when `root` has no stops.
 */
export function wrapTarget(
  root: HTMLElement,
  from: Element | null,
  back: boolean,
): HTMLElement | null {
  const stops = tabStops(root);
  const edge = (back ? stops.at(-1) : stops.at(0)) ?? null;
  if (!edge || !from || from === root || !root.contains(from)) return edge;
  const way = back ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
  return stops.some((stop) => from.compareDocumentPosition(stop) & way) ? null : edge;
}
