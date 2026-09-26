import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
import type { RecordGratitude } from "../api/contract";

/** Finished combos the server hasn't recorded yet. */
const PENDING_KEY = "draw.gratitude.pending";

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

/** By idempotency key; empty when there's none or storage is blocked. */
function readPending(): Map<string, RecordGratitude> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PENDING_KEY);
  } catch (error) {
    console.error("Gratitude waiting to be sent can't be read on this device", error);
    return new Map();
  }
  if (raw === null) return new Map();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  if (Array.isArray(value) && value.every(isRecordGratitude)) {
    return new Map(value.map((body) => [body.idempotencyKey, body]));
  }
  console.error("Gratitude waiting to be sent is unreadable, so it can't be sent:", raw);
  return new Map();
}

function writePending(pending: ReadonlyMap<string, RecordGratitude>) {
  try {
    if (pending.size === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify([...pending.values()]));
  } catch (error) {
    console.error(
      `Gratitude waiting to be sent can't be saved on this device (${[...pending.keys()].join(", ")})`,
      error,
    );
  }
}

function forget(idempotencyKey: string) {
  const pending = readPending();
  if (pending.delete(idempotencyKey)) writePending(pending);
}

/** Keys with a request out, so a resend doesn't repeat a send still waiting on its answer. */
const sending = new Set<string>();

async function send(api: Recorder, body: RecordGratitude): Promise<GratitudeSendResult> {
  const key = body.idempotencyKey;
  if (sending.has(key)) return { state: "kept" };
  sending.add(key);
  try {
    await api.recordGratitude(body);
    forget(key);
    return { state: "recorded" };
  } catch (caught) {
    const error = apiError(caught);
    if (isRefusal(error)) {
      forget(key);
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
 * Keeps a finished combo on this device, then sends it. It stays until the server records or
 * refuses it, so a page that closes mid-request sends it again when the app next opens.
 */
export function sendGratitude(api: Recorder, body: RecordGratitude): Promise<GratitudeSendResult> {
  const pending = readPending();
  pending.set(body.idempotencyKey, body);
  writePending(pending);
  return send(api, body);
}

/** Sends every combo this device still keeps, one at a time. The app runs it once as it starts. */
export async function resendPendingGratitude(api: Recorder): Promise<void> {
  for (const body of readPending().values()) await send(api, body);
}
