import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
import type { RecordGratitude } from "@drawing-app/api/client";
import { personKey, parseStored, readStored, writeStored } from "../ui/deviceStorage";
import { GAME_CONFIG } from "./gameConfig";

/**
 * Combos the server hasn't recorded yet, finished or still in play. One list per person, so someone
 * else signing in on this device never sends them, and their combos leave these be.
 */
const keyFor = (userId: string) => personKey("draw.gratitude.pending", userId);

/**
 * The longest a combo kept in play can go on in another tab after it was last kept: twice its safety
 * stop, so a late frame there has still ended it.
 */
const IN_PLAY_MAX_MS = 2 * GAME_CONFIG.maxDurationMs;

type Recorder = Pick<ApiClient, "recordGratitude">;

/**
 * How a send ended: recorded, kept on this device to send again, refused for good, or lost: it
 * didn't reach the server and this device couldn't keep it, so nothing holds it.
 */
export type GratitudeSendResult =
  | { state: "recorded" }
  | { state: "kept" }
  | { state: "refused"; error: ApiError }
  | { state: "lost" };

/**
 * The refusals that sending the same combo again can't change. A 404 counts only as gift_not_found:
 * route_not_found says nothing about the combo, so it's kept to send again.
 */
const REFUSED_CODES = new Set([
  "gift_not_found",
  "gift_not_received",
  "gratitude_already_recorded",
]);
const isRefusal = (error: ApiError) =>
  error.status === 400 || error.status === 403 || REFUSED_CODES.has(error.code);

const describeError = (error: ApiError) =>
  `${error.status === 0 ? "no answer" : `HTTP ${error.status}`}: ${error.message}`;

/** A combo kept on this device: finished, or still in play when it was last kept. */
interface Kept {
  body: RecordGratitude;
  /** When a combo still in play was last kept, ms since the epoch. A finished one has none. */
  inPlayAt?: number;
}

const isRecordGratitude = (value: unknown): value is RecordGratitude =>
  typeof value === "object" &&
  value !== null &&
  "idempotencyKey" in value &&
  typeof value.idempotencyKey === "string" &&
  "giftId" in value &&
  typeof value.giftId === "string";

const isKept = (value: unknown): value is Kept =>
  typeof value === "object" &&
  value !== null &&
  "body" in value &&
  isRecordGratitude(value.body) &&
  (!("inPlayAt" in value) || typeof value.inPlayAt === "number");

/** One person's list as stored: the combos it can send, and the entries it can't read, as they were. */
interface Pending {
  combos: Map<string, Kept>;
  unreadable: unknown[];
}

/**
 * `userId`'s list, by idempotency key. Null when storage is blocked or holds something other than a
 * list: nothing in it can be sent, and nothing may be written over it. With `quiet`, what can't be
 * read isn't logged: a screen only asking what waits would repeat it at every render.
 */
function readPending(userId: string, quiet = false): Pending | null {
  const { text: raw, blocked } = readStored(
    keyFor(userId),
    "Gratitude waiting to be sent can't be read on this device",
  );
  if (blocked) return null;
  if (raw === null) return { combos: new Map(), unreadable: [] };
  const value = parseStored(raw);
  if (!Array.isArray(value)) {
    if (!quiet) {
      console.error(
        "Gratitude waiting to be sent is unreadable, so none of it is sent and nothing is kept over it:",
        raw,
      );
    }
    return null;
  }
  const entries: unknown[] = value;
  const unreadable = entries.filter((entry) => !isKept(entry));
  if (unreadable.length > 0 && !quiet) {
    console.error(
      "Gratitude waiting to be sent has entries that are unreadable, so they stay on this device unsent:",
      JSON.stringify(unreadable),
    );
  }
  const combos = entries.filter(isKept);
  return { combos: new Map(combos.map((kept) => [kept.body.idempotencyKey, kept])), unreadable };
}

/** Whether the list was saved. */
function writePending(userId: string, { combos, unreadable }: Pending): boolean {
  const entries = [...combos.values(), ...unreadable];
  return writeStored(
    keyFor(userId),
    entries.length === 0 ? null : JSON.stringify(entries),
    `Gratitude waiting to be sent can't be saved on this device (${[...combos.keys()].join(", ")})`,
  );
}

/** Edits `userId`'s combos; `edit` says whether it changed them. False when the change can't be kept. */
function changePending(userId: string, edit: (combos: Map<string, Kept>) => boolean): boolean {
  const pending = readPending(userId);
  if (!pending) return false;
  return !edit(pending.combos) || writePending(userId, pending);
}

/** A combo that has left the outbox, and how: the server recorded it, or refused it for good. */
interface GratitudeLeft {
  idempotencyKey: string;
  result: Extract<GratitudeSendResult, { state: "recorded" | "refused" }>;
}

/** Screens showing what waits, told when a combo has left the outbox. */
const leftListeners = new Set<(left: GratitudeLeft) => void>();

/**
 * Calls `listener` whenever the server has recorded or refused a combo, on its first send or a
 * later one, so a screen that showed it as waiting can say what became of it. Returns what stops it.
 */
export function onGratitudeLeftOutbox(listener: (left: GratitudeLeft) => void): () => void {
  leftListeners.add(listener);
  return () => void leftListeners.delete(listener);
}

function forget(userId: string, left: GratitudeLeft) {
  changePending(userId, (combos) => combos.delete(left.idempotencyKey));
  for (const listener of leftListeners) listener(left);
}

/**
 * Whether `userId`'s outbox holds a combo for `giftId`, in play or finished: its gratitude is on its
 * way to the server, so a second combo for the gift would only be refused.
 */
export function isGratitudeWaiting(userId: string, giftId: string): boolean {
  const kept = readPending(userId, true)?.combos.values() ?? [];
  return [...kept].some(({ body }) => body.giftId === giftId);
}

/** Keys with a request out, so a resend doesn't repeat a send still waiting on its answer. */
const sending = new Set<string>();

/** `onDevice`: whether the outbox holds the combo, so a send that doesn't get through leaves it to send again. */
async function send(
  api: Recorder,
  userId: string,
  body: RecordGratitude,
  onDevice = true,
): Promise<GratitudeSendResult> {
  const key = body.idempotencyKey;
  if (sending.has(key)) return { state: "kept" };
  sending.add(key);
  try {
    await api.recordGratitude(body);
    forget(userId, { idempotencyKey: key, result: { state: "recorded" } });
    return { state: "recorded" };
  } catch (caught) {
    const error = apiError(caught);
    if (isRefusal(error)) {
      forget(userId, { idempotencyKey: key, result: { state: "refused", error } });
      console.error(
        `The server refused the gratitude for gift ${body.giftId} (${describeError(error)}), so this device no longer keeps it:`,
        body,
      );
      return { state: "refused", error };
    }
    if (!onDevice) {
      console.error(
        `The gratitude for gift ${body.giftId} didn't reach the server (${describeError(error)}) and this device couldn't keep it, so it's lost:`,
        body,
      );
      return { state: "lost" };
    }
    console.warn(
      `The gratitude for gift ${body.giftId} didn't reach the server (${describeError(error)}); this device keeps it and sends it again when the phone is back online, the app comes back to the front or it next opens`,
    );
    return { state: "kept" };
  } finally {
    sending.delete(key);
  }
}

/**
 * Keeps `userId`'s combo still in play on this device as it stands, unsent, so a page torn down
 * before the combo ends leaves it to send. Its finished record, under the same idempotency key,
 * takes its place.
 */
export function keepGratitudeInPlay(userId: string, body: RecordGratitude): void {
  changePending(userId, (combos) => {
    combos.set(body.idempotencyKey, { body, inPlayAt: Date.now() });
    return true;
  });
}

/**
 * Keeps `userId`'s finished combo on this device, then sends it. It stays until the server records
 * or refuses it, so a page that closes mid-request sends it again when the app next opens. When the
 * device can't keep it and the send doesn't get through, the answer is `lost`.
 */
export function sendGratitude(
  api: Recorder,
  userId: string,
  body: RecordGratitude,
): Promise<GratitudeSendResult> {
  const kept = changePending(userId, (combos) => {
    combos.set(body.idempotencyKey, { body });
    return true;
  });
  if (!kept) {
    console.error(
      `The gratitude for gift ${body.giftId} can't be kept on this device, so it's lost if this send doesn't reach the server`,
    );
  }
  return send(api, userId, body, kept);
}

/**
 * Sends every combo this device keeps for `userId`, one at a time. The app runs it as it starts, and
 * again whenever the phone comes back online or the app comes back to the front.
 * A combo kept in play was left by a page torn down mid-combo, unless another tab is still playing
 * it and sends it as it ends; so it goes once that tab would have ended it, as it's kept then.
 */
export async function resendPendingGratitude(api: Recorder, userId: string): Promise<void> {
  const inPlay: { key: string; at: number }[] = [];
  for (const { body, inPlayAt } of readPending(userId)?.combos.values() ?? []) {
    if (inPlayAt === undefined) await send(api, userId, body);
    else inPlay.push({ key: body.idempotencyKey, at: inPlayAt });
  }
  for (const { key, at } of inPlay) {
    const wait = Math.min(IN_PLAY_MAX_MS, at + IN_PLAY_MAX_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    const kept = readPending(userId)?.combos.get(key);
    if (!kept) continue;
    if (kept.inPlayAt !== undefined) {
      console.warn(
        `The gratitude for gift ${kept.body.giftId} was still in play when its page went; it's sent as it was last kept`,
      );
    }
    await send(api, userId, kept.body);
  }
}

/**
 * Sends `userId`'s kept combos now, and again whenever the phone comes back online or the app comes
 * back to the front, so a combo kept for want of a connection doesn't wait for the next launch.
 * Returns what stops it.
 */
export function resendGratitudeWhenReachable(api: Recorder, userId: string): () => void {
  const resend = () => void resendPendingGratitude(api, userId);
  const onVisibility = () => {
    if (document.visibilityState === "visible") resend();
  };
  resend();
  window.addEventListener("online", resend);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("online", resend);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
