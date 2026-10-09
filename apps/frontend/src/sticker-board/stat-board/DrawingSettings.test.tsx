// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { keepDrawingHand, type DrawingHand } from "../../sticker-creation/drawingSettings";
import { refusingStorage } from "../../ui/testing";
import { DrawingSettings } from "./DrawingSettings";

const words = stickerBoard.settings.drawing;
let unmount = () => {};

afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // A refused write holds until the page goes, and the next test would see it.
  keepDrawingHand("right");
  localStorage.clear();
});

/** The Drawing group as Settings shows it. */
function render() {
  const view = renderWithApi(<DrawingSettings />);
  unmount = view.unmount;
  return view.host;
}

/** Picks a drawing hand from the row's list, as the device's own picker does. */
const pick = (host: HTMLElement, hand: DrawingHand) =>
  act(() => {
    const select = host.querySelector("select");
    if (!select) throw new Error("No drawing hand row");
    select.value = hand;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

/** The hand the row shows at its end. */
const shown = (host: HTMLElement) => host.querySelector(".settings-note__picked")?.textContent;

describe("Settings' Drawing group", () => {
  it("keeps the drawing hand on this device for the next visit, and says so", () => {
    const host = render();
    expect(shown(host)).toBe(words.hand.right.en);
    pick(host, "left");
    expect(shown(host)).toBe(words.hand.left.en);
    expect(host.querySelector('[role="status"]')?.textContent).toBe(words.kept.en);
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
