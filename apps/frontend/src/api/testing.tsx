import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, type ApiClient } from "./apiClient";
import { ApiProvider } from "./ApiProvider";
import type { Person, RecordGratitude } from "./contract";
import { gratitudeOf } from "./mock/gratitude";

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
};

/** A one-tap combo's POST /api/gratitude body; `overrides` replace any of its fields. */
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
    endReason: "sent",
    switchedAtHit: null,
    hits: [0, 5000, 5000, 1],
    strokes: [],
    shakes: [],
  },
  ...overrides,
});

const needsServer = () =>
  Promise.reject(
    new ApiError(501, {
      error: "needs_server",
      detail: "Opening a gift needs the app's server, which isn't running yet.",
    }),
  );

/**
 * A client with nothing on the board and no gifts, that records any gratitude; `overrides` replace
 * any of its methods.
 */
export function emptyApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [] }),
    saveStickerPlacement: (stickerId, placement) =>
      Promise.resolve({ stickerId, placement, seenAt: null, arrivedAt: new Date(0).toISOString() }),
    markTraySeen: () => Promise.resolve({ newStickerCount: 0 }),
    stickerDetail: (stickerId) =>
      Promise.reject(new ApiError(404, { error: "sticker_not_found", detail: stickerId })),
    pendingGifts: () => Promise.resolve({ gifts: [] }),
    previewGift: needsServer,
    receiveGift: needsServer,
    recordGratitude: (body) => Promise.resolve({ gratitude: gratitudeOf(body, 0) }),
    ...overrides,
  };
}

/** Renders `ui` under an ApiProvider in a fresh host. `unmount` removes both. */
export function renderWithApi(ui: ReactNode, client: ApiClient = emptyApi()) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<ApiProvider client={client}>{ui}</ApiProvider>));
  return {
    host,
    root,
    client,
    rerender: (next: ReactNode) =>
      act(() => root.render(<ApiProvider client={client}>{next}</ApiProvider>)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
