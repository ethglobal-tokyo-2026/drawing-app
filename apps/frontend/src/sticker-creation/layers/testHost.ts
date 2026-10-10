import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** A fresh element in the document for each test, which `render` fills and the test's end empties. */
export function testHost() {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;
  const live = () => {
    if (!host || !root) throw new Error("testHost is used outside a test");
    return { host, root };
  };
  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    const { root: done } = live();
    act(() => done.unmount());
    host?.remove();
    host = root = null;
  });
  return {
    render: (ui: ReactNode) => act(() => live().root.render(ui)),
    /** The element `selector` finds in what's rendered; throws when there's none. */
    find: <E extends HTMLElement = HTMLElement>(selector: string): E => {
      const found = live().host.querySelector<E>(selector);
      if (!found) throw new Error(`nothing rendered matches ${selector}`);
      return found;
    },
    findAll: (selector: string) => [...live().host.querySelectorAll<HTMLElement>(selector)],
    click: (el: HTMLElement) => act(() => el.click()),
    press: (el: HTMLElement, key: string) =>
      act(() => void el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))),
  };
}
