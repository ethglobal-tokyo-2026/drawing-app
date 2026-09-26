import { ticketPurchases, ticketUses } from "@drawing-app/db";
import { Hono, type Context } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import {
  FREE_TICKETS_PER_DAY,
  paymentCounted,
  TICKET_PACKS,
  ticketHolder,
  ticketPurchaseRequestSchema,
  ticketsOf,
  toTicketUse,
} from "../tickets/tickets.ts";

/** requireSession found the account, so this answers only one that has since gone. */
const noAccount = (c: Context<AppEnv>) =>
  apiError(c, 401, "signed_out", `Person ${c.var.userId} has no account`);

/** Tickets: the day's tickets, spending one, and buying packs. */
export const ticketRoutes = ({ db, clock, sui }: AppDeps) =>
  new Hono<AppEnv>()
    .get("/tickets", (c) => {
      const holder = ticketHolder(db, c.var.userId);
      if (!holder) return noAccount(c);
      return c.json({ tickets: ticketsOf(db, holder, clock.now()) }, 200);
    })
    .post("/tickets/spend", (c) => {
      const now = clock.now();
      return db.transaction(
        (tx) => {
          const holder = ticketHolder(tx, c.var.userId);
          if (!holder) return noAccount(c);
          const { ticketDay, freeLeft, paidLeft, usedToday } = ticketsOf(tx, holder, now);
          if (freeLeft === 0 && paidLeft === 0) {
            return apiError(
              c,
              409,
              "no_tickets_left",
              `All ${FREE_TICKETS_PER_DAY} free tickets for ${ticketDay} are spent, and no paid ones are left`,
            );
          }
          // Today's free tickets go first: the index counts up, and the unique day index stops a
          // double tap spending two.
          const use = tx
            .insert(ticketUses)
            .values({ userId: holder.id, ticketDay, dayIndex: usedToday.length })
            .returning()
            .get();
          return c.json({ ticketUse: toTicketUse(use), tickets: ticketsOf(tx, holder, now) }, 201);
        },
        { behavior: "immediate" },
      );
    })
    .post("/ticket-purchases", validate("json", ticketPurchaseRequestSchema), async (c) => {
      const { tickets, txDigest, paidMist } = c.req.valid("json");
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
      // The contract has no code for a payment Sui doesn't verify; the mock payment always verifies.
      if (!(await sui.verifyPayment(txDigest))) {
        console.error(`POST /api/ticket-purchases: Sui didn't verify payment ${txDigest}`);
        return apiError(c, 500, "internal_error", `Sui didn't verify payment ${txDigest}`);
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
              paidMist,
              txDigest,
              verifiedAt: now,
            })
            .run();
          return c.json({ tickets: ticketsOf(tx, holder, now) }, 201);
        },
        { behavior: "immediate" },
      );
    });
