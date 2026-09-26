import { formatNo } from "../stickers/format";
import type { GiftBackend } from "./giftBackend";
import { buildGiftMessage } from "./giftMessage";
import type { GiftRecord, GiftStore } from "./giftStore";

interface LocalGiftBackendOptions {
  store: GiftStore;
  /** Printed on the gift message: "From @alice". */
  fromHandle: string;
  liffId: string;
  heroUrl?: string;
  now?: () => number;
  randomBytes?: (size: number) => Uint8Array;
}

const toHex = (bytes: Uint8Array) =>
  "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

type PackedRecord = Extract<GiftRecord, { state: "packed" }>;

/**
 * Makes gifts on this device. Gift IDs and gift claim tokens take createGiftClaim's format (32
 * random bytes as 0x-hex) so links keep their shape when the server issues them; there's no claim
 * commitment, because nothing here can accept a gift yet.
 */
export function createLocalGiftBackend({
  store,
  fromHandle,
  liffId,
  heroUrl,
  now = Date.now,
  randomBytes = (size) => crypto.getRandomValues(new Uint8Array(size)),
}: LocalGiftBackendOptions): GiftBackend {
  const settle = (giftId: string, settled: (packed: PackedRecord) => GiftRecord) => {
    const record = store.get(giftId);
    if (!record) throw new Error(`Gift ${giftId} isn't on this device`);
    if (record.state !== "packed") {
      throw new Error(`Gift ${giftId} was already ${record.state === "sent" ? "sent" : "closed"}`);
    }
    store.put(settled(record));
  };

  return {
    pack: async (sticker) => {
      const earlier = store.list().filter((r) => r.stickerId === sticker.id);
      if (earlier.some((r) => r.state === "sent")) {
        throw new Error(`${formatNo(sticker.no)} was already given`);
      }
      const packedAt = now();
      for (const r of earlier) {
        if (r.state === "packed") {
          store.put({ ...r, state: "not_sent", closedAt: packedAt, reason: "abandoned" });
        }
      }
      const giftId = toHex(randomBytes(32));
      const claimToken = toHex(randomBytes(32));
      const message = buildGiftMessage({
        liffId,
        giftClaimToken: claimToken,
        fromHandle,
        timeUsed: sticker.timeUsed,
        heroUrl,
      });
      store.put({ id: giftId, stickerId: sticker.id, state: "packed", packedAt, claimToken });
      return { giftId, message };
    },
    markShared: async (giftId, outcome) => {
      const record = store.get(giftId);
      if (!record) throw new Error(`Gift ${giftId} isn't on this device`);
      if (outcome === "cancelled") return;
      settle(giftId, (r) => ({ ...r, state: "sent", sentAt: now() }));
    },
    takeOut: async (giftId) =>
      settle(giftId, (r) => ({
        ...r,
        state: "not_sent",
        closedAt: now(),
        reason: "taken_out",
      })),
  };
}
