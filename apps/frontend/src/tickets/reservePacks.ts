import type { TicketShop } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";
import { preloadQuery, QueryAnswers, useApiQuery } from "../api/useApiQuery";

export type ReservePacks = TicketShop;
export type ReservePack = TicketShop["packs"][number];

/** How long the Shop shows the packs last loaded without asking again: prices change only with a release. */
export const RESERVE_PACKS_FRESH_MS = 5 * 60_000;

const KEY = "ticket-shop";
const loadPacks = (api: ApiClient) => api.ticketShop();
const answers = new QueryAnswers<TicketShop>({ freshMs: RESERVE_PACKS_FRESH_MS });

/**
 * The reserve ticket packs on sale, priced in yen, and where they're paid, from this reader's own
 * load: the checkout pays with them, so it never pays a price kept from before.
 */
export const useReservePacks = () => useApiQuery(KEY, loadPacks, answers, { ownLoadOnly: true });

/** The same packs for the Shop to show: the last ones loaded at once, loaded again once they're stale. */
export const useShownReservePacks = () => useApiQuery(KEY, loadPacks, answers);

/** Loads the packs ahead, so the Shop opens on its prices. */
export const preloadReservePacks = (api: ApiClient) => preloadQuery(api, KEY, loadPacks, answers);

/** The price of one reserve ticket bought alone, and whether a bigger pack costs less a ticket. */
export function singleTicketPrice(packs: ReservePacks["packs"]) {
  const single = packs.find((p) => p.tickets === 1);
  if (!single) return null;
  return { priceYen: single.priceYen, lessInPacks: packs.some((p) => p.discountPercent > 0) };
}
