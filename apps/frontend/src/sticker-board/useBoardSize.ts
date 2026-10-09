import { useLayoutEffect, useState, type RefObject } from "react";
import { LARGE_SCREEN, useLargeScreen } from "../ui/largeScreen";
import { unitOf, type BoardLayout, type BoardSize } from "./placement";

/** The layout a board shows on this screen: the large layout on a large screen, else the phone's. */
export const useBoardLayout = (): BoardLayout => (useLargeScreen() ? "large" : "phone");

/** The layout a board shows on this screen now, for code outside React. */
export const boardLayoutNow = (): BoardLayout =>
  window.matchMedia(LARGE_SCREEN).matches ? "large" : "phone";

/**
 * A board's size in px and its unit, which lay out its stickers: measured before it first paints and
 * again as it resizes or turns. The same object is kept while they hold, so a resize that changes
 * none of them doesn't re-render the board.
 */
export function useBoardSize(ref: RefObject<HTMLElement | null>, layout: BoardLayout) {
  const [size, setSize] = useState<BoardSize | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize((was) => {
        const [W, H] = [el.clientWidth, el.clientHeight];
        const U = unitOf(layout, W);
        return was?.W === W && was.H === H && was.U === U ? was : { W, H, U };
      });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [ref, layout]);
  return size;
}
