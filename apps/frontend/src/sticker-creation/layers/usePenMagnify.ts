import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { clamp, EASE_OUT, lerp } from "../../ui/easing";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { chipsIn, measureRests, pitchOf, px, snap, type Rest } from "./chipGeometry";

/** How much bigger the chip under the pen is, the chips beside it, and the next ones. Tuned by feel. */
export const MAGNIFY_NEAREST = 1.5;
export const MAGNIFY_NEXT = 1.25;
export const MAGNIFY_FAR = 1.1;

/** Scale by distance from the pen in chip pitches; past the last point a chip stays its size. */
const PROFILE = [
  [0, MAGNIFY_NEAREST],
  [1, MAGNIFY_NEXT],
  [2, MAGNIFY_FAR],
  [3, 1],
] as const;
/** Chips ease toward the pen over this long, ms, so a stepped hover reads as a glide. */
const FOLLOW_MS = 80;
/** Chips settle back over this long once the pen leaves, ms. */
const RESET_MS = 180;
/** Past a transition's end, when what it left on the chips is cleared. */
const CLEAN_AFTER_MS = 40;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** A chip's scale from its distance to the pen in pitches: smoothstep between the profile's points. */
function scaleAt(pitches: number): number {
  const d = Math.abs(pitches);
  for (let i = 1; i < PROFILE.length; i++) {
    const [d0, s0] = PROFILE[i - 1];
    const [d1, s1] = PROFILE[i];
    if (d <= d1) return lerp(s0, s1, smoothstep((d - d0) / (d1 - d0)));
  }
  return 1;
}

/**
 * Each chip's scale, and how far it moves along the column to make room, with the pen at `penY`.
 * A chip's growth pushes the chips beyond it away, so the shifts sum the growth between a chip and the
 * pen; the pen's own place in the column stays put, even between two chips.
 */
function magnify(rests: readonly Rest[], pitch: number, penY: number) {
  const n = rests.length;
  const scales = rests.map((rest) => scaleAt((rest.center - penY) / pitch));
  const growth = rests.map((rest, i) => (scales[i] - 1) * rest.height);
  const shifts = rests.map(() => 0);
  if (n > 1) {
    let k = 0;
    while (k < n - 2 && penY > rests[k + 1].center) k++;
    const span = rests[k + 1].center - rests[k].center;
    const between = span > 0 ? clamp((penY - rests[k].center) / span, 0, 1) : 0;
    const apart = (growth[k] + growth[k + 1]) / 2;
    shifts[k] = -between * apart;
    shifts[k + 1] = (1 - between) * apart;
    for (let i = k + 2; i < n; i++) shifts[i] = shifts[i - 1] + (growth[i - 1] + growth[i]) / 2;
    for (let i = k - 1; i >= 0; i--) shifts[i] = shifts[i + 1] - (growth[i] + growth[i + 1]) / 2;
  }
  return rests.map((_, i) => ({ scale: scales[i], shift: shifts[i] }));
}

/**
 * A hovering Apple Pencil magnifies the layer chips under it, as the macOS Dock does: the chip under
 * the pen grows most, its neighbors less, and they part so scaled chips don't overlap. Chips grow
 * from the edge the column sits on, toward the sheet.
 *
 * Pen hover is read from events (`pointermove` of a pen with no button down), never a media query:
 * iPadOS answers `(hover: none)` even with a Pencil. A finger or a mouse never magnifies. Transforms
 * go straight to the DOM; only `hovering` is state, so the column can fade its slider.
 */
export function usePenMagnify(
  list: RefObject<HTMLElement | null>,
  options: {
    enabled: boolean;
    /** The screen edge the column sits on: chips grow toward the other side. */
    edge: "left" | "right";
  },
): { hovering: boolean } {
  const { enabled, edge } = options;
  const reduced = useReducedMotion();
  const [hovering, setHovering] = useState(false);
  const latest = useRef({ reduced });
  useLayoutEffect(() => {
    latest.current = { reduced };
  });

  useEffect(() => {
    const el = list.current;
    if (!enabled || !el) return;
    // The chips as they rest, measured when the pen enters, so growing chips never move the yardstick.
    let rests: Rest[] | null = null;
    let pitch = 0;
    let scrollAt = 0;
    // A pen down freezes the chips as they are, so a tap lands where the pen hovered.
    let frozen = false;
    let over = false;
    // What each chip's transform was set to, so a reset leaves a chip someone else took over alone.
    const written = new Map<HTMLElement, string>();
    let cleanTimer: number | undefined;
    const stop = new AbortController();
    const { signal } = stop;

    const hover = (e: PointerEvent) => {
      if (e.pointerType !== "pen" || e.buttons !== 0 || frozen) return;
      clearTimeout(cleanTimer);
      const chips = chipsIn(el);
      let at = rests;
      if (!at || at.length !== chips.length || at.some((rest, i) => rest.chip !== chips[i])) {
        at = measureRests(chips);
        rests = at;
        pitch = pitchOf(at);
        scrollAt = el.scrollTop;
      }
      if (!over) {
        over = true;
        setHovering(true);
      }
      if (pitch <= 0) return;
      const transition = latest.current.reduced ? "none" : `transform ${FOLLOW_MS}ms linear`;
      // The chips rest where they were measured, so a list scrolled since moves the pen instead.
      const penY = e.clientY + el.scrollTop - scrollAt;
      magnify(at, pitch, penY).forEach(({ scale, shift }, i) => {
        const { chip } = at[i];
        const value = `translateY(${px(shift)}) scale(${scale.toFixed(3)})`;
        chip.style.transition = transition;
        chip.style.transformOrigin = `${edge} center`;
        chip.style.transform = value;
        written.set(chip, value);
      });
    };

    /** The chips settle back, once the pen is gone. */
    const release = (instant: boolean) => {
      frozen = false;
      rests = null;
      const mine = [...written].flatMap(([chip, value]) =>
        chip.style.transform === value ? [chip] : [],
      );
      written.clear();
      if (instant || latest.current.reduced) snap(mine, el);
      else {
        for (const { style } of mine) {
          style.transition = `transform ${RESET_MS}ms ${EASE_OUT}`;
          style.transform = "";
        }
        clearTimeout(cleanTimer);
        cleanTimer = window.setTimeout(() => snap(mine, el), RESET_MS + CLEAN_AFTER_MS);
      }
      if (over) {
        over = false;
        setHovering(false);
      }
    };

    el.addEventListener("pointermove", hover, { signal });
    el.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "pen") frozen = true;
      },
      { signal },
    );
    const penUp = (e: PointerEvent) => {
      if (e.pointerType === "pen") frozen = false;
    };
    el.addEventListener("pointerup", penUp, { signal });
    el.addEventListener("pointercancel", penUp, { signal });
    el.addEventListener(
      "pointerleave",
      (e) => {
        if (e.pointerType === "pen") release(false);
      },
      { signal },
    );

    return () => {
      stop.abort();
      clearTimeout(cleanTimer);
      release(true);
    };
  }, [enabled, edge, list]);

  return { hovering };
}
