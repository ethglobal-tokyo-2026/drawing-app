import { personSwitchSessions, users, type Db } from "@drawing-app/db";
import { privySubject } from "@drawing-app/line-auth/line-privy-jwt";
import { and, eq, isNull, lte } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";
import { PersonSessionError } from "../errors.ts";
import { pendingPersonOwnership, withPersonOwnership } from "./personOwnership.ts";
import { unseenGratitudeCount } from "../gratitude/feed.ts";
import { toMe, toPerson } from "../shapes.ts";
import { newStickerCount } from "../stickerBoards/board.ts";
import type { PersonSwitchConfig, ResolvedSession, SessionEnvelope } from "./sessionShapes.ts";

export const BIGWHEEL_ID = "d5984df6-db28-44f2-801c-2f2f5b565463";
export const HANA_ID = "bef03287-50ee-4e51-aaef-a9dc1303b854";

/** A configured account while it exists and has not been deleted. */
export const liveSessionUser = (db: Db, userId: string) =>
  db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

/** Only the configured authenticated operator can select another account. */
export const canSelectPerson = (config: PersonSwitchConfig, authenticatedUserId: string) =>
  config.mode !== "off" &&
  config.operatorUserId === authenticatedUserId &&
  config.hanaUserId !== null;

/**
 * Only the configured operator marks Kyoto Seika Subjects for deletion, and only acting as themself,
 * so a recording made acting as Hana never shows a mark.
 */
export const marksKyotoSeikaSubjects = (
  config: PersonSwitchConfig,
  session: Pick<ResolvedSession, "authenticatedUserId" | "selectedUserId">,
) =>
  config.operatorUserId !== null &&
  config.operatorUserId === session.authenticatedUserId &&
  config.operatorUserId === session.selectedUserId;

/** Validate retained configuration even while switching is off; never create missing users. */
export function validatePersonSwitchConfig(db: Db, config: PersonSwitchConfig): void {
  if (config.operatorUserId === null && config.hanaUserId === null && config.mode === "off") return;
  if (config.operatorUserId !== BIGWHEEL_ID || config.hanaUserId !== HANA_ID) {
    throw new Error("Person switching requires the configured BIGWHEEL and existing Hana IDs");
  }
  const operator = liveSessionUser(db, config.operatorUserId);
  const hana = liveSessionUser(db, config.hanaUserId);
  if (!operator?.lineUserId || hana?.lineUserId !== "dev-video-hana") {
    throw new Error(
      "Person switching requires live BIGWHEEL and Hana with her stored LINE identity",
    );
  }
}

/** Expired browser selections are removed at startup and before a new selection. */
export function prunePersonSwitchSessions(db: Pick<Db, "delete">, now: Date): void {
  db.delete(personSwitchSessions).where(lte(personSwitchSessions.expiresAt, now)).run();
}

/** Select one configured live account, committing only the browser's expected version. */
export function selectPerson(
  deps: AppDeps,
  session: ResolvedSession,
  targetUserId: string,
): Promise<SessionEnvelope> {
  if (!canSelectPerson(deps.personSwitch, session.authenticatedUserId)) {
    return Promise.reject(new PersonSessionError("person_switch_forbidden"));
  }
  return withPersonOwnership(deps, session, async () => {
    if (
      !canSelectPerson(deps.personSwitch, session.authenticatedUserId) ||
      ![deps.personSwitch.operatorUserId, deps.personSwitch.hanaUserId].includes(targetUserId) ||
      !liveSessionUser(deps.db, targetUserId)?.lineUserId ||
      liveSessionUser(deps.db, deps.personSwitch.hanaUserId ?? "")?.lineUserId !== "dev-video-hana"
    ) {
      throw new PersonSessionError("person_switch_forbidden");
    }
    const selected = deps.db.transaction(
      (tx) => {
        prunePersonSwitchSessions(tx, deps.clock.now());
        const pending = pendingPersonOwnership(deps);
        if (pending) throw new PersonSessionError("person_switch_busy", pending);
        const selectionVersion = deps.ids.uuid();
        const existing = tx
          .select()
          .from(personSwitchSessions)
          .where(eq(personSwitchSessions.sessionId, session.sessionId))
          .get();
        if (existing) {
          const changed = tx
            .update(personSwitchSessions)
            .set({ selectedUserId: targetUserId, selectionVersion })
            .where(
              and(
                eq(personSwitchSessions.sessionId, session.sessionId),
                eq(personSwitchSessions.authenticatedUserId, session.authenticatedUserId),
                eq(personSwitchSessions.selectedUserId, session.selectedUserId),
                eq(personSwitchSessions.selectionVersion, session.selectionVersion ?? ""),
              ),
            )
            .run();
          if (changed.changes !== 1) throw new PersonSessionError("session_account_changed");
        } else {
          if (
            session.selectionVersion !== session.sessionId ||
            session.selectedUserId !== session.authenticatedUserId
          )
            throw new PersonSessionError("session_account_changed");
          const inserted = tx
            .insert(personSwitchSessions)
            .values({
              sessionId: session.sessionId,
              authenticatedUserId: session.authenticatedUserId,
              selectedUserId: targetUserId,
              selectionVersion,
              expiresAt: session.expiresAt,
            })
            .onConflictDoNothing()
            .run();
          if (inserted.changes !== 1) throw new PersonSessionError("session_account_changed");
        }
        return sessionEnvelope(deps, {
          ...session,
          selectedUserId: targetUserId,
          selectionVersion,
        });
      },
      { behavior: "immediate" },
    );
    logInfo("person.selection", {
      authenticatedUserId: session.authenticatedUserId,
      selectedUserId: targetUserId,
      selectionVersion: selected.selectionVersion,
      outcome: "authorized",
    });
    return selected;
  });
}

/** Bootstrap and sign-in metadata always retain the authenticated LINE profile. */
export function sessionEnvelope(deps: AppDeps, session: ResolvedSession): SessionEnvelope {
  const authenticated = liveSessionUser(deps.db, session.authenticatedUserId);
  const selected = liveSessionUser(deps.db, session.selectedUserId);
  if (!authenticated?.lineUserId || !selected?.lineUserId) {
    throw new Error("Session account disappeared while building its profile");
  }
  const enabled = canSelectPerson(deps.personSwitch, session.authenticatedUserId);
  const allowedSelections = enabled
    ? [deps.personSwitch.operatorUserId, deps.personSwitch.hanaUserId].flatMap((id) => {
        const user = id === null ? undefined : liveSessionUser(deps.db, id);
        return user ? [toPerson(user)] : [];
      })
    : [];
  return {
    me: toMe(selected, {
      newStickerCount: newStickerCount(deps.db, selected.id),
      unseenGratitudeCount: unseenGratitudeCount(deps.db, selected.id),
    }),
    authenticated: {
      id: authenticated.id,
      lineUserId: authenticated.lineUserId,
      lineDisplayName: authenticated.lineDisplayName,
      linePictureUrl: authenticated.linePictureUrl,
    },
    allowedSelections,
    selectionVersion: session.selectionVersion,
    expectedPrivySubject: privySubject(deps.lineChannelId, selected.lineUserId),
    expectedSuiAddress: selected.suiAddress,
    personSwitchMode: enabled ? deps.personSwitch.mode : "off",
    marksKyotoSeikaSubjects: marksKyotoSeikaSubjects(deps.personSwitch, session),
  };
}
