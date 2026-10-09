import { Component, type ReactNode, type RefObject } from "react";

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

/** Every CSS animation in `root` and under it. */
const cssAnimationsIn = (root: Element): Clocked[] =>
  root.getAnimations({ subtree: true }).flatMap((a) =>
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

interface Props {
  /** The children's order, as a string: a change is a reorder, which React makes by re-inserting them. */
  order: string;
  /** The element the children are in. */
  root: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/**
 * Keeps its children's CSS animations running through a reorder. A re-inserted element's animations
 * start over, so a sticker moved ahead of others would jump their resin's sway. The
 * clocks are read just before React changes the DOM, and set back on the new animations before paint.
 */
export class KeepAnimations extends Component<Props, object, Clocks | null> {
  getSnapshotBeforeUpdate(prev: Readonly<Props>): Clocks | null {
    const root = this.props.root.current;
    return root && prev.order !== this.props.order ? readClocks(cssAnimationsIn(root)) : null;
  }

  componentDidUpdate(_prev: Readonly<Props>, _state: object, clocks: Clocks | null) {
    const root = this.props.root.current;
    if (clocks && root) restoreClocks(clocks, cssAnimationsIn(root));
  }

  render() {
    return this.props.children;
  }
}
