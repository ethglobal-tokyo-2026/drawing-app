import { DAILY_TICKETS_PER_DAY, ticketPurchases, ticketUses } from "@drawing-app/db";
import { Hono, type Context } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import {
  jpycFor,
  paymentCounted,
  spendRequestSchema,
  TICKET_PACKS,
  ticketHolder,
  ticketKindAt,
  ticketPaymentReference,
  ticketPurchaseRequestSchema,
  ticketShop,
  ticketsOf,
  toTicketUse,
} from "../tickets/tickets.ts";

/** requireSession found the account, so this answers only one that has since gone. */
const noAccount = (c: Context<AppEnv>) =>
  apiError(c, 401, "signed_out", `Person ${c.var.userId} has no account`);

/** Tickets: the day's tickets, spending one, the ticket shop, and buying its packs with JPYC. */
export const ticketRoutes = ({ db, clock, ticketPayments }: AppDeps) =>
  new Hono<AppEnv>()
    .get("/tickets", (c) => {
      const holder = ticketHolder(db, c.var.userId);
      if (!holder) return noAccount(c);
      return c.json({ tickets: ticketsOf(db, holder.id, clock.now()) }, 200);
    })
    .post("/tickets/spend", validate("json", spendRequestSchema), (c) => {
      const { kind } = c.req.valid("json");
      const now = clock.now();
      return db.transaction(
        (tx) => {
          const holder = ticketHolder(tx, c.var.userId);
          if (!holder) return noAccount(c);
          const { ticketDay, dailyLeft, reserveLeft, usedToday } = ticketsOf(tx, holder.id, now);
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
          // The unique day index stops a double tap spending two.
          const use = tx
            .insert(ticketUses)
            .values({ userId: holder.id, ticketDay, dayIndex, kind })
            .returning()
            .get();
          return c.json(
            { ticketUse: toTicketUse(use), tickets: ticketsOf(tx, holder.id, now) },
            201,
          );
        },
        { behavior: "immediate" },
      );
    })
    .get("/ticket-shop", (c) =>
      c.json({ shop: ticketShop(ticketPayments.target, c.var.userId) }, 200),
    )
    .post("/ticket-purchases", validate("json", ticketPurchaseRequestSchema), async (c) => {
      const { tickets, txDigest } = c.req.valid("json");
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
      const alreadyCounted = () =>
        apiError(c, 409, "payment_already_counted", `txDigest: ${txDigest} already bought tickets`);
      if (paymentCounted(db, txDigest)) return alreadyCounted();

      let payments;
      try {
        payments = await ticketPayments.paymentsIn(txDigest);
      } catch (error) {
        console.error(`POST /api/ticket-purchases: couldn't read ${txDigest} from Sui`, error);
        return apiError(
          c,
          502,
          "sui_unavailable",
          `Couldn't read transaction ${txDigest} from Sui: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (payments === null) {
        return apiError(
          c,
          422,
          "payment_not_found",
          `txDigest: Sui has no transaction ${txDigest}`,
        );
      }
      const { vault } = ticketPayments.target;
      const intoVault = payments.filter((payment) => payment.vault === vault);
      const reference = ticketPaymentReference(c.var.userId);
      const payment = intoVault.find((p) => p.reference === reference);
      if (!payment) {
        return intoVault.length > 0
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
              `txDigest: ${txDigest} made no JPYC payment into the ticket vault ${vault}`,
            );
      }
      const priceJpyc = jpycFor(pack.priceYen, ticketPayments.target.decimals);
      if (payment.amount < priceJpyc) {
        return apiError(
          c,
          402,
          "payment_short",
          `txDigest: paid ${payment.amount} JPYC base units, short of the ${pack.tickets}-ticket pack's ${priceJpyc}`,
        );
      }
      const now = clock.now();
      return db.transaction(
        (tx) => {
          const holder = ticketHolder(tx, c.var.userId);
          if (!holder) return noAccount(c);
          // Checked again: another request could have counted it while Sui was asked.
          if (paymentCounted(tx, txDigest)) return alreadyCounted();
          tx.insert(ticketPurchases)
            .values({
              userId: holder.id,
              tickets,
              priceYen: pack.priceYen,
              paidJpyc: payment.amount.toString(),
              txDigest,
              verifiedAt: now,
            })
            .run();
          return c.json({ tickets: ticketsOf(tx, holder.id, now) }, 201);
        },
        { behavior: "immediate" },
      );
    });
