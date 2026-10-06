import { suiTransactions, type Db } from "@drawing-app/db";
import { fromBase64 } from "@mysten/sui/utils";
import { isValidTransactionSignature } from "@mysten/sui/verify";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { AppDeps, Clock } from "../deps.ts";
import { logFailure, logInfo, type DiagnosticFields } from "../diagnostics.ts";
import {
  TransactionRefusedError,
  type GasStation,
  type SuiChain,
  type SuiOutcome,
} from "./types.ts";

/**
 * How long past its sponsorship's lapse a submitted transaction Sui doesn't show is still followed
 * before it settles dead: one sent just before the lapse can still run.
 */
export const SETTLE_GRACE_MS = 5 * 60_000;
/**
 * How long before its sponsorship lapses an unsigned transaction is still answered again, rather
 * than replaced: room for the wallet to sign it and the server to submit it.
 */
export const SPONSORSHIP_MARGIN_MS = 5 * 60_000;

/** A row of sui_transactions: one Sui transaction, from Shinami's sponsorship to its outcome. */
export type SuiTransaction = typeof suiTransactions.$inferSelect;

/** What a transaction that succeeded emitted. */
export type SuiEvents = Extract<SuiOutcome, { ok: true }>["events"];

export interface SuiTransactionDeps {
  db: Db;
  clock: Clock;
  sui: SuiChain;
  gasStation: GasStation;
}

/** What these steps reach of the app's deps; null in mock chain mode, which has no Sui. */
export const suiDepsOf = ({
  db,
  clock,
  sui,
  gasStation,
}: Pick<AppDeps, "db" | "clock" | "sui" | "gasStation">): SuiTransactionDeps | null =>
  sui && gasStation ? { db, clock, sui, gasStation } : null;

/** Whether an unsigned row is worth answering again: open, unsubmitted, and not about to lapse. */
export const isLive = (row: SuiTransaction, now: Date) =>
  row.outcome === null &&
  row.submittedAt === null &&
  row.expiresAt.getTime() - now.getTime() > SPONSORSHIP_MARGIN_MS;

/**
 * What a new transaction moves and settles, as sui_transactions_subject allows for its kind. The
 * server sends mints, claims and returns; the person's Privy Sui wallet sends the rest.
 */
export type SuiTransactionSubject =
  | { kind: "mint"; stickerId: string }
  | { kind: "claim" | "return"; giftId: string; stickerId?: string }
  | { kind: "deposit"; sender: string; userId: string; stickerId: string; giftId: string }
  | { kind: "take_out"; sender: string; userId: string; giftId: string; stickerId?: string }
  | { kind: "payment"; sender: string; userId: string; purchaseId: number };

/** A row as it now stands, and what it emitted if this call saw it succeed. */
export interface Followed {
  row: SuiTransaction;
  /** Null unless this call had Sui's answer that the transaction succeeded. */
  events: SuiEvents | null;
}

/** The signature the app posted isn't the sender's wallet's over the transaction's bytes. */
export class SignatureInvalidError extends Error {
  name = "SignatureInvalidError";
}

type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * A flow's record of a transaction that succeeded, such as the tickets a payment buys. It runs in
 * the database transaction that settles the row, so the two land together or not at all: a record
 * that throws leaves the row open for the next follow.
 */
export type OnSucceeded = (tx: DbTransaction, events: SuiEvents) => void;

type Settlement =
  | { outcome: "succeeded"; events: SuiEvents; onSucceeded?: OnSucceeded }
  | { outcome: "failed"; failure: string }
  | { outcome: "dead"; reason: string; failure?: string };

/** What a submission came back with: Sui's outcome, null for a lost answer, or its refusal. */
type Submitted = SuiOutcome | null | { refused: string };

/** A sui.tx line's fields: the transaction's kind, as its stage, its digest and its subject. */
const fieldsOf = (row: SuiTransaction): DiagnosticFields => ({
  kind: row.kind,
  txDigest: row.digest,
  ...(row.stickerId !== null && { stickerId: row.stickerId }),
  ...(row.giftId !== null && { giftId: row.giftId }),
  ...(row.userId !== null && { userId: row.userId }),
  ...(row.purchaseId !== null && { purchaseId: row.purchaseId }),
});

/** The row as the database holds it now. */
function current(deps: SuiTransactionDeps, row: SuiTransaction): SuiTransaction {
  const stored = deps.db.select().from(suiTransactions).where(eq(suiTransactions.id, row.id)).get();
  if (!stored) throw new Error(`Transaction ${row.digest} is gone from sui_transactions`);
  return stored;
}

/** Matches the row while it's open and `guards` hold, so a write leaves it to a step that moved it first. */
const whileOpen = (row: SuiTransaction, ...guards: SQL[]) =>
  and(eq(suiTransactions.id, row.id), isNull(suiTransactions.outcome), ...guards);

const lapsed = (deps: SuiTransactionDeps, row: SuiTransaction) =>
  deps.clock.now().getTime() >= row.expiresAt.getTime();

/**
 * Settles an open row, with a success's record in the same database transaction, and logs how. A
 * row another step settled first is answered as it stands, its record already written by that step.
 */
function settle(
  deps: SuiTransactionDeps,
  row: SuiTransaction,
  settlement: Settlement,
  ...guards: SQL[]
): SuiTransaction {
  const settled = deps.db.transaction((tx) => {
    const updated: SuiTransaction | undefined = tx
      .update(suiTransactions)
      .set({
        outcome: settlement.outcome,
        failure: settlement.outcome === "succeeded" ? null : (settlement.failure ?? null),
        settledAt: deps.clock.now(),
      })
      .where(whileOpen(row, ...guards))
      .returning()
      .get();
    if (updated && settlement.outcome === "succeeded") {
      settlement.onSucceeded?.(tx, settlement.events);
    }
    return updated;
  });
  if (!settled) return current(deps, row);
  const fields = fieldsOf(settled);
  if (settlement.outcome === "succeeded") logInfo("sui.tx.succeeded", fields);
  if (settlement.outcome === "failed") {
    logFailure("sui.tx.failed", new Error(settlement.failure), fields);
  }
  if (settlement.outcome === "dead") {
    const { reason, failure } = settlement;
    logInfo("sui.tx.dead", { ...fields, reason: failure ? `${reason}: ${failure}` : reason });
  }
  return settled;
}

/** Settles what a submission came back with; a lost answer leaves the row open for following. */
function answered(
  deps: SuiTransactionDeps,
  row: SuiTransaction,
  answer: Submitted,
  onSucceeded?: OnSucceeded,
): Followed {
  if (answer === null) return { row, events: null };
  if ("refused" in answer) {
    const dead = settle(deps, row, {
      outcome: "dead",
      reason: "Sui refused it outright",
      failure: answer.refused,
    });
    return { row: dead, events: null };
  }
  if (!answer.ok) {
    return { row: settle(deps, row, { outcome: "failed", failure: answer.failure }), events: null };
  }
  const settled = settle(deps, row, { outcome: "succeeded", events: answer.events, onSucceeded });
  return { row: settled, events: answer.events };
}

/** Sends the row's bytes with the sender's and Shinami's signatures, as Sui takes a sponsored one. */
async function send(deps: SuiTransactionDeps, row: SuiTransaction): Promise<Submitted> {
  if (row.senderSignature === null) {
    throw new Error(`Transaction ${row.digest} has no sender's signature to submit`);
  }
  try {
    return await deps.sui.submit(row.txBytes, [row.senderSignature, row.sponsorSignature]);
  } catch (error) {
    if (error instanceof TransactionRefusedError) return { refused: error.message };
    throw error;
  }
}

/**
 * Stores the sender's signature and submits. The row is marked submitted before it's sent, so a
 * crash mid-send leaves it to be followed, never dropped while it may have run.
 */
async function submitSigned(
  deps: SuiTransactionDeps,
  row: SuiTransaction,
  senderSignature: string,
  onSucceeded?: OnSucceeded,
): Promise<Followed> {
  const marked: SuiTransaction | undefined = deps.db
    .update(suiTransactions)
    .set({ senderSignature, submittedAt: deps.clock.now() })
    .where(whileOpen(row, isNull(suiTransactions.submittedAt)))
    .returning()
    .get();
  if (!marked) return follow(deps, row, onSucceeded);
  logInfo("sui.tx.submitted", fieldsOf(marked));
  return answered(deps, marked, await send(deps, marked), onSucceeded);
}

/**
 * Has Shinami sponsor `transactionKind` for the subject's sender, then inserts its open row in one
 * database transaction with what `alongside` writes, such as the gift a deposit packs. Rejects
 * with SponsorshipError, or when an open transaction over the same subject wins the insert: the
 * sponsorship then lapses unused.
 */
export async function sponsored(
  deps: SuiTransactionDeps,
  subject: SuiTransactionSubject,
  transactionKind: Uint8Array,
  alongside?: (tx: DbTransaction) => void,
): Promise<SuiTransaction> {
  const sender = "sender" in subject ? subject.sender : deps.sui.server;
  const sponsorship = await deps.gasStation.sponsor(transactionKind, sender);
  const row = deps.db.transaction((tx) => {
    alongside?.(tx);
    return tx
      .insert(suiTransactions)
      .values({
        ...subject,
        sender,
        digest: sponsorship.digest,
        txBytes: sponsorship.txBytes,
        sponsorSignature: sponsorship.sponsorSignature,
        expiresAt: sponsorship.expiresAt,
      })
      .returning()
      .get();
  });
  logInfo("sui.tx.sponsored", fieldsOf(row));
  return row;
}

/**
 * Signs a transaction the server sends, stores the signature, submits it, and settles what Sui
 * answers, with `onSucceeded`'s record. A row another step submitted or settled is followed
 * instead, and one whose sponsorship lapsed unsubmitted is dropped. Rejects with
 * ChainUnavailableError when Sui can't take it, leaving the row submitted for following.
 */
export async function runAsServer(
  deps: SuiTransactionDeps,
  given: SuiTransaction,
  onSucceeded?: OnSucceeded,
): Promise<Followed> {
  const row = current(deps, given);
  if (row.sender !== deps.sui.server) {
    throw new Error(`Transaction ${row.digest} is sent by ${row.sender}, not the server`);
  }
  if (row.outcome !== null || row.submittedAt !== null) return follow(deps, row, onSucceeded);
  if (lapsed(deps, row)) return { row: drop(deps, row), events: null };
  return submitSigned(deps, row, await deps.sui.signAsServer(row.txBytes), onSucceeded);
}

/**
 * Runs a transaction the person signed: checks the signature is their wallet's over its bytes,
 * stores it, submits, and settles what Sui answers, with `onSucceeded`'s record. A row already
 * submitted is followed instead, so a retry after a lost answer never sends a second transaction.
 * One whose sponsorship lapsed is refused and dropped, so the flow can sponsor again at once.
 * Rejects with SignatureInvalidError, leaving the row for a good signature, and as runAsServer does.
 */
export async function runSigned(
  deps: SuiTransactionDeps,
  given: SuiTransaction,
  signature: string,
  onSucceeded?: OnSucceeded,
): Promise<Followed> {
  const row = current(deps, given);
  if (row.sender === deps.sui.server) {
    throw new Error(`Transaction ${row.digest} is the server's to sign`);
  }
  if (row.outcome !== null || row.submittedAt !== null) return follow(deps, row, onSucceeded);
  if (lapsed(deps, row)) return { row: drop(deps, row), events: null };
  const signedBySender = await isValidTransactionSignature(fromBase64(row.txBytes), signature, {
    address: row.sender,
  });
  if (!signedBySender) {
    throw new SignatureInvalidError(
      `The signature isn't ${row.sender}'s over transaction ${row.digest}`,
    );
  }
  return submitSigned(deps, row, signature, onSucceeded);
}

/**
 * Brings an open row up to date with Sui and answers it as it now stands. A transaction Sui shows
 * settles as it ran, a success with `onSucceeded`'s record and the events Sui shows. A submitted
 * one is submitted again until its sponsorship lapses, which runs it at most once since the bytes
 * are the same, and settles dead SETTLE_GRACE_MS later if Sui never shows it. One never submitted
 * can't have run, since only the server holds Shinami's signature, so it's dead at the lapse.
 */
export async function follow(
  deps: SuiTransactionDeps,
  given: SuiTransaction,
  onSucceeded?: OnSucceeded,
): Promise<Followed> {
  const row = current(deps, given);
  if (row.outcome !== null) return { row, events: null };
  if (row.submittedAt === null) {
    if (!lapsed(deps, row)) return { row, events: null };
    const dead = settle(
      deps,
      row,
      { outcome: "dead", reason: "its sponsorship lapsed before it was submitted" },
      isNull(suiTransactions.submittedAt),
    );
    return { row: dead, events: null };
  }
  const shown = await deps.sui.outcomeOf(row.digest);
  if (shown !== null) return answered(deps, row, shown, onSucceeded);
  const now = deps.clock.now().getTime();
  if (now < row.expiresAt.getTime()) {
    logInfo("sui.tx.submitted", fieldsOf(row));
    return answered(deps, row, await send(deps, row), onSucceeded);
  }
  if (now < row.expiresAt.getTime() + SETTLE_GRACE_MS) return { row, events: null };
  const dead = settle(deps, row, {
    outcome: "dead",
    reason: "Sui never showed it, and its sponsorship lapsed",
  });
  return { row: dead, events: null };
}

/**
 * Settles a row the server never submitted as dead at once, since nothing else can submit it.
 * Throws on a submitted row, which only following can settle.
 */
export function drop(deps: SuiTransactionDeps, given: SuiTransaction): SuiTransaction {
  const row = current(deps, given);
  if (row.outcome !== null) return row;
  if (row.submittedAt === null) {
    const dead = settle(
      deps,
      row,
      { outcome: "dead", reason: "dropped before it was submitted" },
      isNull(suiTransactions.submittedAt),
    );
    if (dead.outcome !== null) return dead;
  }
  throw new Error(`Transaction ${row.digest} was submitted, so only following it settles it`);
}
