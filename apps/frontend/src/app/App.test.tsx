// @vitest-environment happy-dom
import type { GiftPreview } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { gift, people, sticker } from "../api/testFixtures";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { PULL } from "../receiving/pullTab";
import { forgetBoardComplete } from "../sticker-board/boardComplete";
import { readKeptBoardAgain } from "../sticker-board/lastBoard";
import {
  addUnaddedPurchases,
  keepUnaddedPurchase,
  readUnaddedPurchasesAgain,
} from "../tickets/unaddedPurchases";
import App from "./App";

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
vi.mock("../sticker-creation/DrawingScreen", () => ({ DrawingScreen: () => null }));
vi.mock("../sticker-board/stat-board/StatBoard", () => ({ StatBoard: () => null }));
vi.mock("./MotionPermissionCard", () => ({ MotionPermissionCard: () => null }));

Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

let unmount = () => {};
const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["Date", "setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  vi.setSystemTime(new Date("2026-09-26T12:00:00.000Z"));
  localStorage.clear();
  readKeptBoardAgain();
  readUnaddedPurchasesAgain();
  forgetBoardComplete();
  history.replaceState(null, "", "/g/test-claim-token");
});

afterEach(async () => {
  await act(() => vi.dynamicImportSettled());
  unmount();
  history.replaceState(null, "", "/");
  vi.useRealTimers();
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
  const view = renderWithApi(<App />, emptyApi({ previewGift, giftsForYou, stickerBoard }));
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

it("opens a name's link once: a later visit to Explore is plain Explore", async () => {
  history.replaceState(null, "", "/@mika");
  const personByEnsLabel = vi.fn(async () => people.mika);
  const view = renderWithApi(<App />, emptyApi({ personByEnsLabel }));
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  expect(personByEnsLabel).toHaveBeenCalledTimes(1);

  const tab = (name: "board" | "explore") =>
    act(() => view.host.querySelector<HTMLElement>(`.tab-${name}`)?.click());
  tab("board");
  await settle();
  tab("explore");
  await act(() => vi.dynamicImportSettled());
  await settle();
  expect(view.host.querySelector(".explore")).not.toBeNull();
  expect(personByEnsLabel).toHaveBeenCalledTimes(1);
});

/** The App with a paid pack kept on the phone, whose tickets the server answers with `buyTickets`. */
async function renderWithKeptPayment(buyTickets: ApiClient["buyTickets"]) {
  history.replaceState(null, "", "/");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  keepUnaddedPurchase(TEST_ME.id, {
    digest: "D".repeat(44),
    tickets: 3,
    priceYen: 270,
    paidAt: Date.now(),
  });
  const api = emptyApi({ buyTickets });
  const view = renderWithApi(<App />, api);
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await settle();
  const shopTab = () => view.host.querySelector<HTMLElement>(".tab-shop");
  /** What the Shop tab's pip tells screen readers; null when the tab wears none. */
  const pipSaid = () => {
    const note = shopTab()?.getAttribute("aria-describedby");
    const pipShown = shopTab()?.querySelector(".tab-pip") != null;
    return pipShown && note ? document.getElementById(note)?.textContent : null;
  };
  return { api, pipSaid, shopTabName: () => shopTab()?.textContent };
}

it("puts a pip on the Shop tab while a paid pack's tickets wait, until the server adds them", async () => {
  const buyTickets = vi
    .fn<ApiClient["buyTickets"]>()
    .mockRejectedValue(new ApiError(502, { error: "sui_unavailable" }));
  const { api, pipSaid, shopTabName } = await renderWithKeptPayment(buyTickets);
  expect(pipSaid()).toBe("Tickets not added yet");
  // The description sits beside the tab's name, not in it.
  expect(shopTabName()).toBe("Shop");

  buyTickets.mockResolvedValue({ ...FRESH_TICKETS, reserveLeft: 3 });
  await act(() => addUnaddedPurchases(api, TEST_ME.id));
  expect(pipSaid()).toBeNull();
});

it("keeps the Shop tab's pip once the server has refused the payment, and says so", async () => {
  const buyTickets = vi
    .fn<ApiClient["buyTickets"]>()
    .mockRejectedValue(new ApiError(422, { error: "payment_not_found" }));
  const { pipSaid } = await renderWithKeptPayment(buyTickets);
  expect(pipSaid()).toBe("Tickets can’t be added");
});
