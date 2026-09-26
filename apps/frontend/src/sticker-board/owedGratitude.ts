import type { StickerDetail as StickerDetailResponse } from "@drawing-app/api/client";
import { toPerson, type PersonView } from "../api/views";

/**
 * The gift you haven't thanked for a sticker you hold: the Transfer Trail's newest entry, when it
 * came to you and has no gratitude. Null otherwise.
 */
export function owedGratitude(
  detail: StickerDetailResponse,
): { giftId: string; giver: PersonView } | null {
  const newest = detail.transferTrail[0];
  if (!newest || newest.receiver.id !== detail.owner.id || newest.gratitude) return null;
  return { giftId: newest.giftId, giver: toPerson(newest.giver) };
}
