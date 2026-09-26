// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardSticker } from "./boardSticker";
import { StickerDetail } from "./StickerDetail";
import { yoursHeld } from "./testBoardSticker";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Midday, so the day reads the same in every time zone. */
const day = (d: number) => new Date(2026, 8, d, 12).getTime();

const sticker = (no: number, createdAt: number): BoardSticker => ({
  id: `s-${no}`,
  no,
  createdAt,
  timeUsed: 292,
  ...yoursHeld,
  width: 120,
  height: 100,
  urls: { png: `blob:${no}` },
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: no },
});
const stickers = [sticker(147, day(20)), sticker(133, day(14)), sticker(117, day(9))];

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();
const onGive = vi.fn();

const open = (props: Partial<ComponentProps<typeof StickerDetail>> = {}) =>
  act(() =>
    root.render(
      <StickerDetail
        stickers={stickers}
        startId="s-133"
        mode="yours"
        handle="alice"
        gifts={new Map()}
        onClose={onClose}
        onGive={onGive}
        {...props}
      />,
    ),
  );

const heading = () => document.querySelector("h2")?.textContent;
const button = (name: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name,
  );
const press = (name: string) =>
  act(() => {
    const target = button(name);
    if (!target) throw new Error(`no "${name}" button; the heading is "${heading()}"`);
    target.click();
  });
const key = (name: string) =>
  act(() => {
    document
      .querySelector('[role="dialog"]')
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
  onGive.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("StickerDetail", () => {
  it("gives the sticker it shows, after paging by the pager, arrow keys and strip", () => {
    open();
    press("Next sticker");
    expect(heading()).toBe("No.0117");
    press("Next sticker");
    expect(heading()).toBe("No.0117");

    key("ArrowLeft");
    key("ArrowLeft");
    expect(heading()).toBe("No.0147");
    press("No.0133");
    press("Give");
    expect(onGive).toHaveBeenCalledExactlyOnceWith(stickers[1]);
  });

  it("says when a given sticker went, and offers no Give", () => {
    const gifts = new Map([
      ["s-133", { giftId: "g-133", state: "sent" as const, packedAt: day(23), sentAt: day(23) }],
    ]);
    open({ mode: "given", gifts });
    expect(document.querySelector(".sticker-detail__meta")?.textContent).toContain("2026.09.23");
    expect(button("Give")).toBeUndefined();
  });

  it("titles LINE's header with the shown sticker, and puts the title back when it closes", () => {
    document.title = "Your sticker board";
    open();
    expect(document.title).toBe("No.0133");
    press("Previous sticker");
    expect(document.title).toBe("No.0147");
    act(() => root.render(null));
    expect(document.title).toBe("Your sticker board");
  });
});
