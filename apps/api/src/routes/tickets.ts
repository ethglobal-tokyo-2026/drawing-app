import { ticketUses } from "@drawing-app/db";
import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, refused, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { refuse } from "../shapes.ts";
import { payTicketPurchase, startTicketPurchase } from "../tickets/purchases.ts";
import {
  kyotoSeikaPracticeOf,
  nextTicketKind,
  spendRequestSchema,
  startPurchaseRequestSchema,
  ticketPurchaseRequestSchema,
  ticketShop,
  ticketsOf,
  ticketUseSpentWith,
  toTicketUse,
} from "../tickets/tickets.ts";

/**
 * Tickets: the day's tickets, spending one, the ticket shop, and buying its packs with JPYC: a
 * purchase is started with its payment, which the server builds, then the buyer's wallet signs it
 * and the server submits it; the free first pack is given as it starts. Once a spend or a purchase
 * commits, the chat menu's Draw key catches up in the background: LINE never holds up the answer or
 * fails it.
 */
export const ticketRoutes = (deps: AppDeps) => {
  const { db, clock, ticketPayment, lineChatMenu } = deps;
  return new Hono<AppEnv>()
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
          const kyotoSeikaPractice = kyotoSeikaPracticeOf(tx, userId);
          const { ticketDay, dailyPerDay, dailyLeft, reserveLeft, usedToday } = ticketsOf(
            tx,
            userId,
            now,
          );
          if (dailyLeft === 0 && reserveLeft === 0) {
            return apiError(
              c,
              409,
              "no_tickets_left",
              `All ${dailyPerDay} daily tickets for ${ticketDay} are spent, and no reserve tickets are left`,
            );
          }
          // Daily tickets go first, under the allowance of the mode in force now. The start screen
          // asks before spending a reserve ticket, so it must never get the other kind than it offered.
          const dayIndex = usedToday.length;
          const next = nextTicketKind({ dailyLeft });
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
            .values({ userId, ticketDay, dayIndex, kind, idempotencyKey, kyotoSeikaPractice })
            .returning()
            .get();
          return c.json({ ticketUse: toTicketUse(use), tickets: ticketsOf(tx, userId, now) }, 201);
        },
        { behavior: "immediate" },
      );
      if (spent.status === 201) void lineChatMenu.relink(userId);
      return spent;
    })
    .get("/ticket-shop", async (c) => {
      // The mock chain has no package, so the configured one stands in.
      const originalPackage = deps.sui
        ? await deps.sui.paymentOriginalPackage()
        : ticketPayment.paymentPackage;
      return c.json({ shop: ticketShop(db, c.var.userId, ticketPayment, originalPackage) }, 200);
    })
    .post("/ticket-purchases/start", validate("json", startPurchaseRequestSchema), async (c) => {
      const started = await startTicketPurchase(deps, c.var.userId, c.req.valid("json"));
      if (started.refusal !== null) return refused(c, started);
      if (started.payment === null) {
        void lineChatMenu.relink(c.var.userId);
        const { purchase, tickets } = started;
        return c.json({ purchase, payment: null, tickets }, 201);
      }
      const { purchase, payment } = started;
      return c.json({ purchase, payment }, 201);
    })
    .post("/ticket-purchases", validate("json", ticketPurchaseRequestSchema), async (c) => {
      if (!deps.sui) return refused(c, refuse("chain_unavailable", "This server runs without Sui"));
      const paying = await payTicketPurchase(deps, c.var.userId, c.req.valid("json"));
      if (paying.refusal !== null) return refused(c, paying);
      void lineChatMenu.relink(c.var.userId);
      return c.json({ tickets: paying.tickets }, 201);
    });
};
