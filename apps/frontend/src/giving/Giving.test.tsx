// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftSender, GiftSendOutcome } from "./giftSender";
import { deviceGiftStore, giftStatusBySticker } from "./giftStore";
import { Giving } from "./Giving";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let answerPicker: (outcome: GiftSendOutcome) => void;
const onClose = vi.fn();

const sender: GiftSender = {
  send: () =>
    new Promise((resolve) => {
      answerPicker = resolve;
    }),
};

/** Opens Giving for a sticker of its own, so tests don't share gifts. */
const open = (stickerId: string) =>
  act(() =>
    root.render(
      <Giving
        sticker={{ id: stickerId, no: 147, timeUsed: 292, createdAt: Date.now(), url: "blob:x" }}
        fromHandle="alice"
        sender={sender}
        liffId="2011732197-P98cxGpu"
        onClose={onClose}
      />,
    ),
  );

const title = () => document.querySelector(".giving__title")?.textContent;
const tap = (label: string) =>
  act(() => {
    const target = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(label),
    );
    if (!target) throw new Error(`no "${label}" on screen; the title is "${title()}"`);
    target.click();
  });
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const giftOf = (stickerId: string) =>
  giftStatusBySticker(deviceGiftStore().list()).get(stickerId)?.state;

// happy-dom has no font loading; every browser the app runs in does.
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("Giving", () => {
  it("packs the sticker, opens LINE's picker, and seals once it's sent", async () => {
    open("s-sent");
    expect(title()).toBe("Give No.0147");

    tap("Send in a LINE chat");
    expect(title()).toBe("In the bag");
    expect(document.querySelector(".gift-tag__name")?.textContent).toBe("@alice");
    await wait(1150);
    expect(giftOf("s-sent")).toBe("packed");

    await act(async () => answerPicker("sent"));
    await wait(0);
    expect(title()).toBe("Sealed and sent");
    expect(giftOf("s-sent")).toBe("sent");
    await wait(300);
    expect(document.querySelector(".gift-bag")?.getAttribute("data-state")).toBe("sealed");

    tap("Back to my sticker board");
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("shows Not sent yet when the picker is cancelled, and takes the sticker out", async () => {
    open("s-cancelled");
    tap("Send in a LINE chat");
    await wait(1150);
    await act(async () => answerPicker("cancelled"));
    await wait(0);
    expect(title()).toBe("Not sent yet");
    expect(document.querySelector(".gift-bag")?.getAttribute("data-state")).toBe("open");
    expect(giftOf("s-cancelled")).toBe("packed");

    tap("Take it out");
    await wait(400);
    expect(title()).toBe("Give No.0147");
    expect(giftOf("s-cancelled")).toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});
