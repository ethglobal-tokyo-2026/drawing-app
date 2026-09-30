import { useEffect, type RefObject } from "react";

/** How many modal dialogs hold an element inert, and whether it was inert before the first did. */
const holds = new WeakMap<HTMLElement, { count: number; wasInert: boolean }>();

function hold(el: HTMLElement) {
  const entry = holds.get(el) ?? { count: 0, wasInert: el.inert };
  entry.count++;
  holds.set(el, entry);
  el.inert = true;
}

function release(el: HTMLElement) {
  const entry = holds.get(el);
  if (!entry) return;
  if (--entry.count > 0) return;
  holds.delete(el);
  el.inert = entry.wasInert;
}

/** Everything beside the path from `layer` up to the page: the app as it stands behind it. */
function behind(layer: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let node = layer; node !== document.body && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling !== node && sibling instanceof HTMLElement) found.push(sibling);
    }
  }
  return found;
}

interface Options {
  /**
   * What stays live: the dialog itself, unless it sits in a layer with its own scrim, which
   * this is.
   */
  layer?: RefObject<HTMLElement | null>;
  active?: boolean;
}

/**
 * Makes a dialog modal while it's mounted: `aria-modal` on the `role="dialog"` around `inside`, and
 * everything outside its layer inert, so the page behind can't be focused, tapped or read. For a
 * sheet that can't carry `aria-modal` itself.
 */
export function useModalDialog(
  inside: RefObject<HTMLElement | null>,
  { layer, active = true }: Options = {},
) {
  useEffect(() => {
    const dialog = inside.current?.closest<HTMLElement>('[role="dialog"]');
    const kept = layer ? layer.current : dialog;
    if (!active || !dialog || !kept) return;
    dialog.setAttribute("aria-modal", "true");
    const held = behind(kept);
    held.forEach(hold);
    return () => {
      held.forEach(release);
      dialog.removeAttribute("aria-modal");
    };
  }, [inside, layer, active]);
}
