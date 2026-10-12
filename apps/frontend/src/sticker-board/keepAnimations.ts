import { Component, type ReactNode, type RefObject } from "react";
import { glideOnWithLight, movesWithLight, stopLightGlides } from "../stickers/light";

/** A CSS animation where it runs, by its element, pseudo-element and name, and its clock. */
export interface Clocked {
  target: Element;
  pseudo: string | null;
  name: string;
  clock: Pick<Animation, "startTime" | "currentTime" | "playState">;
}

/** Each animation's clock as it read, by element, then by pseudo-element and name. */
type Clocks = Map<
  Element,
  Map<string, Pick<Clocked, "clock"> & Pick<Animation, "startTime" | "currentTime">>
>;

const slotOf = (a: Clocked) => `${a.pseudo ?? ""} ${a.name}`;

/** Reads each animation's clock now: a removed element's animations end, and their clocks with them. */
export function readClocks(animations: readonly Clocked[]): Clocks {
  const clocks: Clocks = new Map();
  for (const a of animations) {
    const slots = clocks.get(a.target) ?? new Map();
    clocks.set(a.target, slots);
    slots.set(slotOf(a), {
      clock: a.clock,
      startTime: a.clock.startTime,
      currentTime: a.clock.currentTime,
    });
  }
  return clocks;
}

/**
 * Sets each animation that started over since `clocks` were read back on its old clock: a running one
 * by its old start, a paused one at the time it held.
 */
export function restoreClocks(clocks: Clocks, animations: readonly Clocked[]) {
  for (const a of animations) {
    const was = clocks.get(a.target)?.get(slotOf(a));
    if (!was || was.clock === a.clock) continue;
    if (a.clock.playState !== "paused" && was.startTime !== null) a.clock.startTime = was.startTime;
    else if (was.currentTime !== null) a.clock.currentTime = was.currentTime;
  }
}

/** A CSS transition where it runs, by its element, and its effect: a glide, such as a highlight's. */
export interface Gliding {
  /** The transition itself: a re-insert cancels it, and those still running are told apart by it. */
  transition: object;
  property: string;
  currentTime: CSSNumberish | null;
  target: Pick<Element, "animate" | "isConnected">;
  effect: Pick<KeyframeEffect, "pseudoElement" | "getKeyframes" | "getTiming">;
}

/** A glide as it was read: enough to replay the rest of it. */
export interface Glide {
  transition: object;
  target: Gliding["target"];
  pseudo: string | null;
  property: string;
  keyframes: Keyframe[];
  timing: Pick<EffectTiming, "duration" | "easing" | "delay">;
  currentTime: CSSNumberish | null;
}

/** Reads each glide where it is now: a removed element's transitions end, and their glides with them. */
export const readGlides = (glides: readonly Gliding[]): Glide[] =>
  glides.map(({ transition, property, currentTime, target, effect }) => {
    const { duration, easing, delay } = effect.getTiming();
    return {
      transition,
      target,
      pseudo: effect.pseudoElement,
      property,
      // Read back, each keyframe also says where it falls, which a keyframe handed in can't.
      keyframes: effect.getKeyframes().map(({ computedOffset: _, ...keyframe }) => keyframe),
      timing: { duration, easing, delay },
      currentTime,
    };
  });

/** A replayed glide, and the property it moves. */
export interface Replay {
  replay: Animation;
  property: string;
}

/**
 * Replays each glide a re-insert cancelled from where it was: the same keyframes and timing, as far
 * into them. A glide still `running`, or on an element no longer on the page, is left alone.
 */
export function replayGlides(glides: readonly Glide[], running: ReadonlySet<object>): Replay[] {
  return glides.flatMap((glide) => {
    if (running.has(glide.transition) || !glide.target.isConnected) return [];
    const replay = glide.target.animate(glide.keyframes, {
      ...glide.timing,
      pseudoElement: glide.pseudo ?? undefined,
    });
    replay.currentTime = glide.currentTime;
    return [{ replay, property: glide.property }];
  });
}

/** Every CSS animation among `animations`. */
const cssAnimationsIn = (animations: readonly Animation[]): Clocked[] =>
  animations.flatMap((a) =>
    a instanceof CSSAnimation && a.effect instanceof KeyframeEffect && a.effect.target
      ? [
          {
            target: a.effect.target,
            pseudo: a.effect.pseudoElement,
            name: a.animationName,
            clock: a,
          },
        ]
      : [],
  );

/** Light transitions only: other replays would override newer drag, selection, or crease state. */
const cssTransitionsIn = (animations: readonly Animation[]): Gliding[] =>
  animations.flatMap((a) => {
    const effect = a.effect;
    return a instanceof CSSTransition &&
      effect instanceof KeyframeEffect &&
      effect.target &&
      movesWithLight(effect.target)
      ? [
          {
            transition: a,
            property: a.transitionProperty,
            currentTime: a.currentTime,
            target: effect.target,
            effect,
          },
        ]
      : [];
  });

/** What a reorder must put back: CSS animations' clocks, and the glides it cuts short. */
interface Kept {
  clocks: Clocks;
  glides: Glide[];
}

interface Props {
  /** The children's order, as a string: a change is a reorder, which React makes by re-inserting them. */
  order: string;
  /** The element the children are in. */
  root: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/**
 * Keeps its children's CSS animations and light transitions going through a reorder. A re-inserted
 * element's animations start over and its transitions jump to their end, so a sticker moved ahead of
 * others would jump their resin's sway and snap their highlights' glides. Both are read just before
 * React changes the DOM: the animations are set back on their clocks before paint, and each glide cut
 * short is replayed from where it was, then handed to the light, whose next move glides on from there.
 */
export class KeepAnimations extends Component<Props, object, Kept | null> {
  /** The parent's ref clears before this component unmounts, while its replays still need cleanup. */
  private replayRoot: HTMLElement | null = null;

  getSnapshotBeforeUpdate(prev: Readonly<Props>): Kept | null {
    const root = this.props.root.current;
    if (!root || prev.order === this.props.order) return null;
    const animations = root.getAnimations({ subtree: true });
    return {
      clocks: readClocks(cssAnimationsIn(animations)),
      glides: readGlides(cssTransitionsIn(animations)),
    };
  }

  componentDidUpdate(_prev: Readonly<Props>, _state: object, kept: Kept | null) {
    const root = this.props.root.current;
    if (!kept || !root) return;
    this.replayRoot = root;
    const animations = root.getAnimations({ subtree: true });
    restoreClocks(kept.clocks, cssAnimationsIn(animations));
    const running = new Set(cssTransitionsIn(animations).map((g) => g.transition));
    for (const { replay, property } of replayGlides(kept.glides, running))
      glideOnWithLight(replay, property);
  }

  componentWillUnmount() {
    if (this.replayRoot) stopLightGlides(this.replayRoot);
  }

  render() {
    return this.props.children;
  }
}
