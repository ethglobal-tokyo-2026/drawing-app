import { useLayoutEffect, useRef, type PointerEvent } from "react";
import { capturePointer } from "../ui/capturePointer";
import { EASE_OUT, T_STICK_MS } from "../ui/easing";
import type { Toss } from "./detailLift";

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
/** A drag up or down is thrown when let go this fast, in px/s, or once it has come this far. */
const THROW_SPEED = 300;
const THROW_PX = 60;
/** A throw's speed is the finger's over this long before it let go, read over this long at least. */
const THROW_WINDOW_MS = 100;
const THROW_SPAN_MS = 8;
/** A finger that came far enough but rested before it let go throws at this speed, the way it went. */
const THROW_RESTED_SPEED = 800;
/** A dragged sticker turns this much for each px sideways. */
const THROW_TURN_DEG_PER_PX = 0.08;

type Move = { dx: number; dy: number };

/**
 * What a move on the stage is once it has gone far enough to tell, null until then. Mostly sideways
 * swipes between stickers; anything else is left to scroll the page, or is a throw where one is taken.
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

type Sample = { t: number; x: number; y: number };

/**
 * A drag up or down the stage as it was let go: thrown at the finger's speed, in px/s, or null when
 * it went neither fast nor far enough.
 */
export function throwOf(samples: readonly Sample[], { dx, dy }: Move, now: number) {
  const last = samples.at(-1);
  const first = last && samples.find((s) => last.t - s.t <= THROW_WINDOW_MS);
  const span = last && first && now - last.t <= THROW_WINDOW_MS ? last.t - first.t : 0;
  // Moves that came all at once, as coalesced ones can, give no speed to go by.
  const v =
    first && last && span >= THROW_SPAN_MS
      ? { x: ((last.x - first.x) * 1000) / span, y: ((last.y - first.y) * 1000) / span }
      : null;
  if (v && Math.hypot(v.x, v.y) >= THROW_SPEED) return v;
  const far = Math.hypot(dx, dy);
  return far >= THROW_PX
    ? { x: (dx / far) * THROW_RESTED_SPEED, y: (dy / far) * THROW_RESTED_SPEED }
    : null;
}

interface Swipe {
  pointerId: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  lock: ReturnType<typeof swipeLock> | "throw";
  /** The finger's recent places, while it throws. */
  samples: Sample[];
}

interface Paging {
  index: number;
  count: number;
  reduced: boolean;
  /** Shows the sticker at `next`, which is in the list and not the one shown. */
  onPage: (next: number) => void;
  /**
   * Takes a drag up or down the stage as a throw of the shown sticker, which the slide follows until
   * it's let go fast or far enough; without one, such a move is left to scroll the page.
   */
  onThrow?: (toss: Toss) => void;
}

/**
 * Paging stickers one at a time. `page` goes to one, and its `slide` enters from its side; `stage`'s
 * handlers let a sideways swipe page, with the slide following the finger and springing back when the
 * swipe falls short, and with `onThrow`, a drag up or down throws the sticker.
 */
export function useSwipePaging({ index, count, reduced, onPage, onThrow }: Paging) {
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
    swipe.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      dx: 0,
      dy: 0,
      lock: null,
      samples: [],
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.lock) {
      const lock = swipeLock({ dx, dy });
      s.lock = lock === "scroll" && onThrow ? "throw" : lock;
      if (s.lock === "swipe" || s.lock === "throw") capturePointer(e.currentTarget, e.pointerId);
      // A thrown sticker leaves the sheet it's in, so nothing clips it on its way.
      if (s.lock === "throw") e.currentTarget.dataset.throwing = "";
    }
    if (s.lock === "throw") {
      s.dx = dx;
      s.dy = dy;
      // When the finger moved, rather than when the event was handled.
      const now = e.timeStamp;
      s.samples.push({ t: now, x: e.clientX, y: e.clientY });
      while (now - s.samples[0].t > THROW_WINDOW_MS * 2) s.samples.shift();
      if (!reduced && slide.current)
        slide.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * THROW_TURN_DEG_PER_PX}deg)`;
      return;
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
    if (s.lock === "throw") {
      const thrown = pages ? throwOf(s.samples, s, e.timeStamp) : null;
      // Thrown, the slide stays where the finger left it, for the throw to leave from.
      if (thrown && onThrow) {
        onThrow({ vx: thrown.x, vy: thrown.y, turn: s.dx * THROW_TURN_DEG_PER_PX });
        return;
      }
      const stage = e.currentTarget;
      const followed = el?.style.transform;
      if (el) el.style.transform = "";
      const back =
        followed && !reduced
          ? el?.animate([{ transform: followed }, { transform: "none" }], {
              duration: T_STICK_MS,
              easing: EASE_OUT,
            })
          : null;
      if (!back) delete stage.dataset.throwing;
      else
        back.finished.then(
          () => delete stage.dataset.throwing,
          () => delete stage.dataset.throwing,
        );
      return;
    }
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
