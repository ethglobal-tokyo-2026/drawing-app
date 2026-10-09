import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { placeOf, scrollToKeep, type Marker, type Place } from "./keptPlace";

/** A scroll is noted once it has rested this long, rather than every frame. */
const NOTE_AFTER_MS = 100;
/**
 * How long after a turn the place is put back, every frame: the pile lays its days out again as its
 * width settles, passing through a width in between.
 */
const PUT_BACK_MS = 400;
/** The putting back scrolls too: noting those would trade the reader's sticker for another. */
const QUIET_AFTER_MS = 100;

/** What the place is kept by: each sticker on the pile. */
const MARKERS = ".pile-sticker[data-pile-id]";

/** What scrolls the pile: its own column in two columns, Explore itself in one. */
const pileScroller = (explore: HTMLElement, columns: 1 | 2) =>
  columns === 2 ? explore.querySelector<HTMLElement>(".explore-view") : explore;

function markersIn(view: HTMLElement): Marker[] {
  const top = view.getBoundingClientRect().top;
  return [...view.querySelectorAll<HTMLElement>(MARKERS)].map((el) => {
    const box = el.getBoundingClientRect();
    return { key: el.dataset.pileId ?? "", top: box.top - top, height: box.height };
  });
}

/**
 * Keeps the reader's place in Explore's pile through a turn, which moves the pile between Explore's
 * scroller and its own column and lays it out at a new width.
 */
export function useKeptPlace(explore: RefObject<HTMLElement | null>, columns: 1 | 2) {
  const place = useRef<Place | null>(null);
  const quietUntil = useRef(0);

  // Scrolls don't bubble, so Explore listens in the capture phase for whichever box scrolls the pile.
  useEffect(() => {
    const root = explore.current;
    if (!root) return;
    let timer = 0;
    const quiet = () => performance.now() < quietUntil.current;
    const note = () => {
      const view = pileScroller(root, columns);
      if (view && !quiet()) place.current = placeOf(markersIn(view), view.clientHeight);
    };
    const onScroll = (event: Event) => {
      if (quiet() || event.target !== pileScroller(root, columns)) return;
      clearTimeout(timer);
      timer = window.setTimeout(note, NOTE_AFTER_MS);
    };
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll, { capture: true });
      clearTimeout(timer);
    };
  }, [explore, columns]);

  const laidOutFor = useRef(columns);
  useLayoutEffect(() => {
    const root = explore.current;
    const kept = place.current;
    if (laidOutFor.current === columns) return;
    laidOutFor.current = columns;
    if (!root || !kept) return;
    const until = performance.now() + PUT_BACK_MS;
    quietUntil.current = until + QUIET_AFTER_MS;
    let frame = 0;
    const putBack = () => {
      const view = pileScroller(root, columns);
      const marker = view && markersIn(view).find((m) => m.key === kept.key);
      if (view && marker) view.scrollTop += scrollToKeep(kept, marker);
      if (performance.now() < until) frame = requestAnimationFrame(putBack);
    };
    putBack();
    return () => cancelAnimationFrame(frame);
  }, [explore, columns]);
}
