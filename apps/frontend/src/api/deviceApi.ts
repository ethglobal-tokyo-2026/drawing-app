import type { GiftRecord } from "../giving/giftStore";
import { giftStatusBySticker } from "../giving/giftStore";
import type { Placement as RecordPlacement, StickerRecord } from "../stickers/stickerStorage";
import type { StickerUrls } from "../stickers/stickerUrls";
import { ApiError, type ApiClient } from "./apiClient";
import { toApiPlacement } from "./views";
import type { BoardSticker, Gift, Person, Sticker, StickerPlacement } from "./contract";

/** Gift Messages go unreceived after this long, as on the server. */
const GIFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** What this device keeps, handed in so tests can pass their own. */
export interface DeviceSources {
  /** You, from LINE's profile. */
  me: () => Person;
  /** Newest first, as stickerStorage lists them. */
  listStickers: () => Promise<StickerRecord[]>;
  updatePlacement: (id: string, placement: RecordPlacement) => Promise<void>;
  gifts: () => readonly GiftRecord[];
  readSeen: () => Set<string>;
  saveSeen: (seen: ReadonlySet<string>) => void;
  /** Object URLs for a sticker's images; made once per sticker and kept for the page. */
  urlsOf: (record: StickerRecord) => StickerUrls;
}

const iso = (ms: number) => new Date(ms).toISOString();

const needsServer = () =>
  Promise.reject(
    new ApiError(501, {
      error: "needs_server",
      detail: "Opening a gift needs the app's server, which isn't running yet.",
    }),
  );

/**
 * The API as this device can answer it, until the server exists. Every sticker here is yours, and
 * nothing can be received, so no sticker is ever given away: a sent gift stays on its way.
 */
export function createDeviceApi(sources: DeviceSources): ApiClient {
  const toSticker = (r: StickerRecord): Sticker => {
    const me = sources.me();
    const urls = sources.urlsOf(r);
    return {
      id: r.id,
      number: r.no,
      artist: me,
      ownerId: me.id,
      timeUsed: r.timeUsed,
      width: r.width,
      height: r.height,
      outline: r.outline ?? "",
      contentHash: "",
      images: {
        png: urls.png,
        mask: urls.mask ?? "",
        spec: urls.spec ?? "",
        rim: urls.rim ?? "",
        flat: "",
      },
      tokenId: null,
      mintTxHash: null,
      sealedAt: iso(r.createdAt),
    };
  };

  // The device keeps which stickers were seen, not when, so a seen sticker reports its arrival.
  const placementOf = (r: StickerRecord, seen: ReadonlySet<string>): StickerPlacement => ({
    stickerId: r.id,
    placement: r.placement ? toApiPlacement(r.placement) : null,
    seenAt: seen.has(r.id) ? iso(r.createdAt) : null,
    arrivedAt: iso(r.createdAt),
  });

  const recordOf = async (stickerId: string) => {
    const record = (await sources.listStickers()).find((r) => r.id === stickerId);
    if (!record) {
      throw new ApiError(404, { error: "sticker_not_found", detail: `No sticker ${stickerId}` });
    }
    return record;
  };

  return {
    stickerBoard: async () => {
      const records = [...(await sources.listStickers())].reverse();
      const seen = sources.readSeen();
      const open = giftStatusBySticker(sources.gifts());
      const boardStickers = records.map((r): BoardSticker => {
        const gift = open.get(r.id);
        return {
          ...placementOf(r, seen),
          sticker: toSticker(r),
          held: true,
          givenTo: null,
          openGift: gift ? { id: gift.giftId, status: gift.state } : null,
        };
      });
      return { owner: sources.me(), boardStickers };
    },

    saveStickerPlacement: async (stickerId, placement) => {
      const record = await recordOf(stickerId);
      const saved: RecordPlacement = {
        on: placement.onBoard,
        x: placement.x,
        y: placement.y,
        s: placement.scale,
        r: placement.rotation,
        z: placement.z,
      };
      await sources.updatePlacement(stickerId, saved);
      return placementOf({ ...record, placement: saved }, sources.readSeen());
    },

    markTraySeen: async (stickerIds) => {
      const seen = sources.readSeen();
      for (const id of stickerIds) seen.add(id);
      sources.saveSeen(seen);
      const records = await sources.listStickers();
      return { newStickerCount: records.filter((r) => !seen.has(r.id)).length };
    },

    stickerDetail: async (stickerId) => ({
      sticker: toSticker(await recordOf(stickerId)),
      owner: sources.me(),
      transferTrail: [],
    }),

    pendingGifts: async () => {
      const me = sources.me();
      const records = await sources.listStickers();
      const byId = new Map(records.map((r) => [r.id, r]));
      const open = sources
        .gifts()
        .filter((g) => g.state !== "not_sent")
        .sort((a, b) => b.packedAt - a.packedAt);
      const gifts = open.flatMap((g) => {
        const record = byId.get(g.stickerId);
        if (!record) {
          console.error(`Gift ${g.id} is for sticker ${g.stickerId}, which isn't on this device`);
          return [];
        }
        const gift: Gift = {
          id: g.id,
          stickerId: g.stickerId,
          giverId: me.id,
          receiverId: null,
          status: g.state === "sent" ? "sent" : "packed",
          // Minting is a stub, so a deposit counts as landed at once.
          escrowStatus: "pending",
          packedAt: iso(g.packedAt),
          expiresAt: iso(g.packedAt + GIFT_EXPIRY_MS),
          sentAt: g.state === "sent" ? iso(g.sentAt) : null,
          takenOutAt: null,
          receivedAt: null,
          returnedAt: null,
        };
        return [{ gift, sticker: toSticker(record) }];
      });
      return { gifts };
    },

    previewGift: needsServer,
    receiveGift: needsServer,
  };
}
