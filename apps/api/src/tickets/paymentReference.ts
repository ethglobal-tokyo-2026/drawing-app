// The app's Shop reads payments' references too, through client.ts, so this module imports nothing.

/**
 * What a person passes as `pay`'s reference for one purchase: their id first, so a payment for
 * someone else's purchase is told apart without a lookup, then the purchase's.
 */
export const ticketPaymentReference = (userId: string, purchaseId: number) =>
  `tickets:${userId}:${purchaseId}`;

const PURCHASE_REFERENCE = /^tickets:(.+):([1-9][0-9]*)$/;

/** The person and the purchase a payment's reference names; null for one that names none. */
export function purchaseNamedBy(reference: string): { userId: string; purchaseId: number } | null {
  const [, userId, id] = PURCHASE_REFERENCE.exec(reference) ?? [];
  const purchaseId = Number(id);
  return userId && Number.isSafeInteger(purchaseId) ? { userId, purchaseId } : null;
}
