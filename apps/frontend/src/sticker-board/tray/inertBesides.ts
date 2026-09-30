/**
 * Makes everything in `within` but `keep` inert, so Tab, taps and screen readers reach only `keep`
 * while it's a modal. Returns what undoes it, which takes off only the `inert` it added.
 */
export function inertBesides(keep: HTMLElement, within: HTMLElement): () => void {
  if (!within.contains(keep)) {
    throw new Error("The sticker tray's spread must be inside the board it makes inert around it");
  }
  const added: Element[] = [];
  for (let node: HTMLElement = keep; node !== within; node = node.parentElement ?? within) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling === node || sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      added.push(sibling);
    }
  }
  return () => {
    for (const el of added.splice(0)) el.removeAttribute("inert");
  };
}
