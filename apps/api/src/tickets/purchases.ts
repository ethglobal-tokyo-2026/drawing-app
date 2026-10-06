import { suiTransactions, ticketPurchases, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";
import {
  refuse,
  toSponsoredTransaction,
  type Refusal,
  type SponsoredTransaction,
  type Tickets,
} from "../shapes.ts";
import { paymentReceivedIn } from "../sui/events.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import {
  drop,
  follow,
  runSigned,
  sponsored,
  type OnSucceeded,
  type SuiTransaction,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import { ticketPaymentReference } from "./paymentReference.ts";
import {
  jpycFor,
  TICKET_PACKS,
  ticketsOf,
  toStartedTicketPurchase,
  type StartedTicketPurchase,
  type TicketPurchasePayment,
} from "./tickets.ts";

type Purchase = typeof ticketPurchases.$inferSelect;

/** The routes check for Sui first, so only mock chain mode lacks it, where nothing is bought. */
function chainOf({ db, clock, sui, gasStation }: AppDeps): SuiTransactionDeps {
  if (!sui || !gasStation) throw new Error("Ticket purchases need Sui and Shinami Gas Station");
  return { db, clock, sui, gasStation };
}

const purchaseOf = (db: Db, purchaseId: number) =>
  db.select().from(ticketPurchases).where(eq(ticketPurchases.id, purchaseId)).get();

/** The payer's open payment, if any: there's at most one, as it spends their JPYC coins. */
const openPaymentOf = (db: Db, payer: string) =>
  db
    .select()
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.kind, "payment"),
        eq(suiTransactions.sender, payer),
        isNull(suiTransactions.outcome),
      ),
    )
    .get();

/** Open payments, oldest first, for the sweep. */
export const openPayments = (db: Db) =>
  db
    .select()
    .from(suiTransactions)
    .where(and(eq(suiTransactions.kind, "payment"), isNull(suiTransactions.outcome)))
    .orderBy(asc(suiTransactions.createdAt))
    .all();

/** Gives up an open purchase whose payment never ran; answers whether it was still open. */
export function giveUp(deps: Pick<AppDeps, "db" | "clock">, purchase: Purchase, why: string) {
  const { changes } = deps.db
    .update(ticketPurchases)
    .set({ givenUpAt: deps.clock.now() })
    .where(
      and(
        eq(ticketPurchases.id, purchase.id),
        isNull(ticketPurchases.verifiedAt),
        isNull(ticketPurchases.givenUpAt),
      ),
    )
    .run();
  if (changes > 0) {
    logInfo("ticket_purchase.given_up", {
      userId: purchase.userId,
      purchaseId: purchase.id,
      reason: why,
    });
  }
  return changes > 0;
}

/**
 * A payment's record, in the transaction that settles it: its PaymentReceived checked against the
 * purchase, then the purchase paid, which counts its tickets. A payment the server built can't miss,
 * so a mismatch is a bug, and throwing keeps the payment open for a fix rather than crediting it.
 */
const creditOnSuccess =
  (deps: Pick<AppDeps, "clock" | "ticketPayment">, purchase: Purchase): OnSucceeded =>
  (tx, events) => {
    const paid = paymentReceivedIn(events, deps.ticketPayment);
    const reference = ticketPaymentReference(purchase.userId, purchase.id);
    const price = jpycFor(purchase.priceYen, deps.ticketPayment.decimals);
    if (
      !paid ||
      paid.vault !== deps.ticketPayment.vault ||
      paid.reference !== reference ||
      paid.amount < price
    ) {
      throw new Error(
        `Purchase ${purchase.id}'s payment emitted ${paid ? `${paid.amount} into ${paid.vault} for ${paid.reference}` : "no PaymentReceived"}, not ${price} into ${deps.ticketPayment.vault} for ${reference}`,
      );
    }
    tx.update(ticketPurchases)
      .set({ paidJpyc: paid.amount.toString(), verifiedAt: deps.clock.now(), givenUpAt: null })
      .where(and(eq(ticketPurchases.id, purchase.id), isNull(ticketPurchases.verifiedAt)))
      .run();
  };

/**
 * Settles a payment `follow` left standing: a success has already counted its tickets, and a failure
 * or a lapse gives its purchase up. Answers the payment as it stands.
 */
function afterFollowing(deps: AppDeps, purchase: Purchase, row: SuiTransaction) {
  if (row.outcome === "succeeded") {
    logInfo("ticket_purchase.credited", {
      userId: purchase.userId,
      purchaseId: purchase.id,
      txDigest: row.digest,
    });
    void deps.lineChatMenu.relink(purchase.userId);
  } else if (row.outcome === "failed") {
    giveUp(deps, purchase, `Sui ran its payment ${row.digest}, and it failed: ${row.failure}`);
  } else if (row.outcome === "dead") {
    giveUp(
      deps,
      purchase,
      `its payment ${row.digest} never ran: ${row.failure ?? "its sponsorship lapsed"}`,
    );
  }
  return row;
}

/** Follows a payment to where it now stands, its tickets counted or its purchase given up. */
export async function followPayment(deps: AppDeps, row: SuiTransaction) {
  const purchase = row.purchaseId === null ? undefined : purchaseOf(deps.db, row.purchaseId);
  if (!purchase) throw new Error(`Payment ${row.digest} names no purchase`);
  const { row: now } = await follow(chainOf(deps), row, creditOnSuccess(deps, purchase));
  return afterFollowing(deps, purchase, now);
}

export type PurchaseStart =
  | Refusal<"pack_unknown" | "no_sui_wallet" | "payment_not_landed">
  | { refusal: null; purchase: StartedTicketPurchase; payment: SponsoredTransaction };

/**
 * Starts a purchase of a pack: the server builds its payment, which Shinami sponsors, for the
 * buyer's Privy Sui wallet to sign. An earlier payment of theirs goes first: one that ran counts its
 * tickets, and one never sent is dropped with its purchase. Rejects with SponsorshipError when
 * Shinami refuses it, such as for a balance short of the pack, giving the purchase up.
 */
export async function startTicketPurchase(
  deps: AppDeps,
  userId: string,
  tickets: number,
): Promise<PurchaseStart> {
  const pack = TICKET_PACKS.find((offer) => offer.tickets === tickets);
  if (!pack) {
    const packs = TICKET_PACKS.map((offer) => offer.tickets).join(", ");
    return refuse("pack_unknown", `tickets: no pack has ${tickets}; packs have ${packs}`);
  }
  const chain = chainOf(deps);
  const payer = await deps.suiWallets.addressFor(userId);
  if (!payer) return refuse("no_sui_wallet", `${userId} has no Privy Sui wallet yet`);

  return oneAtATime(`payer:${payer}`, async (): Promise<PurchaseStart> => {
    const open = openPaymentOf(deps.db, payer);
    if (open) {
      const earlier = open.purchaseId === null ? undefined : purchaseOf(deps.db, open.purchaseId);
      if (open.submittedAt === null) {
        drop(chain, open);
        if (earlier) giveUp(deps, earlier, "its buyer started another before signing it");
      } else if ((await followPayment(deps, open)).outcome === null) {
        return refuse(
          "payment_not_landed",
          `Sui hasn't answered about the earlier payment ${open.digest} yet; try again in a moment`,
        );
      }
    }
    const purchase = deps.db
      .insert(ticketPurchases)
      .values({ userId, tickets, priceYen: pack.priceYen })
      .returning()
      .get();
    try {
      const kind = await chain.sui.paymentKind({
        sender: payer,
        amount: jpycFor(pack.priceYen, deps.ticketPayment.decimals),
        reference: ticketPaymentReference(userId, purchase.id),
      });
      const row = await sponsored(
        chain,
        { kind: "payment", sender: payer, userId, purchaseId: purchase.id },
        kind,
      );
      logInfo("ticket_purchase.started", { userId, purchaseId: purchase.id, txDigest: row.digest });
      return {
        refusal: null,
        purchase: toStartedTicketPurchase(purchase),
        payment: toSponsoredTransaction(row),
      };
    } catch (error) {
      // Nothing can pay it now; the next tap starts another.
      giveUp(deps, purchase, "its payment couldn't be built or sponsored");
      throw error;
    }
  });
}

export type PurchasePaying =
  | Refusal<
      | "purchase_not_found"
      | "payment_not_yours"
      | "sponsorship_expired"
      | "transaction_failed"
      | "payment_not_landed"
    >
  | { refusal: null; tickets: Tickets };

/**
 * The buyer's signed payment, which the server submits: the tickets it bought once it lands. A
 * payment already sent is followed instead, so sending the same signature again after a lost answer
 * pays once. Rejects with SignatureInvalidError for a signature that isn't the buyer's wallet's.
 */
export async function payTicketPurchase(
  deps: AppDeps,
  userId: string,
  { purchaseId, digest, signature }: TicketPurchasePayment,
): Promise<PurchasePaying> {
  const chain = chainOf(deps);
  const purchase = purchaseOf(deps.db, purchaseId);
  if (!purchase) return refuse("purchase_not_found", `purchaseId: no purchase ${purchaseId}`);
  if (purchase.userId !== userId) {
    return refuse("payment_not_yours", `purchaseId: purchase ${purchaseId} is someone else's`);
  }
  const row = deps.db
    .select()
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.kind, "payment"),
        eq(suiTransactions.purchaseId, purchaseId),
        eq(suiTransactions.digest, digest),
      ),
    )
    .get();
  if (!row) {
    return refuse(
      "sponsorship_expired",
      `digest: ${digest} isn't purchase ${purchaseId}'s payment; start the purchase again`,
    );
  }

  return oneAtATime(`payer:${row.sender}`, async (): Promise<PurchasePaying> => {
    const { row: ran } = await runSigned(chain, row, signature, creditOnSuccess(deps, purchase));
    afterFollowing(deps, purchase, ran);
    switch (ran.outcome) {
      case "succeeded":
        return { refusal: null, tickets: ticketsOf(deps.db, userId, deps.clock.now()) };
      case "failed":
        return refuse(
          "transaction_failed",
          `Sui ran payment ${ran.digest}, and it failed: ${ran.failure}`,
        );
      case "dead":
        return refuse(
          "sponsorship_expired",
          `Payment ${ran.digest} never ran: ${ran.failure ?? "its sponsorship lapsed"}; start the purchase again`,
        );
      case null:
        return refuse(
          "payment_not_landed",
          `Sui's answer to payment ${ran.digest} was lost; send the same signature again`,
        );
    }
  });
}
