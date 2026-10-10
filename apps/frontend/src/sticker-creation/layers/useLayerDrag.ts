import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { clamp, EASE_OUT } from "../../ui/easing";
import { SWALLOW_MS } from "../../ui/press";
import { useReducedMotion } from "../../ui/useReducedMotion";
import type { LayerId } from "../canvas/ops";
import { chipsIn, layerOf, measureRests, pitchOf, px, snap, type Rest } from "./chipGeometry";

/** How long a press holds still on a chip before it lifts, ms. Tuned by feel. */
export const LIFT_HOLD_MS = 400;
/** How far a press may wander before the hold gives way to a scroll, px. */
export const LIFT_SLOP_PX = 8;
/** A lifted chip's size against its size at rest. */
export const LIFT_SCALE = 1.06;
/** How fast the list scrolls under a lifted chip held at its very edge, px per second. */
const EDGE_SCROLL_PX_PER_S = 480;
/** A frame longer than this scrolls as this long, so a stalled frame can't fling the list. */
const MAX_FRAME_MS = 32;
const SLIDE_MS = 160;
const SETTLE_MS = 140;
/** How long a dropped chip waits for the column to reorder before it settles back where it was. */
const REORDER_WAIT_MS = 250;
/** Past a transition's end, when what it left on the chips is cleared. */
const CLEAN_AFTER_MS = 40;

const LIFT_SHADOW = "var(--shadow-lift)";
const SLIDE = `transform ${SLIDE_MS}ms ${EASE_OUT}`;
const SETTLE = `transform ${SETTLE_MS}ms ${EASE_OUT}, box-shadow ${SETTLE_MS}ms ${EASE_OUT}`;

/** A press on a chip, held still so far. */
interface Press {
  id: LayerId;
  pointerId: number;
  x: number;
  y: number;
  /** Where the pointer is now, which the chip is lifted from. */
  lastY: number;
  timer: number;
}

/** A lifted chip. Slots count from the front, as the column shows the chips. */
interface Lift {
  id: LayerId;
  pointerId: number;
  rests: Rest[];
  from: number;
  /** The slot the chip would drop in now. */
  slot: number;
  startY: number;
  pointerY: number;
  scrollFrom: number;
  /** The list's visible top and bottom, client px. */
  top: number;
  bottom: number;
  pitch: number;
  /** How far the chip is from its resting place, px. */
  dy: number;
  raf: number | null;
  frameAt: number;
}

/** What is left on the chips after a drop, until it is cleared. */
type Tail =
  /** Dropped on a new slot: transforms stand in for the reorder the column is about to make. */
  | {
      kind: "reorder";
      timer: number;
      rests: Rest[];
      from: number;
      slot: number;
      dy: number;
      orderKey: string;
    }
  /** Easing back to rest. */
  | { kind: "settle"; timer: number; rests: Rest[] };

const restChips = (rests: readonly Rest[]) => rests.map((rest) => rest.chip);

function finishTail(tail: RefObject<Tail | null>, list: HTMLElement) {
  const t = tail.current;
  if (!t) return;
  tail.current = null;
  clearTimeout(t.timer);
  snap(restChips(t.rests), list);
}

/** The chips eased back to rest, then cleared once they've arrived. */
function easeBack(rests: Rest[], list: HTMLElement, tail: RefObject<Tail | null>) {
  for (const { chip } of rests) {
    chip.style.transition = SETTLE;
    chip.style.transform = "";
    chip.style.boxShadow = "";
  }
  const timer = window.setTimeout(() => finishTail(tail, list), SETTLE_MS + CLEAN_AFTER_MS);
  tail.current = { kind: "settle", rests, timer };
}

function putBack(rests: Rest[], list: HTMLElement, tail: RefObject<Tail | null>, instant: boolean) {
  if (instant) snap(restChips(rests), list);
  else easeBack(rests, list, tail);
}

/**
 * The column has reordered under a dropped chip, so the others' transforms are cleared at once, as
 * they already sit where the transforms showed them. The dropped chip settles from where it was let
 * go, measured against its new place.
 */
function settleReordered(
  t: Extract<Tail, { kind: "reorder" }>,
  list: HTMLElement,
  tail: RefObject<Tail | null>,
  instant: boolean,
) {
  snap(restChips(t.rests), list);
  tail.current = null;
  if (instant) return;
  const dropped = t.rests[t.from];
  const newPlace = t.rests[t.slot].center - dropped.center;
  dropped.chip.style.transition = "none";
  dropped.chip.style.transform = `translateY(${px(t.dy - newPlace)}) scale(${LIFT_SCALE})`;
  dropped.chip.style.boxShadow = LIFT_SHADOW;
  dropped.chip.style.zIndex = "1";
  void list.offsetHeight;
  easeBack([dropped], list, tail);
}

/** The slot whose chip rests nearest `y`. */
const nearestSlot = (rests: readonly Rest[], y: number) =>
  rests.reduce(
    (best, rest, i) => (Math.abs(rest.center - y) < Math.abs(rests[best].center - y) ? i : best),
    0,
  );

/** Where chip `j` slides to while the chip lifted from slot `from` hovers over slot `slot`. */
const slotAfter = (j: number, from: number, slot: number) =>
  j > from && j <= slot ? j - 1 : j < from && j >= slot ? j + 1 : j;

/** How fast the list scrolls, px per second, down positive: faster nearer the end, none away from both. */
function edgeSpeed(l: Lift) {
  const into = (depth: number) => EDGE_SCROLL_PX_PER_S * clamp(depth / l.pitch, 0, 1);
  if (l.pointerY < l.top + l.pitch) return -into(l.top + l.pitch - l.pointerY);
  if (l.pointerY > l.bottom - l.pitch) return into(l.pointerY - (l.bottom - l.pitch));
  return 0;
}

/**
 * Hold a chip to lift it, drag it along the column and drop it to move its layer. Pointer events
 * only: the browser's drag and drop may not be on in LINE's web view. A press that moves before the
 * hold runs out is a scroll of the column, which the hook lets go. The chips move by transforms
 * written straight to the DOM, so a drag renders nothing in React; only `lifted` is state.
 *
 * The chips' own click is left alone, except the one a lift's release brings.
 */
export function useLayerDrag(
  list: RefObject<HTMLElement | null>,
  options: {
    enabled: boolean;
    /** The layers back to front, as the column shows them reversed (front on top). */
    order: readonly LayerId[];
    /** A drop: the layer goes to this index from the back. One call per drag, never per slot crossed. */
    onMove: (id: LayerId, to: number) => void;
    /** A chip lifted, or put down: the clock holds while a chip is lifted. */
    onLift: (lifted: boolean) => void;
  },
): { lifted: LayerId | null } {
  const { enabled, order, onMove, onLift } = options;
  const reduced = useReducedMotion();
  const [lifted, setLifted] = useState<LayerId | null>(null);
  const orderKey = order.join(",");
  // Listeners installed once read the latest options through this.
  const latest = useRef({ order, orderKey, onMove, onLift, reduced });
  useLayoutEffect(() => {
    latest.current = { order, orderKey, onMove, onLift, reduced };
  });
  const tail = useRef<Tail | null>(null);
  const controls = useRef<{ cancel: () => void } | null>(null);

  useLayoutEffect(() => {
    const t = tail.current;
    const el = list.current;
    if (t?.kind !== "reorder" || t.orderKey === orderKey || !el) return;
    clearTimeout(t.timer);
    settleReordered(t, el, tail, latest.current.reduced);
  }, [orderKey, list]);

  // Layers that change under a lifted chip leave its slots wrong.
  useEffect(() => {
    controls.current?.cancel();
  }, [orderKey]);

  useEffect(() => {
    const el = list.current;
    if (!enabled || !el) return;
    let press: Press | null = null;
    let lift: Lift | null = null;
    // The click a lift's release brings is not a tap on a chip.
    let swallowing = false;
    let swallowTimer: number | undefined;
    const stop = new AbortController();
    const { signal } = stop;

    const clearPress = () => {
      if (press) clearTimeout(press.timer);
      press = null;
    };

    /** Follows the pointer, and parts the other chips round the slot it would drop in. */
    const place = (l: Lift) => {
      const { rests, from } = l;
      const here = rests[from];
      const follow = l.pointerY - l.startY + (el.scrollTop - l.scrollFrom);
      const [first, last] = [rests[0], rests[rests.length - 1]];
      l.dy = clamp(follow, first.center - here.center, last.center - here.center);
      here.chip.style.transform = `translateY(${px(l.dy)}) scale(${LIFT_SCALE})`;
      const slot = nearestSlot(rests, here.center + l.dy);
      if (slot === l.slot) return;
      l.slot = slot;
      rests.forEach((rest, j) => {
        if (j === from) return;
        const by = rests[slotAfter(j, from, slot)].center - rest.center;
        rest.chip.style.transform = by ? `translateY(${px(by)})` : "";
      });
    };

    const scrollFrame = (now: number) => {
      const l = lift;
      if (!l) return;
      l.raf = null;
      const dt = Math.min(now - l.frameAt, MAX_FRAME_MS);
      l.frameAt = now;
      const speed = edgeSpeed(l);
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const next = clamp(el.scrollTop + (speed * dt) / 1000, 0, max);
      if (speed === 0 || next === el.scrollTop) return;
      el.scrollTop = next;
      place(l);
      l.raf = requestAnimationFrame(scrollFrame);
    };
    const ensureScrolling = (l: Lift) => {
      if (l.raf !== null || edgeSpeed(l) === 0) return;
      l.frameAt = performance.now();
      l.raf = requestAnimationFrame(scrollFrame);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape puts the chip back and does only that: a dialog's own Escape waits for the next one.
      e.preventDefault();
      e.stopImmediatePropagation();
      endLift("cancel");
    };

    const endLift = (how: "drop" | "cancel", instant = false) => {
      const l = lift;
      if (!l) return;
      lift = null;
      if (l.raf !== null) cancelAnimationFrame(l.raf);
      document.removeEventListener("keydown", onKey, true);
      if (el.hasPointerCapture(l.pointerId)) el.releasePointerCapture(l.pointerId);
      clearTimeout(swallowTimer);
      swallowTimer = window.setTimeout(() => {
        swallowing = false;
      }, SWALLOW_MS);
      const now = latest.current;
      const to = now.order.length - 1 - l.slot;
      if (how === "drop" && to !== now.order.indexOf(l.id)) {
        // The column reorders once it renders; until then the transforms keep every chip where it shows.
        const timer = window.setTimeout(() => {
          const t = tail.current;
          if (t?.kind !== "reorder") return;
          tail.current = null;
          putBack(t.rests, el, tail, latest.current.reduced);
        }, REORDER_WAIT_MS);
        tail.current = {
          kind: "reorder",
          timer,
          rests: l.rests,
          from: l.from,
          slot: l.slot,
          dy: l.dy,
          orderKey: now.orderKey,
        };
        now.onMove(l.id, to);
      } else putBack(l.rests, el, tail, instant || now.reduced);
      setLifted(null);
      now.onLift(false);
    };

    const startLift = () => {
      const p = press;
      press = null;
      if (!p) return;
      const now = latest.current;
      finishTail(tail, el);
      const byLayer = new Map(chipsIn(el).map((chip) => [layerOf(chip), chip] as const));
      const slots = [...now.order].reverse();
      const chips = slots.flatMap((id) => byLayer.get(id) ?? []);
      const from = slots.indexOf(p.id);
      if (chips.length !== slots.length || from < 0) return;
      try {
        el.setPointerCapture(p.pointerId);
      } catch (error) {
        // The finger came up as the hold ran out: nothing is left to carry.
        if (error instanceof DOMException && error.name === "NotFoundError") return;
        throw error;
      }
      const rests = measureRests(chips);
      const box = el.getBoundingClientRect();
      const l: Lift = {
        id: p.id,
        pointerId: p.pointerId,
        rests,
        from,
        slot: from,
        startY: p.lastY,
        pointerY: p.lastY,
        scrollFrom: el.scrollTop,
        top: box.top,
        bottom: box.bottom,
        pitch: pitchOf(rests),
        dy: 0,
        raf: null,
        frameAt: 0,
      };
      lift = l;
      for (const { chip } of rests) chip.style.transition = now.reduced ? "none" : SLIDE;
      const dragged = rests[from].chip;
      dragged.style.transition = "none";
      dragged.style.zIndex = "1";
      dragged.style.boxShadow = LIFT_SHADOW;
      place(l);
      document.addEventListener("keydown", onKey, true);
      swallowing = true;
      now.onLift(true);
      setLifted(p.id);
      ensureScrolling(l);
    };

    el.addEventListener(
      "pointerdown",
      (e) => {
        // One press at a time; a second finger is neither a lift nor a scroll.
        if (press || lift) return;
        swallowing = false;
        clearTimeout(swallowTimer);
        const chip =
          e.target instanceof Element ? e.target.closest<HTMLElement>("[data-layer-chip]") : null;
        if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
        if (!chip || !el.contains(chip) || latest.current.order.length < 2) return;
        const id = layerOf(chip);
        if (!latest.current.order.includes(id)) return;
        const timer = window.setTimeout(startLift, LIFT_HOLD_MS);
        press = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, lastY: e.clientY, timer };
      },
      { signal },
    );
    el.addEventListener(
      "pointermove",
      (e) => {
        if (lift && e.pointerId === lift.pointerId) {
          lift.pointerY = e.clientY;
          place(lift);
          ensureScrolling(lift);
        } else if (press && e.pointerId === press.pointerId) {
          press.lastY = e.clientY;
          if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > LIFT_SLOP_PX) clearPress();
        }
      },
      { signal },
    );
    el.addEventListener(
      "pointerup",
      (e) => {
        if (lift && e.pointerId === lift.pointerId) {
          // Where it lets go is where it drops, whatever the last move said.
          lift.pointerY = e.clientY;
          place(lift);
          endLift("drop");
        } else if (press && e.pointerId === press.pointerId) clearPress();
      },
      { signal },
    );
    el.addEventListener(
      "pointercancel",
      (e) => {
        if (lift && e.pointerId === lift.pointerId) endLift("cancel");
        else if (press && e.pointerId === press.pointerId) clearPress();
      },
      { signal },
    );
    el.addEventListener(
      "lostpointercapture",
      (e) => {
        if (lift && e.pointerId === lift.pointerId) endLift("cancel");
      },
      { signal },
    );
    // iOS may not let a touchmove listener added after the touch began cancel it, so this one stands
    // for as long as the hook is enabled and acts only while a chip is lifted.
    el.addEventListener(
      "touchmove",
      (e) => {
        if (lift && e.cancelable) e.preventDefault();
      },
      { passive: false, signal },
    );
    el.addEventListener(
      "contextmenu",
      (e) => {
        if (press || lift) e.preventDefault();
      },
      { signal },
    );
    el.addEventListener(
      "click",
      (e) => {
        if (!swallowing) return;
        swallowing = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { capture: true, signal },
    );

    controls.current = { cancel: () => endLift("cancel", true) };
    return () => {
      controls.current = null;
      endLift("cancel", true);
      clearPress();
      clearTimeout(swallowTimer);
      finishTail(tail, el);
      stop.abort();
    };
  }, [enabled, list]);

  return { lifted };
}
