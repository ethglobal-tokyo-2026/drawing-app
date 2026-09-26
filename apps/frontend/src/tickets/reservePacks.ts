import type { TicketShop } from "@drawing-app/api/client";
import { useApiQuery } from "../api/useApiQuery";

export type ReservePacks = TicketShop;
export type ReservePack = TicketShop["packs"][number];

/** The reserve ticket packs on sale, priced in yen, and where they're paid. */
export const useReservePacks = () => useApiQuery("ticket-shop", (api) => api.ticketShop());

/** The price of one reserve ticket bought alone, and whether a bigger pack costs less a ticket. */
export function singleTicketPrice(packs: ReservePacks["packs"]) {
  const single = packs.find((p) => p.tickets === 1);
  if (!single) return null;
  return { priceYen: single.priceYen, lessInPacks: packs.some((p) => p.discountPercent > 0) };
}
