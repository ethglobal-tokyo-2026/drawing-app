import { describe, expect, it } from "vitest";
import { trackSlot } from "./slotTracker";

/** A sealed card whose layout the test moves, and a resize the test fires, as a ResizeObserver would. */
function fakeCard() {
  const layout = { cardTop: 400, slotTop: 18 };
  let resized = () => {};
  const observe = (onResize: () => void) => {
    resized = onResize;
    return () => {};
  };
  const read = () => ({ x: 14, y: layout.cardTop + layout.slotTop, w: 362, h: 208 });
  return {
    observe,
    read,
    /** The card grows upward from its foot by `by` px, and says so once its size has changed. */
    grow: (by: number) => {
      layout.cardTop -= by;
      return () => resized();
    },
  };
}

describe("trackSlot", () => {
  it("measures the slot once, and again once the card has changed size", () => {
    const card = fakeCard();
    const slot = trackSlot(card.read, card.observe);
    const first = slot.box();
    // A second row of stubs grows the card upward; until its size is reported, the measure holds.
    const reportResize = card.grow(31);
    expect(slot.box()).toEqual(first);
    reportResize();
    expect(slot.box()).toEqual({ ...first, y: first.y - 31 });
  });
});
