import { EASE_PEEL } from "../ui/easing";

interface Options {
  /** `land`: dropped from above the board as it arrives. `drop`: pressed flat where it was let go. */
  from?: "land" | "drop";
  delay?: number;
  reduced: boolean;
}

/**
 * A sticker sticks: `el`, the part that lifts, settles onto the board. Under reduced motion it fades
 * in. Resolves when it has settled.
 */
export function playStick(
  el: HTMLElement,
  { from = "drop", delay = 0, reduced }: Options,
): Promise<void> {
  if (reduced)
    return settled([
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay, fill: "backwards" }),
    ]);
  const land = from === "land";
  const duration = land ? 560 : 220;
  const frames: Keyframe[] = land
    ? [
        { transform: "translate(-6px, -34px) rotate(-5deg) scale(1.24)", opacity: 0 },
        { transform: "translate(0, 0) rotate(0) scale(1.06)", opacity: 1, offset: 0.62 },
        { transform: "scale(0.985)", offset: 0.84 },
        { transform: "scale(1)" },
      ]
    : [
        { transform: "scale(1.06)" },
        { transform: "scale(0.99)", offset: 0.7 },
        { transform: "scale(1)" },
      ];
  const played = [el.animate(frames, { duration, delay, easing: EASE_PEEL, fill: "backwards" })];
  return settled(played);
}

/** Once every animation has finished, or was cancelled with its element. */
const settled = (animations: Animation[]) =>
  Promise.allSettled(animations.map((a) => a.finished)).then(() => undefined);
