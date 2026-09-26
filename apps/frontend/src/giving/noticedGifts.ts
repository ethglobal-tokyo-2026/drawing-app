/** Which received gifts this device has shown the giver's notice for, so each shows once. */

const KEY = "draw.gifts.noticed";

/** A sticker can come back to you and be given again, so a receive is its sticker and its time. */
const keyOf = (g: { stickerId: string; receivedAt: number }) => `${g.stickerId}@${g.receivedAt}`;

function readNoticed(): Set<string> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (error) {
    console.error(`Can't read ${KEY} on this device`, error);
    return new Set();
  }
  if (raw === null) return new Set();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  if (Array.isArray(value) && value.every((k) => typeof k === "string")) return new Set(value);
  console.error("Noticed gifts are unreadable, so the newest received gift shows again:", raw);
  return new Set();
}

function saveNoticed(noticed: ReadonlySet<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...noticed]));
  } catch (error) {
    console.error(`Can't save ${KEY} on this device`, error);
  }
}

/** The newest received gift whose notice this device hasn't shown, or null. Reads only. */
export function newestUnnoticed<T extends { stickerId: string; receivedAt: number }>(
  received: readonly T[],
): T | null {
  const noticed = readNoticed();
  let next: T | null = null;
  for (const g of received) {
    if (!noticed.has(keyOf(g)) && (!next || g.receivedAt > next.receivedAt)) next = g;
  }
  return next;
}

/** Marks every gift passed in as noticed: one notice shows for them all. */
export function markNoticed(received: readonly { stickerId: string; receivedAt: number }[]) {
  const noticed = readNoticed();
  for (const g of received) noticed.add(keyOf(g));
  saveNoticed(noticed);
}
