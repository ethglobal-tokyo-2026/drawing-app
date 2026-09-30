import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * A board's size in px, which lays out its stickers: measured before it first paints and again as it
 * resizes. The same object is kept while the width and height hold, so a resize that changes neither
 * doesn't re-render the board.
 */
export function useBoardSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize((was) =>
        was?.W === el.clientWidth && was.H === el.clientHeight
          ? was
          : { W: el.clientWidth, H: el.clientHeight },
      );
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
