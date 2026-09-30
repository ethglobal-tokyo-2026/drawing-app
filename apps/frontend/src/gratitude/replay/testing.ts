import type { FrameSource } from "../../ui/frameSource";
import type { FeedInput, ReplayFeed } from "./replayFeed";

/** A feed of `inputs`, already in time order, handed out as createReplayFeed hands them out. */
export function feedOf(inputs: readonly FeedInput[], end: ReplayFeed["end"]): ReplayFeed {
  let next = 0;
  return {
    inputs,
    end,
    due(at) {
      const from = next;
      while (next < inputs.length && inputs[next].at <= at) next++;
      return inputs.slice(from, next);
    },
  };
}

/**
 * Frames driven by hand. `run(ms, hz)` delivers one every 1000 / hz ms of real time, letting
 * promises settle between them, as the endings wait on them. `asked()`: whether a frame is asked for.
 */
export function handFrames() {
  let time = 0;
  let waiting: ((t: number) => void) | null = null;
  const frames: FrameSource = {
    now: () => time,
    request(frame) {
      waiting = frame;
      return () => {
        if (waiting === frame) waiting = null;
      };
    },
  };
  const run = async (ms: number, hz = 60) => {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + 1000 / hz);
      const frame = waiting;
      waiting = null;
      frame?.(time);
      await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { frames, run, asked: () => waiting !== null };
}
