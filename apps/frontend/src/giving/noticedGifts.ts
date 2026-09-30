/** Which received gifts this device has shown the giver's notice for, so each shows once. */

const KEY = "draw.gifts.noticed";

/** A sticker can come back to you and be given again, so a receive is its sticker and its time. */
export const receiveOf = (g: { stickerId: string; receivedAt: number }) =>
  `${g.stickerId}@${g.receivedAt}`;

/** Noticed on this page, so a notice this device can't save still shows once per session. */
const noticedHere = new Set<string>();
/** The record was started on this page, so a device that can't save it still counts as started. */
let startedHere = false;

interface NoticeRecord {
  noticed: Set<string>;
  /** Whether this device has a record at all: one with none has shown no notice yet. */
  recorded: boolean;
}

function readRecord(): NoticeRecord {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (error) {
    // Storage that can't be read can't be started either, so notices go on without a start.
    console.error(`Can't read ${KEY} on this device`, error);
    return { noticed: new Set(noticedHere), recorded: true };
  }
  if (raw === null) return { noticed: new Set(noticedHere), recorded: startedHere };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  if (Array.isArray(value) && value.every((k) => typeof k === "string")) {
    return { noticed: new Set([...value, ...noticedHere]), recorded: true };
  }
  console.error("Noticed gifts are unreadable, so the newest received gift shows again:", raw);
  return { noticed: new Set(noticedHere), recorded: true };
}

function saveNoticed(noticed: ReadonlySet<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...noticed]));
  } catch (error) {
    console.error(`Can't save ${KEY} on this device`, error);
  }
}

/**
 * The newest received gift whose notice this device hasn't shown, or null. Reads only. A device
 * with no record has none until `noticeReceivesFromNow` starts one.
 */
export function newestUnnoticed<T extends { stickerId: string; receivedAt: number }>(
  received: readonly T[],
): T | null {
  const { noticed, recorded } = readRecord();
  if (!recorded) return null;
  let next: T | null = null;
  for (const g of received) {
    if (!noticed.has(receiveOf(g)) && (!next || g.receivedAt > next.receivedAt)) next = g;
  }
  return next;
}

/** Marks the gifts passed in as noticed: each gets its own notice, one after another. */
export function markNoticed(received: readonly { stickerId: string; receivedAt: number }[]) {
  const { noticed } = readRecord();
  for (const g of received) {
    noticed.add(receiveOf(g));
    noticedHere.add(receiveOf(g));
  }
  saveNoticed(noticed);
}

/**
 * A device with no record would show a notice for every gift ever received, one after another, as
 * on a new phone. On its first board, what's already received counts as noticed, and only later
 * receives show one. Does nothing once the device has a record.
 */
export function noticeReceivesFromNow(
  received: readonly { stickerId: string; receivedAt: number }[],
) {
  if (readRecord().recorded) return;
  startedHere = true;
  markNoticed(received);
}

/** Forgets what this page noticed and started, as a page loaded anew would. */
export function forgetNoticedHere() {
  noticedHere.clear();
  startedHere = false;
}
