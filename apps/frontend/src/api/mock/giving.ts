import { deviceGiftStore } from "../../giving/giftStore";
import type { ApiClient } from "../apiClient";
import type { Gift, IsoTime, Person } from "../contract";
import { toMs } from "../views";
import { people } from "./fixtures";
import type { Overlay } from "./index";

/** How long after it's sent the pretend friend receives a gift sent through LINE. */
const RECEIVES_AFTER_MS = 5_000;

/** A gift the pretend friend received, as a board sticker's `givenTo` names it. */
export interface ReceivedGift {
  receiver: Person;
  receivedAt: IsoTime;
}

interface Options {
  /** Whether a gift went to someone in the app; only gifts sent through LINE reach the friend. */
  givenInApp: (giftId: string) => boolean;
  now: () => number;
}

/**
 * Giving's fixtures: Bob, the pretend friend, receives each gift sent through LINE 5 s after it's
 * sent. From then pendingGifts leaves it out, and receivedGifts says who received it and when.
 */
export function createGivingMock({ givenInApp, now }: Options) {
  let below: ApiClient | null = null;
  const receivedAt = (gift: Gift): number | null => {
    if (gift.status !== "sent" || gift.sentAt === null || givenInApp(gift.id)) return null;
    const at = toMs(gift.sentAt) + RECEIVES_AFTER_MS;
    return at <= now() ? at : null;
  };

  const overlay: Overlay = (client) => {
    below = client;
    return {
      pendingGifts: async () => {
        const { gifts } = await client.pendingGifts();
        return { gifts: gifts.filter(({ gift }) => receivedAt(gift) === null) };
      },
    };
  };

  /** What the friend has received so far, by sticker ID, worked out from the gifts beneath. */
  const receivedGifts = async (): Promise<Map<string, ReceivedGift>> => {
    const received = new Map<string, ReceivedGift>();
    if (!below) return received;
    for (const { gift } of (await below.pendingGifts()).gifts) {
      const at = receivedAt(gift);
      if (at !== null) {
        received.set(gift.stickerId, {
          receiver: people.bob,
          receivedAt: new Date(at).toISOString(),
        });
      }
    }
    return received;
  };

  return { overlay, receivedGifts };
}

const givingMock = createGivingMock({
  givenInApp: (giftId) => deviceGiftStore().get(giftId)?.to !== undefined,
  now: Date.now,
});

export const givingOverlay = givingMock.overlay;
/** The board overlay reads it for `held: false` and `givenTo`. */
export const receivedGifts = givingMock.receivedGifts;
