import { personKey, parseStored, readStored, writeStored } from "../ui/deviceStorage";

/** Per-person recovery without the Gift Claim Token or message contents. */
export interface KeptGift {
  message?: "sent" | "maybeSent" | "cancelled";
  /** Absent only on entries kept by an older client; the server supplies their attempt. */
  attemptId?: string;
}

const keyFor = (userId: string) => personKey("draw.gifts.kept", userId);
/** Failed writes stay on this page. Null overrides a stale entry after a failed removal. */
const fallback = new Map<string, Map<string, KeptGift | null>>();
/** Last readable state, available when this device later refuses reads. */
const remembered = new Map<string, Map<string, KeptGift>>();
const changes = new Set<(userId: string) => void>();

/** A local outcome changed, so the giver's tray and detail can show it before its report lands. */
export function onKeptGiftChanged(listener: (userId: string) => void): () => void {
  changes.add(listener);
  return () => void changes.delete(listener);
}

function keptOf(value: unknown): KeptGift | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("message" in value)) return {};
  if (value.message !== "sent" && value.message !== "maybeSent" && value.message !== "cancelled")
    return null;
  const attemptId = "attemptId" in value ? value.attemptId : undefined;
  if (
    attemptId !== undefined &&
    (typeof attemptId !== "string" || !/^0x[0-9a-f]{64}$/.test(attemptId))
  )
    return null;
  return { message: value.message, ...(typeof attemptId === "string" && { attemptId }) };
}

function readKept(userId: string) {
  const { text: raw, blocked } = readStored(
    keyFor(userId),
    "Giving's kept gifts can't be read on this device",
  );
  const kept = new Map<string, KeptGift>(blocked ? remembered.get(userId) : undefined);
  if (raw !== null) {
    const value = parseStored(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      console.error(
        "Giving's kept gifts are unreadable; the server's message attempts still protect them",
      );
    } else {
      for (const [giftId, entry] of Object.entries(value)) {
        const gift = keptOf(entry);
        if (gift) kept.set(giftId, gift);
        else
          console.error(
            `Gift ${giftId}'s kept entry is unreadable; recover its attempt from the server`,
          );
      }
    }
  }
  for (const [giftId, gift] of fallback.get(userId) ?? []) {
    if (gift === null) kept.delete(giftId);
    else kept.set(giftId, gift);
  }
  remembered.set(userId, new Map(kept));
  return { kept, blocked };
}

/** What this page or device kept for this person. The server remains the safety authority. */
export function keptGift(
  userId: string,
  giftId: string,
  onReadFailure?: () => void,
): KeptGift | null {
  const { kept, blocked } = readKept(userId);
  if (blocked) onReadFailure?.();
  return kept.get(giftId) ?? null;
}

/** Definitive LINE outcomes awaiting acknowledgement, including cancellations. */
export function keptReports(userId: string): [string, KeptGift][] {
  return [...readKept(userId).kept].filter(
    ([, gift]) => gift.message === "sent" || gift.message === "cancelled",
  );
}

/** Keeps recovery in memory even when persistence fails, and reports whether the device saved it. */
export function keepGift(userId: string, giftId: string, gift: KeptGift): boolean {
  const { kept, blocked } = readKept(userId);
  if (gift.message !== undefined) kept.set(giftId, gift);
  else kept.delete(giftId);
  remembered.set(userId, new Map(kept));
  const pending = fallback.get(userId) ?? new Map<string, KeptGift | null>();
  pending.set(giftId, gift.message === undefined ? null : gift);
  fallback.set(userId, pending);
  for (const changed of changes) changed(userId);
  // A failed read leaves other gifts unknown. Keep changes in memory until a readable map can be merged.
  if (blocked) return false;
  const saved = writeStored(
    keyFor(userId),
    kept.size === 0 ? null : JSON.stringify(Object.fromEntries(kept)),
    `Gift ${giftId}'s message outcome can't be saved on this device; the server still keeps its attempt`,
  );
  if (saved) fallback.delete(userId);
  return saved;
}

/** Drops local recovery only after a server acknowledgement or a terminal refusal. */
export function forgetKeptGift(userId: string, giftId: string): void {
  keepGift(userId, giftId, {});
}
