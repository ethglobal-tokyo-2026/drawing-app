import { useMemo, useSyncExternalStore } from "react";
import { deviceGiftStore, giftStatusBySticker, type StickerGiftStatus } from "./giftStore";

/** Which of my stickers are packed in a gift or sent, and when. Stickers with neither have no entry. */
export function useStickerGifts(): ReadonlyMap<string, StickerGiftStatus> {
  const store = deviceGiftStore();
  const records = useSyncExternalStore(store.subscribe, store.snapshot);
  return useMemo(() => giftStatusBySticker(records), [records]);
}
