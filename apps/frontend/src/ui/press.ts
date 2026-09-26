/**
 * The press: one tactile press for every key (`.key`), label (`.label-btn`, not the quiet link) and
 * `[data-press]` element. It drops in 70ms, bottoms out, creeps while held, springs back up when the
 * finger slides off, and on release pops past rest and fires the element's click 60ms in. Disabled,
 * `aria-disabled` and `data-press="off"` elements never press.
 *
 * Only `translate` animates, on the element and a counter-move on its `::after` base, so a key's lip
 * compresses without its outline thinning. The element's native click is swallowed and re-fired with
 * `el.click()`, so React's onClick still runs, and a cancelled press can't let a click slip through.
 * While it moves the element carries `data-press-state` (down | pop | lift); at rest it has none.
 */

const SELECTOR = ".key, .label-btn:not(.label-btn--quiet), [data-press]";
/** Pixels past the touch target before a held press lets go. */
const SLOP_OUT = 16;
/** Pixels the finger must come back within to press again, so the edge doesn't flicker. */
const SLOP_IN = 10;
/** Milliseconds into the pop when the click fires. */
const FIRE_AT = 60;
const T = { down: 70, bottom: 120, creep: 900, pop: 340, lift: 380 };
const BOTTOM = 0.5;
const CREEP = 0.4;
/** The commit pops this far past rest, but at most 30% of the travel. */
const POP = 1.4;
/** How long after a press ends the browser's own click can still arrive. */
const SWALLOW_MS = 800;

interface Key {
  o: number;
  y?: number;
  e?: string;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const isOff = (el: HTMLElement) =>
  el.matches(":disabled") ||
  el.getAttribute("aria-disabled") === "true" ||
  el.dataset.press === "off";

function pressable(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(SELECTOR);
  return el instanceof HTMLElement && !isOff(el) ? el : null;
}

const hasBase = (el: HTMLElement) => el.matches(".key, .label-btn");

function travel(el: HTMLElement): number {
  const v = parseFloat(getComputedStyle(el).getPropertyValue("--press-travel"));
  return Number.isFinite(v) ? v : 1;
}

/** Where the face is right now, mid-animation included. */
function nowY(el: HTMLElement): number {
  const t = getComputedStyle(el).translate;
  if (!t || t === "none") return 0;
  const y = parseFloat(t.split(" ")[1] ?? "0");
  return Number.isFinite(y) ? y : 0;
}

/** What the finger can touch: the box plus a label's invisible `--hit` bands, in screen pixels. */
function bounds(el: HTMLElement): Bounds {
  const r = el.getBoundingClientRect();
  const hit = parseFloat(getComputedStyle(el).getPropertyValue("--hit")) || 0;
  const k = el.offsetHeight ? r.height / el.offsetHeight : 1;
  return { left: r.left, right: r.right, top: r.top - hit * k, bottom: r.bottom + hit * k };
}

const within = (b: Bounds, x: number, y: number, m: number) =>
  x >= b.left - m && x <= b.right + m && y >= b.top - m && y <= b.bottom + m;

/** Installs the press on the document and returns a function that removes it. */
export function installPress(): () => void {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const curves = {
    out: css.getPropertyValue("--ease-out").trim() || "cubic-bezier(.16,1,.3,1)",
    spring: css.getPropertyValue("--ease-spring").trim() || "cubic-bezier(.34,1.7,.5,1)",
  };

  const running = new WeakMap<HTMLElement, (Animation | null)[]>();
  const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
  let held: { el: HTMLElement; id: number; rect: Bounds; inside: boolean } | null = null;
  let keyed: { el: HTMLElement; key: string } | null = null;
  // The browser's own click after a press lands on the pressed element; a click anywhere else is real.
  let swallow: { el: HTMLElement; until: number } | null = null;

  const stop = (el: HTMLElement) => {
    running.get(el)?.forEach((a) => a?.cancel());
    running.delete(el);
  };

  // keys: [{ o: offset, y: px, e: easing to the next key }]; the first key starts where the face is now.
  const move = (el: HTMLElement, keys: Key[], duration: number, fill: FillMode = "none") => {
    const start = nowY(el);
    stop(el);
    const frames = (sign: number) =>
      keys.map((k, i) => ({
        offset: k.o,
        easing: k.e ?? "linear",
        translate: `0 ${(sign * (i === 0 ? start : (k.y ?? 0))).toFixed(3)}px`,
      }));
    const opts: KeyframeAnimationOptions = { duration: Math.max(1, duration), fill };
    const face = el.animate(frames(1), opts);
    const base = hasBase(el) ? el.animate(frames(-1), { ...opts, pseudoElement: "::after" }) : null;
    running.set(el, [face, base]);
  };

  const down = (el: HTMLElement) => {
    const d = travel(el);
    if (reduced()) return move(el, [{ o: 0 }, { o: 1, y: d }], 1, "forwards");
    const total = T.down + T.bottom + T.creep;
    move(
      el,
      [
        { o: 0, e: curves.out },
        { o: T.down / total, y: d + BOTTOM, e: "ease-in-out" },
        { o: (T.down + T.bottom) / total, y: d, e: "ease-in-out" },
        { o: 1, y: d + CREEP },
      ],
      total,
      "forwards",
    );
  };

  const rest = (el: HTMLElement, ms: number) => {
    if (reduced()) return move(el, [{ o: 0 }, { o: 1, y: 0 }], 1);
    move(
      el,
      [
        { o: 0, e: curves.spring },
        { o: 1, y: 0 },
      ],
      ms,
    );
  };

  const popUp = (el: HTMLElement) => {
    if (reduced()) return move(el, [{ o: 0 }, { o: 1, y: 0 }], 1);
    const over = -Math.min(POP, travel(el) * 0.3);
    move(
      el,
      [
        { o: 0, e: curves.out },
        { o: 0.36, y: over, e: curves.spring },
        { o: 1, y: 0 },
      ],
      T.pop,
    );
  };

  const setState = (el: HTMLElement, s: "down" | "pop" | "lift") => {
    clearTimeout(timers.get(el));
    el.dataset.pressState = s;
  };

  // After the pop or lift has played, back to rest.
  const settle = (el: HTMLElement, s: "pop" | "lift", ms: number) => {
    timers.set(
      el,
      setTimeout(() => {
        if (el.dataset.pressState !== s) return;
        delete el.dataset.pressState;
        running.delete(el);
      }, ms),
    );
  };

  const lift = (el: HTMLElement) => {
    setState(el, "lift");
    rest(el, T.lift);
    settle(el, "lift", reduced() ? 0 : T.lift);
  };

  const commit = (el: HTMLElement) => {
    setState(el, "pop");
    popUp(el);
    const fire = () => {
      if (el.isConnected && !isOff(el)) el.click();
    };
    if (reduced()) fire();
    else setTimeout(fire, FIRE_AT);
    settle(el, "pop", reduced() ? 0 : T.pop + 20);
  };

  const swallowNext = (el: HTMLElement) => {
    swallow = { el, until: performance.now() + SWALLOW_MS };
  };

  // Only the clicks a press commits get through; the browser's own click after a press is swallowed.
  const onClick = (e: MouseEvent) => {
    if (!e.isTrusted || !swallow || performance.now() > swallow.until) return;
    if (!(e.target instanceof Node) || !swallow.el.contains(e.target)) return;
    swallow = null;
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  const onPointerDown = (e: PointerEvent) => {
    swallow = null;
    if (held || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    const el = pressable(e.target);
    if (!el) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events have no active pointer to capture; the press still works.
    }
    held = { el, id: e.pointerId, rect: bounds(el), inside: true };
    setState(el, "down");
    down(el);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!held || e.pointerId !== held.id) return;
    const inside = within(held.rect, e.clientX, e.clientY, held.inside ? SLOP_OUT : SLOP_IN);
    if (inside === held.inside) return;
    held.inside = inside;
    if (inside) {
      setState(held.el, "down");
      down(held.el);
    } else lift(held.el);
  };

  const end = (e: PointerEvent, cancelled: boolean) => {
    if (!held || e.pointerId !== held.id) return;
    const h = held;
    held = null;
    swallowNext(h.el);
    const inside =
      !cancelled && within(h.rect, e.clientX, e.clientY, h.inside ? SLOP_OUT : SLOP_IN);
    if (inside && !isOff(h.el)) commit(h.el);
    else lift(h.el);
  };
  const onPointerUp = (e: PointerEvent) => end(e, false);
  const onPointerCancel = (e: PointerEvent) => end(e, true);
  const onLostCapture = (e: PointerEvent) => {
    if (held && e.pointerId === held.id && !held.el.isConnected) end(e, true);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Escape cancels the held press, and only that: a dialog's own Escape waits for the next one.
    if (e.key === "Escape" && keyed) {
      const k = keyed;
      keyed = null;
      e.preventDefault();
      e.stopImmediatePropagation();
      lift(k.el);
      return;
    }
    if (e.key !== " " && e.key !== "Enter") return;
    const el = pressable(e.target);
    if (!el || el !== e.target || (e.key === " " && el.tagName === "A")) return;
    e.preventDefault(); // no native click on Enter's keydown, no page scroll on Space
    if (e.repeat || keyed || held) return;
    keyed = { el, key: e.key };
    setState(el, "down");
    down(el);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!keyed || e.key !== keyed.key) {
      // A cancelled key's release stays quiet.
      if (e.key === " " || e.key === "Enter") {
        const el = pressable(e.target);
        if (el && el === e.target) e.preventDefault();
      }
      return;
    }
    const k = keyed;
    keyed = null;
    e.preventDefault();
    swallowNext(k.el);
    if (isOff(k.el)) lift(k.el);
    else commit(k.el);
  };

  const onFocusOut = (e: FocusEvent) => {
    if (keyed && e.target === keyed.el) {
      const k = keyed;
      keyed = null;
      lift(k.el);
    }
  };

  // Leaving the page mid-press lets go: nothing stays stuck down, nothing fires.
  const letGo = () => {
    if (held) {
      const h = held;
      held = null;
      swallowNext(h.el);
      lift(h.el);
    }
    if (keyed) {
      const k = keyed;
      keyed = null;
      lift(k.el);
    }
  };
  const onVisibility = () => {
    if (document.hidden) letGo();
  };
  // iOS only applies :active (the quiet links' feedback) once a touch listener exists.
  const onTouchStart = () => {};

  const capture = { capture: true };
  document.addEventListener("click", onClick, capture);
  document.addEventListener("pointerdown", onPointerDown, capture);
  document.addEventListener("pointermove", onPointerMove, capture);
  document.addEventListener("pointerup", onPointerUp, capture);
  document.addEventListener("pointercancel", onPointerCancel, capture);
  document.addEventListener("lostpointercapture", onLostCapture, capture);
  document.addEventListener("keydown", onKeyDown, capture);
  document.addEventListener("keyup", onKeyUp, capture);
  document.addEventListener("focusout", onFocusOut, capture);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("blur", letGo);
  root.dataset.pressReady = "";

  return () => {
    document.removeEventListener("click", onClick, capture);
    document.removeEventListener("pointerdown", onPointerDown, capture);
    document.removeEventListener("pointermove", onPointerMove, capture);
    document.removeEventListener("pointerup", onPointerUp, capture);
    document.removeEventListener("pointercancel", onPointerCancel, capture);
    document.removeEventListener("lostpointercapture", onLostCapture, capture);
    document.removeEventListener("keydown", onKeyDown, capture);
    document.removeEventListener("keyup", onKeyUp, capture);
    document.removeEventListener("focusout", onFocusOut, capture);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("blur", letGo);
    delete root.dataset.pressReady;
  };
}
