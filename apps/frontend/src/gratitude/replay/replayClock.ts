import type { FrameSource } from "../../ui/frameSource";

/** A frame counts at most this much real time, ms, so a stall never skips the replay ahead. */
export const MAX_FRAME_MS = 50;

export interface ReplayClock extends FrameSource {
  /** Holds the clock and its frames, as the stage leaves the screen. */
  pause: () => void;
  /** Runs them again from where they stopped. */
  resume: () => void;
}

/**
 * A replay's clock: `real`'s frames, with time starting at 0 and running `speed` times as fast.
 * Paused time never counts, and neither does more than MAX_FRAME_MS of any one frame.
 * `onRealFrame` hears each frame's real interval, stalls included, for the frame-time readout.
 */
export function createReplayClock(
  real: FrameSource,
  speed: number,
  onRealFrame?: (ms: number) => void,
): ReplayClock {
  let time = 0;
  let lastReal: number | null = null;
  let paused = false;
  let waiting: ((t: number) => void) | null = null;
  let cancelReal: (() => void) | null = null;

  const tick = (realNow: number) => {
    cancelReal = null;
    if (lastReal !== null) {
      const ms = realNow - lastReal;
      onRealFrame?.(ms);
      time += Math.min(MAX_FRAME_MS, ms) * speed;
    }
    lastReal = realNow;
    const frame = waiting;
    waiting = null;
    frame?.(time);
  };
  const askReal = () => {
    if (waiting && !paused && !cancelReal) cancelReal = real.request(tick);
  };

  return {
    now: () => time,
    request(frame) {
      waiting = frame;
      askReal();
      return () => {
        if (waiting !== frame) return;
        waiting = null;
        cancelReal?.();
        cancelReal = null;
      };
    },
    pause() {
      paused = true;
      cancelReal?.();
      cancelReal = null;
      // The next frame starts the count again, so the time away never counts.
      lastReal = null;
    },
    resume() {
      paused = false;
      askReal();
    },
  };
}
