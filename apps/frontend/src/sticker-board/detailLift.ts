import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from "react";
import { playStick } from "../stickers/stick";
import type { BoardSticker } from "./boardSticker";

// Motion tokens spelled out: Web Animations can't read CSS variables.
/** --t-peel: the flight off the board. */
const PEEL_MS = 280;
/** --ease-peel's control points. */
const EASE_PEEL = [0.2, 0.7, 0.2, 1] as const;
/** --t-stick: the flight back, which is the opening played backward. */
const STICK_MS = 220;
/** --ease-out, for the rest of the detail coming in around the sticker. */
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** On its way the sticker rises and turns toward you, most at this share of the flight's time. */
const LIFT = { at: 0.35, rise: -8, turnY: -11, perspective: 900 };
/** A given sticker fades in out of its silhouette over this share of the flight. */
const GIVEN_FADE = 0.4;
/** Under reduced motion the detail and the board crossfade. */
const CROSSFADE_MS = 150;

/** A box on screen by its center, with its size before any turn. */
interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Everything that moves as the detail opens. Closing plays it backward. */
interface Flight {
  animations: Animation[];
  /** The copy of the detail's sticker that flies, over the board and the detail. */
  flyer: HTMLElement | null;
  /** The sticker on the board, hidden while its copy flies. */
  boardCopy: HTMLElement | null;
  hide: Animation | null;
}

interface Takeoff {
  /** Where the sticker sits: its lift on the board, or its given sticker silhouette. */
  origin: HTMLElement | null;
  /** Its turn there. */
  turn: number;
  given: boolean;
  reduced: boolean;
}

const spotOf = (el: HTMLElement): Spot => {
  const box = el.getBoundingClientRect();
  return {
    x: box.left + box.width / 2,
    y: box.top + box.height / 2,
    w: el.offsetWidth,
    h: el.offsetHeight,
  };
};

/** Once every animation has stopped, finished or cancelled. */
const settled = (animations: readonly Animation[]) =>
  Promise.allSettled(animations.map((a) => a.finished)).then(() => undefined);

const stop = ({ animations, flyer }: Flight) => {
  animations.forEach((a) => a.cancel());
  flyer?.remove();
};

type Point = readonly [number, number];

/**
 * A cubic-bezier easing cut at time `t`: the progress there, and each side as an easing of its own.
 * A keyframe can then sit at `t` while the motion through it still follows the one curve, where
 * easing each side with the whole curve would stall at the keyframe.
 */
export function splitEasing(
  [x1, y1, x2, y2]: readonly [number, number, number, number],
  t: number,
) {
  const x = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (x(mid) < t) lo = mid;
    else hi = mid;
  }
  const u = (lo + hi) / 2;
  // de Casteljau's construction at u gives both halves' control points.
  const mix = (p: Point, q: Point): Point => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  const p0: Point = [0, 0];
  const p1: Point = [x1, y1];
  const p2: Point = [x2, y2];
  const p3: Point = [1, 1];
  const a = mix(p0, p1);
  const b = mix(p1, p2);
  const c = mix(p2, p3);
  const d = mix(a, b);
  const e = mix(b, c);
  const cut = mix(d, e);
  const easing = (start: Point, c1: Point, c2: Point, end: Point) => {
    const n = (p: Point) =>
      [(p[0] - start[0]) / (end[0] - start[0]), (p[1] - start[1]) / (end[1] - start[1])]
        .map((v) => v.toFixed(4))
        .join(", ");
    return `cubic-bezier(${n(c1)}, ${n(c2)})`;
  };
  return { progress: cut[1], before: easing(p0, a, d, cut), after: easing(cut, e, c, p3) };
}

const LIFT_EASING = splitEasing(EASE_PEEL, LIFT.at);

/**
 * The flyer's frames from the sticker's spot and turn to its place in the detail, along --ease-peel.
 * Each frame lists the same functions, so each one tweens on its own.
 */
function flightFrames(from: Spot, to: Spot, turn: number): Keyframe[] {
  const at = (progress: number, lift: number) => {
    const left = 1 - progress;
    const f = (n: number) => n.toFixed(2);
    return [
      `perspective(${LIFT.perspective}px)`,
      `translate(${f((from.x - to.x) * left)}px, ${f((from.y - to.y) * left + LIFT.rise * lift)}px)`,
      `rotate(${f(turn * left)}deg)`,
      `scale(${f(1 + (from.w / to.w - 1) * left)}, ${f(1 + (from.h / to.h - 1) * left)})`,
      `rotateY(${f(LIFT.turnY * lift)}deg)`,
    ].join(" ");
  };
  return [
    { transform: at(0, 0), easing: LIFT_EASING.before },
    { transform: at(LIFT_EASING.progress, 1), offset: LIFT.at, easing: LIFT_EASING.after },
    { transform: at(1, 0) },
  ];
}

/** A copy of the detail's sticker, on top of it, beside the detail so the detail's fade and clip pass it by. */
function makeFlyer(detail: HTMLElement, figure: HTMLElement, to: Spot) {
  const flyer = document.createElement("div");
  flyer.className = "sticker-detail__flyer";
  flyer.setAttribute("aria-hidden", "true");
  flyer.append(figure.cloneNode(true));
  detail.after(flyer);
  // Where a left and top of 0 put it, whatever the borders and padding of what holds it.
  const zero = flyer.getBoundingClientRect();
  flyer.style.left = `${to.x - to.w / 2 - zero.left}px`;
  flyer.style.top = `${to.y - to.h / 2 - zero.top}px`;
  flyer.style.width = `${to.w}px`;
  flyer.style.height = `${to.h}px`;
  return flyer;
}

function takeOff(detail: HTMLElement, { origin, turn, given, reduced }: Takeoff): Flight {
  const fill = "both";
  const none = { flyer: null, boardCopy: null, hide: null };
  if (reduced)
    return {
      animations: [
        detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CROSSFADE_MS, fill }),
      ],
      ...none,
    };

  // The ground fades in, the strip slides in from the left, then the fine print and Give rise.
  const animations = [
    detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE_OUT, fill }),
  ];
  const enter = (part: Element, from: string, duration: number, delay: number) =>
    animations.push(
      part.animate(
        [
          { transform: from, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration, delay, easing: EASE_OUT, fill },
      ),
    );
  const strip = detail.querySelector(".sticker-detail__strip");
  if (strip) enter(strip, "translateX(-12px)", 200, 40);
  for (const part of detail.querySelectorAll(".sticker-detail__meta, .sticker-detail__acts"))
    enter(part, "translateY(8px)", 160, 120);

  const figure = detail.querySelector<HTMLElement>(".sticker-detail__slide .sticker-figure");
  if (!origin || !figure) return { animations, ...none };
  const from = spotOf(origin);
  const to = spotOf(figure);
  if (!to.w || !to.h) return { animations, ...none };

  const flyer = makeFlyer(detail, figure, to);
  animations.push(
    flyer.animate(flightFrames(from, to, turn), { duration: PEEL_MS, fill }),
    figure.animate([{ opacity: 0 }, { opacity: 0 }], { duration: PEEL_MS, fill }),
  );
  if (given) {
    animations.push(
      flyer.animate([{ opacity: 0 }, { opacity: 1, offset: GIVEN_FADE }, { opacity: 1 }], {
        duration: PEEL_MS,
        fill,
      }),
    );
    return { animations, flyer, boardCopy: null, hide: null };
  }
  const hide = origin.animate([{ opacity: 0 }, { opacity: 0 }], { duration: PEEL_MS, fill });
  animations.push(hide);
  return { animations, flyer, boardCopy: origin, hide };
}

interface Options {
  root: RefObject<HTMLElement | null>;
  /** The sticker the detail shows. */
  sticker: BoardSticker | undefined;
  /** Where a sticker sits on the board: its lift, or its given sticker silhouette. */
  originOf: ((id: string) => HTMLElement | null) | undefined;
  given: boolean;
  reduced: boolean;
  onClose: () => void;
}

/**
 * The detail lifts its sticker off the board: a copy flies from the sticker's spot and turn to its
 * place in the detail, while the rest of the detail comes in around it. Returns the detail's close,
 * which plays that backward to wherever the shown sticker sits, sticks it down there, then calls
 * `onClose`. A sticker that isn't on the board just fades. The detail takes input throughout.
 */
export function useDetailLift({ root, sticker, originOf, given, reduced, onClose }: Options) {
  /** The opening while it plays, then the closing. */
  const flight = useRef<Flight | null>(null);
  const closing = useRef(false);

  const takeOffFrom = (detail: HTMLElement) =>
    takeOff(detail, {
      origin: sticker ? (originOf?.(sticker.id) ?? null) : null,
      turn: sticker?.placement.r ?? 0,
      given,
      reduced,
    });
  const open = useEffectEvent(takeOffFrom);

  // Before the first paint, so the detail never shows before it lifts off.
  useLayoutEffect(() => {
    const detail = root.current;
    if (!detail) return;
    const opening = open(detail);
    flight.current = opening;
    void settled(opening.animations).then(() => {
      if (flight.current !== opening || closing.current) return;
      stop(opening);
      flight.current = null;
    });
    return () => {
      if (flight.current) stop(flight.current);
      flight.current = null;
    };
  }, [root]);

  // Paged mid-flight, the sticker in flight isn't the one shown any more: it lands at once.
  const shownId = sticker?.id;
  const shown = useRef(shownId);
  useLayoutEffect(() => {
    if (shown.current === shownId) return;
    shown.current = shownId;
    const opening = flight.current;
    if (!opening || closing.current) return;
    stop(opening);
    flight.current = null;
  }, [shownId]);

  return () => {
    const detail = root.current;
    if (closing.current) return;
    closing.current = true;
    if (!detail) {
      onClose();
      return;
    }
    // A tap during the flight back reaches the board it's uncovering.
    detail.style.setProperty("pointer-events", "none");
    const back = flight.current ?? takeOffFrom(detail);
    flight.current = back;
    for (const a of back.animations) {
      a.updatePlaybackRate(reduced ? 1 : PEEL_MS / STICK_MS);
      a.reverse();
    }
    void settled(back.animations).then(() => {
      if (flight.current !== back) return;
      back.flyer?.remove();
      back.hide?.cancel();
      if (back.boardCopy) void playStick(back.boardCopy, { reduced });
      onClose();
    });
  };
}
