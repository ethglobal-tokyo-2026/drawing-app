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
  /** Whether the focus lines flip between their two drawings over a few frames. */
  const focusFlickers = () => {
    const seen = new Set<string | undefined>();
    for (let i = 0; i < 6; i++) {
      background.step(0.05);
      seen.add(focus.dataset.v);
    }
    return seen.size > 1;
  };
  /** Whether 昇天's rays turn over a frame. */
  const raysTurn = () => {
    const before = rays.style.transform;
    background.step(0.5);
    return rays.style.transform !== before;
  };
  return { ground, front, background, find, focusFlickers, raysTurn };
}

describe("createTierBackground", () => {
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
});
