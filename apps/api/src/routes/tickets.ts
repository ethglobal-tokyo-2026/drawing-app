import { DAILY_TICKETS_PER_DAY, ticketPurchases, ticketUses } from "@drawing-app/db";
import { Hono, type Context } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import {
  createQuoteBook,
  paymentCounted,
  spendRequestSchema,
  TICKET_PACKS,
  ticketHolder,
  ticketKindAt,
  ticketPurchaseRequestSchema,
  ticketsOf,
  toTicketUse,
} from "../tickets/tickets.ts";

/** requireSession found the account, so this answers only one that has since gone. */
const noAccount = (c: Context<AppEnv>) =>
  apiError(c, 401, "signed_out", `Person ${c.var.userId} has no account`);

/** Tickets: the day's tickets, spending one, quoting packs in SUI, and buying them. */
export const ticketRoutes = ({ db, clock, sui, suiPrice }: AppDeps) => {
  const quotes = createQuoteBook();
  return new Hono<AppEnv>()
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
    .get("/ticket-quote", async (c) => {
      const suiYen = await suiPrice();
      if (suiYen === null) {
        return apiError(
          c,
          503,
          "sui_price_unavailable",
          "No 5-minute average SUI/JPY price is available",
        );
      }
      return c.json({ quote: quotes.issue(suiYen, clock.now()) }, 200);
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
      const quote = quotes.covering(pack.tickets, BigInt(paidMist), clock.now());
      if (!quote) {
        return apiError(
          c,
          402,
          "payment_short",
          `paidMist: ${paidMist} MIST covers the ${pack.tickets}-ticket pack at no quote that still holds`,
        );
      }
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
              suiYen: quote.suiYen,
              paidMist,
              txDigest,
              verifiedAt: now,
            })
            .run();
          return c.json({ tickets: ticketsOf(tx, holder.id, now) }, 201);
        },
        { behavior: "immediate" },
      );
    });
};
