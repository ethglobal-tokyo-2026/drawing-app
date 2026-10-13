// @vitest-environment happy-dom
import type { GiftPreview, TicketShop, SessionEnvelope } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boardSticker, gift, people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { SEARCH_AFTER_MS } from "../explore/ExploreScreen";
import { keepGift } from "../giving/keptGifts";
import { forgetNoticedHere, newestUnnoticed, noticeReceivesFromNow } from "../giving/noticedGifts";
import { strings } from "../i18n/strings";
import { PULL } from "../receiving/pullTab";
import { forgetBoardComplete } from "../sticker-board/boardComplete";
import { readKeptBoardAgain } from "../sticker-board/lastBoard";
import { onTouchScreen } from "../ui/testing";
import App from "./App";
import { SessionEnvelopeContext } from "../api/sessionContext";

vi.mock("@line/liff", () => ({
  default: {
    isApiAvailable: () => false,
    getContext: () => ({ type: "utou" }),
  },
}));
vi.mock("../line/LineDetails", () => ({ LineDetails: () => null }));
vi.mock("../line/liff", () => ({
  liffMockActive: true,
  useLine: () => ({
    status: "ready",
    profile: { userId: "U-you", displayName: "You" },
    inClient: true,
  }),
}));
// Only the board and Receiving are visited; avoid starting unrelated drawing and payment screens.
vi.mock("../shop/ShopScreen", () => ({ ShopScreen: () => null }));
vi.mock("../tickets/ReserveTicketCheckout", () => ({ ReserveTicketCheckout: () => null }));
// The drawing screen's own tests cover it; here it's only its My board tile, which App answers.
vi.mock("../sticker-creation/DrawingScreen", () => ({
  DrawingScreen: ({ onMyBoardTile }: { onMyBoardTile: () => void }) => (
    <button type="button" className="my-board-tile" onClick={onMyBoardTile} />
  ),
}));
vi.mock("../sticker-board/stat-board/StatBoard", () => ({ StatBoard: () => null }));
vi.mock("./MotionPermissionCard", () => ({ MotionPermissionCard: () => null }));

Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

/** happy-dom has no ResizeObserver; Explore's pile never changes width here. */
class StillResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= StillResizeObserver;

let unmount = () => {};
const ticketShop = (): Promise<TicketShop> =>
  Promise.resolve({
    packs: [],
    payment: {
      network: "testnet",
      coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
      decimals: 6,
      paymentPackage: `0x${"b".repeat(64)}`,
      originalPackage: `0x${"b".repeat(64)}`,
      vault: `0x${"c".repeat(64)}`,
    },
  });
const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const tapTab = (host: HTMLElement, name: "board" | "explore") =>
  act(() => host.querySelector<HTMLElement>(`.tab-${name}`)?.click());

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["Date", "setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  vi.setSystemTime(new Date("2026-09-26T12:00:00.000Z"));
  localStorage.clear();
  forgetNoticedHere();
  readKeptBoardAgain();
  forgetBoardComplete();
  history.replaceState(null, "", "/g/test-claim-token");
});

afterEach(async () => {
  await act(() => vi.dynamicImportSettled());
  unmount();
  history.replaceState(null, "", "/");
  vi.useRealTimers();
  sessionStorage.clear();
});

it("opens the queued recipient gift after reload and keeps its destination until preview succeeds", async () => {
  history.replaceState(null, "", "/");
  const session: SessionEnvelope = {
    me: TEST_ME,
    authenticated: { ...TEST_ME, id: "bigwheel" },
    allowedSelections: [TEST_OWNER],
    selectionVersion: "second",
    expectedPrivySubject: "me",
    expectedSuiAddress: null,
    personSwitchMode: "live",
  };
  noticeReceivesFromNow([]);
  const previous = boardSticker({
    placement: { onBoard: false, x: 0.5, y: 0.5, scale: 0.2, rotation: 0, z: 1 },
    held: false,
    givenTo: { receiver: people.bob, receivedAt: "2026-09-26T11:00:00.000Z" },
  });
  const gifted = sticker();
  const waiting = {
    gift: gift({ id: "gift-42", stickerId: gifted.id }),
    giver: people.mika,
    sticker: gifted,
  };
  sessionStorage.setItem(
    "croquis.person-switch.destination",
    JSON.stringify({ authenticatedUserId: "bigwheel", recipientUserId: "me", giftId: "gift-42" }),
  );
  let previewFinished!: (value: GiftPreview) => void;
  const preview = vi.fn(
    () =>
      new Promise<GiftPreview>((resolve) => {
        previewFinished = resolve;
      }),
  );
  const view = renderWithApi(
    <SessionEnvelopeContext value={session}>
      <App />
    </SessionEnvelopeContext>,
    emptyApi({
      stickerBoard: async () => ({ owner: TEST_OWNER, boardStickers: [previous] }),
      giftsForYou: async () => ({ gifts: [waiting] }),
      previewGiftForYou: preview,
      ticketShop,
    }),
  );
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  await act(() => vi.dynamicImportSettled());
  expect(preview).toHaveBeenCalledWith("gift-42");
  expect(view.host.querySelector(".gift-received-notice")).toBeNull();
  expect(
    newestUnnoticed([
      { stickerId: previous.stickerId, receivedAt: Date.parse("2026-09-26T11:00:00.000Z") },
    ]),
  ).not.toBeNull();
  expect(sessionStorage.getItem("croquis.person-switch.destination")).not.toBeNull();
  await act(async () =>
    previewFinished({
      giver: waiting.giver,
      expiresAt: waiting.gift.expiresAt,
      receivable: true,
      refusal: null,
      sticker: gifted,
    }),
  );
  expect(view.host.querySelector('[role="slider"]')).not.toBeNull();
  expect(view.host.querySelector(".gift-received-notice")).toBeNull();
  expect(sessionStorage.getItem("croquis.person-switch.destination")).toBeNull();
});

it("reports a Gift Message's send the server missed as the app starts", async () => {
  history.replaceState(null, "", "/");
  const attemptId = `0x${"12".repeat(32)}`;
  keepGift(TEST_ME.id, "gift-missed", { message: "sent", attemptId });
  const reportShared = vi.fn(async () => gift({ id: "gift-missed", status: "sent" }));
  const view = renderWithApi(<App />, emptyApi({ reportShared }));
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  expect(reportShared).toHaveBeenCalledWith("gift-missed", attemptId, "sent");
});

it("shows no tab strip over the drawing screen, whose My board tile opens the board as the tab does", async () => {
  history.replaceState(null, "", "/draw");
  const view = renderWithApi(<App />, emptyApi());
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  const tabs = () => view.host.querySelector("nav.tabs");
  expect(tabs()).toBeNull();

  act(() => view.host.querySelector<HTMLElement>(".my-board-tile")?.click());
  await settle();
  expect(tabs()?.querySelector(".tab-board")?.getAttribute("aria-current")).toBe("page");
});

it("refreshes waiting gifts after Not now without reloading the sticker board", async () => {
  const gifted = sticker();
  const waiting = { gift: gift({ stickerId: gifted.id }), giver: people.mika, sticker: gifted };
  let previewFinished = false;
  let finishPreview: (preview: GiftPreview) => void = () => {
    throw new Error("No gift preview is pending");
  };
  const previewGift = vi.fn(() => new Promise<GiftPreview>((resolve) => (finishPreview = resolve)));
  const giftsForYou = vi.fn(async () => ({ gifts: previewFinished ? [waiting] : [] }));
  const stickerBoard = vi.fn(async () => ({ owner: TEST_OWNER, boardStickers: [] }));
  const view = renderWithApi(
    <App />,
    emptyApi({ previewGift, giftsForYou, stickerBoard, ticketShop }),
  );
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  expect(giftsForYou).toHaveBeenCalledTimes(1);
  expect(view.host.querySelector(".gifts-for-you-badge")).toBeNull();

  previewFinished = true;
  await act(async () =>
    finishPreview({
      giver: waiting.giver,
      expiresAt: waiting.gift.expiresAt,
      receivable: true,
      refusal: null,
      sticker: gifted,
    }),
  );
  const slider = view.host.querySelector<HTMLElement>("[role=slider]");
  if (!slider) throw new Error("The gift has no pull tab");
  act(() => void slider.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  await settle(PULL.autoTearMs + 100);
  await settle(1000);
  const notNow = [...view.host.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Not now",
  );
  if (!notNow) throw new Error("The gift has no Not now button");
  act(() => notNow.click());
  await settle();
  expect(giftsForYou).toHaveBeenCalledTimes(2);
  expect(view.host.querySelector(".gifts-for-you-badge")?.textContent).toContain("@mika");
  expect(stickerBoard).toHaveBeenCalledTimes(1);
});

it("keeps Explore's search while another tab shows, asks nothing for it then, and refreshes it on a return", async () => {
  history.replaceState(null, "", "/explore");
  const explore = vi.fn(async () => ({
    pile: { stickers: [], before: null },
    leaderboards: {
      weekStart: new Date().toISOString(),
      mostGratitude: [],
      bestCombo: [],
      longestStreak: [],
    },
  }));
  const searchUsers = vi.fn(async () => [people.mika]);
  const view = renderWithApi(<App />, emptyApi({ explore, searchUsers, ticketShop }));
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  const field = () => view.host.querySelector<HTMLInputElement>('input[type="search"]');
  const search = field();
  if (!search) throw new Error("Explore has no search box");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "mi");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(SEARCH_AFTER_MS);
  expect(searchUsers).toHaveBeenCalledTimes(1);

  tapTab(view.host, "board");
  await settle(SEARCH_AFTER_MS * 10);
  expect(field()).toBe(search);
  expect(explore).toHaveBeenCalledTimes(1);
  expect(searchUsers).toHaveBeenCalledTimes(1);

  tapTab(view.host, "explore");
  // What it last found shows at once, while it asks again behind it.
  expect(field()?.value).toBe("mi");
  expect(view.host.querySelector(".search-results")?.textContent).toContain("@mika");
  await settle();
  expect(explore).toHaveBeenCalledTimes(2);
  expect(searchUsers).toHaveBeenCalledTimes(2);
});

describe("the upright cover", () => {
  /** The app on the board, on a touch screen shaped as `screen` says. */
  const openOn = async (screen: Parameters<typeof onTouchScreen>[0]) => {
    history.replaceState(null, "", "/");
    const switches = onTouchScreen(screen);
    const view = renderWithApi(<App />, emptyApi());
    unmount = view.unmount;
    await act(() => vi.dynamicImportSettled());
    await settle();
    const cover = () => view.host.querySelector(".upright-cover");
    const phone = () => view.host.querySelector(".phone");
    return { switches, cover, phone };
  };

  it("covers a phone on its side, with the app inert under it, until it's turned upright", async () => {
    const { switches, cover, phone } = await openOn({ landscape: true, large: false });
    expect(cover()?.textContent).toBe(strings.app.upright.turn.en);
    expect(phone()?.hasAttribute("inert")).toBe(true);

    act(() => switches.landscape.change(false));
    expect(cover()).toBeNull();
    expect(phone()?.hasAttribute("inert")).toBe(false);
  });

  it.each([
    ["an upright phone", { landscape: false, large: false }],
    ["an iPad on its side, which has the room", { landscape: true, large: true }],
    [
      "an iPad's short, wide window, where turning the iPad wouldn't help",
      { landscape: true, large: false, device: "iPad" },
    ],
  ] as const)("never shows on %s", async (_, screen) => {
    const { cover, phone } = await openOn(screen);
    expect(cover()).toBeNull();
    expect(phone()?.hasAttribute("inert")).toBe(false);
  });
});
