import type { Me, Person, Tickets } from "@drawing-app/api/client";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, type ApiClient } from "./apiClient";
import { ApiProvider } from "./ApiProvider";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { MeContext } from "./meContext";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** The board's owner in tests: you. */
const TEST_OWNER: Person = {
  id: "me",
  handle: "you",
  lineDisplayName: "You",
  linePictureUrl: null,
};

const TEST_ME: Me = {
  ...TEST_OWNER,
  timeZone: "Asia/Tokyo",
  createdAt: "2026-09-01T00:00:00.000Z",
  needsHandle: false,
  newStickerCount: 0,
  unseenGratitudeCount: 0,
};

/** Three daily tickets, none spent, and no reserve ones. */
export const FRESH_TICKETS: Tickets = {
  ticketDay: "2026-09-26",
  dailyPerDay: 3,
  dailyLeft: 3,
  reserveLeft: 0,
  nextRefillAt: "2026-09-26T15:00:00.000Z",
  usedToday: [],
};

/** A method a test didn't give: it fails, saying which. */
const unanswered = (method: string) => () =>
  Promise.reject(
    new ApiError(501, { error: "not_in_test", detail: `This test's client has no ${method}` }),
  );

/**
 * A client with nothing on the board, no gifts, and fresh tickets; `overrides` replace any of its
 * methods. Methods that change something answer only when a test gives them.
 */
export function emptyApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [] }),
    userStats: unanswered("userStats"),
    saveStickerPlacement: (stickerId, placement) =>
      Promise.resolve({ stickerId, placement, seenAt: null, arrivedAt: new Date(0).toISOString() }),
    markTraySeen: () => Promise.resolve({ newStickerCount: 0 }),
    seal: unanswered("seal"),
    stickerDetail: (stickerId) =>
      Promise.reject(new ApiError(404, { error: "sticker_not_found", detail: stickerId })),
    tickets: () => Promise.resolve(FRESH_TICKETS),
    spendTicket: unanswered("spendTicket"),
    ticketQuote: unanswered("ticketQuote"),
    buyTickets: unanswered("buyTickets"),
    packageGift: unanswered("packageGift"),
    reportDeposit: unanswered("reportDeposit"),
    reportShared: unanswered("reportShared"),
    takeOutGift: unanswered("takeOutGift"),
    pendingGifts: () => Promise.resolve({ gifts: [] }),
    previewGift: unanswered("previewGift"),
    receiveGift: unanswered("receiveGift"),
    recordGratitude: unanswered("recordGratitude"),
    unseenGratitude: () => Promise.resolve({ unseen: [] }),
    gratitude: unanswered("gratitude"),
    markGratitudeSeen: unanswered("markGratitudeSeen"),
    explore: unanswered("explore"),
    searchUsers: () => Promise.resolve([]),
    ...overrides,
  };
}

/** Renders `ui` as you, under an ApiProvider, in a fresh host. `unmount` removes both. */
export function renderWithApi(ui: ReactNode, client: ApiClient = emptyApi(), me: Me = TEST_ME) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const wrap = (node: ReactNode) => (
    <MeContext value={me}>
      <ApiProvider client={client}>
        <TicketsProvider>{node}</TicketsProvider>
      </ApiProvider>
    </MeContext>
  );
  act(() => root.render(wrap(ui)));
  return {
    host,
    root,
    client,
    rerender: (next: ReactNode) => act(() => root.render(wrap(next))),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
