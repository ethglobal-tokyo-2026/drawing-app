// @vitest-environment happy-dom
import type { TicketShop } from "@drawing-app/api/client";
import { act, useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi } from "../api/testing";
import type { Query } from "../api/useApiQuery";
import {
  preloadReservePacks,
  RESERVE_PACKS_FRESH_MS,
  useReservePacks,
  useShownReservePacks,
} from "./reservePacks";

const SHOP: TicketShop = {
  packs: [{ tickets: 1, priceYen: 100, discountPercent: 0, priceJpyc: "100000000" }],
  payment: {
    network: "testnet",
    coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
    decimals: 6,
    paymentPackage: `0x${"b".repeat(64)}`,
    vault: `0x${"c".repeat(64)}`,
  },
};

const seen: { query: Query<TicketShop> } = { query: { state: "loading" } };
const reader = (usePacks: () => Query<TicketShop>) =>
  function Reader() {
    const query = usePacks();
    useLayoutEffect(() => {
      seen.query = query;
    });
    return null;
  };
const Shop = reader(useShownReservePacks);
const Checkout = reader(useReservePacks);

/** A client of its own, since the kept packs are kept per client, with the packs loaded ahead. */
async function loadedAhead() {
  const ticketShop = vi.fn(() => Promise.resolve(SHOP));
  const api = emptyApi({ ticketShop });
  preloadReservePacks(api);
  await act(() => Promise.resolve());
  return { api, ticketShop };
}

let unmount = () => {};
beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => {
  unmount();
  vi.useRealTimers();
});

describe("reserve packs", () => {
  it("the Shop shows packs loaded ahead at once, asks for nothing while they're fresh, and loads again once they're stale", async () => {
    const { api, ticketShop } = await loadedAhead();
    preloadReservePacks(api);
    ({ unmount } = renderWithApi(<Shop />, api));
    expect(seen.query).toMatchObject({ state: "ready", data: SHOP });
    expect(ticketShop).toHaveBeenCalledTimes(1);
    unmount();
    vi.setSystemTime(Date.now() + RESERVE_PACKS_FRESH_MS);
    ({ unmount } = renderWithApi(<Shop />, api));
    expect(seen.query).toMatchObject({ state: "ready", data: SHOP });
    expect(ticketShop).toHaveBeenCalledTimes(2);
  });

  it("the checkout, which pays with them, never shows packs kept from before: it waits for its own load", async () => {
    const { api, ticketShop } = await loadedAhead();
    ({ unmount } = renderWithApi(<Checkout />, api));
    expect(seen.query.state).toBe("loading");
    expect(ticketShop).toHaveBeenCalledTimes(2);
    await act(() => Promise.resolve());
    expect(seen.query).toMatchObject({ state: "ready", data: SHOP });
  });
});
