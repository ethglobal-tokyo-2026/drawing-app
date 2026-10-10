import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from "react";
import { playStick } from "../stickers/stick";
import { EASE_OUT, EASE_PEEL_POINTS, splitEasing, T_PEEL_MS, T_STICK_MS } from "../ui/easing";
import "./detail-lift.css";

/** On its way the sticker rises and turns toward you, most at this share of the flight's time. */
const LIFT = { at: 0.35, rise: -8, turnY: -11, perspective: 900 };
/** A given sticker fades in out of its silhouette over this share of the flight. */
const GIVEN_FADE = 0.4;
/** Under reduced motion the view and what it lifts off crossfade; so does a ghost moving spots. */
const CROSSFADE_MS = 150;

/** Where a sticker sits before it lifts: its lift on the board, its spot in Explore's pile. */
export interface LiftOrigin {
  /** The sticker where it sits. The flight leaves from its box, as laid out before its turn. */
  el: HTMLElement;
  /** Its turn there, in degrees. */
  turn: number;
  /** It sits as its given sticker silhouette, which stays: the sticker fades in out of it. */
  given?: boolean;
}

/** The view a sticker lifts into: the board's sticker detail, Explore's lifted sticker. */
export interface LiftView {
  /** The shown sticker's figure, where the flight lands. */
  figureOf: (view: HTMLElement) => HTMLElement | null;
  /** The rest of the view coming in around the sticker. Closing plays it backward. */
  enter: (view: HTMLElement) => Animation[];
  /**
   * The opacity the sticker's spot keeps while it's lifted, for a view that leaves the spot in
   * sight: a ghost of where it goes back. Without one the spot is empty only while the sticker flies.
   */
  ghost?: number;
}

/** A box on screen by its center, with its size before any turn. */
interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Everything that moves as the view opens. Closing plays it backward. */
interface Flight {
  animations: Animation[];
  /** The copy of the view's sticker that flies, over the view and what it lifts off. */
  flyer: HTMLElement | null;
  /** The sticker's spot while it's away: empty, or down to its ghost. */
  away: { el: HTMLElement; fade: Animation } | null;
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

const LIFT_EASING = splitEasing(EASE_PEEL_POINTS, LIFT.at);

/**
 * The flyer's frames from the sticker's spot and turn to its place in the view, along --ease-peel.
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

/** A copy of the view's sticker, on top of it, beside the view so the view's fade and clip pass it by. */
function makeFlyer(view: HTMLElement, figure: HTMLElement, to: Spot) {
  const flyer = document.createElement("div");
  flyer.className = "detail-lift__flyer";
  flyer.setAttribute("aria-hidden", "true");
  flyer.append(figure.cloneNode(true));
  view.after(flyer);
  // Where a left and top of 0 put it, whatever the borders and padding of what holds it.
  const zero = flyer.getBoundingClientRect();
  flyer.style.left = `${to.x - to.w / 2 - zero.left}px`;
  flyer.style.top = `${to.y - to.h / 2 - zero.top}px`;
  flyer.style.width = `${to.w}px`;
  flyer.style.height = `${to.h}px`;
  return flyer;
}

function takeOff(
  view: HTMLElement,
  into: LiftView,
  origin: LiftOrigin | null,
  reduced: boolean,
): Flight {
  const fill = "both";
  // A given sticker's silhouette stays where it is; any other spot empties while the sticker's away.
  const leaves = origin && !origin.given ? origin.el : null;
  const left = into.ghost ?? 0;
  if (reduced) {
    const animations = [
      view.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CROSSFADE_MS, fill }),
    ];
    const fade =
      leaves && into.ghost !== undefined
        ? leaves.animate([{ opacity: 1 }, { opacity: left }], { duration: CROSSFADE_MS, fill })
        : null;
    if (!leaves || !fade) return { animations, flyer: null, away: null };
    animations.push(fade);
    return { animations, flyer: null, away: { el: leaves, fade } };
  }

  // Measured before anything moves, so the flight lands where the figure comes to rest.
  const figure = into.figureOf(view);
  const to = figure && spotOf(figure);
  const from = origin && spotOf(origin.el);
  const animations = into.enter(view);
  if (!origin || !figure || !from || !to?.w || !to.h)
    return { animations, flyer: null, away: null };

  const flyer = makeFlyer(view, figure, to);
  animations.push(
    flyer.animate(flightFrames(from, to, origin.turn), { duration: T_PEEL_MS, fill }),
    figure.animate([{ opacity: 0 }, { opacity: 0 }], { duration: T_PEEL_MS, fill }),
  );
  if (!leaves) {
    animations.push(
      flyer.animate([{ opacity: 0 }, { opacity: 1, offset: GIVEN_FADE }, { opacity: 1 }], {
        duration: T_PEEL_MS,
        fill,
      }),
    );
    return { animations, flyer, away: null };
  }
  const fade = leaves.animate([{ opacity: left }, { opacity: left }], {
    duration: T_PEEL_MS,
    fill,
  });
  animations.push(fade);
  return { animations, flyer, away: { el: leaves, fade } };
}

interface Options {
  /** The view, which the flyer goes beside. */
  root: RefObject<HTMLElement | null>;
  /** The sticker it shows. Paging to another lands a flight in progress at once. */
  shownId: string | undefined;
  /** Where a sticker sits, which it lifts off from and sticks back onto; null where it isn't shown. */
  originOf: (id: string) => LiftOrigin | null;
  into: LiftView;
  reduced: boolean;
  onClose: () => void;
}

/**
 * A view lifts its sticker off where it sits: a copy flies from the sticker's spot and turn to its
 * place in the view, while the rest of the view comes in around it. Returns the view's close, which
 * plays that backward to wherever the shown sticker sits, sticks it down there, then calls `onClose`.
 * A sticker that isn't shown anywhere just fades. The view takes input throughout.
 */
export function useDetailLift({ root, shownId, originOf, into, reduced, onClose }: Options) {
  /** The opening while it plays, then the closing. */
  const flight = useRef<Flight | null>(null);
  const closing = useRef(false);
  /** The shown sticker's spot, held at its ghost once the sticker has landed in the view. */
  const ghosted = useRef<{ el: HTMLElement; fade: Animation } | null>(null);

  const takeOffFrom = (view: HTMLElement) =>
    takeOff(view, into, shownId === undefined ? null : originOf(shownId), reduced);
  const open = useEffectEvent(takeOffFrom);

  /** The sticker landed in the view: the flight ends, and a view with a ghost keeps the spot at it. */
  const land = useEffectEvent((opening: Flight) => {
    const hold = into.ghost !== undefined ? opening.away : null;
    for (const a of opening.animations) if (a !== hold?.fade) a.cancel();
    opening.flyer?.remove();
    ghosted.current = hold;
  });

  /** Paged: only the shown sticker is away, so the last one's spot fills back in and the new one's fades. */
  const moveGhost = useEffectEvent((from: HTMLElement | null, id: string | undefined) => {
    const ghost = into.ghost;
    if (ghost === undefined) return;
    const timing = { duration: CROSSFADE_MS, easing: EASE_OUT };
    from?.animate([{ opacity: ghost }, { opacity: 1 }], timing);
    const origin = id === undefined ? null : originOf(id);
    if (!origin || origin.given) return;
    const fade = origin.el.animate([{ opacity: 1 }, { opacity: ghost }], {
      ...timing,
      fill: "forwards",
    });
    // Nothing waits on it: it holds until paging on or putting back cancels it, which rejects `finished`.
    void settled([fade]);
    ghosted.current = { el: origin.el, fade };
  });

  // Before the first paint, so the view never shows before it lifts off.
  useLayoutEffect(() => {
    const view = root.current;
    if (!view) return;
    const opening = open(view);
    flight.current = opening;
    void settled(opening.animations).then(() => {
      if (flight.current !== opening || closing.current) return;
      land(opening);
      flight.current = null;
    });
    return () => {
      if (flight.current) stop(flight.current);
      flight.current = null;
      ghosted.current?.fade.cancel();
      ghosted.current = null;
    };
  }, [root]);

  // Paged mid-flight, the sticker in flight isn't the one shown any more: it lands at once.
  const shown = useRef(shownId);
  useLayoutEffect(() => {
    if (shown.current === shownId) return;
    shown.current = shownId;
    if (closing.current) return;
    const opening = flight.current;
    if (opening) stop(opening);
    flight.current = null;
    const was = opening?.away ?? ghosted.current;
    ghosted.current?.fade.cancel();
    ghosted.current = null;
    moveGhost(was?.el ?? null, shownId);
  }, [shownId]);

  return () => {
    const view = root.current;
    if (closing.current) return;
    closing.current = true;
    if (!view) {
      ghosted.current?.fade.cancel();
      onClose();
      return;
    }
    // A tap during the flight back reaches what it's uncovering.
    view.style.setProperty("pointer-events", "none");
    const back = flight.current ?? takeOffFrom(view);
    flight.current = back;
    // The flight back is the opening played backward, in a stick's time rather than a peel's.
    for (const a of back.animations) {
      a.updatePlaybackRate(reduced ? 1 : T_PEEL_MS / T_STICK_MS);
      a.reverse();
    }
    void settled(back.animations).then(() => {
      if (flight.current !== back) return;
      back.flyer?.remove();
      back.away?.fade.cancel();
      ghosted.current?.fade.cancel();
      ghosted.current = null;
      if (back.flyer && back.away) void playStick(back.away.el, { reduced });
      onClose();
    });
  };
}
