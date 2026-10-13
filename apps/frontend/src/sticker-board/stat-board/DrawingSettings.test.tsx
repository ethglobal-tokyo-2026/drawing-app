// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { keepDrawingHand, type DrawingHand } from "../../sticker-creation/drawingSettings";
import { keepPointerIndicators } from "../../ui/pointerIndicatorsSetting";
import { inLanguage, refusingStorage, renderInHost } from "../../ui/testing";
import { DrawingSettings } from "./DrawingSettings";

const words = stickerBoard.settings.drawing;
let unmount = () => {};

afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // A refused write holds until the page goes, and the next test would see it.
  keepDrawingHand("right");
  keepPointerIndicators(false);
  localStorage.clear();
});

/** The Drawing group as Settings shows it. */
function render() {
  const view = renderInHost(<DrawingSettings />);
  unmount = view.unmount;
  return view.host;
}

/** Taps a drawing hand in the row's choices. */
const pick = (host: HTMLElement, hand: DrawingHand) =>
  act(() => {
    const choice = [...host.querySelectorAll<HTMLElement>('[role="radio"]')].find(
      (radio) => radio.textContent === words.hand[hand].en,
    );
    if (!choice) throw new Error(`No ${hand} hand in the row`);
    choice.click();
  });

/** The hand the row has picked. */
const shown = (host: HTMLElement) =>
  host.querySelector('[role="radio"][aria-checked="true"]')?.textContent;

describe("Settings' Drawing group", () => {
  it("offers pointer and tap indicators before a pen has drawn, off until chosen", () => {
    const host = render();
    const indicator = host.querySelector<HTMLInputElement>('[role="switch"]');
    expect(indicator).not.toBeNull();
    expect(indicator?.checked).toBe(false);
    expect(indicator?.closest("label")?.textContent).toBe("Show pointer and taps");
    act(() => indicator?.click());
    expect(indicator?.checked).toBe(true);
    unmount();
    expect(render().querySelector<HTMLInputElement>('[role="switch"]')?.checked).toBe(true);
  });

  it("says when this device couldn't keep pointer and tap indicators, which still apply", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    const host = render();
    const indicator = host.querySelector<HTMLInputElement>('[role="switch"]');
    act(() => indicator?.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(words.notKept.en);
    expect(indicator?.checked).toBe(true);
  });

  it("names pointer and tap indicators in Japanese", async () => {
    await inLanguage("ja");
    const host = render();
    expect(host.querySelector('[role="switch"]')?.closest("label")?.textContent).toBe(
      "ポインターとタップを表示する",
    );
  });

  it("keeps the drawing hand on this device for the next visit", () => {
    const host = render();
    expect(shown(host)).toBe(words.hand.right.en);
    pick(host, "left");
    expect(shown(host)).toBe(words.hand.left.en);
    expect(host.querySelector('[role="status"]')).toBeNull();
    unmount();
    expect(shown(render())).toBe(words.hand.left.en);
  });

  it("says when this device couldn't keep the drawing hand, which still applies until Croquis closes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    const host = render();
    pick(host, "left");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(words.notKept.en);
    expect(shown(host)).toBe(words.hand.left.en);
  });
});
