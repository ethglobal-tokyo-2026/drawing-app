import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

/** down: held; pop: released inside, the action is about to fire; lift: cancelled. */
export type PressState = "down" | "pop" | "lift" | undefined;

/** Past the touch edge plus this, a held press lifts and cancels. */
const SLIDE_OFF = 16;
/** Coming back within this of the touch edge presses again. */
const SLIDE_BACK = 10;
/** The action fires this far into the pop, so the pop shows before the screen changes. */
const FIRE_DELAY_MS = 60;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The one press shared by every key, label and quiet link. The visual travel lives
 * in controls.css, keyed on `data-press`; this hook only tracks the gesture.
 */
export function usePress(onPress: () => void, disabled = false) {
  const [state, setState] = useState<PressState>();
  const active = useRef<{ pointerId?: number; inside: boolean } | null>(null);
  const fireTimer = useRef(0);
  const detach = useRef<() => void>(() => {});
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  });

  const cancel = () => {
    detach.current();
    if (active.current?.inside) setState("lift");
    active.current = null;
  };

  const release = () => {
    detach.current();
    const wasInside = active.current?.inside;
    active.current = null;
    if (!wasInside) return;
    setState("pop");
    window.clearTimeout(fireTimer.current);
    fireTimer.current = window.setTimeout(
      () => onPressRef.current(),
      reducedMotion() ? 0 : FIRE_DELAY_MS,
    );
  };

  useEffect(() => {
    const onHidden = () => document.hidden && active.current && cancel();
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      detach.current();
      window.clearTimeout(fireTimer.current);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0 || active.current) return;
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    active.current = { pointerId, inside: true };
    setState("down");

    const onMove = (m: globalThis.PointerEvent) => {
      const press = active.current;
      if (m.pointerId !== pointerId || !press) return;
      // Measured from the touch edge, which includes any invisible touch band.
      const r = el.getBoundingClientRect();
      const band = parseFloat(getComputedStyle(el).getPropertyValue("--touch-band")) || 0;
      const dx = Math.max(r.left - m.clientX, 0, m.clientX - r.right);
      const dy = Math.max(r.top - band - m.clientY, 0, m.clientY - r.bottom - band);
      const off = Math.hypot(dx, dy);
      if (press.inside && off > SLIDE_OFF) {
        press.inside = false;
        setState("lift");
      } else if (!press.inside && off <= SLIDE_BACK) {
        press.inside = true;
        setState("down");
      }
    };
    const onUp = (u: globalThis.PointerEvent) => u.pointerId === pointerId && release();
    // A scroll takes the pointer (labels allow it), and that cancels the press.
    const onCancel = (c: globalThis.PointerEvent) => c.pointerId === pointerId && cancel();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    detach.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      detach.current = () => {};
    };
  };

  // preventDefault on Enter's keydown and Space's keyup stops the native click, so only the press fires.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && active.current) {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (disabled || e.repeat || active.current) return;
    active.current = { inside: true };
    setState("down");
  };

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (active.current && active.current.pointerId === undefined) release();
  };

  // Pointer and keyboard presses fire through release(). A click with no press behind it
  // (detail 0 and nothing held) comes from assistive technology, so it fires directly.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!disabled && e.detail === 0 && !active.current) onPressRef.current();
  };

  return {
    state,
    handlers: {
      onPointerDown,
      onKeyDown,
      onKeyUp,
      onClick,
      onBlur: () => active.current && cancel(),
      onAnimationEnd: (e: AnimationEvent<HTMLButtonElement>) => {
        if (e.animationName === "press-pop" || e.animationName === "press-lift")
          setState(undefined);
      },
      "data-press": state,
    },
  };
}
