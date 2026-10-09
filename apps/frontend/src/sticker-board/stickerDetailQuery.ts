import type { StickerDetail } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";
import { preloadQuery, QueryAnswers, useApiQuery, type Query } from "../api/useApiQuery";
import { onGratitudeLeftOutbox } from "../gratitude/gratitudeOutbox";
import { onTheBoard, type BoardStickerView } from "./boardSticker";

/**
 * How long a sticker's detail read is the answer: opening it then asks the server nothing. A
 * Transfer Trail changes only when the sticker is given or gets gratitude, and this phone's own
 * gratitude is caught by `combosLeftBefore`.
 */
const STICKER_DETAIL_FRESH_MS = 60_000;
/** The most stickers on the board whose details load ahead of a tap. */
export const MAX_DETAILS_AHEAD = 12;

/** A sticker's detail (null for no sticker), and the combos gone from the outbox as its read went out. */
interface DetailRead {
  stickerDetail: StickerDetail | null;
  combosLeftBefore: number;
}

const answers = new QueryAnswers<DetailRead>({ freshMs: STICKER_DETAIL_FRESH_MS });

let combosLeft = 0;
onGratitudeLeftOutbox(() => {
  combosLeft += 1;
});
/** Combos that left this phone's outbox since the app started: a read from before one may lack its gratitude. */
export const combosLeftNow = () => combosLeft;

const keyOf = (stickerId: string | null) => `sticker-detail:${stickerId ?? "none"}`;
const loadOf =
  (stickerId: string | null) =>
  async (api: ApiClient): Promise<DetailRead> => {
    const combosLeftBefore = combosLeft;
    const stickerDetail = stickerId ? await api.stickerDetail(stickerId) : null;
    return { stickerDetail, combosLeftBefore };
  };

/** A sticker's detail: one read ahead shows at once, and loads nothing while it's fresh. */
export const useStickerDetail = (stickerId: string | null): Query<DetailRead> =>
  useApiQuery(keyOf(stickerId), loadOf(stickerId), answers);

/** The stickers on the board whose details load ahead: the topmost first, up to MAX_DETAILS_AHEAD. */
export const detailsAhead = (stickers: readonly BoardStickerView[]): string[] =>
  stickers
    .filter(onTheBoard)
    .toSorted((a, b) => b.placement.z - a.placement.z)
    .slice(0, MAX_DETAILS_AHEAD)
    .map((s) => s.id);

/**
 * Loads each sticker's detail ahead, one at a time so they never crowd what else loads, and keeps
 * them for the detail; returns how to stop before the next.
 */
export function preloadStickerDetails(api: ApiClient, stickerIds: readonly string[]): () => void {
  let stopped = false;
  void (async () => {
    for (const id of stickerIds) {
      if (stopped) return;
      await preloadQuery(api, keyOf(id), loadOf(id), answers);
    }
  })();
  return () => {
    stopped = true;
  };
}
