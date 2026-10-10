import { useEffect, type RefObject } from "react";

/**
 * How many modal dialogs hold an element inert, whether its owner wants it inert once they've all
 * gone, and the watch that keeps that wish current: React can set the element's own `inert` while a
 * dialog holds it, as the drawing screen's tab strip does when it tucks away.
 */
const holds = new WeakMap<
  HTMLElement,
  { count: number; wasInert: boolean; watch: MutationObserver }
>();

function hold(el: HTMLElement) {
  let entry = holds.get(el);
  if (!entry) {
    const watch = new MutationObserver(() => {
      const held = holds.get(el);
      if (!held) return;
      // The owner's change is its wish for after; while held, the element stays inert.
      held.wasInert = el.inert;
      if (!el.inert) {
        el.inert = true;
        watch.takeRecords();
      }
    });
    entry = { count: 0, wasInert: el.inert, watch };
    holds.set(el, entry);
    el.inert = true;
    watch.observe(el, { attributes: true, attributeFilter: ["inert"] });
  }
  entry.count++;
}

function release(el: HTMLElement) {
  const entry = holds.get(el);
  if (!entry) return;
  if (--entry.count > 0) return;
  // An owner's change still waiting to be heard is its wish too.
  if (entry.watch.takeRecords().length) entry.wasInert = el.inert;
  entry.watch.disconnect();
  holds.delete(el);
  el.inert = entry.wasInert;
}

/** Everything beside the path from `layer` up to `within`: what stands behind it. */
function behind(layer: HTMLElement, within: HTMLElement = document.body): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let node = layer; node !== within && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling !== node && sibling instanceof HTMLElement) found.push(sibling);
    }
  }
  return found;
}

/**
 * Holds everything beside `layer`, up to `within`, inert, so Tab, taps and screen readers reach only
 * the layer. Returns what lets go, which leaves inert whatever its owner wants inert.
 */
export function holdBehind(layer: HTMLElement, within?: HTMLElement): () => void {
  const held = behind(layer, within);
  held.forEach(hold);
  return () => held.forEach(release);
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
 * everything outside its layer inert, so the page behind can't be focused, tapped or read.
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
    const letGo = holdBehind(kept);
    return () => {
      letGo();
      dialog.removeAttribute("aria-modal");
    };
  }, [inside, layer, active]);
}
