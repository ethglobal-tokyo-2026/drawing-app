/**
 * This device's storage (localStorage), by key. Storage can refuse a read or a write (blocked in some
 * private modes and webviews, or full), so each refusal is logged with the store's own message and
 * never thrown. An entry a store can't parse or validate is logged whole by that store, which says
 * what it does instead.
 */

/** The key of a store kept for one person, so someone else signing in on this device never reads it. */
export const personKey = (store: string, userId: string) => `${store}.${userId}`;

/** What's kept under a key: its text, or null when there's none. */
interface Stored {
  text: string | null;
  /** Storage refused the read, so nothing kept can be known, and a write may land over it. */
  blocked: boolean;
}

/** What's kept under `key`. A read storage refuses is logged with `failure`, and reads as nothing kept. */
export function readStored(key: string, failure: string): Stored {
  try {
    // Tests outside a browser have no storage.
    if (typeof localStorage === "undefined") return { text: null, blocked: true };
    return { text: localStorage.getItem(key), blocked: false };
  } catch (error) {
    console.error(failure, error);
    return { text: null, blocked: true };
  }
}

/** `text` as JSON, or undefined when it isn't JSON: the store logs it as unreadable. */
export function parseStored(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Keeps `text` under `key`, or nothing for null. False when storage refused, logged with `failure`. */
export function writeStored(key: string, text: string | null, failure: string): boolean {
  try {
    if (text === null) localStorage.removeItem(key);
    else localStorage.setItem(key, text);
    return true;
  } catch (error) {
    console.error(failure, error);
    return false;
  }
}

/** How many visits have been counted under `key`: 0 when there's no record or it's unreadable. */
export function visitsCounted(key: string): number {
  const { text } = readStored(key, `The visit count ${key} can't be read on this device`);
  const visits = Number(text ?? 0);
  if (!Number.isInteger(visits) || visits < 0) {
    console.error(`The visit count ${key} is unreadable, so it's counted afresh:`, text);
    return 0;
  }
  return visits;
}

/** Counts a visit under `key`, and returns how many there have been, this one included. */
export function countVisit(key: string): number {
  const visits = visitsCounted(key) + 1;
  writeStored(key, String(visits), `The visit count ${key} can't be saved on this device`);
  return visits;
}
