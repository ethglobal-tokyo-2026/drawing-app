// @vitest-environment happy-dom
import type { Person } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { people } from "../api/testFixtures";
import { ApiError } from "../api/apiClient";
import { emptyApi, renderWithApi } from "../api/testing";
import { forgetBoardComplete } from "../sticker-board/boardComplete";
import { readKeptBoardAgain } from "../sticker-board/lastBoard";
import { onLargeScreen } from "../ui/testing";
import App from "./App";

vi.mock("@line/liff", () => ({
  default: { isApiAvailable: () => false, getContext: () => ({ type: "utou" }) },
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
vi.mock("../giving/useGiftSender", () => ({ useGiftSender: () => ({}) }));
vi.mock("../shop/ShopScreen", () => ({ ShopScreen: () => null }));
vi.mock("../tickets/ReserveTicketCheckout", () => ({ ReserveTicketCheckout: () => null }));
vi.mock("../sticker-creation/DrawingScreen", () => ({ DrawingScreen: () => null }));
vi.mock("../sticker-board/stat-board/StatBoard", () => ({ StatBoard: () => null }));
vi.mock("./MotionPermissionCard", () => ({ MotionPermissionCard: () => null }));
// Explore has its own tests: here it's a list whose one row opens someone's board.
vi.mock("../explore/ExploreScreen", () => ({
  ExploreScreen: ({ onOpenArtist }: { onOpenArtist: (person: Person) => void }) => (
    <button type="button" className="explore-row" onClick={() => onOpenArtist(people.ken)}>
      Ken
    </button>
  ),
}));

Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });

let unmount = () => {};

beforeEach(() => {
  localStorage.clear();
  readKeptBoardAgain();
  forgetBoardComplete();
  history.replaceState(null, "", "/explore");
});

afterEach(async () => {
  await act(() => vi.dynamicImportSettled());
  unmount();
  history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

const element = (selector: string) => {
  const found = document.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Nothing on screen matches ${selector}`);
  return found;
};

/** Opens App on Explore and Ken's board from his row, focused first. Resolves with the row. */
async function visitKen() {
  const api = emptyApi({
    userStats: () => Promise.reject(new ApiError(503, { error: "unavailable", detail: "test" })),
  });
  const view = renderWithApi(<App />, api);
  unmount = view.unmount;
  await act(() => vi.dynamicImportSettled());
  await act(async () => {});

  const row = element(".explore-row");
  act(() => row.focus());
  act(() => row.click());
  await act(() => vi.dynamicImportSettled());
  await act(async () => {});
  return row;
}

it("makes Explore inert under someone's board, puts focus on it, and gives it back to the row on Back", async () => {
  const row = await visitKen();

  expect(element(".screen-layer").hasAttribute("inert")).toBe(true);
  expect(document.activeElement).toBe(element(".artist-board .board-who"));

  act(() => element(".explore-chip").click());
  expect(element(".screen-layer").hasAttribute("inert")).toBe(false);
  expect(document.querySelector(".artist-board")).toBeNull();
  expect(document.activeElement).toBe(row);
});

it("on a large screen, makes the lit Explore tab the way back from someone's board", async () => {
  onLargeScreen();
  await visitKen();

  const tab = element(".tab-explore");
  expect(tab.getAttribute("aria-label")).toBe("Back to Explore");

  act(() => tab.click());
  expect(document.querySelector(".artist-board")).toBeNull();
  expect(element(".screen-layer").hasAttribute("inert")).toBe(false);
  expect(tab.getAttribute("aria-label")).toBeNull();
});
