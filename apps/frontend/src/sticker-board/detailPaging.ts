import { useLayoutEffect, useRef, type PointerEvent } from "react";
import { capturePointer } from "../ui/capturePointer";
import { EASE_OUT, T_STICK_MS } from "../ui/easing";

/** How far a finger moves on the stage before it counts as a swipe or a scroll. */
export const LOCK_PX = 8;
/** How far sideways a swipe goes before it pages. */
export const PAGE_PX = 56;
/** A paged-to slide enters from this far to its side, turned this much, over this long. */
const ENTER_PX = 60;
const ENTER_TURN_DEG = 2;
const ENTER_MS = 260;
/** The share of a swipe the slide follows, and how far it turns for each px. */
const FOLLOW = 0.7;
const FOLLOW_TURN_DEG_PER_PX = 0.02;

type Move = { dx: number; dy: number };

/**
 * What a move on the stage is once it has gone far enough to tell, null until then. Mostly sideways
 * swipes between stickers; anything else is left to scroll the page.
 */
export function swipeLock({ dx, dy }: Move): "swipe" | "scroll" | null {
  if (Math.hypot(dx, dy) <= LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
}

/** Where a swipe lands: one sticker along when it went far enough, left for the next, within the list. */
export function swipeTo({ dx, index, count }: { dx: number; index: number; count: number }) {
  if (Math.abs(dx) <= PAGE_PX) return index;
  return Math.min(count - 1, Math.max(0, index + (dx < 0 ? 1 : -1)));
}

interface Swipe {
  pointerId: number;
  x: number;
  y: number;
  dx: number;
  lock: ReturnType<typeof swipeLock>;
}

interface Paging {
  index: number;
  count: number;
  reduced: boolean;
  /** Shows the sticker at `next`, which is in the list and not the one shown. */
  onPage: (next: number) => void;
}

/**
 * Paging stickers one at a time. `page` goes to one, and its `slide` enters from its side; `stage`'s
 * handlers let a sideways swipe page, with the slide following the finger and springing back when the
 * swipe falls short.
 */
export function useSwipePaging({ index, count, reduced, onPage }: Paging) {
  /** The shown sticker's slide. */
  const slide = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);
  /** The side the next sticker enters from: 1 from the right, -1 from the left. */
  const enterFrom = useRef(0);

  const page = (next: number) => {
    if (next < 0 || next >= count || next === index) return;
    enterFrom.current = Math.sign(next - index);
    onPage(next);
  };

  useLayoutEffect(() => {
    const side = enterFrom.current;
    enterFrom.current = 0;
    if (!side || reduced) return;
    slide.current?.animate(
      [
        {
          transform: `translateX(${side * ENTER_PX}px) rotate(${side * ENTER_TURN_DEG}deg)`,
          opacity: 0,
        },
        { transform: "none", opacity: 1 },
      ],
      { duration: ENTER_MS, easing: EASE_OUT },
    );
  }, [index, reduced]);

  // A second finger doesn't restart a swipe. The same pointer pressing again means its last press
  // was let go off the stage, where a mouse isn't captured, so that one is over.
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button > 0 || (swipe.current && swipe.current.pointerId !== e.pointerId)) return;
    swipe.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, lock: null };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.x;
    if (!s.lock) {
      s.lock = swipeLock({ dx, dy: e.clientY - s.y });
      if (s.lock === "swipe") capturePointer(e.currentTarget, e.pointerId);
    }
    if (s.lock !== "swipe") return;
    s.dx = dx;
    if (!reduced && slide.current)
      slide.current.style.transform = `translateX(${dx * FOLLOW}px) rotate(${dx * FOLLOW_TURN_DEG_PER_PX}deg)`;
  };

  // A cancelled swipe springs back rather than paging: the browser or the system took the touch. A
  // swipe that falls short sticks back in place.
  const endSwipe = (e: PointerEvent<HTMLElement>, pages: boolean) => {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointerId) return;
    swipe.current = null;
    const el = slide.current;
    if (s.lock !== "swipe" || !el) return;
    const followed = el.style.transform;
    el.style.transform = "";
    const next = pages ? swipeTo({ dx: s.dx, index, count }) : index;
    if (next !== index) page(next);
    else if (followed && !reduced)
      el.animate([{ transform: followed }, { transform: "none" }], {
        duration: T_STICK_MS,
        easing: EASE_OUT,
      });
  };

  return {
    slide,
    page,
    stage: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLElement>) => endSwipe(e, true),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => endSwipe(e, false),
    },
  };
}
