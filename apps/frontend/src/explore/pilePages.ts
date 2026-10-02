import type { PilePage, PileSticker } from "@drawing-app/api/client";
import { useRef, useState } from "react";
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { pileDays, type PileDay } from "./pileDays";

/** The pile's pages loaded so far, as one run with nothing missing between them. */
export interface LoadedPile {
  /** Newest first. */
  stickers: readonly PileSticker[];
  /** Where the next, older page starts; null once nothing's older. */
  before: string | null;
}

/** Whether `a` was sealed before `b`: by seal, then by number, as the server pages them. */
function isOlder(a: PileSticker, b: PileSticker) {
  const apart = Date.parse(a.sticker.sealedAt) - Date.parse(b.sticker.sealedAt);
  return apart < 0 || (apart === 0 && a.sticker.number < b.sticker.number);
}

/** An older page, under what's loaded. */
export function withOlderPage(loaded: LoadedPile, page: PilePage): LoadedPile {
  const oldest = loaded.stickers.at(-1);
  const older = oldest ? page.stickers.filter((pile) => isOlder(pile, oldest)) : page.stickers;
  return { stickers: [...loaded.stickers, ...older], before: page.before };
}

/**
 * A fresh first page over what's loaded, keeping the older pages when it reaches back to them. More
 * than a page of new stickers leaves a gap between the two, so the pile starts over from it.
 */
export function withNewestPage(loaded: LoadedPile, page: PilePage): LoadedPile {
  const oldest = page.stickers.at(-1);
  const newest = loaded.stickers[0];
  if (page.before === null || !oldest || !newest || isOlder(newest, oldest)) return page;
  return {
    stickers: [...page.stickers, ...loaded.stickers.filter((pile) => isOlder(pile, oldest))],
    before: loaded.before,
  };
}

/**
 * The days to lay out, newest first. The last is held back while an older page may still add to
 * it, since its older stickers land under the rest and would move the whole heap. Today always shows.
 */
export function shownDays(loaded: LoadedPile, today: number): PileDay[] {
  const days = pileDays(loaded.stickers);
  const last = days.at(-1);
  return loaded.before !== null && last && last.day !== today ? days.slice(0, -1) : days;
}

/** What lies under the pile's last layer. */
export type PileEnd =
  | { state: "more" }
  | { state: "loading" }
  | { state: "failed"; error: ApiError; retry: () => void }
  | { state: "end" };

/**
 * The pile's pages: Explore's first, joined by each fresh one as Explore loads again, and the older
 * pages `reachEnd` asks for. They stay loaded while Explore is hidden.
 */
export function usePilePages(first: PilePage) {
  const api = useApi();
  const [loaded, setLoaded] = useState<LoadedPile>(first);
  const [joined, setJoined] = useState(first);
  if (joined !== first) {
    setJoined(first);
    setLoaded((was) => withNewestPage(was, first));
  }
  const [failure, setFailure] = useState<ApiError | null>(null);
  // The cursor of the page on its way: set before React renders, so a second ask can't go out too.
  const asking = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = (before: string) => {
    if (asking.current === before) return;
    asking.current = before;
    setLoading(true);
    setFailure(null);
    api.explorePile(before).then(
      (page) => {
        if (asking.current !== before) return;
        asking.current = null;
        // A fresh first page may have started the pile over meanwhile, leaving this one nowhere.
        setLoaded((was) => (was.before === before ? withOlderPage(was, page) : was));
        setLoading(false);
      },
      (error: unknown) => {
        const failed = apiError(error);
        console.error(`Loading the pile's page before ${before} failed`, failed);
        if (asking.current !== before) return;
        asking.current = null;
        setFailure(failed);
        setLoading(false);
      },
    );
  };

  const { before } = loaded;
  const end: PileEnd =
    before === null
      ? { state: "end" }
      : failure
        ? { state: "failed", error: failure, retry: () => load(before) }
        : loading
          ? { state: "loading" }
          : { state: "more" };
  /** The pile's end came near: asks for the next page, unless the last ask failed. */
  const reachEnd = () => {
    if (before !== null && !failure) load(before);
  };
  return { loaded, end, reachEnd };
}
