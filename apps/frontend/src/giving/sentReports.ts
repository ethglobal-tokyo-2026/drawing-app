import { ApiError, type ApiClient, type ErrorCode } from "../api/apiClient";
import { forgetMyStickerBoard } from "../sticker-board/useMyStickerBoard";
import { forgetKeptGift, keptSends } from "./keptGifts";

/** Refusals no later report can change: the gift is gone, closed, or someone else's. */
const FINAL_REFUSALS: ReadonlySet<string> = new Set([
  "gift_not_found",
  "not_yours",
  "gift_closed",
] satisfies ErrorCode[]);
export const refusedForGood = (error: unknown) =>
  error instanceof ApiError && FINAL_REFUSALS.has(error.code);

/**
 * Reports each of `userId`'s gift messages that went out while the server couldn't hear it, as when
 * the session had ended, so its gift doesn't wait as packed until the sticker is given again. Apart
 * from Giving, so the app's start doesn't load Giving's code to do it.
 */
export async function reportKeptSends(
  api: Pick<ApiClient, "reportShared">,
  userId: string,
): Promise<void> {
  const sends = keptSends(userId);
  for (const giftId of sends) {
    try {
      await api.reportShared(giftId, "sent");
    } catch (error) {
      if (!refusedForGood(error)) {
        console.error(
          `Gift ${giftId}'s send still can't be recorded; the app's next start tries again`,
          error,
        );
        continue;
      }
    }
    forgetKeptGift(userId, giftId);
  }
  if (sends.length > 0) forgetMyStickerBoard();
}
