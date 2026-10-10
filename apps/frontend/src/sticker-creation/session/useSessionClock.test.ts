import { describe, expect, it } from "vitest";
import { KYOTO_SEIKA_TIME_USED_S, MAX_TIME_USED_S } from "@drawing-app/api/client";
import { sessionMs } from "./session";
import { clockOnFrames } from "./testClock";
import { WARN_AT_SECONDS, type Hold, type ScreenHolds } from "./useSessionClock";

const NO_HOLDS: ScreenHolds = {
  paused: false,
  away: false,
  seal: false,
  color: false,
  smoothing: false,
  clear: false,
  size: false,
};

const setup = clockOnFrames;

describe("SessionClock", () => {
  it("waits at 3:00 until the first stroke starts it", () => {
    const { clock, counted } = setup({ started: false });
    expect(counted(5000)).toBe(0);
    expect(clock.getView().secondsLeft).toBe(sessionMs(false) / 1000);
    clock.start();
    expect(counted(1000)).toBe(1000);
  });

  it("holds for each hold and counts again when it lets go", () => {
    const { clock, counted } = setup();
    for (const hold of Object.keys(NO_HOLDS)) {
      clock.setHolds({ ...NO_HOLDS, [hold]: true });
      expect(counted(1000)).toBe(0);
      expect(clock.getView().held).toBe(hold);
      clock.setHolds(NO_HOLDS);
      expect(counted(500)).toBe(500);
      expect(clock.getView().held).toBeNull();
    }
  });

  it("shows the person's own pause over any other hold", () => {
    const { clock } = setup();
    clock.setHidden(true);
    clock.setHolds({ ...NO_HOLDS, size: true, paused: true });
    expect(clock.getView().held).toBe<Hold>("paused");
  });

  it("shows no hold while it waits for the first stroke", () => {
    const { clock } = setup({ started: false });
    clock.setHolds({ ...NO_HOLDS, away: true });
    clock.setHidden(true);
    expect(clock.getView()).toMatchObject({ held: null, waiting: true });
    clock.start();
    expect(clock.getView()).toMatchObject({ held: "hidden", waiting: false });
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
    advance(sessionMs(false) - 10_001);
    expect(clock.getView()).toMatchObject({ secondsLeft: 11, late: false });
    advance(1);
    expect(clock.getView()).toMatchObject({ secondsLeft: 10, late: true });
  });

  it("warns as it counts down through 30 seconds and through 10, once each", () => {
    const { clock, advance } = setup();
    const warned: number[] = [];
    clock.onWarning((secondsLeft) => warned.push(secondsLeft));
    advance(sessionMs(false) - 30_000 - 1);
    expect(warned).toEqual([]);
    advance(1);
    expect(warned).toEqual([30]);
    advance(20_000);
    expect(warned).toEqual([30, 10]);
    advance(9_000);
    expect(warned).toEqual([30, 10]);
  });

  it("warns of nothing already past when a kept drawing comes back inside the last 30 seconds", () => {
    const { clock, advance } = setup({ started: false });
    const warned: number[] = [];
    clock.onWarning((secondsLeft) => warned.push(secondsLeft));
    clock.restore(sessionMs(false) - 25_000);
    advance(5_000);
    expect(warned).toEqual([]);
    advance(10_000);
    expect(warned).toEqual([10]);
  });

  it("calls time at 0:00, once, and stops asking for frames", () => {
    const { clock, onTimeUp, advance, hasFrame } = setup();
    advance(sessionMs(false) + 1000);
    expect(onTimeUp).toHaveBeenCalledOnce();
    expect(clock.elapsed).toBe(sessionMs(false));
    expect(clock.getView().secondsLeft).toBe(0);
    expect(hasFrame()).toBe(false);
    clock.resume();
    advance(1000);
    expect(onTimeUp).toHaveBeenCalledOnce();
  });

  it("picks a kept drawing back up with the time it had drawn", () => {
    const { clock, counted } = setup({ started: false });
    clock.restore(sessionMs(false) - 30_000);
    expect(clock.getView().secondsLeft).toBe(30);
    expect(counted(1000)).toBe(1000);
  });

  it("calls time on a kept drawing whose time had run out once it runs again", () => {
    const { clock, onTimeUp, advance } = setup({ started: false });
    clock.setHolds({ ...NO_HOLDS, paused: true });
    clock.restore(sessionMs(false));
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

  it("goes back to 3:00 on a fresh sheet", () => {
    const { clock, counted } = setup();
    counted(20_000);
    clock.reset();
    expect(clock.getView().secondsLeft).toBe(sessionMs(false) / 1000);
    expect(counted(1000)).toBe(0);
  });

  it("runs as long as its sheet's ticket says, and sets a waiting clock to another length", () => {
    const { clock, counted, onTimeUp } = setup({ started: false, length: sessionMs(true) });
    expect(clock.getView().secondsLeft).toBe(KYOTO_SEIKA_TIME_USED_S);
    clock.setLength(sessionMs(false));
    expect(clock.getView().secondsLeft).toBe(MAX_TIME_USED_S);
    clock.setLength(sessionMs(true));
    clock.start();
    counted(sessionMs(true) - 1000, 1000);
    expect(onTimeUp).not.toHaveBeenCalled();
    clock.setLength(sessionMs(false));
    expect(clock.length).toBe(sessionMs(true));
  });

  it("calls the time at 10 and 5 minutes left only on a clock long enough to reach them", () => {
    const heard = (length: number) => {
      const { clock, advance } = setup({ length });
      const calls: number[] = [];
      clock.onWarning((s) => calls.push(s));
      advance(length, 250);
      return calls;
    };
    const long = heard(sessionMs(true));
    // The proctor's calls are in whole minutes, before the last seconds' warnings.
    expect(long.filter((s) => s >= 60)).not.toEqual([]);
    expect(long).toEqual(WARN_AT_SECONDS);
    expect(heard(sessionMs(false))).toEqual(
      WARN_AT_SECONDS.filter((s) => s * 1000 < sessionMs(false)),
    );
  });

  it("goes back to a fresh sheet at the length its next ticket gives", () => {
    const { clock, counted } = setup({ length: sessionMs(true) });
    counted(20_000);
    clock.reset(sessionMs(false));
    expect(clock.getView().secondsLeft).toBe(MAX_TIME_USED_S);
  });
});
