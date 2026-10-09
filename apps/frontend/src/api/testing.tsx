import type { Gratitude, Me, Person, RecordGratitude, Tickets } from "@drawing-app/api/client";
import { act, createRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, type ApiClient } from "./apiClient";
import { ApiProvider } from "./ApiProvider";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { MeHolder } from "./MeHolder";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** The board's owner in tests: you. */
export const TEST_OWNER: Person = {
  id: "me",
  handle: "you",
  lineDisplayName: "You",
  linePictureUrl: null,
  nsfwOptIn: false,
};

/** You in tests. */
export const TEST_ME: Me = {
  ...TEST_OWNER,
  lineUserId: "U-you",
  language: "en",
  languageChoice: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  needsHandle: false,
  newStickerCount: 0,
  unseenGratitudeCount: 0,
  kyotoSeikaPractice: false,
  kyotoSeikaDarkSubjects: false,
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

/** A one-hit tap combo's POST /api/gratitude body; `overrides` replace any of its fields. */
export const recordGratitudeBody = (overrides: Partial<RecordGratitude> = {}): RecordGratitude => ({
  idempotencyKey: "0f6c1a52-3d4b-4e8a-9c21-5b7d8e9f0a13",
  giftId: "g1",
  method: "tap",
  hits: 1,
  total: 1,
  peakMult: 1,
  peakTier: 0,
  gameConfigVersion: "test",
  replay: {
    v: 1,
    seed: 1,
    intensity: 0.7,
    stage: [390, 741],
    durationMs: 0,
    endReason: "empty",
    switchedAtHit: null,
    hits: [0, 5000, 5000, 1],
    strokes: [],
    shakes: [],
    strokePasses: [],
  },
  ...overrides,
});

/** The gratitude the server records from a combo, with no Original Artist Gratitude Share. */
export const gratitudeOf = (body: RecordGratitude): Gratitude => ({
  giftId: body.giftId,
  method: body.method,
  hits: body.hits,
  total: body.total,
  peakMult: body.peakMult,
  peakTier: body.peakTier,
  originalArtistGratitudeShare: 0,
  gameConfigVersion: body.gameConfigVersion,
  recordedAt: new Date(0).toISOString(),
  seenByGiverAt: null,
});

/** A method a test didn't give: it fails, saying which. */
const unanswered = (method: string) => () =>
  Promise.reject(
    new ApiError(501, { error: "not_in_test", detail: `This test's client has no ${method}` }),
  );

/**
 * A client with nothing on the board, no gifts, and fresh tickets, that records any gratitude;
 * `overrides` replace any of its methods. Other methods that change something answer only when a
 * test gives them.
 */
export function emptyApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    setLanguageChoice: unanswered("setLanguageChoice"),
    setNsfwOptIn: unanswered("setNsfwOptIn"),
    setKyotoSeikaPractice: unanswered("setKyotoSeikaPractice"),
    stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [] }),
    userStats: unanswered("userStats"),
    suiAddress: unanswered("suiAddress"),
    gratitudeEvents: unanswered("gratitudeEvents"),
    saveStickerPlacement: (stickerId, placement) =>
      Promise.resolve({ stickerId, placement, seenAt: null, arrivedAt: new Date(0).toISOString() }),
    markTraySeen: () => Promise.resolve({ newStickerCount: 0 }),
    seal: unanswered("seal"),
    stickerDetail: (stickerId) =>
      Promise.reject(new ApiError(404, { error: "sticker_not_found", detail: stickerId })),
    timelapse: (stickerId) =>
      Promise.reject(new ApiError(404, { error: "timelapse_not_found", detail: stickerId })),
    markStickerNsfw: unanswered("markStickerNsfw"),
    tickets: () => Promise.resolve(FRESH_TICKETS),
    spendTicket: unanswered("spendTicket"),
    ticketShop: unanswered("ticketShop"),
    startTicketPurchase: unanswered("startTicketPurchase"),
    buyTickets: unanswered("buyTickets"),
    packageGift: unanswered("packageGift"),
    reportDeposit: unanswered("reportDeposit"),
    reportShared: unanswered("reportShared"),
    startTakeOut: unanswered("startTakeOut"),
    takeOutGift: unanswered("takeOutGift"),
    pendingGifts: () => Promise.resolve({ gifts: [] }),
    previewGift: unanswered("previewGift"),
    receiveGift: unanswered("receiveGift"),
    recordGratitude: (body) => Promise.resolve(gratitudeOf(body)),
    unseenGratitude: () => Promise.resolve({ unseen: [] }),
    gratitude: unanswered("gratitude"),
    markGratitudeSeen: unanswered("markGratitudeSeen"),
    explore: unanswered("explore"),
    explorePile: unanswered("explorePile"),
    searchUsers: () => Promise.resolve([]),
    giftsForYou: () => Promise.resolve({ gifts: [] }),
    previewGiftForYou: unanswered("previewGiftForYou"),
    receiveGiftForYou: unanswered("receiveGiftForYou"),
    ...overrides,
  };
}

/** The text `selector`'s first match shows on screen, without what only screen readers hear. */
export function shownText(selector: string): string {
  const shown = document.querySelector(selector)?.cloneNode(true);
  if (!(shown instanceof Element)) throw new Error(`Nothing on screen matches ${selector}`);
  shown.querySelectorAll(".visually-hidden").forEach((hidden) => hidden.remove());
  return shown.textContent;
}

/** Renders `ui` as you, under an ApiProvider, in a fresh host. `unmount` removes both. */
export function renderWithApi(ui: ReactNode, client: ApiClient = emptyApi(), me: Me = TEST_ME) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const replace = createRef<(me: Me) => void>();
  const wrap = (node: ReactNode) => (
    <MeHolder me={me} replace={replace}>
      <ApiProvider client={client}>
        <TicketsProvider>{node}</TicketsProvider>
      </ApiProvider>
    </MeHolder>
  );
  act(() => root.render(wrap(ui)));
  return {
    host,
    root,
    client,
    rerender: (next: ReactNode) => act(() => root.render(wrap(next))),
    /** Replaces you, as a setting saved on the Settings note does. */
    setMe: (next: Me) => act(() => replace.current?.(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
