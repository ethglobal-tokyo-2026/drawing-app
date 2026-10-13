import { gifts } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { PersonSessionError } from "../errors.ts";
import { assertCurrentPerson, assertPersonTransferAllowed } from "../session/personOwnership.ts";
import { liveSessionUser } from "../session/personSwitch.ts";
import type { PersonSwitchConfig, ResolvedSession } from "../session/sessionShapes.ts";
import { refuse } from "../shapes.ts";
import { ownGift } from "./giftTransactions.ts";
import { recordMessageOutcome } from "./packaging.ts";

/** Retained participants determine delivery and LINE exclusions even while selection is off. */
export function deliveryAtPackaging(
  config: PersonSwitchConfig,
  gift: { giverId: string; forUserId: string | null },
): "line" | "person" {
  const { operatorUserId, hanaUserId } = config;
  return operatorUserId !== null &&
    hanaUserId !== null &&
    ((gift.giverId === operatorUserId && gift.forUserId === hanaUserId) ||
      (gift.giverId === hanaUserId && gift.forUserId === operatorUserId))
    ? "person"
    : "line";
}

/** A private gift retains its original delivery and configured targeted destination. */
export function giftDeliveryFor(
  config: PersonSwitchConfig,
  gift: { giverId: string; forUserId: string | null; delivery: "line" | "person" },
): "line" | "person" {
  return gift.delivery === "person" && deliveryAtPackaging(config, gift) === "person"
    ? "person"
    : "line";
}

/** Giver-only recovery reads the persisted destination; the client keeps no delivery flag. */
export function giftDelivery(deps: AppDeps, userId: string, giftId: string) {
  const owned = ownGift(
    deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get(),
    userId,
    giftId,
  );
  return owned.refusal === null
    ? ({ refusal: null, delivery: giftDeliveryFor(deps.personSwitch, owned.gift) } as const)
    : owned;
}

/** A private delivery acknowledges the matching deposited gift under the current operator selection. */
export async function deliverPersonGift(
  deps: AppDeps,
  session: ResolvedSession,
  giftId: string,
  attemptId: string,
) {
  assertCurrentPerson(deps, session);
  if (
    deps.personSwitch.mode !== "live" ||
    session.authenticatedUserId !== deps.personSwitch.operatorUserId ||
    liveSessionUser(deps.db, deps.personSwitch.hanaUserId ?? "")?.lineUserId !== "dev-video-hana"
  ) {
    throw new PersonSessionError("person_switch_forbidden");
  }
  const owned = ownGift(
    deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get(),
    session.selectedUserId,
    giftId,
  );
  if (owned.refusal !== null) return owned;
  if (giftDeliveryFor(deps.personSwitch, owned.gift) !== "person") {
    throw new PersonSessionError("person_switch_forbidden");
  }
  assertPersonTransferAllowed(deps, [owned.gift.giverId, owned.gift.forUserId]);
  if (
    owned.gift.status === "packed" &&
    (deps.sui ? (await deps.sui.readGift(giftId)).status : owned.gift.escrowStatus) !== "pending"
  ) {
    return refuse("not_deposited", `Gift ${giftId}'s escrow object is not holding its sticker`);
  }
  assertCurrentPerson(deps, session);
  return recordMessageOutcome(deps, session.selectedUserId, giftId, attemptId, "sent");
}

/** Hana has no real LINE account; her menu and outgoing notices are explicitly unavailable. */
export const personLineUnavailable = (config: PersonSwitchConfig | undefined, userId: string) =>
  config?.hanaUserId != null && config.hanaUserId === userId;
