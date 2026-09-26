import { ApiError, type ApiClient } from "../apiClient";
import type { Gratitude, RecordGratitude } from "../contract";
import type { Overlay } from "./index";

/** The gratitude the server records from a combo. */
export const gratitudeOf = (body: RecordGratitude, recordedAt: number): Gratitude => ({
  giftId: body.giftId,
  method: body.method,
  hits: body.hits,
  total: body.total,
  peakMult: body.peakMult,
  peakTier: body.peakTier,
  // The mock doesn't know who drew the sticker, so no Original Artist is owed a share.
  originalArtistGratitudeShare: 0,
  gameConfigVersion: body.gameConfigVersion,
  recordedAt: new Date(recordedAt).toISOString(),
  seenByGiverAt: null,
});

/**
 * Gratitude's fixtures: combos recorded in memory, one per gift. A resend with the same idempotency
 * key gets the stored record back; another key for a gift that already has its gratitude is refused,
 * as on the server.
 */
export function createGratitudeMock(now: () => number): Pick<ApiClient, "recordGratitude"> {
  const byKey = new Map<string, Gratitude>();
  const giftsWithGratitude = new Set<string>();
  return {
    recordGratitude: (body) => {
      const stored = byKey.get(body.idempotencyKey);
      if (stored) return Promise.resolve({ gratitude: stored });
      if (giftsWithGratitude.has(body.giftId)) {
        return Promise.reject(
          new ApiError(409, {
            error: "gratitude_already_recorded",
            detail: `Gift ${body.giftId} already has its gratitude`,
          }),
        );
      }
      const gratitude = gratitudeOf(body, now());
      byKey.set(body.idempotencyKey, gratitude);
      giftsWithGratitude.add(body.giftId);
      return Promise.resolve({ gratitude });
    },
  };
}

const gratitudeMock = createGratitudeMock(Date.now);

export const gratitudeOverlay: Overlay = () => gratitudeMock;
