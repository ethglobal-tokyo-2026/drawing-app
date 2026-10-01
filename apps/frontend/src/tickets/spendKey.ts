import { parseStored, personKey, readStored, writeStored } from "../ui/deviceStorage";

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

/** A kept spend's key, and whether the server refused the last spend sent with it, spending nothing. */
export interface KeptSpend {
  key: string;
  refused: boolean;
}

const isKeptSpend = (value: unknown): value is KeptSpend =>
  typeof value === "object" &&
  value !== null &&
  "key" in value &&
  typeof value.key === "string" &&
  SPEND_KEY.test(value.key) &&
  "refused" in value &&
  typeof value.refused === "boolean";

/** `userId`'s kept spend; null when there's none, it's unreadable, or storage is blocked. */
export function keptSpend(userId: string): KeptSpend | null {
  const { text } = readStored(keyFor(userId), "A ticket spend's key can't be read on this device");
  if (text === null) return null;
  const kept = parseStored(text);
  if (isKeptSpend(kept)) return kept;
  // Cleared, since it can never be sent, so it's logged once rather than at every read.
  console.error(
    "A ticket spend's kept key is unreadable, so it's cleared and the next spend sends a new one:",
    text,
  );
  writeStored(
    keyFor(userId),
    null,
    "An unreadable ticket spend's key can't be cleared on this device",
  );
  return null;
}

/** Keeps `spend` as `userId`'s. */
export function keepSpend(userId: string, spend: KeptSpend): void {
  writeStored(
    keyFor(userId),
    JSON.stringify(spend),
    `A ticket spend's key (${spend.key}) can't be kept on this device; a reload before its answer comes may spend another ticket`,
  );
}

/** Drops `key` once its ticket use is kept, unless a later spend's key has taken its place. */
export function forgetSpendKey(userId: string, key: string): void {
  if (keptSpend(userId)?.key !== key) return;
  writeStored(
    keyFor(userId),
    null,
    `A kept ticket use's spend key (${key}) can't be cleared on this device`,
  );
}
