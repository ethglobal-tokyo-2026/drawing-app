// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpacitySlider, KEY_STEP } from "./OpacitySlider";
import { testHost } from "./testHost";

const { render, find, press } = testHost();
const onPreview = vi.fn(),
  onCommit = vi.fn(),
  onHold = vi.fn();
const show = (value = 64) =>
  render(<OpacitySlider value={value} onPreview={onPreview} onCommit={onCommit} onHold={onHold} />);
const input = () => find<HTMLInputElement>("input");
const placeRange = () =>
  vi.spyOn(input(), "getBoundingClientRect").mockReturnValue({
    x: 100,
    y: 0,
    left: 100,
    top: 0,
    right: 216,
    bottom: 44,
    width: 116,
    height: 44,
    toJSON() {},
  });
const point = (type: string, clientX = 0) =>
  act(() => {
    input().dispatchEvent(
      new PointerEvent(type, { pointerId: 1, bubbles: true, cancelable: true, clientX }),
    );
  });
const change = (value: number) =>
  act(() => {
    input().value = String(value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
beforeEach(() => {
  vi.clearAllMocks();
  show();
});
afterEach(() => vi.restoreAllMocks());

describe("horizontal layer opacity", () => {
  it("retains opacity on an off-center thumb press and moves from the same grab point", () => {
    placeRange();
    point("pointerdown", 178);
    expect(input().value).toBe("64");
    expect(onPreview).not.toHaveBeenCalled();
    point("pointerup", 178);
    expect(onCommit).not.toHaveBeenCalled();
    point("pointerdown", 178);
    point("pointermove", 154);
    expect(input().value).toBe("40");
    point("pointerup", 154);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(40);
  });
  it("jumps to a pressed track position outside the thumb", () => {
    placeRange();
    point("pointerdown", 138);
    expect(input().value).toBe("30");
    point("pointerup", 138);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(30);
  });
  it("keeps focus while captured pointer travel previews the thumb's full range", () => {
    placeRange();
    point("pointerdown", 172);
    expect(document.activeElement).toBe(input());
    point("pointermove", 128);
    expect(input().value).toBe("20");
    point("pointermove", 90);
    expect(input().value).toBe("0");
    point("pointermove", 230);
    expect(input().value).toBe("100");
    expect(onCommit).not.toHaveBeenCalled();
    point("pointerup", 230);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(100);
  });
  it("restores a pointer preview when focus leaves the slider", () => {
    act(() => input().focus());
    point("pointerdown");
    change(18);
    act(() => input().blur());
    expect(onPreview).toHaveBeenLastCalledWith(64);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input().value).toBe("64");
    expect(onHold).toHaveBeenLastCalledWith(false);
  });
  it("previews while held and commits once on release", () => {
    point("pointerdown");
    change(40);
    change(25);
    expect(onHold).toHaveBeenCalledWith(true);
    expect(onPreview.mock.calls).toEqual([[40], [25]]);
    expect(onCommit).not.toHaveBeenCalled();
    expect(find("output").textContent).toBe("25%");
    point("pointerup");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(25);
    expect(onHold).toHaveBeenLastCalledWith(false);
  });
  it.each(["pointercancel", "lostpointercapture"])("restores the committed value on %s", (type) => {
    placeRange();
    point("pointerdown", 172);
    point("pointermove", 126);
    expect(input().value).toBe("18");
    point(type);
    expect(onPreview).toHaveBeenLastCalledWith(64);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input().value).toBe("64");
    expect(find("output").textContent).toBe("64%");
    expect(onHold).toHaveBeenLastCalledWith(false);
  });
  it("restores a preview and releases the clock when the menu closes", () => {
    point("pointerdown");
    change(18);
    render(<></>);
    expect(onPreview).toHaveBeenLastCalledWith(64);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onHold).toHaveBeenLastCalledWith(false);
  });
  it("commits keyboard steps and endpoints without holding the clock", () => {
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) press(input(), key);
    expect(onCommit.mock.calls).toEqual([[64 + KEY_STEP], [64 - KEY_STEP], [0], [100]]);
    expect(onHold).not.toHaveBeenCalled();
    expect(input().getAttribute("aria-orientation")).toBe("horizontal");
  });
  it("keeps focus while new values arrive and does not commit a no-op", () => {
    act(() => input().focus());
    show(100);
    press(input(), "End");
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe("100");
    expect(onCommit).not.toHaveBeenCalled();
    point("pointerdown");
    point("pointerup");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
