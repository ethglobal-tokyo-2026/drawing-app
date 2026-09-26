import { describe, expect, it, vi } from "vitest";
import { SESSION_MS, type Hold } from "./session";
import { SessionClock, type FrameSource } from "./useSessionClock";

const NO_HOLDS = { paused: false, away: false, color: false, smoothing: false, size: false };

/** A clock on hand-driven frames; `advance(ms)` runs a frame every `step` ms up to `ms` later. */
function setup({ started = true } = {}) {
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
  const clock = new SessionClock(frames);
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

describe("SessionClock", () => {
  it("waits at 5:00 until the first stroke starts it", () => {
    const { clock, counted } = setup({ started: false });
    expect(counted(5000)).toBe(0);
    expect(clock.getView().secondsLeft).toBe(300);
    clock.start();
    expect(counted(1000)).toBe(1000);
  });

  it("holds for each hold and counts again when it lets go", () => {
    const { clock, counted } = setup();
    for (const hold of ["paused", "away", "color", "smoothing", "size"] as const) {
      clock.setHolds({ ...NO_HOLDS, [hold]: true });
      expect(counted(1000)).toBe(0);
      expect(clock.getView().held).toBe<Hold>(hold);
      clock.setHolds(NO_HOLDS);
      expect(counted(500)).toBe(500);
      expect(clock.getView().held).toBeNull();
    }
  });

  it("holds while the page is hidden and resumes 420ms after it returns", () => {
    const { clock, counted } = setup();
    clock.setHidden(true);
    expect(clock.getView()).toMatchObject({ held: "hidden", lifted: true });
    expect(counted(3000)).toBe(0);
    clock.setHidden(false);
    expect(counted(400, 1)).toBe(0);
    expect(clock.getView().lifted).toBe(true);
    expect(counted(100, 1)).toBe(80);
    expect(clock.getView()).toMatchObject({ held: null, lifted: false });
  });

  it("counts at most 5 seconds for any one frame", () => {
    const { counted } = setup();
    expect(counted(60_000, 60_000)).toBe(5000);
  });

  it("turns late for the last ten seconds", () => {
    const { clock, advance } = setup();
    advance(SESSION_MS - 10_001);
    expect(clock.getView()).toMatchObject({ secondsLeft: 11, late: false });
    advance(1);
    expect(clock.getView()).toMatchObject({ secondsLeft: 10, late: true });
  });

  it("calls time at 0:00, once, and stops asking for frames", () => {
    const { clock, onTimeUp, advance, hasFrame } = setup();
    advance(SESSION_MS + 1000);
    expect(onTimeUp).toHaveBeenCalledOnce();
    expect(clock.elapsed).toBe(SESSION_MS);
    expect(clock.getView().secondsLeft).toBe(0);
    expect(hasFrame()).toBe(false);
    clock.resume();
    advance(1000);
    expect(onTimeUp).toHaveBeenCalledOnce();
  });

  it("picks a kept drawing back up with the time it had drawn", () => {
    const { clock, counted } = setup({ started: false });
    clock.restore(SESSION_MS - 30_000);
    expect(clock.getView().secondsLeft).toBe(30);
    expect(counted(1000)).toBe(1000);
  });

  it("calls time on a kept drawing whose time had run out once it runs again", () => {
    const { clock, onTimeUp, advance } = setup({ started: false });
    clock.setHolds({ ...NO_HOLDS, paused: true });
    clock.restore(SESSION_MS);
    advance(1000);
    expect(onTimeUp).not.toHaveBeenCalled();
    clock.setHolds(NO_HOLDS);
    advance(16);
    expect(onTimeUp).toHaveBeenCalledOnce();
  });

  it("freezes while sealing and runs on if the seal fails", () => {
    const { clock, counted } = setup();
    counted(1000);
    clock.stop();
    expect(counted(1000)).toBe(0);
    clock.resume();
    expect(counted(500)).toBe(500);
  });

  it("goes back to 5:00 on a fresh sheet", () => {
    const { clock, counted } = setup();
    counted(20_000);
    clock.reset();
    expect(clock.getView().secondsLeft).toBe(300);
    expect(counted(1000)).toBe(0);
  });
});
