import { QUOTE_TTL_MS, TICKET_PACKS, TICKET_PRICE_YEN } from "./config";
import { addReserveTickets } from "./useTickets";

/**
 * MOCK of the ticket shop's routes, `GET /api/ticket-quote` and `POST /api/ticket-purchases`, in
 * the shapes docs/database-schema-and-rest-api.md gives them. Swap the bodies for the API client
 * once the routes exist.
 */

export type PackSize = (typeof TICKET_PACKS)[number]["tickets"];

export interface TicketQuote {
  /** Yen per SUI, the 5-minute time-weighted average, as decimal text. */
  suiYen: string;
  quotedAt: string;
  expiresAt: string;
  packs: Array<{
    tickets: PackSize;
    priceYen: number;
    /** Off TICKET_PRICE_YEN per ticket. */
    discountPercent: number;
    /** Decimal MIST, rounded up. */
    priceMist: string;
  }>;
}

type TicketShopErrorCode =
  | "sui_price_unavailable"
  | "pack_unknown"
  | "payment_short"
  | "payment_already_counted";

/** An error response from a ticket shop route: its status and machine-readable code. */
class TicketShopError extends Error {
  readonly status: number;
  readonly code: TicketShopErrorCode;

  constructor(status: number, code: TicketShopErrorCode, message: string) {
    super(message);
    this.name = "TicketShopError";
    this.status = status;
    this.code = code;
  }
}

// A stand-in SUI/JPY price, not a market one.
const MOCK_SUI_YEN = 300;
const MOCK_LATENCY_MS = 250;
const countedDigests = new Set<string>();
let lastQuote: TicketQuote | null = null;

const later = () => new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));

const discountPercent = (tickets: number, priceYen: number) =>
  Math.round((1 - priceYen / (tickets * TICKET_PRICE_YEN)) * 100);

export async function fetchTicketQuote(): Promise<TicketQuote> {
  await later();
  const now = Date.now();
  lastQuote = {
    suiYen: String(MOCK_SUI_YEN),
    quotedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    packs: TICKET_PACKS.map(({ tickets, priceYen }) => ({
      tickets,
      priceYen,
      discountPercent: discountPercent(tickets, priceYen),
      priceMist: String(Math.ceil((priceYen / MOCK_SUI_YEN) * 1e9)),
    })),
  };
  return lastQuote;
}

/** Records a Sui payment for a pack; its reserve tickets count from here. */
export async function recordTicketPurchase(body: {
  tickets: PackSize;
  txDigest: string;
  paidMist: string;
}): Promise<void> {
  await later();
  const pack = lastQuote?.packs.find((p) => p.tickets === body.tickets);
  if (!lastQuote || !pack)
    throw new TicketShopError(
      400,
      "pack_unknown",
      `No pack of ${body.tickets} tickets is on sale.`,
    );
  if (BigInt(body.paidMist) < BigInt(pack.priceMist))
    throw new TicketShopError(
      402,
      "payment_short",
      `The payment of ${body.paidMist} MIST doesn't cover ${pack.priceMist} MIST.`,
    );
  if (countedDigests.has(body.txDigest))
    throw new TicketShopError(409, "payment_already_counted", "This payment was already counted.");
  countedDigests.add(body.txDigest);
  addReserveTickets(body.tickets);
}
