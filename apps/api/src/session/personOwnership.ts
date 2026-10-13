import { gifts, personSwitchSessions, stickers, suiTransactions } from "@drawing-app/db";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { PersonSessionError } from "../errors.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import { canSelectPerson, liveSessionUser } from "./personSwitch.ts";
import type { PendingPersonOwnership } from "./personOwnershipShapes.ts";
import type { ResolvedSession } from "./sessionShapes.ts";

const pair = (deps: AppDeps) =>
  [deps.personSwitch.operatorUserId, deps.personSwitch.hanaUserId].filter(
    (id): id is string => id !== null,
  );

/** Recheck after waiting: a request belongs to the account and version that admitted it. */
export function assertCurrentPerson(deps: AppDeps, session: ResolvedSession): void {
  const enabled = canSelectPerson(deps.personSwitch, session.authenticatedUserId);
  const stored = enabled
    ? deps.db
        .select()
        .from(personSwitchSessions)
        .where(
          and(
            eq(personSwitchSessions.sessionId, session.sessionId),
            eq(personSwitchSessions.authenticatedUserId, session.authenticatedUserId),
            gt(personSwitchSessions.expiresAt, deps.clock.now()),
          ),
        )
        .get()
    : undefined;
  if (
    session.expiresAt <= deps.clock.now() ||
    !liveSessionUser(deps.db, session.authenticatedUserId) ||
    !liveSessionUser(deps.db, session.selectedUserId) ||
    (stored?.selectedUserId ?? session.authenticatedUserId) !== session.selectedUserId ||
    (enabled ? (stored?.selectionVersion ?? session.sessionId) : null) !== session.selectionVersion
  ) {
    throw new PersonSessionError("session_account_changed");
  }
}

/** The configured pair's lock precedes every gift, sticker and payer lock. */
function withPairOwnership<T>(deps: AppDeps, run: () => Promise<T>): Promise<T> {
  const ids = pair(deps);
  return deps.personSwitch.mode === "off" || ids.length !== 2
    ? run()
    : oneAtATime(`person-ownership:${ids.join(":")}`, run);
}

/** HTTP entry points acquire once, including ordinary gifts whose recipient is not known yet. */
export function withPersonOwnership<T>(
  deps: AppDeps,
  session: ResolvedSession,
  run: () => Promise<T>,
): Promise<T> {
  return withPairOwnership(deps, async () => {
    assertCurrentPerson(deps, session);
    return run();
  });
}

/** Background entry points acquire before domain locks; nested domain functions never reacquire. */
export function withPersonBackgroundOwnership<T>(
  deps: AppDeps,
  userIds: readonly string[],
  run: () => Promise<T>,
): Promise<T> {
  return userIds.some((id) => pair(deps).includes(id))
    ? withPairOwnership(deps, async () => {
        assertPersonTransferAllowed(deps, userIds);
        return run();
      })
    : run();
}

/** Verification permits authentication and reads while transfers involving either account wait. */
export function assertPersonTransferAllowed(
  deps: AppDeps,
  userIds: readonly (string | null | undefined)[],
): void {
  if (
    deps.personSwitch.mode === "verify" &&
    userIds.some((id) => id != null && pair(deps).includes(id))
  ) {
    throw new PersonSessionError("person_switch_forbidden");
  }
}

/** People a gift involves, including its Original Artist and durable token-first claimant. */
export function giftOwnershipPeople(deps: AppDeps, giftId: string): string[] {
  const row = deps.db
    .select({
      giver: gifts.giverId,
      receiver: gifts.receiverId,
      waiting: gifts.forUserId,
      artist: stickers.artistId,
    })
    .from(gifts)
    .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
    .where(eq(gifts.id, giftId))
    .get();
  const claimants = deps.db
    .select({ userId: suiTransactions.requestedByUserId })
    .from(suiTransactions)
    .where(eq(suiTransactions.giftId, giftId))
    .all();
  return [...(row ? Object.values(row) : []), ...claimants.map((r) => r.userId)].filter(
    (id): id is string => id !== null,
  );
}

/** Open transactions and unfinished delivery prevent selection until their ordinary recovery settles. */
export function pendingPersonOwnership(deps: AppDeps): PendingPersonOwnership | null {
  const ids = pair(deps);
  if (ids.length !== 2) return null;
  const transaction = deps.db
    .select({
      kind: suiTransactions.kind,
      giftId: suiTransactions.giftId,
      stickerId: stickers.id,
      stickerNo: stickers.number,
    })
    .from(suiTransactions)
    .leftJoin(gifts, eq(gifts.id, suiTransactions.giftId))
    .leftJoin(
      stickers,
      or(eq(stickers.id, suiTransactions.stickerId), eq(stickers.id, gifts.stickerId)),
    )
    .where(
      and(
        or(
          isNull(suiTransactions.outcome),
          and(
            eq(suiTransactions.kind, "claim"),
            eq(suiTransactions.outcome, "succeeded"),
            inArray(gifts.status, ["packed", "sent"]),
          ),
        ),
        or(
          inArray(suiTransactions.userId, ids),
          inArray(suiTransactions.requestedByUserId, ids),
          inArray(gifts.giverId, ids),
          inArray(gifts.receiverId, ids),
          inArray(gifts.forUserId, ids),
          inArray(stickers.artistId, ids),
          inArray(stickers.ownerId, ids),
        ),
      ),
    )
    .get();
  if (transaction) return transaction;
  const delivery = deps.db
    .select({ giftId: gifts.id, stickerId: gifts.stickerId, stickerNo: stickers.number })
    .from(gifts)
    .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
    .where(
      and(
        eq(gifts.status, "packed"),
        or(
          inArray(gifts.giverId, ids),
          inArray(gifts.receiverId, ids),
          inArray(gifts.forUserId, ids),
          inArray(stickers.artistId, ids),
        ),
      ),
    )
    .get();
  return delivery ? { kind: "delivery", ...delivery } : null;
}
