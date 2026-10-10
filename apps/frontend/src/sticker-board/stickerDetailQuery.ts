import type { StickerDetail } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";
import { preloadQuery, QueryAnswers, useApiQuery, type Query } from "../api/useApiQuery";
import { onGratitudeLeftOutbox } from "../gratitude/gratitudeOutbox";
import { onTheBoard, type BoardStickerView } from "./boardSticker";

/**
 * How long a sticker's detail read is the answer: opening it then asks the server nothing. A
 * Transfer Trail changes only when the sticker is given or gets gratitude, which the board's outline
 * of it in the read's key catches once the board lists it, and this phone's own gratitude before then
 * is caught by `combosLeftBefore`.
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

/** What the board lists of a sticker's Transfer Trail, which a gift received or its gratitude changes. */
type ListedTrail = Pick<BoardStickerView, "id" | "trail">;

/** A read's key, by the board's outline of its trail: a gift since misses the answers kept before it. */
const keyOf = (sticker: ListedTrail | null) =>
  sticker
    ? `sticker-detail:${sticker.id}:${sticker.trail.timesGiven}:${sticker.trail.newestHasGratitude ? 1 : 0}`
    : "sticker-detail:none";
const loadOf =
  (stickerId: string | null) =>
  async (api: ApiClient): Promise<DetailRead> => {
    const combosLeftBefore = combosLeft;
    const stickerDetail = stickerId ? await api.stickerDetail(stickerId) : null;
    return { stickerDetail, combosLeftBefore };
  };

/** A sticker's detail: one read ahead shows at once, and loads nothing while it's fresh. */
export const useStickerDetail = (sticker: ListedTrail | null): Query<DetailRead> =>
  useApiQuery(keyOf(sticker), loadOf(sticker?.id ?? null), answers);

/** The stickers on the board whose details load ahead: the topmost first, up to MAX_DETAILS_AHEAD. */
export const detailsAhead = (stickers: readonly BoardStickerView[]): BoardStickerView[] =>
  stickers
    .filter(onTheBoard)
    .toSorted((a, b) => b.placement.z - a.placement.z)
    .slice(0, MAX_DETAILS_AHEAD);

/** Names the reads of `stickers`' details: it changes with which stickers they are, or their trails, not their order. */
export const detailReadsKey = (stickers: readonly ListedTrail[]): string =>
  stickers.map(keyOf).toSorted().join(" ");

/**
 * Loads each sticker's detail ahead, one at a time so they never crowd what else loads, and keeps
 * them for the detail; returns how to stop before the next.
 */
export function preloadStickerDetails(
  api: ApiClient,
  stickers: readonly ListedTrail[],
): () => void {
  let stopped = false;
  void (async () => {
    for (const sticker of stickers) {
      if (stopped) return;
      await preloadQuery(api, keyOf(sticker), loadOf(sticker.id), answers);
    }
  })();
  return () => {
    stopped = true;
  };
}
