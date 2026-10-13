// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import {
  keepInputMode,
  keepPenMinimumWidth,
  keepPenPressure,
  penDrew,
  readInputMode,
  readPenMinimumWidth,
  readPenPressure,
} from "../../sticker-creation/drawingSettings";
import { inLanguage, refusingStorage, renderInHost } from "../../ui/testing";
import { DrawingSettings } from "./DrawingSettings";

// Try it draws on a canvas, which happy-dom gives no 2D context.
vi.mock(
  "../../sticker-creation/canvas/context2d",
  () => import("../../sticker-creation/canvas/testContext2d"),
);

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
  keepPenMinimumWidth(20);
  localStorage.clear();
});

/** The Drawing group as Settings shows it, the Pencil rows under the drawing hand. */
function render() {
  const view = renderInHost(<DrawingSettings />);
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

/** Moves the native range as a finger or arrow key does, before it is released. */
function slide(slider: HTMLInputElement, percent: number) {
  act(() => {
    slider.value = String(percent);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function minimumWidth(host: HTMLElement) {
  const slider = host.querySelector<HTMLInputElement>('input[type="range"]');
  if (!slider) throw new Error("No Minimum pen width slider");
  return slider;
}

describe("Settings' Pencil rows", () => {
  it("show once a pen has drawn on this device, starting from Pencil only and Normal", () => {
    const host = render();
    expect(rowNamed(host, words.input.title.en)).toBeUndefined();
    expect(host.querySelector('input[type="range"]')).toBeNull();
    act(() => penDrew());
    expect(picked(row(host, words.input.title.en))).toBe(words.input.pencilOnly.en);
    expect(picked(row(host, words.pressure.title.en))).toBe(words.pressure.normal.en);
    expect(host.querySelector<HTMLInputElement>('input[type="range"]')?.valueAsNumber).toBe(20);
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

  it("applies the minimum percentage while the slider moves and keeps it for the next visit", () => {
    penDrew();
    const host = render();
    slide(minimumWidth(host), 65);
    expect(readPenMinimumWidth()).toBe(65);
    expect(minimumWidth(host).getAttribute("aria-valuetext")).toBe("65%");
    expect(localStorage.getItem("draw.penMinimumWidth")).toBe("65");
    unmount();
    expect(minimumWidth(render()).valueAsNumber).toBe(65);
  });

  it("disables the minimum slider under Off and restores its choice when pressure returns", () => {
    penDrew();
    const host = render();
    slide(minimumWidth(host), 65);
    choose(row(host, words.pressure.title.en), words.pressure.off.en);
    expect(minimumWidth(host).disabled).toBe(true);
    expect(minimumWidth(host).valueAsNumber).toBe(65);
    choose(row(host, words.pressure.title.en), words.pressure.light.en);
    expect(minimumWidth(host).disabled).toBe(false);
    expect(readPenMinimumWidth()).toBe(65);
  });

  it("reports a refused minimum-width save while the chosen value still applies", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    penDrew();
    const host = render();
    slide(minimumWidth(host), 65);
    expect(readPenMinimumWidth()).toBe(65);
    expect(minimumWidth(host).valueAsNumber).toBe(65);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(notKept.en);
  });

  it("gives the minimum slider an associated Japanese label, percentage, and help", async () => {
    await inLanguage("ja");
    penDrew();
    const slider = minimumWidth(render());
    expect(slider.labels?.[0]?.textContent).toBe("ペンの最小幅");
    expect(slider.getAttribute("aria-valuetext")).toBe("20%");
    expect(document.getElementById(slider.getAttribute("aria-describedby") ?? "")).not.toBeNull();
  });
});
