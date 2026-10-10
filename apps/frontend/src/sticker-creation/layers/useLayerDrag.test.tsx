// @vitest-environment happy-dom
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SWALLOW_MS } from "../../ui/press";
import { ReducedMotion } from "../../ui/testing";
import type { LayerId } from "../canvas/ops";
import {
  PITCH,
  click,
  elapse,
  layOut,
  mountChipList,
  pointer,
  scaleOf,
  shiftOf,
  slotY,
  useFakeClock,
} from "./layerListTesting";
import { LIFT_HOLD_MS, LIFT_SCALE, LIFT_SLOP_PX, useLayerDrag } from "./useLayerDrag";

/** Back to front: the column shows layer 5 on top, in slot 0, and layer 1 at the foot. */
const ORDER = [1, 2, 3, 4, 5];

const props = {
  enabled: true,
  order: ORDER as readonly LayerId[],
  onMove: vi.fn<(id: LayerId, to: number) => void>(),
  onLift: vi.fn<(lifted: boolean) => void>(),
};
const selected: LayerId[] = [];

beforeEach(() => {
  useFakeClock();
  Object.assign(props, { enabled: true, order: ORDER });
  props.onMove.mockReset();
  props.onLift.mockReset();
  selected.length = 0;
});

const mount = () =>
  mountChipList(
    (list) => useLayerDrag(list, props),
    () => props.order,
    (id) => selected.push(id),
  );

/** Presses `id`'s chip, which sits in `slot`, and holds it until it lifts. */
function lift(column: ReturnType<typeof mount>, id: LayerId, slot: number) {
  pointer(column.chip(id), "pointerdown", { clientY: slotY(slot) });
  elapse(LIFT_HOLD_MS);
}

/** Moves the lifted finger to the middle of `slot`. */
const dragTo = (column: ReturnType<typeof mount>, slot: number) =>
  pointer(column.list, "pointermove", { clientY: slotY(slot) });

const pressEscape = () =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

/** Whether a touchmove the browser would scroll with is stopped. */
function touchmoveStopped(list: HTMLElement) {
  const move = new Event("touchmove", { bubbles: true, cancelable: true });
  act(() => {
    list.dispatchEvent(move);
  });
  return move.defaultPrevented;
}

describe("useLayerDrag", () => {
  it("leaves a tap to the chip: no lift, no move, and its click still selects", () => {
    const column = mount();
    pointer(column.chip(4), "pointerdown", { clientY: slotY(1) });
    elapse(LIFT_HOLD_MS - 1);
    pointer(column.chip(4), "pointerup", { clientY: slotY(1) });
    click(column.chip(4));
    // The hold's timer ends with the press, so waiting past it lifts nothing.
    elapse(LIFT_HOLD_MS);
    expect(selected).toEqual([4]);
    expect(props.onLift).not.toHaveBeenCalled();
    expect(props.onMove).not.toHaveBeenCalled();
    expect(column.result().lifted).toBeNull();
  });

  it("lifts a chip held through a wobble, and lets go of one that moves before the hold runs out", () => {
    const column = mount();
    pointer(column.chip(4), "pointerdown", { clientY: slotY(1) });
    pointer(column.chip(4), "pointermove", { clientY: slotY(1) + LIFT_SLOP_PX });
    elapse(LIFT_HOLD_MS);
    expect(column.result().lifted).toBe(4);
    expect(props.onLift).toHaveBeenLastCalledWith(true);
    pointer(column.list, "pointerup", { clientY: slotY(1) });

    // Past the slop it is a scroll of the column: the hook lets go, and its click is the chip's.
    props.onLift.mockReset();
    pointer(column.chip(3), "pointerdown", { clientY: slotY(2) });
    pointer(column.chip(3), "pointermove", { clientY: slotY(2) + LIFT_SLOP_PX + 1 });
    elapse(LIFT_HOLD_MS * 2);
    pointer(column.chip(3), "pointerup", { clientY: slotY(2) + LIFT_SLOP_PX + 1 });
    click(column.chip(3));
    expect(props.onLift).not.toHaveBeenCalled();
    expect(selected).toEqual([3]);
  });

  it("moves the layer once, as it is let go, to the slot the drag ended on", () => {
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 1);
    // It drops where the finger lets go, which is past where it last moved.
    pointer(column.list, "pointerup", { clientY: slotY(2) });
    // From the front to the third slot is from index 4 to index 2, back to front.
    expect(props.onMove).toHaveBeenCalledExactlyOnceWith(5, 2);
    expect(props.onLift.mock.calls).toEqual([[true], [false]]);
    expect(column.result().lifted).toBeNull();
  });

  it("holds the finger's pointer while a chip is lifted, so the drag follows it off the list", () => {
    const column = mount();
    lift(column, 5, 0);
    expect(column.list.hasPointerCapture(1)).toBe(true);
    pointer(column.list, "pointerup", { clientY: slotY(0) });
    expect(column.list.hasPointerCapture(1)).toBe(false);
  });

  it("moves nothing when the chip is let go in its own slot", () => {
    const column = mount();
    lift(column, 3, 2);
    dragTo(column, 1);
    dragTo(column, 2);
    pointer(column.list, "pointerup", { clientY: slotY(2) });
    expect(props.onMove).not.toHaveBeenCalled();
    expect(props.onLift).toHaveBeenLastCalledWith(false);
  });

  it("carries the lifted chip with the finger, and slides the chips it passes apart", () => {
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 2);
    const lifted = column.chip(5);
    expect(scaleOf(lifted)).toBe(LIFT_SCALE);
    expect(shiftOf(lifted)).toBeCloseTo(2 * PITCH);
    // Layers 4 and 3 sat in the slots it crossed: each moves up into the one the chip left.
    expect(shiftOf(column.chip(4))).toBeCloseTo(-PITCH);
    expect(shiftOf(column.chip(3))).toBeCloseTo(-PITCH);
    expect(shiftOf(column.chip(2))).toBe(0);
    expect(shiftOf(column.chip(1))).toBe(0);
    // Back across, they part the other way round.
    dragTo(column, 0);
    expect(shiftOf(column.chip(4))).toBe(0);
    expect(shiftOf(column.chip(3))).toBe(0);
  });

  it("never carries the chip past the first or last slot", () => {
    const column = mount();
    lift(column, 5, 0);
    pointer(column.list, "pointermove", { clientY: slotY(0) - 500 });
    expect(shiftOf(column.chip(5))).toBe(0);
    pointer(column.list, "pointermove", { clientY: slotY(0) + 5000 });
    expect(shiftOf(column.chip(5))).toBeCloseTo((ORDER.length - 1) * PITCH);
    pointer(column.list, "pointerup", { clientY: slotY(0) + 5000 });
    expect(props.onMove).toHaveBeenCalledExactlyOnceWith(5, 0);
  });

  it("puts the chip back on Escape: no move, nothing left on the chips, the clock released", () => {
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 2);
    pressEscape();
    for (const id of ORDER) expect(column.chip(id).style.transform).toBe("");
    expect(props.onLift).toHaveBeenLastCalledWith(false);
    expect(column.result().lifted).toBeNull();
    // The finger lets go later on: that is not a drop.
    pointer(column.list, "pointerup", { clientY: slotY(2) });
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it.each(["pointercancel", "lostpointercapture"])("puts the chip back on %s", (type) => {
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 2);
    pointer(column.list, type);
    for (const id of ORDER) expect(column.chip(id).style.transform).toBe("");
    expect(props.onLift).toHaveBeenLastCalledWith(false);
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it("puts the chip back when it is disabled mid-drag", () => {
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 2);
    props.enabled = false;
    column.rerender();
    for (const id of ORDER) expect(column.chip(id).style.transform).toBe("");
    expect(props.onLift).toHaveBeenLastCalledWith(false);
    expect(column.result().lifted).toBeNull();
    pointer(column.list, "pointerup", { clientY: slotY(2) });
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it("swallows the click a drop's release brings, and only that one", () => {
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 1);
    pointer(column.list, "pointerup", { clientY: slotY(1) });
    click(column.chip(5));
    expect(selected).toEqual([]);

    pointer(column.chip(2), "pointerdown", { clientY: slotY(3) });
    pointer(column.chip(2), "pointerup", { clientY: slotY(3) });
    click(column.chip(2));
    expect(selected).toEqual([2]);
  });

  it("swallows no click that doesn't follow the drop: a later tap, or the next press's", () => {
    const column = mount();
    lift(column, 5, 0);
    pointer(column.list, "pointerup", { clientY: slotY(0) });
    elapse(SWALLOW_MS + 1);
    click(column.chip(5));
    expect(selected).toEqual([5]);

    // A cancelled pointer brings no click, so the next press's click must not be taken for it.
    lift(column, 4, 1);
    pointer(column.list, "pointercancel");
    pointer(column.chip(3), "pointerdown", { clientY: slotY(2) });
    pointer(column.chip(3), "pointerup", { clientY: slotY(2) });
    click(column.chip(3));
    expect(selected).toEqual([5, 3]);
  });

  it("stops the browser scrolling the column while a chip is lifted, and not before or after", () => {
    const column = mount();
    expect(touchmoveStopped(column.list)).toBe(false);
    lift(column, 5, 0);
    expect(touchmoveStopped(column.list)).toBe(true);
    pointer(column.list, "pointerup", { clientY: slotY(0) });
    expect(touchmoveStopped(column.list)).toBe(false);
  });

  it("scrolls the column when the chip is within a slot of its end, faster the nearer it is", () => {
    props.order = [1, 2, 3, 4, 5, 6, 7, 8];
    const column = mount();
    // Four chips show; the rest are scrolled out of sight.
    layOut(column.list, 4 * PITCH);
    const bottom = column.list.getBoundingClientRect().bottom;
    const scrolledIn = (pointerY: number) => {
      column.list.scrollTop = 0;
      lift(column, 8, 0);
      pointer(column.list, "pointermove", { clientY: pointerY });
      elapse(100);
      const scrolled = column.list.scrollTop;
      pointer(column.list, "pointercancel");
      return scrolled;
    };

    const far = scrolledIn(bottom - 3 * PITCH);
    const near = scrolledIn(bottom - PITCH / 2);
    const atEdge = scrolledIn(bottom + 20);
    expect(far).toBe(0);
    expect(near).toBeGreaterThan(0);
    expect(atEdge).toBeGreaterThan(near);
  });

  describe("settling", () => {
    // The column reorders on a move, as it does when the engine answers.
    const reorderOnMove = (column: ReturnType<typeof mount>) =>
      props.onMove.mockImplementation((id, to) => {
        const rest = props.order.filter((other) => other !== id);
        props.order = [...rest.slice(0, to), id, ...rest.slice(to)];
        column.rerender();
      });

    it("clears the others' slides as the column reorders, since the chips now sit where they showed", () => {
      const column = mount();
      reorderOnMove(column);
      lift(column, 5, 0);
      dragTo(column, 2);
      expect(shiftOf(column.chip(4))).toBeCloseTo(-PITCH);
      pointer(column.list, "pointerup", { clientY: slotY(2) });
      expect(props.order).toEqual([1, 2, 5, 3, 4]);
      for (const id of [1, 2, 3, 4]) expect(column.chip(id).style.transform).toBe("");
    });

    it("puts the chips back when the column doesn't reorder", () => {
      const column = mount();
      lift(column, 5, 0);
      dragTo(column, 2);
      pointer(column.list, "pointerup", { clientY: slotY(2) });
      expect(props.onMove).toHaveBeenCalledOnce();
      elapse(1000);
      for (const id of ORDER) expect(column.chip(id).style.cssText).toBe("");
    });

    it("leaves nothing on the chips once they have settled", () => {
      const column = mount();
      reorderOnMove(column);
      lift(column, 5, 0);
      dragTo(column, 2);
      pointer(column.list, "pointerup", { clientY: slotY(2) });
      elapse(1000);
      for (const id of ORDER) expect(column.chip(id).style.cssText).toBe("");
    });
  });

  it.each([
    ["slide", false, /transform/],
    ["don't slide, under reduced motion,", true, /^none$/],
  ])("the chips %s with a transition", (_name, reducedMotion, transition) => {
    vi.spyOn(window, "matchMedia").mockReturnValue(new ReducedMotion(reducedMotion));
    const column = mount();
    lift(column, 5, 0);
    dragTo(column, 1);
    expect(column.chip(4).style.transition).toMatch(transition);
    // Either way the lifted chip itself follows the finger directly.
    expect(column.chip(5).style.transition).toBe("none");
  });
});
