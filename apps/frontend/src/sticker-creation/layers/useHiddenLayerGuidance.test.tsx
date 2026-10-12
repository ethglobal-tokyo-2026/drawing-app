// @vitest-environment happy-dom
import { act, useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testHost } from "./testHost";
import { useHiddenLayerGuidance } from "./useHiddenLayerGuidance";

const { render, findAll } = testHost();
let guidance: ReturnType<typeof useHiddenLayerGuidance>;
function Harness({ current = 1, hidden = true, suppressed = false, generation = 0 }) {
  const value = useHiddenLayerGuidance({ current, hidden, suppressed, generation });
  useLayoutEffect(() => {
    guidance = value;
  });
  return value.phase && <button data-phase={value.phase}>Recovery</button>;
}
const attempt = () => act(() => guidance.onBlocked());
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const phase = () => findAll("button")[0]?.getAttribute("data-phase") ?? null;
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("hidden-layer recovery lifetime", () => {
  it("waits for blocked input and expires after five seconds and its fade", () => {
    render(<Harness />);
    expect(phase()).toBeNull();
    attempt();
    expect(phase()).toBe("visible");
    expect(guidance.announced).toBe(true);
    advance(4999);
    expect(phase()).toBe("visible");
    advance(1);
    expect(phase()).toBe("leaving");
    advance(149);
    expect(phase()).toBe("leaving");
    advance(1);
    expect(phase()).toBeNull();
  });

  it("never extends or reopens from repeat input within the same episode", () => {
    render(<Harness />);
    attempt();
    advance(4000);
    attempt();
    advance(1000);
    expect(phase()).toBe("leaving");
    attempt();
    advance(150);
    attempt();
    expect(phase()).toBeNull();
  });

  it.each(["selection", "visibility", "drawing"])("resets after a change to %s", (change) => {
    render(<Harness />);
    attempt();
    advance(4000);
    render(
      <Harness
        current={change === "selection" ? 2 : 1}
        hidden={change !== "visibility"}
        generation={change === "drawing" ? 1 : 0}
      />,
    );
    expect(phase()).toBeNull();
    if (change === "visibility") {
      attempt();
      expect(phase()).toBeNull();
      render(<Harness />);
    }
    attempt();
    advance(1000);
    expect(phase()).toBe("visible");
    advance(4000);
    expect(phase()).toBe("leaving");
  });

  it("clears for a panel or locked drawing without reopening that episode", () => {
    render(<Harness />);
    attempt();
    expect(phase()).toBe("visible");
    render(<Harness suppressed />);
    expect(phase()).toBeNull();
    attempt();
    render(<Harness />);
    attempt();
    advance(6000);
    expect(phase()).toBeNull();
  });

  it.each(["hover", "focus"] as const)("pauses for %s, then grants at least one second", (kind) => {
    render(<Harness />);
    attempt();
    advance(4700);
    act(() => (kind === "hover" ? guidance.onHover(true) : guidance.onFocus(true)));
    advance(10000);
    expect(phase()).toBe("visible");
    act(() => (kind === "hover" ? guidance.onHover(false) : guidance.onFocus(false)));
    advance(999);
    expect(phase()).toBe("visible");
    advance(1);
    expect(phase()).toBe("leaving");
  });

  it("keeps the remaining time when hover leaves while keyboard focus stays", () => {
    render(<Harness />);
    attempt();
    advance(2000);
    act(() => guidance.onHover(true));
    act(() => guidance.onFocus(true));
    act(() => guidance.onHover(false));
    advance(10000);
    expect(phase()).toBe("visible");
    act(() => guidance.onFocus(false));
    advance(2999);
    expect(phase()).toBe("visible");
    advance(1);
    expect(phase()).toBe("leaving");
  });

  it("cancels a pending fade if a control receives focus", () => {
    render(<Harness />);
    attempt();
    advance(5050);
    act(() => guidance.onFocus(true));
    advance(10000);
    expect(phase()).toBe("visible");
  });

  it("removes without a fade when reduced motion is requested", () => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    Object.defineProperty(query, "matches", { value: true });
    vi.spyOn(window, "matchMedia").mockReturnValue(query);
    render(<Harness />);
    attempt();
    expect(phase()).toBe("visible");
    advance(5000);
    expect(phase()).toBeNull();
    vi.restoreAllMocks();
  });
});
