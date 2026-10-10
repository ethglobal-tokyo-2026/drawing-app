/** The DOM helpers the sticker tray's engine and its Zipper share. */

/** The window `el` is shown in, where it animates and listens; `what` names `el` when it has none. */
export function windowOf(el: Element, what: string): Window & typeof globalThis {
  const win = el.ownerDocument.defaultView;
  if (!win) throw new Error(`${what} isn't in a document with a window`);
  return win;
}

/** Makes elements in `doc`: a tag, its class, and what goes in it. */
export const elementMaker =
  (doc: Document) =>
  <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    ...kids: (Node | string)[]
  ): HTMLElementTagNameMap[K] => {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    el.append(...kids);
    return el;
  };

/** Timeouts in `win` that `clearAll` clears at once, as a part that's destroyed does. */
export function timeoutsIn(win: Window) {
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const t = win.setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const cancel = (t: number) => {
    win.clearTimeout(t);
    timers.delete(t);
  };
  const clearAll = () => {
    for (const t of timers) win.clearTimeout(t);
    timers.clear();
  };
  return { later, cancel, clearAll };
}
