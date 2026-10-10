import { isCancelled } from "../ui/webAnimations";

/**
 * Starts a Web Animation on `el`, `rate` times as fast as its timing says: a replay's clock can run
 * faster than real time, and every animation keeps pace with it.
 */
export function animate(
  el: HTMLElement,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
  rate = 1,
): Animation {
  const animation = el.animate(frames, options);
  if (rate !== 1) animation.playbackRate = rate;
  // Cancelling an animation rejects its `finished`: browsers mark that handled, happy-dom doesn't.
  void animation.finished.catch(rethrowUnlessCancelled);
  return animation;
}

function rethrowUnlessCancelled(error: unknown) {
  if (!isCancelled(error)) throw error;
}
