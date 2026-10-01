import { bcs } from "@mysten/sui/bcs";
import { TransactionError } from "@mysten/sui/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { JpycPayment, TicketPaymentTarget, TicketPayments } from "../deps.ts";

/** The payment contract's PaymentReceived, field for field. */
const paymentReceived = bcs.struct("PaymentReceived", {
  vault_id: bcs.Address,
  payer: bcs.Address,
  amount: bcs.u64(),
  reference: bcs.vector(bcs.u8()),
});

/**
 * How long reading a payment from Sui may take in all, well inside the app's own request timeout;
 * also how long each request of a read of payment events may take.
 */
export const SUI_READ_TIMEOUT_MS = 10_000;
/** How soon a transaction Sui doesn't show yet is asked for again. */
export const NOT_LANDED_RETRY_MS = 1_000;

/**
 * Reads a transaction with `read`, which answers null while Sui doesn't show it, asking again until
 * SUI_READ_TIMEOUT_MS runs out; null if Sui never showed it by then. The public fullnode is
 * load-balanced, so the node that answers can be behind one that just ran the payment. A failure to
 * reach Sui rejects at once rather than passing for a transaction Sui doesn't have; a read the time
 * running out cuts off rejects too, unless an earlier one has already answered that Sui doesn't show it.
 */
export async function readLanded<T>(
  read: (signal: AbortSignal) => Promise<T | null>,
): Promise<T | null> {
  const signal = AbortSignal.timeout(SUI_READ_TIMEOUT_MS);
  const deadline = Date.now() + SUI_READ_TIMEOUT_MS;
  let answered = false;
  for (;;) {
    let found: T | null;
    try {
      found = await read(signal);
    } catch (error) {
      if (answered && signal.aborted) return null;
      throw error;
    }
    if (found !== null) return found;
    answered = true;
    if (deadline - Date.now() <= NOT_LANDED_RETRY_MS) return null;
    await new Promise((resolve) => setTimeout(resolve, NOT_LANDED_RETRY_MS));
  }
}

/** Events one page asks Sui for: the most a public fullnode answers. */
const EVENTS_PER_PAGE = 50;
/** The most pages one read of payment events goes through, so a sweep's reads stay bounded. */
export const PAGES_PER_READ = 20;

/** One page of events, newest first, and where the next, older page starts: null after the last. */
interface EventPage<Event> {
  events: Event[];
  before: string | null;
}

/**
 * Reads pages of events, newest first, until a page's oldest event ran before `since`, the history
 * runs out, or PAGES_PER_READ pages are read; `complete` is false only in the last case. A page can
 * come back empty with more to read, when Sui bounds how far one request scans.
 */
export async function readBackTo<Event>(
  since: Date,
  readPage: (before: string | null) => Promise<EventPage<Event>>,
  ranAt: (event: Event) => Promise<Date>,
): Promise<{ events: Event[]; complete: boolean }> {
  const events: Event[] = [];
  let before: string | null = null;
  for (let page = 0; page < PAGES_PER_READ; page++) {
    const read: EventPage<Event> = await readPage(before);
    events.push(...read.events);
    const oldest = read.events.at(-1);
    if (read.before === null || (oldest !== undefined && (await ranAt(oldest)) < since)) {
      return { events, complete: true };
    }
    before = read.before;
  }
  return { events, complete: false };
}

/** A PaymentReceived event's fields, from its BCS. */
function paymentOf(bcsBytes: Uint8Array): JpycPayment {
  const fields = paymentReceived.parse(bcsBytes);
  return {
    vault: normalizeSuiAddress(fields.vault_id),
    payer: normalizeSuiAddress(fields.payer),
    amount: BigInt(fields.amount),
    reference: new TextDecoder().decode(Uint8Array.from(fields.reference)),
  };
}

/** Reads ticket payments from Sui's public fullnode for `target.network`, over gRPC. */
export function createJpycPayments(target: TicketPaymentTarget): TicketPayments {
  const client = new SuiGrpcClient({
    network: target.network,
    baseUrl: `https://fullnode.${target.network}.sui.io:443`,
  });
  const eventType = `${target.paymentPackage}::payment::PaymentReceived`;
  return {
    target,
    paymentsIn: async (txDigest) => {
      const result = await readLanded((signal) =>
        client
          .getTransaction({ digest: txDigest, include: { events: true }, signal })
          .catch((error: unknown) => {
            if (error instanceof TransactionError && error.reason === "notFound") return null;
            throw error;
          }),
      );
      if (result === null) return null;
      // A failed transaction moved no JPYC, so it paid for nothing.
      if (result.$kind === "FailedTransaction") return [];
      return result.Transaction.events
        .filter((event) => event.eventType === eventType)
        .map((event) => paymentOf(event.bcs));
    },
    paymentsSince: async (since) => {
      const { events, complete } = await readBackTo(
        since,
        async (before) => {
          const page = await client.listEvents({
            filter: { eventType },
            order: "descending",
            limit: EVENTS_PER_PAGE,
            before,
            signal: AbortSignal.timeout(SUI_READ_TIMEOUT_MS),
          });
          return { events: page.events, before: page.hasNextPage ? page.endCursor : null };
        },
        // Sui lists events without their time, so the read asks for their transaction's.
        async (event) => {
          const result = await client.getTransaction({
            digest: event.transactionDigest,
            signal: AbortSignal.timeout(SUI_READ_TIMEOUT_MS),
          });
          const ranAt = (result.Transaction ?? result.FailedTransaction).timestampMs;
          if (ranAt === null) {
            throw new Error(`Sui gave no time for transaction ${event.transactionDigest}`);
          }
          return new Date(ranAt);
        },
      );
      return {
        payments: events.map((event) => ({
          ...paymentOf(event.bcs),
          txDigest: event.transactionDigest,
        })),
        complete,
      };
    },
  };
}
