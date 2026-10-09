import { useLayoutEffect, useState, type RefObject } from "react";
import { useLargeScreen } from "../ui/largeScreen";

/** Explore's width from which This week sits beside the pile: a wide pile, the gap and a leaderboard. */
export const TWO_COLUMNS_MIN_WIDTH = 960;

/**
 * How many columns Explore lays out in a box `width` by `height` px: two only on a large screen held
 * sideways with room for both, so an iPad upright keeps one column however wide it is.
 */
export const exploreColumns = (width: number, height: number, large: boolean): 1 | 2 =>
  large && width > height && width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1;

/** Explore's columns, from its scroller's box. */
export function useExploreColumns(scroller: RefObject<HTMLElement | null>): 1 | 2 {
  const large = useLargeScreen();
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const [width, height] = [el.clientWidth, el.clientHeight];
      setSize((was) => (was.width === width && was.height === height ? was : { width, height }));
    };
    measure();
    const resized = new ResizeObserver(measure);
    resized.observe(el);
    return () => resized.disconnect();
  }, [scroller]);
  return exploreColumns(size.width, size.height, large);
}
