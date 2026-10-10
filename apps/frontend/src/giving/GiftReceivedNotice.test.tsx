// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { toPerson, toSticker } from "../api/views";
import { dragBy, onLargeScreen } from "../ui/testing";
import { DISMISS_PX } from "../ui/useSheetDrag";
import { GiftReceivedNotice } from "./GiftReceivedNotice";

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

const showNotice = () =>
  act(() =>
    root.render(
      <GiftReceivedNotice
        sticker={toSticker(sticker({ number: 147 }))}
        receiver={toPerson(people.bob)}
        // Noon in Tokyo, whose day the caption prints whatever the phone's zone.
        receivedAt={Date.UTC(2026, 8, 23, 3)}
        onClose={onClose}
      />,
    ),
  );

describe("GiftReceivedNotice", () => {
  it("says who received the sticker and when, and goes back to the board", () => {
    showNotice();
    const text = (selector: string) => host.querySelector(selector)?.textContent;
    expect(text("h1")?.trim()).toBe("@bob received your sticker");
    expect(host.querySelector("h1 svg")).not.toBeNull();
    expect(text(".gift-received-notice__sub")).toBe("It’s on @bob’s sticker board now.");
    expect(text(".gift-received-notice__caption")).toBe("@bob · 9.23");

    act(() => host.querySelector<HTMLButtonElement>(".label-btn")?.click());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("on an iPad closes from its scrim, and from a swipe down its head past the drag's length", () => {
    onLargeScreen();
    showNotice();
    act(() => host.querySelector<HTMLElement>(".gift-received-notice__scrim")?.click());
    expect(onClose).toHaveBeenCalledOnce();
    const head = host.querySelector(".gift-received-notice__head");
    dragBy(head, [0, DISMISS_PX]);
    expect(onClose).toHaveBeenCalledOnce();
    dragBy(head, [0, DISMISS_PX * 2]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
