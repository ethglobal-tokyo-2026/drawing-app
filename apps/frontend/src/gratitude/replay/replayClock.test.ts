import { describe, expect, it } from "vitest";
import type { FrameSource } from "../../ui/frameSource";
import { createReplayClock, MAX_FRAME_MS } from "./replayClock";

/** Real frames by hand: `frame(ms)` delivers the next one `ms` after the last. */
function realFrames() {
  let time = 1000;
  let waiting: ((t: number) => void) | null = null;
  const real: FrameSource = {
    now: () => time,
    request(frame) {
      waiting = frame;
      return () => {
        if (waiting === frame) waiting = null;
      };
    },
  };
  const frame = (ms: number) => {
    time += ms;
    const next = waiting;
    waiting = null;
    next?.(time);
  };
  return { real, frame, asked: () => waiting !== null };
}

/** A clock that asks for a frame each time it gets one, and keeps the times it's handed. */
function running(real: FrameSource, speed: number, onRealFrame?: (ms: number) => void) {
  const clock = createReplayClock(real, speed, onRealFrame);
  const times: number[] = [];
  const loop = (t: number) => {
    times.push(t);
    clock.request(loop);
  };
  clock.request(loop);
  return { clock, times };
}

describe("createReplayClock", () => {
  it("runs from 0 at its speed", () => {
    const { real, frame } = realFrames();
    const { times } = running(real, 2);
    for (let i = 0; i < 4; i++) frame(16);
    expect(times).toEqual([0, 32, 64, 96]);
  });

  it("counts at most MAX_FRAME_MS of a stalled frame, and reports the stall as it was", () => {
    const { real, frame } = realFrames();
    const heard: number[] = [];
    const { times } = running(real, 1.5, (ms) => heard.push(ms));
    frame(16);
    frame(400);
    expect(times).toEqual([0, MAX_FRAME_MS * 1.5]);
    expect(heard).toEqual([400]);
  });

  it("stands still while paused, and carries on from there", () => {
    const { real, frame, asked } = realFrames();
    const { clock, times } = running(real, 1);
    frame(16);
    frame(16);
    clock.pause();
    expect(asked()).toBe(false);
    clock.resume();
    frame(5000);
    frame(16);
    expect(times).toEqual([0, 16, 16, 32]);
  });
});
