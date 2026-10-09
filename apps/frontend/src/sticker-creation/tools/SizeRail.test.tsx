// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sizePx } from "../canvas/brush";
import { SizeRail } from "./SizeRail";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const VALUE = 0.5;
/** CSS px per sheet unit, as on an iPad. */
const SCALE = 2;
let host: HTMLDivElement;
let root: Root;
const onChange = vi.fn<(value: number) => void>();
const onHold = vi.fn<(holding: boolean) => void>();

const rail = () => {
  const el = host.querySelector(".size-rail");
  if (!el) throw new Error("the rail isn't rendered");
  return el;
};

/** A pointer event of `type` at height `y` on `target`. */
const point = (target: Element, type: string, y: number) =>
  act(
    () =>
      void target.dispatchEvent(
        new PointerEvent(type, { pointerId: 1, clientX: 20, clientY: y, bubbles: true }),
      ),
  );

/** A finger on the thumb at `from`, moved through `path` and lifted at the last of them. */
const dragThumb = (from: number, ...path: number[]) => {
  const thumb = host.querySelector(".size-thumb");
  if (!thumb) throw new Error("the thumb isn't rendered");
  point(thumb, "pointerdown", from);
  for (const y of path) point(thumb, "pointermove", y);
  point(thumb, "pointerup", path.at(-1) ?? from);
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onChange.mockReset();
  onHold.mockReset();
  act(() =>
    root.render(
      <SizeRail
        value={VALUE}
        eraser={false}
        active={false}
        scale={SCALE}
        onChange={onChange}
        onHold={onHold}
      />,
    ),
  );
  rail().getBoundingClientRect = () => new DOMRect(0, 104, 40, 222);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("SizeRail", () => {
  it("takes no drag from the rest of its box, so a stroke starting there is left to the sheet", () => {
    point(rail(), "pointerdown", 150);
    point(rail(), "pointermove", 200);
    point(rail(), "pointerup", 200);
    expect(onHold).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("holds the clock while the thumb is dragged, and sets the size once, as it lets go", () => {
    dragThumb(200, 190, 180);
    expect(onHold.mock.calls).toEqual([[true], [false]]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("shows the ghost at the size the brush draws on the sheet as it's shown", () => {
    const ghost = () =>
      host.querySelector<HTMLElement>(".size-ghost")?.style.getPropertyValue("--d");
    expect(ghost()).toBe(`${sizePx(VALUE) * SCALE}px`);
    dragThumb(205, 180);
    const [[dragged]] = onChange.mock.calls;
    expect(ghost()).toBe(`${sizePx(dragged) * SCALE}px`);
  });

  it("moves the thumb with the finger from where it took hold, and never past the ends", () => {
    // Wherever on the thumb the finger lands, the size stays until it moves.
    dragThumb(196);
    dragThumb(213);
    expect(onChange.mock.calls.map(([size]) => size)).toEqual([VALUE, VALUE]);

    onChange.mockReset();
    dragThumb(205, 195);
    dragThumb(205, 215);
    const [up, down] = onChange.mock.calls.map(([size]) => size);
    expect(up).toBeGreaterThan(VALUE);
    expect(down).toBeLessThan(VALUE);

    onChange.mockReset();
    dragThumb(205, -1000);
    dragThumb(205, 1000);
    expect(onChange.mock.calls.map(([size]) => size)).toEqual([1, 0]);
  });
});
