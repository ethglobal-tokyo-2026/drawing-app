// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { SealingStatusLabel } from "./SealingStatusLabel";

let view: ReturnType<typeof renderWithApi> | undefined;
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const label = () => view?.host.querySelector(".sealing-status") ?? null;
const shown = (part: "line" | "note") =>
  label()?.querySelector(`.sealing-status__${part}`)?.textContent ?? null;
const heard = () => view?.host.querySelector('[role="status"]')?.textContent;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
});

describe("SealingStatusLabel", () => {
  it("sticks on once sealing takes a moment, and says more as the wait goes on", () => {
    view = renderWithApi(<SealingStatusLabel waiting />);
    wait(900);
    expect(label()).toBeNull();
    expect(heard()).toBe("");
    wait(200);
    expect(shown("line")).toBe("Sealing your sticker…");
    expect(shown("note")).toBeNull();
    expect(heard()).toBe("Sealing your sticker…");
    wait(9_000);
    expect(shown("note")).toBe("It can take up to half a minute.");
    expect(label()?.classList.contains("is-restuck")).toBe(true);
    expect(heard()).toBe("Sealing your sticker… It can take up to half a minute.");
    wait(20_000);
    expect(shown("note")).toBe("It’s taking longer than usual.");
  });

  it("never shows for a quick seal", () => {
    view = renderWithApi(<SealingStatusLabel waiting />);
    wait(600);
    view.rerender(<SealingStatusLabel waiting={false} />);
    wait(40_000);
    expect(label()).toBeNull();
  });

  it("peels off when the wait ends, and starts afresh for the next seal", () => {
    view = renderWithApi(<SealingStatusLabel waiting />);
    wait(12_000);
    view.rerender(<SealingStatusLabel waiting={false} />);
    expect(label()?.classList.contains("is-peeling")).toBe(true);
    expect(heard()).toBe("");
    act(() => {
      label()?.dispatchEvent(
        new AnimationEvent("animationend", { animationName: "sealing-status-peel", bubbles: true }),
      );
    });
    expect(label()).toBeNull();

    view.rerender(<SealingStatusLabel waiting />);
    wait(1_100);
    expect(shown("note")).toBeNull();
  });
});
