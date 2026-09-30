import { isHash, type Hash } from "viem";
import { personKey, parseStored, readStored, writeStored } from "../ui/deviceStorage";

/**
 * What Giving needs to pick a gift up again after a reload or a closed webview, kept on this device
 * until the gift settles. One per person, so someone else signing in here never acts on another's
 * gifts. The Gift Claim Token is never kept: it lives only in the gift message.
 */
export interface KeptGift {
  /** When the deposit went to the smart wallet, which answers only once it has landed. */
  depositSentAt?: number;
  depositHash?: Hash;
  takeOutSentAt?: number;
  takeOutHash?: Hash;
  /** Its gift message went out and the server hasn't heard yet, or LINE didn't say whether it did. */
  message?: "sent" | "maybeSent";
}

const keyFor = (userId: string) => personKey("draw.gifts.kept", userId);

const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isMessage = (value: unknown): value is KeptGift["message"] =>
  value === "sent" || value === "maybeSent";

/** One gift's entry as stored, or null when any of it is unreadable. */
function keptOf(value: unknown): KeptGift | null {
  if (typeof value !== "object" || value === null) return null;
  const kept: KeptGift = {};
  if ("depositSentAt" in value) {
    if (!isTime(value.depositSentAt)) return null;
    kept.depositSentAt = value.depositSentAt;
  }
  if ("depositHash" in value) {
    if (typeof value.depositHash !== "string" || !isHash(value.depositHash)) return null;
    kept.depositHash = value.depositHash;
  }
  if ("takeOutSentAt" in value) {
    if (!isTime(value.takeOutSentAt)) return null;
    kept.takeOutSentAt = value.takeOutSentAt;
  }
  if ("takeOutHash" in value) {
    if (typeof value.takeOutHash !== "string" || !isHash(value.takeOutHash)) return null;
    kept.takeOutHash = value.takeOutHash;
  }
  if ("message" in value) {
    if (!isMessage(value.message)) return null;
    kept.message = value.message;
  }
  return kept;
}

/** `userId`'s kept gifts; none when storage is blocked. An unreadable entry is dropped, and said. */
function readKept(userId: string): Map<string, KeptGift> {
  const kept = new Map<string, KeptGift>();
  const { text: raw } = readStored(
    keyFor(userId),
    "Giving's kept gifts can't be read on this device",
  );
  if (raw === null) return kept;
  const value = parseStored(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    console.error("Giving's kept gifts are unreadable, so none is picked up again:", raw);
    return kept;
  }
  for (const [giftId, entry] of Object.entries(value)) {
    const gift = keptOf(entry);
    if (gift) kept.set(giftId, gift);
    else
      console.error(
        `Gift ${giftId}'s kept entry is unreadable, so it isn't picked up again:`,
        entry,
      );
  }
  return kept;
}

const writeKept = (userId: string, kept: ReadonlyMap<string, KeptGift>, giftId: string) =>
  writeStored(
    keyFor(userId),
    kept.size === 0 ? null : JSON.stringify(Object.fromEntries(kept)),
    `Gift ${giftId}'s progress can't be kept on this device; a reload before it settles loses it`,
  );

/** What this device kept of `userId`'s gift, or null. */
export function keptGift(userId: string, giftId: string): KeptGift | null {
  return readKept(userId).get(giftId) ?? null;
}

/** Keeps `gift` for `giftId` in place of what was kept; one with nothing set is dropped. */
export function keepGift(userId: string, giftId: string, gift: KeptGift): void {
  const kept = readKept(userId);
  if (Object.values(gift).some((field) => field !== undefined)) kept.set(giftId, gift);
  else kept.delete(giftId);
  writeKept(userId, kept, giftId);
}

/** Drops `giftId` once it has settled. */
export function forgetKeptGift(userId: string, giftId: string): void {
  const kept = readKept(userId);
  if (kept.delete(giftId)) writeKept(userId, kept, giftId);
}
