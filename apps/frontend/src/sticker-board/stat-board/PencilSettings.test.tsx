// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import {
  keepInputMode,
  keepPenPressure,
  penDrew,
  readInputMode,
  readPenPressure,
} from "../../sticker-creation/drawingSettings";
import { refusingStorage } from "../../ui/testing";
import { DrawingSettings } from "./DrawingSettings";

const words = stickerBoard.settings.pencil;
const { kept, notKept } = stickerBoard.settings.drawing;
let unmount = () => {};
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // A refused value holds until a kept one replaces it, and the next test would see it.
  keepInputMode("pencilOnly");
  keepPenPressure("normal");
  localStorage.clear();
});

/** The Drawing group as Settings shows it, the Pencil rows under the drawing hand. */
function render() {
  const view = renderWithApi(<DrawingSettings />);
  unmount = view.unmount;
  return view.host;
}
/** The select laid over the row named `label`, if the group shows it. */
const rowNamed = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll("select")].find(
    (select) =>
      document.getElementById(select.getAttribute("aria-labelledby") ?? "")?.textContent === label,
  );
function row(host: HTMLElement, label: string) {
  const select = rowNamed(host, label);
  if (!select) throw new Error(`No row named ${label}`);
  return select;
}
const choose = (select: HTMLSelectElement, value: string) =>
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

describe("Settings' Pencil rows", () => {
  it("show once a pen has drawn on this device, starting from Pencil only and Normal", () => {
    const host = render();
    expect(rowNamed(host, words.input.title.en)).toBeUndefined();
    act(() => penDrew());
    expect(row(host, words.input.title.en).value).toBe("pencilOnly");
    expect(row(host, words.pressure.title.en).value).toBe("normal");
  });

  it("keep each choice on this device at once, and the group's status line says so", () => {
    penDrew();
    const host = render();
    choose(row(host, words.input.title.en), "pencilAndFinger");
    choose(row(host, words.pressure.title.en), "light");
    expect([readInputMode(), readPenPressure()]).toEqual(["pencilAndFinger", "light"]);
    expect(host.querySelector('[role="status"]')?.textContent).toBe(kept.en);
  });

  it("say when this device couldn't keep a choice, which still applies until Croquis closes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    penDrew();
    const host = render();
    choose(row(host, words.pressure.title.en), "firm");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(notKept.en);
    expect(row(host, words.pressure.title.en).value).toBe("firm");
  });
});
