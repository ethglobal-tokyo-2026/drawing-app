// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReducedMotion } from "../../ui/testing";
import {
  CHIP,
  PITCH,
  mountChipList,
  pointer,
  scaleOf,
  shiftOf,
  slotY,
  useFakeClock,
} from "./layerListTesting";
import { MAGNIFY_FAR, MAGNIFY_NEAREST, MAGNIFY_NEXT, usePenMagnify } from "./usePenMagnify";

/** Seven layers, back to front: the column shows layer 7 on top, in slot 0. */
const ORDER = [1, 2, 3, 4, 5, 6, 7];
/** The layer in slot 3, with three chips above it and three below. */
const MIDDLE = 4;
const props = { enabled: true, edge: "left" as "left" | "right" };

beforeEach(() => {
  useFakeClock();
  Object.assign(props, { enabled: true, edge: "left" });
});

const mount = () =>
  mountChipList(
    (list) => usePenMagnify(list, props),
    () => ORDER,
  );

/** A Pencil hovering at height `y`: moving with no button down. */
const hover = (column: ReturnType<typeof mount>, y: number, init: PointerEventInit = {}) =>
  pointer(column.list, "pointermove", { pointerType: "pen", buttons: 0, clientY: y, ...init });

/** Each chip's scale, in the order the column shows them. */
const scales = (column: ReturnType<typeof mount>) =>
  [...ORDER].reverse().map((id) => scaleOf(column.chip(id)));

/** Where each chip's middle shows once its transform is applied, in slot order. */
const centers = (column: ReturnType<typeof mount>) =>
  [...ORDER].reverse().map((id, slot) => slotY(slot) + shiftOf(column.chip(id)));

describe("usePenMagnify", () => {
  it("magnifies the chip under the pen most, and its neighbors less the further they are", () => {
    const column = mount();
    hover(column, slotY(3));
    const [far, next, near, nearest] = [
      scaleOf(column.chip(MIDDLE - 3)),
      scaleOf(column.chip(MIDDLE - 2)),
      scaleOf(column.chip(MIDDLE - 1)),
      scaleOf(column.chip(MIDDLE)),
    ];
    expect(nearest).toBeCloseTo(MAGNIFY_NEAREST);
    // The chips one slot from the pen, on either side, grow alike; so do those two slots away.
    expect(scaleOf(column.chip(MIDDLE + 1))).toBeCloseTo(MAGNIFY_NEXT);
    expect(near).toBeCloseTo(MAGNIFY_NEXT);
    expect(scaleOf(column.chip(MIDDLE + 2))).toBeCloseTo(MAGNIFY_FAR);
    expect(next).toBeCloseTo(MAGNIFY_FAR);
    // Three slots away it is its own size.
    expect(far).toBe(1);
    expect(scaleOf(column.chip(MIDDLE + 3))).toBe(1);
    expect(column.result().hovering).toBe(true);
  });

  it.each(["touch", "mouse"])("is never magnified by a %s", (pointerType) => {
    const column = mount();
    hover(column, slotY(3), { pointerType });
    expect(scales(column)).toEqual(ORDER.map(() => 1));
    expect(column.result().hovering).toBe(false);
  });

  it("magnifies only a pen with no button down: the pen on the glass is a stroke or a tap", () => {
    const column = mount();
    hover(column, slotY(3), { buttons: 1 });
    expect(scales(column)).toEqual(ORDER.map(() => 1));
  });

  it("parts the chips so magnified ones never overlap, and the chip under the pen stays put", () => {
    const column = mount();
    hover(column, slotY(3));
    const grown = scales(column);
    const mids = centers(column);
    expect(mids[3]).toBeCloseTo(slotY(3));
    mids.slice(1).forEach((mid, i) => {
      const above = mids[i] + (grown[i] * CHIP.height) / 2;
      const below = mid - (grown[i + 1] * CHIP.height) / 2;
      // Apart by the gap they have at rest.
      expect(below - above).toBeCloseTo(PITCH - CHIP.height);
    });
  });

  it("moves the chips smoothly as the pen crosses from one chip to the next", () => {
    const column = mount();
    const between = (slotY(3) + slotY(4)) / 2;
    hover(column, between - 0.5);
    const before = centers(column);
    hover(column, between + 0.5);
    const after = centers(column);
    // A pen a pixel further on moves no chip by more than a pixel or so.
    after.forEach((mid, i) => expect(Math.abs(mid - before[i])).toBeLessThan(2));
  });

  it("follows the pen along the column", () => {
    const column = mount();
    hover(column, slotY(1));
    expect(scales(column).indexOf(Math.max(...scales(column)))).toBe(1);
    hover(column, slotY(5));
    expect(scales(column).indexOf(Math.max(...scales(column)))).toBe(5);
  });

  it("freezes the chips while the pen is down, and follows it again once it is up", () => {
    const column = mount();
    hover(column, slotY(3));
    const frozen = scales(column);
    pointer(column.chip(MIDDLE), "pointerdown", {
      pointerType: "pen",
      buttons: 1,
      clientY: slotY(3),
    });
    // Whether or not the browser reports the pen's contact as a button, the chips stay as they were.
    hover(column, slotY(5), { buttons: 1 });
    hover(column, slotY(5));
    expect(scales(column)).toEqual(frozen);
    pointer(column.chip(MIDDLE), "pointerup", {
      pointerType: "pen",
      buttons: 0,
      clientY: slotY(5),
    });
    expect(scales(column)).toEqual(frozen);
    hover(column, slotY(5));
    expect(scales(column)).not.toEqual(frozen);
  });

  it("settles the chips and stops hovering when the pen leaves", () => {
    const column = mount();
    hover(column, slotY(3));
    pointer(column.list, "pointerleave", { pointerType: "pen" });
    expect(scales(column)).toEqual(ORDER.map(() => 1));
    for (const id of ORDER) expect(column.chip(id).style.transform).toBe("");
    expect(column.result().hovering).toBe(false);
  });

  it("is not left by a finger or a mouse leaving the list", () => {
    const column = mount();
    hover(column, slotY(3));
    pointer(column.list, "pointerleave", { pointerType: "mouse" });
    expect(column.result().hovering).toBe(true);
  });

  it("settles the chips when it is disabled while the pen hovers", () => {
    const column = mount();
    hover(column, slotY(3));
    props.enabled = false;
    column.rerender();
    for (const id of ORDER) expect(column.chip(id).style.cssText).toBe("");
    expect(column.result().hovering).toBe(false);
  });

  it("hovers the chip now under the pen after the list has scrolled", () => {
    const column = mount();
    hover(column, slotY(3));
    column.list.scrollTop = PITCH;
    // The pen hasn't moved, but the chip that was in slot 4 is now under it.
    hover(column, slotY(3));
    expect(scales(column).indexOf(Math.max(...scales(column)))).toBe(4);
  });

  it.each([["left"], ["right"]] as const)(
    "grows the chips from the %s edge, toward the sheet",
    (edge) => {
      props.edge = edge;
      const column = mount();
      hover(column, slotY(3));
      expect(column.chip(MIDDLE).style.transformOrigin).toBe(`${edge} center`);
    },
  );

  it.each([
    ["eases the chips toward the pen, and back when it leaves", false, /transform/, /transform/],
    ["moves the chips with no transition under reduced motion", true, /^none$/, /^$/],
  ])("%s", (_name, reducedMotion, following, settling) => {
    vi.spyOn(window, "matchMedia").mockReturnValue(new ReducedMotion(reducedMotion));
    const column = mount();
    hover(column, slotY(3));
    expect(column.chip(MIDDLE).style.transition).toMatch(following);
    pointer(column.list, "pointerleave", { pointerType: "pen" });
    // Reduced motion settles at once, so no transition is left behind to ease it.
    expect(column.chip(MIDDLE).style.transition).toMatch(settling);
  });
});
