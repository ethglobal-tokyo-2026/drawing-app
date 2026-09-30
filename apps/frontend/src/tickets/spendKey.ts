import { newIdempotencyKey } from "../api/idempotencyKey";
import { personKey, readStored, writeStored } from "../ui/deviceStorage";

/**
 * The key of a ticket spend, kept on this device until the drawing screen has kept the ticket use it
 * spent, so the first spend after a reload or a closed webview sends it again. One per person, so
 * someone else signing in on this device never sends it, and their spends leave it be.
 */
const keyFor = (userId: string) => personKey("draw.tickets.spendKey", userId);

/**
 * A key as newIdempotencyKey makes it. A kept key goes only once its ticket use is kept, so one the
 * server would refuse must never be sent: every spend would fail.
 */
const SPEND_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** `userId`'s kept key; null when there's none, it's unreadable, or storage is blocked. */
export function keptSpendKey(userId: string): string | null {
  const { text: raw } = readStored(
    keyFor(userId),
    "A ticket spend's key can't be read on this device",
  );
  if (raw === null || SPEND_KEY.test(raw)) return raw;
  console.error("A ticket spend's kept key is unreadable, so the next spend sends a new one:", raw);
  return null;
}

/** The key for `userId`'s spend: the one kept from a spend whose ticket use isn't kept, or a new one, kept. */
export function spendKeyFor(userId: string): string {
  const kept = keptSpendKey(userId);
  if (kept !== null) return kept;
  const key = newIdempotencyKey();
  writeStored(
    keyFor(userId),
    key,
    `A ticket spend's key (${key}) can't be kept on this device; a reload before its answer comes may spend another ticket`,
  );
  return key;
}

/** Drops `key` once its ticket use is kept, unless a later spend's key has taken its place. */
export function forgetSpendKey(userId: string, key: string): void {
  const failure = `A kept ticket use's spend key (${key}) can't be cleared on this device`;
  if (readStored(keyFor(userId), failure).text === key) writeStored(keyFor(userId), null, failure);
}
