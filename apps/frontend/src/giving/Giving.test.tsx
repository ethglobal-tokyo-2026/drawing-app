// @vitest-environment happy-dom
import type { Gift } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi } from "../api/testing";
import { gift } from "../api/testFixtures";
import type { GiftSender, GiftSendOutcome } from "./giftSender";
import { Giving } from "./Giving";

const liff = vi.hoisted(() => ({ openWindow: vi.fn() }));
vi.mock("@line/liff", () => ({ default: liff }));

let view: ReturnType<typeof renderWithApi>;
/** Where each sticker's gift is on the server. */
let giftStatus: Map<string, Gift["status"]>;
let answerPicker: (outcome: GiftSendOutcome) => void;
/** Per picker opened: whether it was LINE's full picker. */
let fullPickers: boolean[] = [];
const onClose = vi.fn();

const sender: GiftSender = {
  send: (_message, picker) => {
    fullPickers.push(picker?.anyChat === true);
    return new Promise((resolve) => {
      answerPicker = resolve;
    });
  },
};

const token = `0x${"ab".repeat(32)}`;

/** A server that packs one gift per sticker and records what LINE's picker did with it. */
function giftsApi() {
  const byGift = new Map<string, string>();
  const settle = (giftId: string, status: Gift["status"]) => {
    const stickerId = byGift.get(giftId) ?? "";
    giftStatus.set(stickerId, status);
    return Promise.resolve(gift({ id: giftId, stickerId, status }));
  };
  return emptyApi({
    packageGift: (stickerId) => {
      const packed = gift({ stickerId, status: "packed" });
      byGift.set(packed.id, stickerId);
      giftStatus.set(stickerId, "packed");
      return Promise.resolve({ gift: packed, giftClaimToken: token, escrowTransfer: null });
    },
    reportShared: (giftId, outcome) => settle(giftId, outcome === "sent" ? "sent" : "packed"),
    takeOutGift: (giftId) => settle(giftId, "taken_out"),
  });
}

/** Opens Giving for a sticker. */
const open = (stickerId: string) => {
  view = renderWithApi(
    <Giving
      sticker={{ id: stickerId, no: 147, timeUsed: 292, createdAt: Date.now(), url: "blob:x" }}
      fromHandle="alice"
      sender={sender}
      liffId="2011732197-P98cxGpu"
      onClose={onClose}
    />,
    giftsApi(),
  );
};

const title = () => document.querySelector(".giving__title")?.textContent;
/** Taps the button named `label`, or the one whose text includes it. */
const tap = (label: string) =>
  act(() => {
    const target = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === label || b.textContent?.includes(label),
    );
    if (!target) throw new Error(`no "${label}" on screen; the title is "${title()}"`);
    target.click();
  });
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const giftOf = (stickerId: string) => giftStatus.get(stickerId);

// happy-dom has no font loading; every browser the app runs in does.
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

beforeEach(() => {
  vi.useFakeTimers();
  giftStatus = new Map();
  onClose.mockReset();
  liff.openWindow.mockReset();
  fullPickers = [];
});

afterEach(() => {
  view.unmount();
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

  it("shows Not sent yet when the picker is cancelled, and Take it out puts the sticker back", async () => {
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
    expect(giftOf("s-cancelled")).toBe("taken_out");
    expect(title()).toBe("Give No.0147");
    expect(onClose).not.toHaveBeenCalled();
  });

  describe("Can’t find them?", () => {
    it("packs the sticker and opens LINE's full picker from Show all my chats", async () => {
      open("s-any-chat");
      tap("Can’t find them?");
      tap("Show all my chats");
      expect(title()).toBe("In the bag");
      await wait(1150);
      expect(fullPickers).toEqual([true]);
    });

    it("goes back to the give sheet", () => {
      open("s-back");
      tap("Can’t find them?");
      expect(title()).toBe("Can’t find them?");
      tap("Back");
      expect(title()).toBe("Give No.0147");
    });

    it("opens LINE's Add friends outside the app, and stays for when they come back", () => {
      open("s-add-friends");
      tap("Can’t find them?");
      tap("Not friends in LINE yet?");
      expect(liff.openWindow).toHaveBeenCalledExactlyOnceWith({
        url: "https://line.me/R/nv/addFriends",
        external: true,
      });
      expect(title()).toBe("Can’t find them?");
    });
  });
});
