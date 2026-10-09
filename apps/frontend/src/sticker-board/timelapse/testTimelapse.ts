import type { TimelapseV1 } from "@drawing-app/api/client";
import type { FrameSource } from "../../ui/frameSource";
import { layoutFor, type TimelapseLayout } from "./timelapseFrame";
import type { TimelapsePlayer, TimelapsePlayerOptions } from "./timelapsePlayer";

/** For tests: a timelapse of nothing, which the fake players never read. */
export const TEST_TIMELAPSE: TimelapseV1 = {
  v: 1,
  ink: [300, 400],
  place: [0, 0, 300, 400],
  density: 1,
  ops: [],
};

/** A promise, and the functions that settle it. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

type Call = keyof TimelapsePlayer;

interface FakeTimelapsePlayer extends TimelapsePlayer {
  options: TimelapsePlayerOptions;
  /** Its methods, in the order they were called. */
  calls: Call[];
  /** Settles `prepare`. */
  prepared: ReturnType<typeof deferred<void>>;
  /** Paints the last op: a pending `play` resolves "done". */
  finish: () => void;
  /** What `layout` answers: the sticker in its spot, until a test sets another. */
  laidOut: TimelapseLayout;
}

/** For tests: players that do nothing on their own; a test settles `prepare` and `play`. */
export function fakeTimelapsePlayers() {
  const made: FakeTimelapsePlayer[] = [];
  const create = (options: TimelapsePlayerOptions): TimelapsePlayer => {
    const prepared = deferred<void>();
    const played = deferred<"done" | "stopped">();
    const calls: Call[] = [];
    const [x, y, w, h] = TEST_TIMELAPSE.place;
    const place = { x, y, w, h };
    const player: FakeTimelapsePlayer = {
      laidOut: layoutFor({ frame: place, place, stage: options.stage, figure: options.figure }),
      layout: () => player.laidOut,
      options,
      calls,
      prepared,
      finish: () => played.resolve("done"),
      prepare: () => {
        calls.push("prepare");
        return prepared.promise;
      },
      play: () => {
        calls.push("play");
        return played.promise;
      },
      skip: () => {
        calls.push("skip");
        played.resolve("done");
      },
      stop: () => {
        calls.push("stop");
        played.resolve("stopped");
      },
      setReduced: () => {
        calls.push("setReduced");
      },
    };
    made.push(player);
    return player;
  };
  const last = () => {
    const player = made.at(-1);
    if (!player) throw new Error("No timelapse player was made");
    return player;
  };
  return { create, made, last };
}

/** For tests: frames driven by hand; `advance(ms)` runs a frame every `step` ms up to `ms` later. */
export function handFrames() {
  let time = 1000;
  let pending: ((t: number) => void) | null = null;
  const source: FrameSource = {
    now: () => time,
    request(frame) {
      pending = frame;
      return () => {
        if (pending === frame) pending = null;
      };
    },
  };
  const advance = (ms: number, step = 16) => {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + step);
      const frame = pending;
      pending = null;
      frame?.(time);
    }
  };
  return { source, advance, waiting: () => pending !== null };
}
