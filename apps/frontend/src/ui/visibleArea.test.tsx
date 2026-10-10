// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisibleArea, type VisibleArea } from "./visibleArea";

/** A visual viewport that fills the page until a test moves it, as iOS's does for the keyboard. */
const viewport = () =>
  Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0, scale: 1 });
type Viewport = ReturnType<typeof viewport>;

function Paper({ area }: { area: VisibleArea }) {
  const paper = useRef<HTMLElement>(null);
  useVisibleArea(paper, area);
  return (
    <main ref={paper}>
      <form>
        <input aria-label="Handle" />
      </form>
    </main>
  );
}

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

function show(area: Viewport) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<Paper area={area} />));
  unmount = () => {
    act(() => root.unmount());
    host.remove();
  };
  const paper = host.querySelector("main");
  return {
    hidden: () => ({
      top: paper?.style.getPropertyValue("--hidden-top"),
      bottom: paper?.style.getPropertyValue("--hidden-bottom"),
    }),
    input: host.querySelector("input"),
    form: host.querySelector("form"),
  };
}

const move = (area: Viewport, to: Partial<Viewport>, type = "resize") =>
  act(() => {
    Object.assign(area, to);
    area.dispatchEvent(new Event(type));
  });

describe("useVisibleArea", () => {
  it("pads by what the keyboard hides, above and below, and by nothing while zoomed", () => {
    const area = viewport();
    const { hidden } = show(area);
    expect(hidden()).toEqual({ top: "0px", bottom: "0px" });
    const keyboard = Math.round(innerHeight / 2);
    move(area, { height: innerHeight - keyboard });
    expect(hidden()).toEqual({ top: "0px", bottom: `${keyboard}px` });
    // iOS slid the page up to show a field: the slide is hidden above, the rest of the keyboard below.
    const slide = Math.round(keyboard / 2);
    move(area, { offsetTop: slide }, "scroll");
    expect(hidden()).toEqual({ top: `${slide}px`, bottom: `${keyboard - slide}px` });
    move(area, { scale: 2 });
    expect(hidden()).toEqual({ top: "0px", bottom: "0px" });
  });

  it("brings the focused field's form into view as the keyboard comes up", () => {
    const area = viewport();
    const { input, form } = show(area);
    const shown = vi.spyOn(Element.prototype, "scrollIntoView");
    act(() => input?.focus());
    move(area, { height: innerHeight / 2 });
    expect(shown.mock.contexts).toEqual([form]);
  });
});
