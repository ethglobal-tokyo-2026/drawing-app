import { DAILY_TICKETS_PER_DAY, ticketUses } from "@drawing-app/db";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import type { Refusal } from "../shapes.ts";
import { payTicketPurchase, startTicketPurchase } from "../tickets/purchases.ts";
import {
  spendRequestSchema,
  startPurchaseRequestSchema,
  ticketKindAt,
  ticketPurchaseRequestSchema,
  ticketShop,
  ticketsOf,
  ticketUseSpentWith,
  toTicketUse,
} from "../tickets/tickets.ts";

/**
 * Each ticket purchase refusal's status. A payment whose answer from Sui was lost is a 503: the app
 * sends the same signature again.
 */
const PURCHASE_REFUSAL_STATUS = {
  pack_unknown: 400,
  no_sui_wallet: 409,
  purchase_not_found: 404,
  payment_not_yours: 403,
  sponsorship_expired: 409,
  transaction_failed: 409,
  payment_not_landed: 503,
} as const satisfies Record<string, ContentfulStatusCode>;

const refusedPurchase = <Code extends keyof typeof PURCHASE_REFUSAL_STATUS>(
  c: Context,
  { refusal, detail }: Refusal<Code>,
) => apiError(c, PURCHASE_REFUSAL_STATUS[refusal], refusal, detail);

/**
 * Tickets: the day's tickets, spending one, the ticket shop, and buying its packs with JPYC: a
 * purchase is started with its payment, which the server builds, then the buyer's wallet signs it
 * and the server submits it. Once a spend or a purchase commits, the chat menu's Draw key catches up
 * in the background: LINE never holds up the answer or fails it.
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
    .get("/ticket-shop", (c) => c.json({ shop: ticketShop(ticketPayment) }, 200))
    .post("/ticket-purchases/start", validate("json", startPurchaseRequestSchema), async (c) => {
      if (!deps.sui) {
        return apiError(c, 503, "chain_unavailable", "This server runs without Sui");
      }
      const started = await startTicketPurchase(deps, c.var.userId, c.req.valid("json").tickets);
      if (started.refusal !== null) return refusedPurchase(c, started);
      const { purchase, payment } = started;
      return c.json({ purchase, payment }, 201);
    })
    .post("/ticket-purchases", validate("json", ticketPurchaseRequestSchema), async (c) => {
      if (!deps.sui) {
        return apiError(c, 503, "chain_unavailable", "This server runs without Sui");
      }
      const paying = await payTicketPurchase(deps, c.var.userId, c.req.valid("json"));
      if (paying.refusal !== null) return refusedPurchase(c, paying);
      void lineChatMenu.relink(c.var.userId);
      return c.json({ tickets: paying.tickets }, 201);
    });
};
