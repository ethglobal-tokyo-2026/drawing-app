// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { strings } from "../../i18n/strings";
import { ReducedMotion } from "../../ui/testing";
import {
  DOUBLE_TAP_MS,
  HINT_MS,
  KEY_STEP,
  OpacitySlider,
  TAP_SLOP,
  type OpacitySliderProps,
} from "./OpacitySlider";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const VALUE = 64;
const LENGTH = 160;
/** Where a finger lands on the thumb. */
const GRAB = 100;
/** Far enough to carry the thumb past either end of the track. */
const PAST_THE_END = 4 * LENGTH;

const onPreview = vi.fn<(value: number) => void>();
const onCommit = vi.fn<(value: number) => void>();
const onHold = vi.fn<(holding: boolean) => void>();
let host: HTMLDivElement;
let root: Root;
let animate: MockInstance<Element["animate"]>;

const render = (over: Partial<OpacitySliderProps> = {}) =>
  act(() =>
    root.render(
      <OpacitySlider
        value={VALUE}
        length={LENGTH}
        edge="left"
        onPreview={onPreview}
        onCommit={onCommit}
        onHold={onHold}
        nudge={0}
        {...over}
      />,
    ),
  );

const find = (selector: string) => {
  const el = host.querySelector(selector);
  if (!el) throw new Error(`${selector} isn't rendered`);
  return el;
};
const thumb = () => find(".opacity-thumb");
const committed = () => onCommit.mock.calls.map(([value]) => value);
const shownHint = () => host.querySelector(".opacity-hint.is-on")?.textContent;
const announced = () => find('[role="status"]').textContent;

/** A pointer event of `type` at height `y` on `target`. */
const point = (target: Element, type: string, y: number) =>
  act(
    () =>
      void target.dispatchEvent(
        new PointerEvent(type, { pointerId: 1, clientX: 8, clientY: y, bubbles: true }),
      ),
  );

/** A finger on the thumb at `GRAB`, moved through `path` and lifted at the last of them. */
const dragThumb = (...path: number[]) => {
  point(thumb(), "pointerdown", GRAB);
  for (const y of path) point(thumb(), "pointermove", y);
  point(thumb(), "pointerup", path.at(-1) ?? GRAB);
};

/** A tap on the thumb, its finger rocking `rock` px. */
const tap = (rock = 0) => dragThumb(GRAB + rock);

const pressKey = (key: string) =>
  act(
    () =>
      void find('[role="slider"]').dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      ),
  );

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  // happy-dom's Web Animations run on their own clock; a stand-in records the shakes instead.
  animate = vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  onPreview.mockReset();
  onCommit.mockReset();
  onHold.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  render();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OpacitySlider", () => {
  it("takes no finger on its track, so a stroke starting beside the thumb is left to the sheet", () => {
    for (const part of [find(".opacity-track"), find(".opacity-fill"), find('[role="slider"]')]) {
      point(part, "pointerdown", GRAB);
      point(part, "pointermove", GRAB - LENGTH);
      point(part, "pointerup", GRAB - LENGTH);
    }
    expect(onHold).not.toHaveBeenCalled();
    expect(onPreview).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("holds the clock while the thumb is held, and lands exactly on an end it's dragged past, once, on release", () => {
    dragThumb(GRAB - 10, GRAB - LENGTH, GRAB - PAST_THE_END);
    expect(onHold.mock.calls).toEqual([[true], [false]]);
    expect(onPreview.mock.calls.at(-1)).toEqual([100]);
    expect(committed()).toEqual([100]);

    onCommit.mockReset();
    dragThumb(GRAB + 10, GRAB + PAST_THE_END);
    expect(committed()).toEqual([0]);
  });

  it("gives the layer back its opacity, and lets the clock go, when it goes away mid-drag", () => {
    render();
    point(thumb(), "pointerdown", GRAB);
    point(thumb(), "pointermove", GRAB - LENGTH / 4);
    onHold.mockClear();
    act(() => root.render(<></>));
    expect(onPreview).toHaveBeenLastCalledWith(VALUE);
    expect(onHold).toHaveBeenCalledWith(false);
    expect(committed()).toEqual([]);
  });

  it("moves the thumb with the finger from where it took hold, in whole percents", () => {
    dragThumb(GRAB - 20);
    dragThumb(GRAB + 20);
    const [up, down] = committed();
    expect(up).toBeGreaterThan(VALUE);
    expect(down).toBeLessThan(VALUE);
    expect(Number.isInteger(up) && Number.isInteger(down)).toBe(true);
  });

  it("commits nothing for a drag that ends where it started", () => {
    dragThumb(GRAB + 40, GRAB);
    expect(onPreview).toHaveBeenCalled();
    expect(onPreview.mock.calls.at(-1)).toEqual([VALUE]);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("shows the value beside the thumb while it's held", () => {
    const readout = () => find(".opacity-readout").textContent;
    const isHeld = () => find('[role="slider"]').classList.contains("is-held");
    point(thumb(), "pointerdown", GRAB);
    point(thumb(), "pointermove", GRAB - 20);
    const [[previewed]] = onPreview.mock.calls;
    expect(isHeld()).toBe(true);
    expect(readout()).toBe(
      strings.stickerCreation.opacitySlider.value.en.replace("{{value}}", String(previewed)),
    );
    point(thumb(), "pointerup", GRAB - 20);
    expect(isHeld()).toBe(false);
  });

  it("resets to full with a double-tap, though each finger rocks a little", () => {
    tap(TAP_SLOP / 2);
    wait(DOUBLE_TAP_MS - 1);
    tap(TAP_SLOP / 2);
    expect(committed()).toEqual([100]);
    // Each tap takes its rocking preview back before the reset lands.
    expect(onPreview.mock.calls.at(-1)).toEqual([VALUE]);
  });

  it("doesn't reset for two taps further apart than the double-tap time, or for one", () => {
    tap();
    wait(DOUBLE_TAP_MS + 1);
    tap();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("steps by a key, or goes to an end, and commits each", () => {
    const keys: [string, number][] = [
      ["ArrowUp", VALUE + KEY_STEP],
      ["ArrowRight", VALUE + KEY_STEP],
      ["ArrowDown", VALUE - KEY_STEP],
      ["ArrowLeft", VALUE - KEY_STEP],
      ["Home", 0],
      ["End", 100],
    ];
    for (const [key] of keys) pressKey(key);
    expect(committed()).toEqual(keys.map(([, opacity]) => opacity));
  });

  it("commits nothing for a key that wouldn't change the opacity", () => {
    render({ value: 100 });
    pressKey("ArrowUp");
    pressKey("End");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("names itself and reads its value out", () => {
    const slider = find('[role="slider"]');
    expect(slider.getAttribute("aria-label")).toBe(strings.stickerCreation.opacitySlider.label.en);
    expect(slider.getAttribute("aria-orientation")).toBe("vertical");
    expect(slider.getAttribute("aria-valuenow")).toBe(String(VALUE));
    expect(slider.getAttribute("aria-valuetext")).toBe(
      strings.stickerCreation.opacitySlider.value.en.replace("{{value}}", String(VALUE)),
    );
  });

  describe("when a stroke meets the hidden layer", () => {
    const hint = strings.stickerCreation.opacitySlider.hiddenHint.en;

    it("shows no hint until it's nudged, then shakes the thumb and says why for a while", () => {
      expect(shownHint()).toBeUndefined();
      expect(animate).not.toHaveBeenCalled();

      render({ nudge: 1 });
      expect(shownHint()).toBe(hint);
      expect(announced()).toBe(hint);
      expect(animate).toHaveBeenCalledOnce();
      expect(animate.mock.contexts[0]).toBe(thumb());

      wait(HINT_MS);
      expect(shownHint()).toBeUndefined();
      expect(announced()).toBe("");
    });

    it("keeps the hint for the full time after another nudge", () => {
      render({ nudge: 1 });
      wait(HINT_MS - 1);
      render({ nudge: 2 });
      wait(HINT_MS - 1);
      expect(shownHint()).toBe(hint);
    });

    it("still says why under reduced motion, without the shake", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue(new ReducedMotion(true));
      render({ nudge: 1 });
      expect(shownHint()).toBe(hint);
      expect(animate).not.toHaveBeenCalled();
    });
  });
});
