// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTierBackground } from "./tierBackground";

afterEach(() => {
  vi.restoreAllMocks();
});

function setUp() {
  const ground = document.createElement("div");
  const front = document.createElement("div");
  const background = createTierBackground(ground, front, () => false);
  background.setLayout(390, 741, { x: 195, y: 430, height: 220 });
  const find = (root: ParentNode, selector: string) => {
    const el = root.querySelector(selector);
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) throw new Error(selector);
    return el;
  };
  const focus = find(ground, ".gr-focus");
  const rays = find(ground, ".gr-beam-rays");
  /** How many times the focus lines swap between their two drawings over `seconds` of frames. */
  const focusSwaps = (seconds: number) => {
    let swaps = 0;
    let shown = focus.dataset.v;
    for (let i = 0; i < seconds * 60; i++) {
      background.step(1 / 60);
      if (focus.dataset.v !== shown) swaps++;
      shown = focus.dataset.v;
    }
    return swaps;
  };
  /** Whether the focus lines swap between their two drawings over a couple of seconds. */
  const focusFlickers = () => focusSwaps(2) > 0;
  /** Whether 昇天's rays turn over a frame. */
  const raysTurn = () => {
    const before = rays.style.transform;
    background.step(0.5);
    return rays.style.transform !== before;
  };
  return { ground, front, background, find, focusSwaps, focusFlickers, raysTurn };
}

describe("createTierBackground", () => {
  it("swaps the focus lines' drawings no more than three times a second", () => {
    const { background, focusSwaps } = setUp();
    background.show(3, 1, "tap");
    const swaps = focusSwaps(4);
    expect(swaps).toBeGreaterThan(0);
    expect(swaps / 4).toBeLessThanOrEqual(3);
  });

  it("keeps the focus lines flickering after a dent, until everything hides", () => {
    const { background, focusFlickers } = setUp();
    background.show(2, 1, "shake");
    background.dent("left", 300);
    expect(focusFlickers()).toBe(true);
    background.hideAll();
    expect(focusFlickers()).toBe(false);
  });

  it("keeps 昇天's rays turning after a dent, until everything hides", () => {
    const { background, raysTurn } = setUp();
    background.show(4, 1, "shake");
    background.dent("top", 120);
    expect(raysTurn()).toBe(true);
    background.hideAll();
    expect(raysTurn()).toBe(false);
  });

  it("dents the top wall where the heart hit it, and a bare edge on the screen's edge", () => {
    const { background } = setUp();
    const animate = vi.spyOn(Element.prototype, "animate");
    const place = () => {
      const frames = animate.mock.lastCall?.[0];
      const first = Array.isArray(frames) ? frames[0] : undefined;
      return String(first?.transform).split(" scale")[0];
    };
    background.dent("top", 120, 176);
    expect(place()).toBe("translate(120px,176px) rotate(0deg)");
    background.dent("top", 120);
    expect(place()).toBe("translate(120px,0px) rotate(0deg)");
    background.dent("bottom", 80);
    expect(place()).toBe("translate(80px,741px) rotate(180deg)");
    background.dent("left", 300);
    expect(place()).toBe("translate(0px,300px) rotate(-90deg)");
    background.dent("right", 300);
    expect(place()).toBe("translate(390px,300px) rotate(90deg)");
  });

  it("peels the corner where the close button doesn't cover it", () => {
    const { front, find } = setUp();
    const corner = find(front, ".gr-corner");
    expect(corner.style.bottom).toBe("0px");
    expect(corner.style.top).toBe("auto");
  });

  it("writes the speed lines only when their opacity or angle changes enough to see", () => {
    const { ground, background, find } = setUp();
    const field = find(ground, ".gr-speedfield");
    const lines = find(field, "svg");
    const shown = () => [field.style.opacity, lines.style.transform];

    background.setSpeedField(0.5, 30);
    expect(shown()).toEqual(["0.500", "rotate(30.0deg)"]);
    background.setSpeedField(0.51, 30.6);
    expect(shown()).toEqual(["0.500", "rotate(30.0deg)"]);
    background.setSpeedField(0.53, 31.2);
    expect(shown()).toEqual(["0.530", "rotate(31.2deg)"]);
    // Across ±180° the short way round: 0.6° apart, not 359.4°.
    background.setSpeedField(0.53, 179.6);
    background.setSpeedField(0.53, -179.8);
    expect(shown()).toEqual(["0.530", "rotate(179.6deg)"]);
    // Hiding is always written, however small the step.
    background.setSpeedField(0.01, 179.6);
    background.setSpeedField(0, 179.6);
    expect(shown()[0]).toBe("0");
    background.setSpeedField(0.5, 90);
    expect(shown()).toEqual(["0.500", "rotate(90.0deg)"]);
  });
});
