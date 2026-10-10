// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFocusLoop } from "./useFocusLoop";

/** A screen whose last two controls take no Tab stop: an inert bar and a control stepped aside. */
function Screen({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusLoop(ref, active);
  return (
    <div ref={ref}>
      <button id="first">First</button>
      <button id="last">Last</button>
      <div inert>
        <button>Inert</button>
      </div>
      <button tabIndex={-1}>Stepped aside</button>
    </div>
  );
}

let host: HTMLDivElement;
let root: Root;

const render = (active: boolean) => act(() => root.render(<Screen active={active} />));
const focused = () => document.activeElement?.id;
const tab = (shiftKey = false) =>
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true }),
  );

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("useFocusLoop", () => {
  it("moves focus onto the first control as it activates", () => {
    render(false);
    expect(focused()).not.toBe("first");
    render(true);
    expect(focused()).toBe("first");
  });

  it("wraps Tab past controls that take no stop, both ways, and never leaves focus on the body", () => {
    render(true);
    document.getElementById("last")?.focus();
    tab();
    expect(focused()).toBe("first");
    tab(true);
    expect(focused()).toBe("last");
    document.getElementById("last")?.blur();
    tab();
    expect(focused()).toBe("first");
  });
});
