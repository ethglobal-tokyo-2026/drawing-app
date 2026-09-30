// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi } from "../api/testing";
import type { Step } from "./boardGesture";
import { StickerToolbar } from "./StickerToolbar";

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

const show = (extra: Partial<Parameters<typeof StickerToolbar>[0]> = {}) => {
  const view = renderWithApi(
    <StickerToolbar
      label="No.0133"
      sticker={{ x: 100, y: 200, w: 80, h: 80, r: 0 }}
      board={{ W: 390, H: 657 }}
      knobBelow={false}
      clearOf={null}
      onView={() => {}}
      onEscape={() => {}}
      reduced
      {...extra}
    />,
    emptyApi(),
  );
  unmount = view.unmount;
  return view.host;
};

const buttons = (host: HTMLElement, group: string) => [
  ...host.querySelectorAll<HTMLButtonElement>(`${group} button`),
];

describe("StickerToolbar's Arrange row", () => {
  it("gives every step a named button that takes it once, for those who can't drag", () => {
    const onArrange = vi.fn<(step: Step) => void>();
    const host = show({ onArrange });
    const arrange = buttons(host, '[role="group"]');
    expect(arrange.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Move left",
      "Move right",
      "Move up",
      "Move down",
      "Smaller",
      "Bigger",
      "Turn left",
      "Turn right",
    ]);
    arrange.forEach((b) => act(() => b.click()));
    expect(onArrange.mock.calls.map(([step]) => step)).toEqual([
      "left",
      "right",
      "up",
      "down",
      "smaller",
      "bigger",
      "turnLeft",
      "turnRight",
    ]);
  });

  it("is left off a board that can't be rearranged", () => {
    const host = show();
    expect(host.querySelector('[role="group"]')).toBeNull();
    expect(host.querySelector('[role="toolbar"]')?.textContent).toContain("View");
  });
});
