import { personKey, parseStored, readStored, writeStored } from "../ui/deviceStorage";

/**
 * Whether a gift's message went out, kept on this device until the server hears it, so a reload or a
 * closed webview never sends its Gift Claim Token twice. One per person, so someone else signing in
 * here never acts on another's gifts. The token itself is never kept: it lives only in the gift
 * message.
 */
export interface KeptGift {
  /** Its gift message went out and the server hasn't heard yet, or LINE's picker may have sent it. */
  message?: "sent" | "maybeSent";
}

const keyFor = (userId: string) => personKey("draw.gifts.kept", userId);

const isMessage = (value: unknown): value is KeptGift["message"] =>
  value === "sent" || value === "maybeSent";

/** One gift's entry as stored, or null when it's unreadable. */
function keptOf(value: unknown): KeptGift | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("message" in value)) return {};
  return isMessage(value.message) ? { message: value.message } : null;
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
    `Whether gift ${giftId}'s message went out can't be kept on this device; a reload before the server hears it loses it`,
  );

/** What this device kept of `userId`'s gift, or null. */
export function keptGift(userId: string, giftId: string): KeptGift | null {
  return readKept(userId).get(giftId) ?? null;
}

/** `userId`'s gifts whose message went out before the server heard it. */
export function keptSends(userId: string): string[] {
  return [...readKept(userId)].filter(([, gift]) => gift.message === "sent").map(([id]) => id);
}

/** Keeps `gift` for `giftId` in place of what was kept; one with nothing set is dropped. */
export function keepGift(userId: string, giftId: string, gift: KeptGift): void {
  const kept = readKept(userId);
  if (gift.message !== undefined) kept.set(giftId, gift);
  else kept.delete(giftId);
  writeKept(userId, kept, giftId);
}

/** Drops `giftId` once it has settled. */
export function forgetKeptGift(userId: string, giftId: string): void {
  const kept = readKept(userId);
  if (kept.delete(giftId)) writeKept(userId, kept, giftId);
}
