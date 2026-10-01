// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installPress } from "./press";
import { ReducedMotion } from "./testing";

let uninstall: () => void;
let button: HTMLButtonElement;
let clicks: number;

const pointer = (type: string, x: number, y = 30) =>
  button.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      pointerType: "touch",
      clientX: x,
      clientY: y,
      button: 0,
    }),
  );

const key = (type: "keydown" | "keyup", k: string) =>
  button.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));

/** The browser's own click, which only it can mark trusted. */
const trustedClick = (el: Element, x = 0, y = 0) => {
  const e = new MouseEvent("click", { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, "isTrusted", { value: true });
  el.dispatchEvent(e);
};

beforeEach(() => {
  vi.useFakeTimers();
  // These tests cover when the press fires, not how it moves. A never-played animation cancels
  // quietly; happy-dom's playing ones reject `finished` unhandled, which browsers mark as handled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  button = document.createElement("button");
  button.className = "key";
  // The target is a 100 × 60 key at the page's top left.
  button.getBoundingClientRect = () => new DOMRect(0, 0, 100, 60);
  document.body.append(button);
  clicks = 0;
  button.addEventListener("click", () => clicks++);
  uninstall = installPress();
});

afterEach(() => {
  uninstall();
  button.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("press", () => {
  it("fires once, 60ms into the pop, when released inside", () => {
    pointer("pointerdown", 50);
    expect(button.dataset.pressState).toBe("down");
    pointer("pointerup", 50);
    vi.advanceTimersByTime(59);
    expect(clicks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(clicks).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(clicks).toBe(1);
    expect(button.dataset.pressState).toBeUndefined();
  });

  it("swallows the browser's own click on the pressed key, and lets a click elsewhere through", () => {
    const other = document.createElement("button");
    document.body.append(other);
    let otherClicks = 0;
    other.addEventListener("click", () => otherClicks++);
    key("keydown", "Enter");
    key("keyup", "Enter");
    vi.advanceTimersByTime(100);
    expect(clicks).toBe(1);
    trustedClick(other);
    expect(otherClicks).toBe(1);
    trustedClick(button);
    expect(clicks).toBe(1);
    other.remove();
  });

  it("under reduced motion, fires on release and swallows the browser's click on what it put there", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue(new ReducedMotion(true));
    // The key's action covers it, as the give sheet's scrim does.
    const scrim = document.createElement("div");
    let scrimClicks = 0;
    scrim.addEventListener("click", () => scrimClicks++);
    button.addEventListener("click", () => button.replaceWith(scrim));
    pointer("pointerdown", 50);
    pointer("pointerup", 50);
    expect(clicks).toBe(1);
    trustedClick(scrim, 50, 30);
    expect(scrimClicks).toBe(0);
    // A tap of its own on the scrim is real.
    trustedClick(scrim, 50, 30);
    expect(scrimClicks).toBe(1);
    scrim.remove();
  });

  it("fires nothing after the finger slides off", () => {
    pointer("pointerdown", 50);
    pointer("pointermove", 120);
    expect(button.dataset.pressState).toBe("lift");
    pointer("pointerup", 120);
    vi.advanceTimersByTime(1000);
    expect(clicks).toBe(0);
  });

  it("stays pressed inside the slop and presses again when the finger comes back", () => {
    pointer("pointerdown", 50);
    pointer("pointermove", 115); // 15px past the edge: still inside the 16px slop
    expect(button.dataset.pressState).toBe("down");
    pointer("pointermove", 120);
    pointer("pointermove", 112); // back, but not within 10px of the edge: still lifted
    expect(button.dataset.pressState).toBe("lift");
    pointer("pointermove", 108);
    expect(button.dataset.pressState).toBe("down");
    pointer("pointerup", 108);
    vi.advanceTimersByTime(60);
    expect(clicks).toBe(1);
  });

  it("fires nothing when a scroll cancels the touch", () => {
    pointer("pointerdown", 50);
    pointer("pointercancel", 50);
    vi.advanceTimersByTime(1000);
    expect(clicks).toBe(0);
  });

  it("never presses a disabled button", () => {
    button.disabled = true;
    pointer("pointerdown", 50);
    expect(button.dataset.pressState).toBeUndefined();
    pointer("pointerup", 50);
    vi.advanceTimersByTime(1000);
    expect(clicks).toBe(0);
  });

  it("presses on Enter's keydown and fires on its keyup", () => {
    key("keydown", "Enter");
    expect(button.dataset.pressState).toBe("down");
    expect(clicks).toBe(0);
    key("keyup", "Enter");
    vi.advanceTimersByTime(60);
    expect(clicks).toBe(1);
  });

  it("cancels a held Space on Escape, and fires nothing", () => {
    key("keydown", " ");
    key("keydown", "Escape");
    key("keyup", " ");
    vi.advanceTimersByTime(1000);
    expect(clicks).toBe(0);
  });

  it("leaves elements alone after it's uninstalled", () => {
    uninstall();
    pointer("pointerdown", 50);
    expect(button.dataset.pressState).toBeUndefined();
    uninstall = installPress();
  });
});
