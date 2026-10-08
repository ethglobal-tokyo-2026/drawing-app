import { vi } from "vitest";
import type { FrameSource } from "../../ui/frameSource";
import { sessionMs } from "./session";
import { SessionClock } from "./useSessionClock";

/** A clock on hand-driven frames; `advance(ms)` runs a frame every `step` ms up to `ms` later. */
export function clockOnFrames({ started = true, length = sessionMs(false) } = {}) {
  let time = 1000;
  let pending: ((t: number) => void) | null = null;
  const frames: FrameSource = {
    now: () => time,
    request(cb) {
      pending = cb;
      return () => {
        if (pending === cb) pending = null;
      };
    },
  };
  const clock = new SessionClock(frames, length);
  const onTimeUp = vi.fn();
  clock.connect(onTimeUp);
  if (started) clock.start();
  const advance = (ms: number, step = 16) => {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + step);
      const frame = pending;
      pending = null;
      frame?.(time);
    }
  };
  /** How much of the next `ms` the clock counts. */
  const counted = (ms: number, step?: number) => {
    const before = clock.elapsed;
    advance(ms, step);
    return clock.elapsed - before;
  };
  return { clock, onTimeUp, advance, counted, hasFrame: () => pending !== null };
}
