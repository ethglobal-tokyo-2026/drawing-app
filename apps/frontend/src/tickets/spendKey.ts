import { newIdempotencyKey } from "../api/idempotencyKey";

/**
 * The key of a ticket spend that hasn't landed, kept on this device until a spend with it lands, so
 * the first spend after a reload or a closed webview sends it again. One per person, so someone else
 * signing in on this device never sends it, and their spends leave it be.
 */
const keyFor = (userId: string) => `draw.tickets.spendKey.${userId}`;

/**
 * A key as newIdempotencyKey makes it. A kept key goes only once a spend with it lands, so one the
 * server would refuse must never be sent: every spend would fail.
 */
const SPEND_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** `userId`'s kept key; null when there's none, it's unreadable, or storage is blocked. */
function readKept(userId: string): string | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(keyFor(userId));
  } catch (error) {
    console.error("A ticket spend's key can't be read on this device", error);
    return null;
  }
  if (raw === null || SPEND_KEY.test(raw)) return raw;
  console.error("A ticket spend's kept key is unreadable, so the next spend sends a new one:", raw);
  return null;
}

/** The key for `userId`'s spend: the one kept from a spend that hasn't landed, or a new one, kept. */
export function spendKeyFor(userId: string): string {
  const kept = readKept(userId);
  if (kept !== null) return kept;
  const key = newIdempotencyKey();
  try {
    localStorage.setItem(keyFor(userId), key);
  } catch (error) {
    console.error(
      `A ticket spend's key (${key}) can't be kept on this device; a reload before its answer comes may spend another ticket`,
      error,
    );
  }
  return key;
}

/** Drops `key` once a spend with it lands, unless a later spend's key has taken its place. */
export function forgetSpendKey(userId: string, key: string): void {
  try {
    if (localStorage.getItem(keyFor(userId)) === key) localStorage.removeItem(keyFor(userId));
  } catch (error) {
    console.error(`A landed ticket spend's key (${key}) can't be cleared on this device`, error);
  }
}
