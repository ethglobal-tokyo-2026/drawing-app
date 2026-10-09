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
const { notKept } = stickerBoard.settings.drawing;
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
/** The choices of the row named `label`, if the group shows it. */
const rowNamed = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll<HTMLElement>('[role="radiogroup"]')].find(
    (group) =>
      document.getElementById(group.getAttribute("aria-labelledby") ?? "")?.textContent === label,
  );
function row(host: HTMLElement, label: string) {
  const group = rowNamed(host, label);
  if (!group) throw new Error(`No row named ${label}`);
  return group;
}
const picked = (group: HTMLElement) =>
  group.querySelector('[role="radio"][aria-checked="true"]')?.textContent;
const choose = (group: HTMLElement, name: string) =>
  act(() => {
    const choice = [...group.querySelectorAll<HTMLElement>('[role="radio"]')].find(
      (radio) => radio.textContent === name,
    );
    if (!choice) throw new Error(`No choice ${name}`);
    choice.click();
  });

describe("Settings' Pencil rows", () => {
  it("show once a pen has drawn on this device, starting from Pencil only and Normal", () => {
    const host = render();
    expect(rowNamed(host, words.input.title.en)).toBeUndefined();
    act(() => penDrew());
    expect(picked(row(host, words.input.title.en))).toBe(words.input.pencilOnly.en);
    expect(picked(row(host, words.pressure.title.en))).toBe(words.pressure.normal.en);
  });

  it("keep each choice on this device at once", () => {
    penDrew();
    const host = render();
    choose(row(host, words.input.title.en), words.input.pencilAndFinger.en);
    choose(row(host, words.pressure.title.en), words.pressure.light.en);
    expect([readInputMode(), readPenPressure()]).toEqual(["pencilAndFinger", "light"]);
    expect(picked(row(host, words.pressure.title.en))).toBe(words.pressure.light.en);
  });

  it("say when this device couldn't keep a choice, which still applies until Croquis closes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    penDrew();
    const host = render();
    choose(row(host, words.pressure.title.en), words.pressure.firm.en);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(notKept.en);
    expect(picked(row(host, words.pressure.title.en))).toBe(words.pressure.firm.en);
  });
});
