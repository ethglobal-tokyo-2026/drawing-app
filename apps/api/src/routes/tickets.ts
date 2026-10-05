import { DAILY_TICKETS_PER_DAY, ticketPurchases, ticketUses } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { failureCause, logFailure, logInfo } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { purchaseNamedBy, ticketPaymentReference } from "../tickets/paymentReference.ts";
import {
  creditPurchase,
  jpycFor,
  paymentCounted,
  spendRequestSchema,
  startPurchaseRequestSchema,
  TICKET_PACKS,
  ticketKindAt,
  ticketPurchaseRequestSchema,
  ticketShop,
  ticketsOf,
  ticketUseSpentWith,
  toStartedTicketPurchase,
  toTicketUse,
} from "../tickets/tickets.ts";

/**
 * Tickets: the day's tickets, spending one, the ticket shop, and buying its packs with JPYC: a
 * purchase is started, then paid on Sui, then its payment reported. Once a spend or a purchase
 * commits, the chat menu's Draw key catches up in the background: LINE never holds up the answer or
 * fails it.
 */
export const ticketRoutes = ({ db, clock, ticketPayments, lineChatMenu }: AppDeps) =>
  new Hono<AppEnv>()
    .get("/tickets", (c) => c.json({ tickets: ticketsOf(db, c.var.userId, clock.now()) }, 200))
    .post("/tickets/spend", validate("json", spendRequestSchema), (c) => {
      const { kind, idempotencyKey } = c.req.valid("json");
      const { userId } = c.var;
      const now = clock.now();
      const spent = db.transaction(
        (tx) => {
          // The same key again is a retry or a second tap: it gets the use the key spent, whatever
          // kind it asks for, and spends nothing.
          const repeat = ticketUseSpentWith(tx, userId, idempotencyKey);
          if (repeat) {
            return c.json(
              { ticketUse: toTicketUse(repeat), tickets: ticketsOf(tx, userId, now) },
              200,
            );
          }
          const { ticketDay, dailyLeft, reserveLeft, usedToday } = ticketsOf(tx, userId, now);
          if (dailyLeft === 0 && reserveLeft === 0) {
            return apiError(
              c,
              409,
              "no_tickets_left",
              `All ${DAILY_TICKETS_PER_DAY} daily tickets for ${ticketDay} are spent, and no reserve tickets are left`,
            );
          }
          // Daily tickets go first, so the day's next index decides the kind. The start screen asks
          // before spending a reserve ticket, so it must never get the other kind than it offered.
          const dayIndex = usedToday.length;
          const next = ticketKindAt(dayIndex);
          if (kind !== next) {
            return apiError(
              c,
              409,
              "ticket_kind_changed",
              `kind: the next ticket is a ${next} ticket, not a ${kind} one`,
            );
          }
          // Immediate transactions spend one at a time, so each spend takes the day's next index,
          // and a key sent twice at once finds its first use above.
          const use = tx
            .insert(ticketUses)
            .values({ userId, ticketDay, dayIndex, kind, idempotencyKey })
            .returning()
            .get();
          return c.json({ ticketUse: toTicketUse(use), tickets: ticketsOf(tx, userId, now) }, 201);
        },
        { behavior: "immediate" },
      );
      if (spent.status === 201) void lineChatMenu.relink(userId);
      return spent;
    })
    .get("/ticket-shop", (c) => c.json({ shop: ticketShop(ticketPayments.target) }, 200))
    // Recorded before the payment is signed, so the sweep finds the payment on Sui even when the
    // app never reports it.
    .post("/ticket-purchases/start", validate("json", startPurchaseRequestSchema), (c) => {
      const { tickets } = c.req.valid("json");
      const pack = TICKET_PACKS.find((offer) => offer.tickets === tickets);
      if (!pack) {
        const packs = TICKET_PACKS.map((offer) => offer.tickets).join(", ");
        return apiError(
          c,
          400,
          "pack_unknown",
          `tickets: no pack has ${tickets}; packs have ${packs}`,
        );
      }
      const purchase = db
        .insert(ticketPurchases)
        .values({ userId: c.var.userId, tickets, priceYen: pack.priceYen })
        .returning()
        .get();
      logInfo("ticket_purchase.started", { userId: c.var.userId, purchaseId: purchase.id });
      return c.json(
        { purchase: toStartedTicketPurchase(purchase, ticketPayments.target.decimals) },
        201,
      );
    })
    .post("/ticket-purchases", validate("json", ticketPurchaseRequestSchema), async (c) => {
      const { purchaseId, txDigest } = c.req.valid("json");
      const { userId } = c.var;
      const purchase = db
        .select()
        .from(ticketPurchases)
        .where(eq(ticketPurchases.id, purchaseId))
        .get();
      if (!purchase) {
        return apiError(c, 404, "purchase_not_found", `purchaseId: no purchase ${purchaseId}`);
      }
      if (purchase.userId !== userId) {
        return apiError(
          c,
          403,
          "payment_not_yours",
          `purchaseId: purchase ${purchaseId} is someone else's`,
        );
      }
      const alreadyCounted = () =>
        apiError(c, 409, "payment_already_counted", `txDigest: ${txDigest} already bought tickets`);
      const alreadyPaid = () =>
        apiError(
          c,
          409,
          "purchase_already_paid",
          `purchaseId: purchase ${purchaseId} was already paid by another payment`,
        );
      if (paymentCounted(db, txDigest)) return alreadyCounted();
      if (purchase.verifiedAt !== null) return alreadyPaid();

      let payments;
      try {
        payments = await ticketPayments.paymentsIn(txDigest);
      } catch (error) {
        // Wrapped so the log names the transaction, which no diagnostic field holds.
        const failure = new Error(`Couldn't read transaction ${txDigest} from Sui`, {
          cause: error,
        });
        logFailure("sui.read.failed", failure, { userId });
        return apiError(c, 502, "sui_unavailable", `${failure.message}: ${failureCause(error)}`);
      }
      // No verdict: Sui may not have run a payment the app just sent yet, so the app asks again.
      if (payments === null) {
        return apiError(
          c,
          409,
          "payment_not_landed",
          `txDigest: Sui doesn't show transaction ${txDigest} yet`,
        );
      }
      const { vault, decimals } = ticketPayments.target;
      const intoVault = payments.filter((payment) => payment.vault === vault);
      const reference = ticketPaymentReference(userId, purchaseId);
      const payment = intoVault.find((p) => p.reference === reference);
      if (!payment) {
        const forSomeoneElse = intoVault.some((p) => {
          const named = purchaseNamedBy(p.reference);
          return named !== null && named.userId !== userId;
        });
        return forSomeoneElse
          ? apiError(
              c,
              403,
              "payment_not_yours",
              `txDigest: ${txDigest} paid the ticket vault for someone else, not ${reference}`,
            )
          : apiError(
              c,
              422,
              "payment_not_found",
              `txDigest: ${txDigest} made no JPYC payment into the ticket vault ${vault} for ${reference}`,
            );
      }
      const priceJpyc = jpycFor(purchase.priceYen, decimals);
      if (payment.amount < priceJpyc) {
        return apiError(
          c,
          402,
          "payment_short",
          `txDigest: paid ${payment.amount} JPYC base units, short of the ${purchase.tickets}-ticket pack's ${priceJpyc}`,
        );
      }
      const now = clock.now();
      const credit = creditPurchase(db, purchaseId, { txDigest, amount: payment.amount }, now);
      if (credit === "payment_already_counted") return alreadyCounted();
      if (credit === "purchase_already_paid") return alreadyPaid();
      void lineChatMenu.relink(userId);
      return c.json({ tickets: ticketsOf(db, userId, now) }, 201);
    });
