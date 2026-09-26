// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/mock/fixtures";
import { toPerson, toSticker } from "../api/views";
import { GiftReceivedNotice } from "./GiftReceivedNotice";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
});

describe("GiftReceivedNotice", () => {
  it("says who received the sticker and when, and goes back to the board", () => {
    act(() =>
      root.render(
        <GiftReceivedNotice
          sticker={toSticker(sticker({ number: 147 }))}
          receiver={toPerson(people.bob)}
          // Midday, so the day reads the same in every time zone.
          receivedAt={new Date(2026, 8, 23, 12).getTime()}
          onClose={onClose}
        />,
      ),
    );
    const text = (selector: string) => host.querySelector(selector)?.textContent;
    expect(text("h1")).toBe("@bob received your sticker ♡");
    expect(text(".gift-received-notice__sub")).toBe("It’s on @bob’s sticker board now.");
    expect(text(".gift-received-notice__caption")).toBe("@bob · 9.23");

    act(() => host.querySelector<HTMLButtonElement>(".label-btn")?.click());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
