/**
 * Gifts made on this device, one localStorage entry per gift, checked on the way out.
 * A stand-in until gifts live on the server; see giftBackend.ts.
 */

const KEY_PREFIX = "draw.gift.";

const NOT_SENT_REASONS = [
  "picker_cancelled",
  "send_failed",
  "taken_out",
  /** Still packed when the same sticker was packed again, e.g. after the app closed mid-send. */
  "abandoned",
] as const;

export type NotSentReason = (typeof NOT_SENT_REASONS)[number];

interface GiftFields {
  id: string;
  stickerId: string;
  /** When the sticker went into the bag. */
  packedAt: number;
}

export type GiftRecord =
  /** In the bag, not sent yet: LINE's picker is about to open or is open. */
  | (GiftFields & { state: "packed" })
  | (GiftFields & { state: "sent"; sentAt: number })
  /** The gift message never left, so the sticker is back. `error` says why sending failed. */
  | (GiftFields & { state: "not_sent"; closedAt: number; reason: NotSentReason; error?: string });

const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNotSentReason = (v: unknown): v is NotSentReason => NOT_SENT_REASONS.some((r) => r === v);

/** A stored gift, or what's wrong with it: localStorage hands back untyped values. */
function readGift(v: unknown): GiftRecord | string {
  if (typeof v !== "object" || v === null) return "not an object";
  if (!("id" in v) || !isText(v.id)) return "no id";
  if (!("stickerId" in v) || !isText(v.stickerId)) return "no stickerId";
  if (!("packedAt" in v) || typeof v.packedAt !== "number") return "no packedAt";
  const gift = { id: v.id, stickerId: v.stickerId, packedAt: v.packedAt };
  const state = "state" in v ? v.state : undefined;
  if (state === "packed") return { ...gift, state };
  if (state === "sent") {
    if (!("sentAt" in v) || typeof v.sentAt !== "number") return "sent, with no sentAt";
    return { ...gift, state, sentAt: v.sentAt };
  }
  if (state === "not_sent") {
    if (!("closedAt" in v) || typeof v.closedAt !== "number") return "not sent, with no closedAt";
    if (!("reason" in v) || !isNotSentReason(v.reason)) return "not sent, for no known reason";
    const error = "error" in v ? v.error : undefined;
    if (error !== undefined && typeof error !== "string") return "an error that isn't text";
    return { ...gift, state, closedAt: v.closedAt, reason: v.reason, ...(error && { error }) };
  }
  return `an unknown state (${JSON.stringify(state)})`;
}

export type GiftStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem">;

export interface GiftStore {
  list: () => GiftRecord[];
  get: (id: string) => GiftRecord | undefined;
  put: (record: GiftRecord) => void;
  subscribe: (listener: () => void) => () => void;
  /** The same array until a gift changes, as useSyncExternalStore requires. */
  snapshot: () => readonly GiftRecord[];
}

export function createGiftStore(
  storage: GiftStorage,
  report: (message: string) => void = console.error,
): GiftStore {
  const listeners = new Set<() => void>();
  let cached: readonly GiftRecord[] | null = null;

  const read = (): GiftRecord[] => {
    const records: GiftRecord[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      let value: unknown;
      try {
        value = JSON.parse(storage.getItem(key) ?? "");
      } catch (error) {
        report(`Skipped stored gift ${key}: not JSON (${String(error)})`);
        continue;
      }
      const gift = readGift(value);
      if (typeof gift === "string") report(`Skipped stored gift ${key}: ${gift}`);
      else records.push(gift);
    }
    return records.sort((a, b) => a.packedAt - b.packedAt);
  };

  const snapshot = () => (cached ??= read());

  return {
    list: () => [...snapshot()],
    get: (id) => snapshot().find((r) => r.id === id),
    put: (record) => {
      storage.setItem(KEY_PREFIX + record.id, JSON.stringify(record));
      cached = null;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
  };
}

/** Storage that lasts as long as the page. */
export function memoryStorage(seed: Record<string, string> = {}): GiftStorage & {
  entries: Map<string, string>;
} {
  const entries = new Map(Object.entries(seed));
  return {
    entries,
    get length() {
      return entries.size;
    },
    key: (i) => [...entries.keys()][i] ?? null,
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => void entries.set(k, v),
  };
}

let deviceStore: GiftStore | undefined;

/** This device's gifts, in localStorage. */
export function deviceGiftStore(): GiftStore {
  if (!deviceStore) {
    let storage: GiftStorage;
    try {
      storage = window.localStorage;
    } catch (error) {
      // Some browsers throw on any localStorage access when site data is blocked. Giving still
      // works; its gifts last until the page closes.
      console.error("localStorage is unavailable; gifts on this page won't be kept", error);
      storage = memoryStorage();
    }
    deviceStore = createGiftStore(storage);
  }
  return deviceStore;
}

export type StickerGiftStatus =
  | { giftId: string; state: "packed"; packedAt: number }
  | { giftId: string; state: "sent"; packedAt: number; sentAt: number };

/** Each sticker's open or sent gift. A sticker whose gifts all went unsent has no entry. */
export function giftStatusBySticker(
  records: readonly GiftRecord[],
): Map<string, StickerGiftStatus> {
  const status = new Map<string, StickerGiftStatus>();
  for (const r of records) {
    if (r.state === "not_sent" || status.get(r.stickerId)?.state === "sent") continue;
    status.set(
      r.stickerId,
      r.state === "sent"
        ? { giftId: r.id, state: "sent", packedAt: r.packedAt, sentAt: r.sentAt }
        : { giftId: r.id, state: "packed", packedAt: r.packedAt },
    );
  }
  return status;
}
