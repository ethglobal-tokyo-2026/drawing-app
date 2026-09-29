// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import type { GiftPreview, ReceivedGift, ReceiveRefusal } from "@drawing-app/api/client";
import { MARKUP_LIKE_NAME, markupLikePerson, people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, shownText } from "../api/testing";
import { toPerson } from "../api/views";
import { i18next } from "../i18n/i18n";
import { formatDay, formatDuration, formatNo } from "../stickers/format";
import { PULL } from "./pullTab";
import type { RefusalKind } from "./receiveFlow";
import { refusalScreen } from "./refusals";
import { ReceiveGiftDialog, type GiftFrom } from "./ReceiveGiftDialog";

// LINE as a 1:1 chat inside LINE's app, logged in as `profile`: the person opening the gift.
const liff = vi.hoisted(() => ({
  getContext: vi.fn(() => ({ type: "utou" })),
  closeWindow: vi.fn(),
  openWindow: vi.fn(),
}));
const profile = vi.hoisted(() => ({ userId: "U1", displayName: "" }));
vi.mock("@line/liff", () => ({ default: liff }));
vi.mock("../line/liff", () => ({
  useLine: () => ({ status: "ready", profile, inClient: true }),
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

const open = (overrides: Partial<ApiClient>, from: GiftFrom = { giftClaimToken: "t0k3n" }) => {
  ({ unmount } = renderWithApi(
    <ReceiveGiftDialog from={from} onClose={onClose} />,
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
async function unpackage(receiveGift: ApiClient["receiveGift"], preview = receivable) {
  open({ previewGift: () => Promise.resolve(preview), receiveGift });
  await pullTheTab();
}

/** Pulls the open gift's tab from the keyboard, up to Accept. */
async function pullTheTab() {
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
  profile.displayName = "Bob Tanaka";
});

afterEach(() => {
  unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// The API's refusals: a contract with the server.
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

  it("receives a gift waiting for you from the board, without its link", async () => {
    const receiveGiftForYou = vi.fn(() => Promise.resolve(received));
    const waiting = { gift: received.gift, giver, sticker: gifted };
    // The board's list carried the preview: asking the server for one again would fail here.
    open({ receiveGiftForYou }, { gift: waiting });
    await pullTheTab();
    expect(heading()).toBe(`${toPerson(giver).name} sent you a sticker`);
    press("Accept");
    await settle();
    await settle(1000);
    expect(receiveGiftForYou).toHaveBeenCalledWith(received.gift.id);
    expect(onClose).toHaveBeenCalledWith(gifted.id);
    expect(liff.closeWindow).not.toHaveBeenCalled();
  });

  it("closes on Not now without receiving it", async () => {
    const receiveGift = vi.fn(() => Promise.resolve(received));
    await unpackage(receiveGift);
    press("Not now");
    expect(onClose).toHaveBeenCalledWith();
    expect(receiveGift).not.toHaveBeenCalled();
  });

  it("prints LINE names that read as markup as they are, in whole sentences", async () => {
    profile.displayName = MARKUP_LIKE_NAME;
    const drawn = sticker({ artist: markupLikePerson });
    await unpackage(vi.fn(), { ...receivable, giver: markupLikePerson, sticker: drawn });
    expect(shownText(".receive-gift__for")).toBe(`This sticker is for you, ${MARKUP_LIKE_NAME}.`);
    expect(shownText(".receive-gift__fine")).toBe(
      `${formatNo(drawn.number)} · ${formatDuration(drawn.timeUsed)} · ${formatDay(Date.parse(drawn.sealedAt))} · by ${MARKUP_LIKE_NAME}`,
    );
    expect(shownText(".receive-gift__terms")).toBe(
      `Receiving it shows ${MARKUP_LIKE_NAME} your LINE name and picture. You agree to the Terms and Privacy Policy.`,
    );
  });

  it("points the terms line's links at the /ja/ pages in Japanese", async () => {
    await i18next.changeLanguage("ja");
    try {
      await unpackage(vi.fn(() => Promise.resolve(received)));
      const links = [...document.querySelectorAll(".receive-gift__terms a")];
      expect(links.map((a) => a.getAttribute("href"))).toEqual([
        "/ja/terms.html",
        "/ja/privacy.html",
      ]);
    } finally {
      await act(() => i18next.changeLanguage("en"));
    }
  });
});
