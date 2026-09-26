// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import type { GiftPreview, ReceivedGift, ReceiveRefusal } from "@drawing-app/api/client";
import { people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi } from "../api/testing";
import { toPerson } from "../api/views";
import { PULL } from "./pullTab";
import type { RefusalKind } from "./receiveFlow";
import { refusalScreen } from "./refusals";
import { ReceiveGiftDialog } from "./ReceiveGiftDialog";

// LINE as a 1:1 chat inside LINE's app.
const liff = vi.hoisted(() => ({
  getContext: vi.fn(() => ({ type: "utou" })),
  closeWindow: vi.fn(),
  openWindow: vi.fn(),
}));
vi.mock("@line/liff", () => ({ default: liff }));
vi.mock("../line/liff", () => ({
  useLine: () => ({
    status: "ready",
    profile: { userId: "U1", displayName: "Bob Tanaka" },
    inClient: true,
  }),
}));

// happy-dom has no font loading; every browser the app runs in does.
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

const giver = people.mika;
const gifted = sticker({ number: 147 });
const claim = { giftClaimToken: "t0k3n", liffContextType: "utou" };

const receivable: GiftPreview = {
  giver,
  expiresAt: "2026-09-30T12:00:00.000Z",
  receivable: true,
  refusal: null,
  sticker: gifted,
};

const received: ReceivedGift = {
  gift: {
    id: "gift-1",
    stickerId: gifted.id,
    giverId: giver.id,
    receiverId: "me",
    status: "received",
    escrowStatus: "claimed",
    packedAt: "2026-09-23T12:00:00.000Z",
    expiresAt: "2026-09-30T12:00:00.000Z",
    sentAt: "2026-09-23T12:00:30.000Z",
    takenOutAt: null,
    receivedAt: "2026-09-23T12:02:00.000Z",
    returnedAt: null,
  },
  sticker: { ...gifted, ownerId: "me" },
  stickerPlacement: {
    stickerId: gifted.id,
    placement: null,
    seenAt: null,
    arrivedAt: "2026-09-23T12:02:00.000Z",
  },
};

const onClose = vi.fn();
let unmount = () => {};

const open = (overrides: Partial<ApiClient>) => {
  ({ unmount } = renderWithApi(
    <ReceiveGiftDialog giftClaimToken={claim.giftClaimToken} onClose={onClose} />,
    emptyApi(overrides),
  ));
};
const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const heading = () => document.querySelector("h1")?.textContent;
const button = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === name);
const press = (name: string) =>
  act(() => {
    const target = button(name);
    if (!target) throw new Error(`no "${name}" button; the heading is "${heading()}"`);
    target.click();
  });

/** Opens a receivable gift and unpackages it from the keyboard, up to Accept. */
async function unpackage(receiveGift: ApiClient["receiveGift"]) {
  open({ previewGift: () => Promise.resolve(receivable), receiveGift });
  await settle();
  const slider = document.querySelector<HTMLElement>("[role=slider]");
  if (!slider) throw new Error(`no pull tab; the heading is "${heading()}"`);
  act(() => void slider.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  // The tear, then the reveal it starts once React has run the snap's effects.
  await settle(PULL.autoTearMs + 100);
  await settle(1000);
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  onClose.mockReset();
});

afterEach(() => {
  unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// The REST doc's refusals: a contract with the server.
const REFUSED_IN_THE_PREVIEW: ReceiveRefusal[] = [
  "group_chat",
  "own_gift",
  "already_received",
  "taken_back",
  "gift_returned",
  "gift_expired",
  "not_deposited",
];
const REFUSED_AS_ERRORS: Array<[number, RefusalKind]> = [
  [404, "gift_not_found"],
  [501, "needs_server"],
];

describe("ReceiveGiftDialog", () => {
  it.each(REFUSED_IN_THE_PREVIEW)("says why a %s gift can't be received", async (refusal) => {
    open({
      previewGift: () =>
        Promise.resolve({ ...receivable, receivable: false, refusal, sticker: null }),
    });
    await settle();
    expect(heading()).toBe(refusalScreen(refusal, toPerson(giver)).title);
  });

  it.each(REFUSED_AS_ERRORS)(
    "says why a gift refused %i %s can't be opened",
    async (status, code) => {
      open({ previewGift: () => Promise.reject(new ApiError(status, { error: code })) });
      await settle();
      expect(heading()).toBe(refusalScreen(code, null).title);
    },
  );

  it("unpackages on the slider's End key and brings up Accept", async () => {
    const receiveGift = vi.fn(() => Promise.resolve(received));
    await unpackage(receiveGift);
    expect(document.querySelector("[role=slider]")).toBeNull();
    expect(button("Accept")).toBeDefined();
    expect(receiveGift).not.toHaveBeenCalled();
  });

  it("receives the gift once on Accept and closes with its sticker", async () => {
    const receiveGift = vi.fn(() => Promise.resolve(received));
    await unpackage(receiveGift);
    press("Accept");
    await act(async () => button("Accepting…")?.click());
    await settle();
    await settle(1000);
    expect(receiveGift).toHaveBeenCalledTimes(1);
    expect(receiveGift).toHaveBeenCalledWith(claim);
    expect(onClose).toHaveBeenCalledWith(gifted.id);
  });

  it("says what failed when Accept fails, and Accept tries again", async () => {
    const receiveGift = vi
      .fn<ApiClient["receiveGift"]>()
      .mockRejectedValueOnce(new ApiError(0, { error: "network", detail: "Failed to fetch" }))
      .mockResolvedValueOnce(received);
    await unpackage(receiveGift);
    press("Accept");
    await settle();
    const problem = document.querySelector('[role="alert"]')?.textContent;
    expect(problem).toContain("Failed to fetch");
    expect(problem).toContain("Tap Accept to try again");
    expect(onClose).not.toHaveBeenCalled();

    press("Accept");
    await settle();
    await settle(1000);
    expect(receiveGift).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledWith(gifted.id);
  });

  it("closes on Not now without receiving it", async () => {
    const receiveGift = vi.fn(() => Promise.resolve(received));
    await unpackage(receiveGift);
    press("Not now");
    expect(onClose).toHaveBeenCalledWith();
    expect(receiveGift).not.toHaveBeenCalled();
  });
});
