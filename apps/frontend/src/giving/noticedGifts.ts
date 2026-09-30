import { parseStored, readStored, writeStored } from "../ui/deviceStorage";

/** Which received gifts this device has shown the giver's notice for, so each shows once. */
const KEY = "draw.gifts.noticed";

/** A sticker can come back to you and be given again, so a receive is its sticker and its time. */
export const receiveOf = (g: { stickerId: string; receivedAt: number }) =>
  `${g.stickerId}@${g.receivedAt}`;

/** Noticed on this page, so a notice this device can't save still shows once per session. */
const noticedHere = new Set<string>();

function readNoticed(): Set<string> {
  const { text: raw } = readStored(KEY, `Can't read ${KEY} on this device`);
  if (raw === null) return new Set(noticedHere);
  const value = parseStored(raw);
  if (Array.isArray(value) && value.every((k) => typeof k === "string")) {
    return new Set([...value, ...noticedHere]);
  }
  console.error("Noticed gifts are unreadable, so the newest received gift shows again:", raw);
  return new Set(noticedHere);
}

const saveNoticed = (noticed: ReadonlySet<string>) =>
  writeStored(KEY, JSON.stringify([...noticed]), `Can't save ${KEY} on this device`);

/** The newest received gift whose notice this device hasn't shown, or null. Reads only. */
export function newestUnnoticed<T extends { stickerId: string; receivedAt: number }>(
  received: readonly T[],
): T | null {
  const noticed = readNoticed();
  let next: T | null = null;
  for (const g of received) {
    if (!noticed.has(receiveOf(g)) && (!next || g.receivedAt > next.receivedAt)) next = g;
  }
  return next;
}

/** Marks the gifts passed in as noticed: each gets its own notice, one after another. */
export function markNoticed(received: readonly { stickerId: string; receivedAt: number }[]) {
  const noticed = readNoticed();
  for (const g of received) {
    noticed.add(receiveOf(g));
    noticedHere.add(receiveOf(g));
  }
  saveNoticed(noticed);
}
