import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from "react";
import { applyStickerFoilCoverage } from "../stickers/prepareStickerFoil";
import { holdFoilCoverageMask } from "../stickers/acquireFoilCoverage";
import { mountStickerCopy, stickerFoilCoverage, turnSticker } from "../stickers/stickerRenderer";
import { pauseStickerMaterial, refreshHiddenMaterials } from "../stickers/stickerMaterialHandoff";
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
  release?: () => void;
  track?: () => void;
  destination?: HTMLElement;
  abort?: AbortController;
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

const stop = (flight: Flight) => {
  flight.abort?.abort();
  flight.animations.forEach((a) => a.cancel());
  flight.release?.();
  flight.flyer?.remove();
};
const finishCanvas = (host: Element | null) =>
  host?.querySelector<HTMLCanvasElement>("canvas.sticker-material") ?? null;

/** A return stays visually hidden while its retained material samples the held pose. */
async function refreshDestination(flight: Flight, host: HTMLElement | null) {
  const canvas = finishCanvas(host);
  if (!canvas || !host?.isConnected) return;
  await refreshHiddenMaterials(
    [canvas],
    flight.abort?.signal ?? new AbortController().signal,
    `sticker ${host.closest<HTMLElement>("[data-sticker-id]")?.dataset.stickerId ?? "(unknown)"}'s flight destination`,
  );
}

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

const cloneFigure = (figure: HTMLElement) => {
  const copy = figure.cloneNode(true);
  if (!(copy instanceof HTMLElement)) throw new Error("The sticker flight copy is not an element");
  return copy;
};

/** Each canvas's last paint, into its clone; one that can't be copied leaves the print showing. */
function copyPaint(
  figure: HTMLElement,
  copy: HTMLElement,
  sticker: string | undefined,
  live?: Element,
) {
  const snapshots = copy.querySelectorAll("canvas");
  figure.querySelectorAll("canvas").forEach((original, index) => {
    const snapshot = snapshots[index];
    if (!snapshot || snapshot === live) return;
    if (!original.width || !original.height) {
      snapshot.dataset.state = "loading";
      return;
    }
    try {
      snapshot.width = original.width;
      snapshot.height = original.height;
      const context = snapshot.getContext("2d");
      if (!context) throw new Error("its 2D context is unavailable");
      context.drawImage(original, 0, 0);
    } catch (error) {
      snapshot.dataset.state = "failed";
      snapshot.dataset.error = String(error);
      console.error(`Copying sticker ${sticker}'s paint into its flight failed`, error);
    }
  });
}

/** Lays a flyer beside the view, on the figure's spot, so the view's fade and clip pass it by. */
function launch(flyer: HTMLElement, copy: HTMLElement, view: HTMLElement, to: Spot) {
  flyer.className = "detail-lift__flyer";
  flyer.setAttribute("aria-hidden", "true");
  flyer.append(copy);
  view.after(flyer);
  // Where a left and top of 0 put it, whatever the borders and padding of what holds it.
  const zero = flyer.getBoundingClientRect();
  flyer.style.left = `${to.x - to.w / 2 - zero.left}px`;
  flyer.style.top = `${to.y - to.h / 2 - zero.top}px`;
  flyer.style.width = `${to.w}px`;
  flyer.style.height = `${to.h}px`;
  return flyer;
}

/** With no ready material to copy, the view's figure flies as it stands: its print and static foil. */
function stillFlyer(view: HTMLElement, figure: HTMLElement, to: Spot, sticker: string | undefined) {
  const copy = cloneFigure(figure);
  copyPaint(figure, copy, sticker);
  return launch(document.createElement("div"), copy, view, to);
}

/**
 * A live copy of the view's sticker, its material seeded from `source`. Null when the source rejects
 * the copy, as one being retired or concealed does.
 */
function makeFlyer(
  view: HTMLElement,
  figure: HTMLElement,
  to: Spot,
  source: HTMLCanvasElement,
  sticker: string | undefined,
) {
  const flyer = document.createElement("div");
  const copy = cloneFigure(figure);
  const canvas = finishCanvas(copy);
  if (!canvas) return null;
  let invalidated = false;
  let live = true;
  // The copied cast keeps its mask while it shows, whatever its source moves on to.
  let releaseMask = () => {};
  let tracking: { raf: number } | undefined;
  const stopTracking = () => {
    if (tracking) cancelAnimationFrame(tracking.raf);
    tracking = undefined;
  };
  let movement: Animation | undefined;
  let hidden: Animation | undefined;
  const destination = finishCanvas(figure);
  const admission = destination && pauseStickerMaterial(destination);
  const abort = new AbortController();
  // Rejection may call this before mountStickerCopy returns. Do not attach a rejected clone.
  const invalidate = () => {
    invalidated = true;
    abort.abort();
    stopTracking();
    movement?.cancel();
    hidden?.cancel();
    releaseMask();
    admission?.release();
    flyer.remove();
  };
  let releaseCopy: () => void;
  try {
    releaseCopy = mountStickerCopy(canvas, source, () => live && !invalidated, invalidate);
  } catch (error) {
    admission?.release();
    throw error;
  }
  const release = () => {
    if (!live) return;
    live = false;
    abort.abort();
    stopTracking();
    releaseCopy();
    releaseMask();
    admission?.release();
    flyer.remove();
  };
  if (invalidated) {
    release();
    return null;
  }
  // Auxiliary crease paint is frozen; the complete material retains its own live material owner.
  copyPaint(figure, copy, sticker, canvas);
  launch(flyer, copy, view, to);
  const copiedFoil = copy.querySelector<HTMLElement>(".sticker-foil");
  const foil = stickerFoilCoverage(canvas);
  try {
    if (copiedFoil && foil) {
      copiedFoil.className = `sticker-foil sticker-foil--${foil.material.size} sticker-foil--${foil.material.style}`;
      applyStickerFoilCoverage(copiedFoil, foil.coverage, to.w, to.h);
      releaseMask = holdFoilCoverageMask(foil.coverage.mask);
    } else copiedFoil?.remove();
  } catch (error) {
    release();
    throw error;
  }
  const track = (animation: Animation, hide: Animation) => {
    movement = animation;
    hidden = hide;
    stopTracking();
    const run = { raf: 0 };
    tracking = run;
    const sample = () => {
      run.raf = 0;
      if (!live || invalidated || tracking !== run || !flyer.isConnected) return;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(flyer).transform);
      const degrees = 180 / Math.PI;
      turnSticker(
        canvas,
        Math.atan2(matrix.m12, matrix.m11) * degrees,
        0,
        Math.atan2(-matrix.m13, matrix.m33) * degrees,
      );
      if (animation.playState === "running" || animation.playState === "paused")
        run.raf = requestAnimationFrame(sample);
    };
    sample();
    void settled([animation]).then(() => {
      cancelAnimationFrame(run.raf);
      if (tracking === run) tracking = undefined;
    });
  };
  return { flyer, release, track, abort };
}

function takeOff(
  view: HTMLElement,
  into: LiftView,
  origin: LiftOrigin | null,
  reduced: boolean,
  sticker: string | undefined,
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

  const source = [finishCanvas(figure), finishCanvas(origin.el)].find(
    (canvas) => canvas?.dataset.state === "ready",
  );
  let owner: ReturnType<typeof makeFlyer> = null;
  if (source)
    try {
      owner = makeFlyer(view, figure, to, source, sticker);
      // A source that rejects its copy is being retired or concealed: only the view comes in.
      if (!owner) return { animations, flyer: null, away: null };
    } catch (error) {
      console.error(`Copying sticker ${sticker}'s material into its flight failed`, error);
    }
  const flyer = owner?.flyer ?? stillFlyer(view, figure, to, sticker);
  const movement = flyer.animate(flightFrames(from, to, origin.turn), {
    duration: T_PEEL_MS,
    fill,
  });
  const hidden = figure.animate([{ opacity: 0 }, { opacity: 0 }], { duration: T_PEEL_MS, fill });
  animations.push(movement, hidden);
  let live: Partial<Flight> = {};
  if (owner) {
    const { release, abort, track } = owner;
    track(movement, hidden);
    live = { release, abort, track: () => track(movement, hidden), destination: figure };
  }
  if (!leaves) {
    animations.push(
      flyer.animate([{ opacity: 0 }, { opacity: 1, offset: GIVEN_FADE }, { opacity: 1 }], {
        duration: T_PEEL_MS,
        fill,
      }),
    );
    return { ...live, animations, flyer, away: null };
  }
  const fade = leaves.animate([{ opacity: left }, { opacity: left }], {
    duration: T_PEEL_MS,
    fill,
  });
  animations.push(fade);
  return { ...live, animations, flyer, away: { el: leaves, fade } };
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
    takeOff(view, into, shownId === undefined ? null : originOf(shownId), reduced, shownId);
  const open = useEffectEvent(takeOffFrom);

  /** The sticker landed in the view: the flight ends, and a view with a ghost keeps the spot at it. */
  const land = useEffectEvent((opening: Flight) => {
    const hold = into.ghost !== undefined ? opening.away : null;
    for (const a of opening.animations) if (a !== hold?.fade) a.cancel();
    opening.release?.();
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
    void settled(opening.animations).then(async () => {
      if (flight.current !== opening || closing.current) return;
      await refreshDestination(opening, opening.destination ?? null);
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
    back.track?.();
    void settled(back.animations).then(async () => {
      if (flight.current !== back) return;
      await refreshDestination(back, back.away?.el ?? null);
      if (flight.current !== back) return;
      back.release?.();
      back.flyer?.remove();
      back.away?.fade.cancel();
      ghosted.current?.fade.cancel();
      ghosted.current = null;
      if (back.flyer && back.away) void playStick(back.away.el, { reduced });
      onClose();
    });
  };
}
