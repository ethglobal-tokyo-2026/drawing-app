// @vitest-environment happy-dom
import type { GiftPreview } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { gift, people, sticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_OWNER } from "../api/testing";
import { PULL } from "../receiving/pullTab";
import { forgetBoardComplete } from "../sticker-board/boardComplete";
import { readKeptBoardAgain } from "../sticker-board/lastBoard";
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
