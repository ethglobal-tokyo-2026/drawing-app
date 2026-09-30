import { useEffect, useRef, type RefObject } from "react";
import { EASE_OUT } from "../../ui/easing";

/** How far the rubber band can show what's under the end, in px: each px of pull shows less toward it. */
const LIMIT = 120;
/** Travel past the scroller's end, in px, that reveals what's under it. */
export const PULL_THRESHOLD = 150;
/** Wheel events further apart than this, in ms, start a new wheel gesture. */
const WHEEL_GAP_MS = 160;
const SETTLE_MS = 320;

/** iOS's rubber band: `pull` px past the end shows this much, and never `LIMIT`. */
const rubberBand = (pull: number) => LIMIT * (1 - 1 / ((pull * 0.55) / LIMIT + 1));

/** The pull that shows `shown` px, so a band still settling back can be caught where it is. */
const pullShowing = (shown: number) => ((LIMIT / (LIMIT - shown) - 1) * LIMIT) / 0.55;

/** A wheel event's travel in px, whatever unit the device counts in. */
function wheelPx(e: WheelEvent, page: number) {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * 16;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * page;
  return e.deltaY;
}

interface Options {
  /**
   * The collapsed box at the end of its parent, the scroller. A pull past the scroller's end grows it
   * through `--pull`, holding the scroller at its end, so the cork and its papers ride up together the
   * way iOS's own rubber band moves a page.
   */
  wrapper: RefObject<HTMLElement | null>;
  /** Off while what it hides is out. */
  enabled: boolean;
  /** Nothing moves: travel past the threshold reveals it at once. */
  reduced: boolean;
  onReveal: () => void;
}

/**
 * Pulling past the end of a scroller meets rubber-band resistance and, past a threshold, reveals what
 * sits collapsed under its end. Only a touch that starts at the end pulls, so a scroll that runs into
 * the end never does, and the touch's first move decides: up pulls, down scrolls as usual. A wheel
 * adds up the same way, per burst.
 */
export function usePullToReveal({ wrapper, enabled, reduced, onReveal }: Options) {
  const reveal = useRef(onReveal);
  useEffect(() => {
    reveal.current = onReveal;
  });

  useEffect(() => {
    const box = wrapper.current;
    const scroller = box?.parentElement;
    if (!enabled || !box || !scroller) return;

    let shown = 0;
    let settling: Animation | null = null;
    // Where a touch that started at the end began; null for a touch that's a scroll.
    let from: number | null = null;
    // The pull already showing as the touch began, from a band still settling back.
    let base = 0;
    let pulling = false;
    let pull = 0;
    let wheelAt = -Infinity;
    let wheelPull = 0;
    let wheelArmed = false;
    let wheelIdle = 0;

    const end = () => scroller.scrollHeight - scroller.clientHeight;
    const atEnd = () => scroller.scrollTop >= end() - 1;

    const show = (px: number) => {
      shown = px;
      box.style.setProperty("--pull", `${px}px`);
      scroller.scrollTop = end();
    };

    // A new pull catches a band settling back where it is.
    const catchBand = () => {
      if (!settling) return;
      const at = box.getBoundingClientRect().height;
      settling.cancel();
      settling = null;
      show(at);
    };

    const settle = () => {
      if (shown === 0) return;
      const was = shown;
      shown = 0;
      box.style.setProperty("--pull", "0px");
      if (reduced) return;
      // The scroller's end follows the box down, so the cork eases back with it.
      settling = box.animate([{ height: `${was}px` }, { height: "0px" }], {
        duration: SETTLE_MS,
        easing: EASE_OUT,
      });
      settling.finished.then(
        () => (settling = null),
        () => {}, // cancelled by a pull that caught it
      );
    };

    const open = () => {
      pulling = false;
      from = null;
      clearTimeout(wheelIdle);
      settling?.cancel();
      settling = null;
      reveal.current();
    };

    const onTouchStart = (e: TouchEvent) => {
      pulling = false;
      from = null;
      if (e.touches.length !== 1) {
        // A second finger ends the pull, so the band goes back.
        settle();
        return;
      }
      catchBand();
      if (!atEnd()) return;
      from = e.touches[0].clientY;
      base = shown > 0 ? pullShowing(shown) : 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (from === null || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      if (!pulling) {
        if (y === from) return;
        // Down from the end, with nothing showing, is a scroll back up: the browser's.
        if (y > from && base === 0) {
          from = null;
          return;
        }
        pulling = true;
      }
      if (e.cancelable) e.preventDefault();
      pull = base + from - y;
      if (reduced) {
        if (pull >= PULL_THRESHOLD) open();
        return;
      }
      if (pull > 0) {
        show(rubberBand(pull));
        return;
      }
      // Back past where it began: the page follows the finger up, as a scroll would.
      if (shown > 0) show(0);
      scroller.scrollTop = end() + pull;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const released = pulling && e.type === "touchend";
      from = null;
      if (!pulling) return;
      pulling = false;
      if (released && !reduced && pull >= PULL_THRESHOLD) open();
      else settle();
    };

    const onWheel = (e: WheelEvent) => {
      // A burst that ran into the end, like a flick's glide, never pulls; one that starts there does.
      if (e.timeStamp - wheelAt > WHEEL_GAP_MS) {
        catchBand();
        wheelArmed = atEnd();
        wheelPull = shown > 0 ? pullShowing(shown) : 0;
      }
      wheelAt = e.timeStamp;
      if (!wheelArmed) return;
      const next = wheelPull + wheelPx(e, scroller.clientHeight);
      if (next <= 0) {
        // Scrolling back up past where it began: the browser's again.
        wheelArmed = false;
        if (shown > 0) show(0);
        return;
      }
      e.preventDefault();
      wheelPull = next;
      if (wheelPull >= PULL_THRESHOLD) {
        open();
        return;
      }
      if (reduced) return;
      show(rubberBand(wheelPull));
      clearTimeout(wheelIdle);
      wheelIdle = window.setTimeout(settle, WHEEL_GAP_MS);
    };

    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    // Not passive, so a pull can keep the browser from scrolling or bouncing under it.
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller.addEventListener("touchend", onTouchEnd);
    scroller.addEventListener("touchcancel", onTouchEnd);
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
      scroller.removeEventListener("wheel", onWheel);
      clearTimeout(wheelIdle);
      settling?.cancel();
      box.style.removeProperty("--pull");
    };
  }, [wrapper, enabled, reduced]);
}
