import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { currentLight, subscribeLight, useLight } from "../stickers/light";
import { screenLean } from "../stickers/lightMode";
import { capturePointer } from "../ui/capturePointer";
import { deviceForLight } from "../ui/deviceForLight";
import { clamp, EASE_OUT, EASE_PEEL } from "../ui/easing";
import { getMotionPermission, subscribeMotionPermission } from "../ui/motionPermission";
import { useReducedMotion } from "../ui/useReducedMotion";

interface Options {
  active: boolean;
  layout: unknown;
}

const HOLD_MS = 320;
const SLOP_PX = 8;
const SETTLE_MS = 420;
const CLICK_AFTER_RELEASE_MS = 600;

interface Pickup {
  pointer: number;
  item: HTMLElement;
  button: HTMLElement;
  play: HTMLElement;
  held: boolean;
  timer: number;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  lastAt: number;
  vx: number;
  vy: number;
}

/**
 * Explore's loose stickers take permitted device tilt and an intentional hold, drag and flick.
 * Only the play wrapper moves: the pile's layout, fall-in and preview keep their own transforms.
 * Vertical pans can cancel pickup, and every release returns to the original pile arrangement.
 */
export function usePilePlay(root: RefObject<HTMLDivElement | null>, { active, layout }: Options) {
  const reduced = useReducedMotion();
  const permission = useSyncExternalStore(subscribeMotionPermission, getMotionPermission);
  const device = deviceForLight(navigator);
  const allowed = permission === "granted" || permission === "not-needed";
  useLight(active && !reduced && device === "phone-or-tablet" && allowed);
  const suppressed = useRef<{ button: HTMLElement; until: number } | null>(null);
  const beforePreview = useRef<() => void>(() => {});

  // This listener survives a layout or active-state change, so a held pointer's eventual click
  // cannot accidentally open the preview after its pickup has already been cancelled.
  useEffect(() => {
    const pile = root.current;
    if (!pile) return;
    const click = (event: MouseEvent) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(".pile-sticker__button")
          : null;
      const skip = suppressed.current;
      if (event.detail !== 0 && skip?.button === button && performance.now() < skip.until) {
        suppressed.current = null;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      suppressed.current = null;
      // A normal tap can interrupt a toss. Restore the preview's origin before React opens it.
      beforePreview.current();
    };
    pile.addEventListener("click", click, true);
    return () => {
      pile.removeEventListener("click", click, true);
      suppressed.current = null;
    };
  }, [root]);

  useEffect(() => {
    const pile = root.current;
    if (!pile) return;
    const doc = pile.ownerDocument;
    const win = doc.defaultView;
    if (!win) return;
    // A non-inherited translation avoids recalculating every sticker and tag on each tilt frame.
    const heaps = [...pile.querySelectorAll<HTMLOListElement>(".pile-day__heap")];
    const translate = (x: number, y: number) => {
      const pose = `${x}px ${y}px`;
      for (const heap of heaps) heap.style.setProperty("translate", pose);
    };
    const neutral = () => {
      translate(0, 0);
    };
    neutral();
    if (!active) return;
    let pickup: Pickup | null = null;
    let settling: {
      item: HTMLElement;
      play: HTMLElement;
      animation: Animation;
      timer: number;
    } | null = null;
    const pointers = new Set<number>();
    let windowFocused = true;
    let keyboardFocused =
      doc.activeElement instanceof Element &&
      pile.contains(doc.activeElement) &&
      doc.activeElement.matches(":focus-visible");

    const applyTilt = () => {
      if (pointers.size || keyboardFocused) return;
      const answer = getMotionPermission();
      if (
        doc.hidden ||
        !windowFocused ||
        reduced ||
        device !== "phone-or-tablet" ||
        (answer !== "granted" && answer !== "not-needed")
      ) {
        neutral();
        return;
      }
      const { x, y } = screenLean(currentLight());
      translate(
        clamp(Number.isFinite(x) ? x : 0, -1, 1) * 6,
        clamp(Number.isFinite(y) ? y : 0, -1, 1) * 4,
      );
    };

    const finishSettle = () => {
      const pending = settling;
      // Release ownership before cancelling; finished can reject after its list has detached.
      settling = null;
      if (!pending) return;
      win.clearTimeout(pending.timer);
      pending.animation.cancel();
      pending.play.style.removeProperty("transform");
      delete pending.item.dataset.playing;
    };
    const releaseCapture = (held: Pickup) => {
      if (held.button.hasPointerCapture(held.pointer))
        held.button.releasePointerCapture(held.pointer);
    };
    const cancelPickup = () => {
      const held = pickup;
      pickup = null;
      if (!held) return;
      win.clearTimeout(held.timer);
      if (held.held) {
        suppressed.current = {
          button: held.button,
          until: performance.now() + CLICK_AFTER_RELEASE_MS,
        };
        releaseCapture(held);
      }
      held.play.style.removeProperty("transform");
      delete held.item.dataset.playing;
    };
    const reset = () => {
      cancelPickup();
      finishSettle();
    };
    beforePreview.current = reset;

    const transform = (held: Pickup) =>
      reduced
        ? `translate(${held.x}px, ${held.y}px)`
        : `translate(${held.x}px, ${held.y - 5}px) rotate(${clamp(held.x * 0.08, -8, 8)}deg) scale(1.045)`;

    const toss = (held: Pickup) => {
      if (reduced) {
        held.play.style.removeProperty("transform");
        delete held.item.dataset.playing;
        return;
      }
      const moving = performance.now() - held.lastAt <= 80;
      const vx = moving ? held.vx : 0;
      const vy = moving ? held.vy : 0;
      const x = clamp(held.x + vx * 64, -120, 120);
      const y = clamp(held.y + vy * 24 - 24, -54, 30);
      const turn = clamp(held.x * 0.08 + vx * 5, -16, 16);
      held.item.dataset.playing = "settling";
      const animation = held.play.animate(
        [
          { transform: transform(held), easing: EASE_OUT },
          {
            transform: `translate(${x}px, ${y}px) rotate(${turn}deg) scale(1.06)`,
            offset: 0.24,
            easing: EASE_PEEL,
          },
          {
            transform: "translate(0, 2px) rotate(0) scale(1.01, 0.98)",
            offset: 0.8,
            easing: EASE_PEEL,
          },
          { transform: "none" },
        ],
        { duration: SETTLE_MS, fill: "both" },
      );
      const pending = { item: held.item, play: held.play, animation, timer: 0 };
      settling = pending;
      const finished = () => {
        if (settling === pending) finishSettle();
      };
      animation.finished.then(finished, finished);
      // A browser that suspends its animation clock must still release the temporary state.
      pending.timer = win.setTimeout(finished, SETTLE_MS + 180);
    };

    const onDown = (event: PointerEvent) => {
      // Browsers can omit the click after a drag. A fresh primary press is a fresh preview tap.
      if (event.isPrimary && event.button === 0) suppressed.current = null;
      pointers.add(event.pointerId);
      keyboardFocused = false;
      if (pointers.size > 1) {
        reset();
        return;
      }
      if (event.button !== 0 || doc.hidden || !windowFocused) return;
      // A second tap must land on a still hit area. Leave its visual pose held until the click
      // restores the preview's origin, or a deliberate pickup takes over.
      settling?.animation.pause();
      const button =
        event.target instanceof Element && pile.contains(event.target)
          ? event.target.closest<HTMLElement>(".pile-sticker__button")
          : null;
      const item = button?.closest<HTMLElement>(".pile-sticker");
      const play = item?.querySelector<HTMLElement>(".pile-sticker__play");
      if (!button || !item || !play || item.dataset.falling) return;
      const held: Pickup = {
        pointer: event.pointerId,
        item,
        button,
        play,
        held: false,
        timer: 0,
        fromX: event.clientX,
        fromY: event.clientY,
        x: 0,
        y: 0,
        lastX: event.clientX,
        lastY: event.clientY,
        lastAt: performance.now(),
        vx: 0,
        vy: 0,
      };
      pickup = held;
      held.timer = win.setTimeout(() => {
        if (pickup !== held || !item.isConnected || doc.hidden) return;
        finishSettle();
        held.held = true;
        item.dataset.playing = "held";
        play.style.transform = transform(held);
        suppressed.current = { button, until: Infinity };
        capturePointer(button, held.pointer);
      }, HOLD_MS);
    };
    const onMove = (event: PointerEvent) => {
      const held = pickup;
      if (!held || event.pointerId !== held.pointer) return;
      const dx = event.clientX - held.fromX;
      const dy = event.clientY - held.fromY;
      if (!held.held) {
        if (Math.hypot(dx, dy) > SLOP_PX) cancelPickup();
        return;
      }
      event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max(8, now - held.lastAt);
      held.vx = clamp((event.clientX - held.lastX) / elapsed, -2, 2);
      held.vy = clamp((event.clientY - held.lastY) / elapsed, -2, 2);
      held.lastX = event.clientX;
      held.lastY = event.clientY;
      held.lastAt = now;
      held.x = clamp(dx, -96, 96);
      held.y = clamp(dy, -24, 24);
      held.play.style.transform = transform(held);
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      const held = pickup;
      if (held?.pointer === event.pointerId) {
        pickup = null;
        win.clearTimeout(held.timer);
        if (held.held) {
          suppressed.current = {
            button: held.button,
            until: performance.now() + CLICK_AFTER_RELEASE_MS,
          };
          releaseCapture(held);
          toss(held);
        }
      }
      if (!pointers.size) settling?.animation.play();
      applyTilt();
    };
    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pickup?.pointer === event.pointerId) cancelPickup();
      if (!pointers.size) settling?.animation.play();
      applyTilt();
    };
    const onLostCapture = (event: PointerEvent) => {
      if (pickup?.pointer === event.pointerId) onCancel(event);
    };
    const onScroll = () => reset();
    const onVisibility = () => {
      if (doc.hidden) {
        reset();
        pointers.clear();
        neutral();
      } else applyTilt();
    };
    const onBlur = () => {
      windowFocused = false;
      reset();
      pointers.clear();
      neutral();
    };
    const onWindowFocus = () => {
      windowFocused = true;
      applyTilt();
    };
    const onContextMenu = (event: Event) => {
      if (pickup?.held) event.preventDefault();
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.type === "focusout" ? event.relatedTarget : event.target;
      keyboardFocused =
        target instanceof Element && pile.contains(target) && target.matches(":focus-visible");
      if (keyboardFocused) reset();
      applyTilt();
    };
    const onKey = () => {
      keyboardFocused = true;
      reset();
    };
    const observer = new ResizeObserver(reset);
    observer.observe(pile);
    const stopLight = subscribeLight(applyTilt);
    const stopPermission = subscribeMotionPermission(applyTilt);
    applyTilt();
    doc.addEventListener("pointerdown", onDown);
    pile.addEventListener("lostpointercapture", onLostCapture);
    pile.addEventListener("contextmenu", onContextMenu);
    pile.addEventListener("focusin", onFocus);
    pile.addEventListener("focusout", onFocus);
    pile.addEventListener("keydown", onKey);
    doc.addEventListener("pointermove", onMove, { passive: false });
    doc.addEventListener("pointerup", onUp);
    doc.addEventListener("pointercancel", onCancel);
    doc.addEventListener("scroll", onScroll, true);
    doc.addEventListener("visibilitychange", onVisibility);
    win.addEventListener("blur", onBlur);
    win.addEventListener("focus", onWindowFocus);
    return () => {
      reset();
      beforePreview.current = () => {};
      neutral();
      observer.disconnect();
      stopLight();
      stopPermission();
      doc.removeEventListener("pointerdown", onDown);
      pile.removeEventListener("lostpointercapture", onLostCapture);
      pile.removeEventListener("contextmenu", onContextMenu);
      pile.removeEventListener("focusin", onFocus);
      pile.removeEventListener("focusout", onFocus);
      pile.removeEventListener("keydown", onKey);
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", onUp);
      doc.removeEventListener("pointercancel", onCancel);
      doc.removeEventListener("scroll", onScroll, true);
      doc.removeEventListener("visibilitychange", onVisibility);
      win.removeEventListener("blur", onBlur);
      win.removeEventListener("focus", onWindowFocus);
    };
  }, [root, active, layout, reduced, device]);
}
