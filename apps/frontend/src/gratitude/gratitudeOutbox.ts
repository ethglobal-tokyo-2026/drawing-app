import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
import type { RecordGratitude } from "@drawing-app/api/client";

/**
 * Finished combos the server hasn't recorded yet. One list per person, so someone else signing in on
 * this device never sends them, and their combos leave these be.
 */
const keyFor = (userId: string) => `draw.gratitude.pending.${userId}`;

type Recorder = Pick<ApiClient, "recordGratitude">;

/** How a send ended: recorded, kept on this device to send again, or refused for good. */
export type GratitudeSendResult =
  | { state: "recorded" }
  | { state: "kept" }
  | { state: "refused"; error: ApiError };

/**
 * The refusals that sending the same combo again can't change. A 404 counts only as gift_not_found:
 * route_not_found means the server doesn't record gratitude yet.
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

const isRecordGratitude = (value: unknown): value is RecordGratitude =>
  typeof value === "object" &&
  value !== null &&
  "idempotencyKey" in value &&
  typeof value.idempotencyKey === "string" &&
  "giftId" in value &&
  typeof value.giftId === "string";

/** One person's list as stored: the combos it can send, and the entries it can't read, as they were. */
interface Pending {
  combos: Map<string, RecordGratitude>;
  unreadable: unknown[];
}

/**
 * `userId`'s list, by idempotency key. Null when storage is blocked or holds something other than a
 * list: nothing in it can be sent, and nothing may be written over it.
 */
function readPending(userId: string): Pending | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(keyFor(userId));
  } catch (error) {
    console.error("Gratitude waiting to be sent can't be read on this device", error);
    return null;
  }
  if (raw === null) return { combos: new Map(), unreadable: [] };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  if (!Array.isArray(value)) {
    console.error(
      "Gratitude waiting to be sent is unreadable, so none of it is sent and nothing is kept over it:",
      raw,
    );
    return null;
  }
  const entries: unknown[] = value;
  const unreadable = entries.filter((entry) => !isRecordGratitude(entry));
  if (unreadable.length > 0) {
    console.error(
      "Gratitude waiting to be sent has entries that are unreadable, so they stay on this device unsent:",
      JSON.stringify(unreadable),
    );
  }
  const combos = entries.filter(isRecordGratitude);
  return { combos: new Map(combos.map((body) => [body.idempotencyKey, body])), unreadable };
}

/** Whether the list was saved. */
function writePending(userId: string, { combos, unreadable }: Pending): boolean {
  const entries = [...combos.values(), ...unreadable];
  try {
    if (entries.length === 0) localStorage.removeItem(keyFor(userId));
    else localStorage.setItem(keyFor(userId), JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error(
      `Gratitude waiting to be sent can't be saved on this device (${[...combos.keys()].join(", ")})`,
      error,
    );
    return false;
  }
}

/** Edits `userId`'s combos; `edit` says whether it changed them. False when the change can't be kept. */
function changePending(
  userId: string,
  edit: (combos: Map<string, RecordGratitude>) => boolean,
): boolean {
  const pending = readPending(userId);
  if (!pending) return false;
  return !edit(pending.combos) || writePending(userId, pending);
}

const forget = (userId: string, idempotencyKey: string) =>
  changePending(userId, (combos) => combos.delete(idempotencyKey));

/** Keys with a request out, so a resend doesn't repeat a send still waiting on its answer. */
const sending = new Set<string>();

async function send(
  api: Recorder,
  userId: string,
  body: RecordGratitude,
): Promise<GratitudeSendResult> {
  const key = body.idempotencyKey;
  if (sending.has(key)) return { state: "kept" };
  sending.add(key);
  try {
    await api.recordGratitude(body);
    forget(userId, key);
    return { state: "recorded" };
  } catch (caught) {
    const error = apiError(caught);
    if (isRefusal(error)) {
      forget(userId, key);
      console.error(
        `The server refused the gratitude for gift ${body.giftId} (${describeError(error)}), so this device no longer keeps it:`,
        body,
      );
      return { state: "refused", error };
    }
    console.warn(
      `The gratitude for gift ${body.giftId} didn't reach the server (${describeError(error)}); this device keeps it and sends it again when the app next opens`,
    );
    return { state: "kept" };
  } finally {
    sending.delete(key);
  }
}

/**
 * Keeps `userId`'s finished combo on this device, then sends it. It stays until the server records
 * or refuses it, so a page that closes mid-request sends it again when the app next opens.
 */
export function sendGratitude(
  api: Recorder,
  userId: string,
  body: RecordGratitude,
): Promise<GratitudeSendResult> {
  const kept = changePending(userId, (combos) => {
    combos.set(body.idempotencyKey, body);
    return true;
  });
  if (!kept) {
    console.error(
      `The gratitude for gift ${body.giftId} can't be kept on this device, so it's lost if this send doesn't reach the server`,
    );
  }
  return send(api, userId, body);
}

/** Sends every combo this device keeps for `userId`, one at a time. The app runs it once as it starts. */
export async function resendPendingGratitude(api: Recorder, userId: string): Promise<void> {
  for (const body of readPending(userId)?.combos.values() ?? []) await send(api, userId, body);
}
