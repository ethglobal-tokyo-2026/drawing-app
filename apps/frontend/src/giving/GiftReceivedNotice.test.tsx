// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { people, sticker } from "../api/testFixtures";
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
          // Noon in Tokyo, whose day the caption prints whatever the phone's zone.
          receivedAt={Date.UTC(2026, 8, 23, 3)}
          onClose={onClose}
        />,
      ),
    );
    const text = (selector: string) => host.querySelector(selector)?.textContent;
    expect(text("h1")?.trim()).toBe("@bob received your sticker");
    expect(host.querySelector("h1 svg")).not.toBeNull();
    expect(text(".gift-received-notice__sub")).toBe("It’s on @bob’s sticker board now.");
    expect(text(".gift-received-notice__caption")).toBe("@bob · 9.23");

    act(() => host.querySelector<HTMLButtonElement>(".label-btn")?.click());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
