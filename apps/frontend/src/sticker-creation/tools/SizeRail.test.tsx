// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { sizePx } from "../canvas/brush";
import { SizeRail } from "./SizeRail";

const VALUE = 0.5;
/** CSS px per sheet unit, as on an iPad. */
const SCALE = 2;
let view: ReturnType<typeof renderWithApi>;
const onChange = vi.fn<(value: number) => void>();
const onHold = vi.fn<(holding: boolean) => void>();

/** The rail at `value`, handing its changes and holds to the mocks. */
const railAt = (value: number) => (
  <SizeRail
    value={value}
    eraser={false}
    active={false}
    scale={SCALE}
    onChange={onChange}
    onHold={onHold}
  />
);

const rail = () => {
  const el = view.host.querySelector(".size-rail");
  if (!el) throw new Error("the rail isn't rendered");
  return el;
};
const thumb = () => {
  const el = view.host.querySelector(".size-thumb");
  if (!el) throw new Error("the thumb isn't rendered");
  return el;
};

/** A pointer event of `type` at height `y` on `target`, from the first finger unless `pointerId` says. */
const point = (target: Element, type: string, y: number, pointerId = 1) =>
  act(
    () =>
      void target.dispatchEvent(
        new PointerEvent(type, { pointerId, clientX: 20, clientY: y, bubbles: true }),
      ),
  );

/** A finger on the thumb at `from`, moved through `path` and lifted at the last of them. */
const dragThumb = (from: number, ...path: number[]) => {
  point(thumb(), "pointerdown", from);
  for (const y of path) point(thumb(), "pointermove", y);
  point(thumb(), "pointerup", path.at(-1) ?? from);
};

beforeEach(() => {
  onChange.mockReset();
  onHold.mockReset();
  view = renderWithApi(railAt(VALUE));
  rail().getBoundingClientRect = () => new DOMRect(0, 104, 40, 222);
});

afterEach(() => view.unmount());

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
      view.host.querySelector<HTMLElement>(".size-ghost")?.style.getPropertyValue("--d");
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

  it("sets the size where the finger lifts", () => {
    dragThumb(205, 185);
    const [[movedThere]] = onChange.mock.calls;
    onChange.mockReset();
    point(thumb(), "pointerdown", 205);
    point(thumb(), "pointerup", 185);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(movedThere);
  });

  it("follows only the finger that took hold, whatever another pointer does over it", () => {
    point(thumb(), "pointerdown", 205);
    point(thumb(), "pointermove", 120, 2);
    point(thumb(), "pointerup", 120, 2);
    expect(onHold.mock.calls).toEqual([[true]]);
    point(thumb(), "pointerup", 205);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(VALUE);
  });

  it("lets go of the clock and keeps the size when the browser takes the finger away", () => {
    point(thumb(), "pointerdown", 205);
    point(thumb(), "pointermove", 180);
    point(thumb(), "lostpointercapture", 180);
    expect(onHold.mock.calls).toEqual([[true], [false]]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("lets go of the clock, and sets no size, when it goes mid-drag", () => {
    point(thumb(), "pointerdown", 205);
    point(thumb(), "pointermove", 180);
    view.rerender(null);
    expect(onHold.mock.calls).toEqual([[true], [false]]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("names the sizes at its ends as its least and most", () => {
    const said = (name: string) => rail().getAttribute(name);
    view.rerender(railAt(0));
    expect(said("aria-valuenow")).toBe(said("aria-valuemin"));
    view.rerender(railAt(1));
    expect(said("aria-valuenow")).toBe(said("aria-valuemax"));
  });
});
