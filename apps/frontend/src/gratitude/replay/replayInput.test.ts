import { describe, expect, it } from "vitest";
import type { ComboPhase } from "../combo";
import type { ComboInput } from "../miniGameEngine";
import type { FeedInput, ReplayFeed } from "./replayFeed";
import { createReplayDriver } from "./replayInput";
import { feedOf } from "./testing";

/** The first hit on the engine's clock. */
const FIRST_HIT_AT = 250;
const P = { x: 130, y: 150 };

/** A ComboInput that keeps every call, and starts the combo as the rules would. */
function recordingInput() {
  const calls: unknown[][] = [];
  let phase: ComboPhase = "ready";
  const call =
    (name: string, starts = false) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      if (starts) phase = "running";
    };
  const input: ComboInput = {
    get phase() {
      return phase;
    },
    heartDown: call("heartDown"),
    heartTap: call("heartTap", true),
    strokeStart: call("strokeStart"),
    strokeMove: call("strokeMove"),
    strokeEnd: call("strokeEnd"),
    unlockStroke: call("unlockStroke", true),
    shakeReversal: call("shakeReversal", true),
    endAt: call("endAt"),
  };
  return { input, calls };
}

/** What the engine hears by each of `nows`, driving `inputs` from a fresh driver. */
function heardBy(
  nows: readonly number[],
  inputs: readonly FeedInput[],
  end: ReplayFeed["end"],
  startsWithStroke = false,
) {
  const drive = createReplayDriver(feedOf(inputs, end), {
    firstHitAt: FIRST_HIT_AT,
    startsWithStroke,
  });
  const { input, calls } = recordingInput();
  return nows.map((now) => {
    const from = calls.length;
    drive(now, input);
    return calls.slice(from);
  });
}

describe("createReplayDriver", () => {
  it("plays each input as its time comes, the first touch as the first tap's press and lift", () => {
    const inputs: FeedInput[] = [
      { kind: "touch", at: 0, point: P, counted: true },
      { kind: "touch", at: 120, point: P, counted: false },
      { kind: "strokeStart", at: 200, point: P },
      { kind: "strokeMove", at: 230, point: { x: 130, y: 110 }, fastPass: true },
      { kind: "strokeEnd", at: 260 },
      { kind: "reversal", at: 300, direction: -1 },
    ];
    const end = { at: 900, reason: "empty" } as const;
    expect(heardBy([249, 250, 500, 5000], inputs, end)).toEqual([
      [],
      [
        ["heartDown", 250, 130, 150],
        ["heartTap", 250, 130, 150],
      ],
      [
        ["heartDown", 370, 130, 150],
        ["strokeStart", 450, 130, 150],
        ["strokeMove", 480, 130, 110, true],
      ],
      [["strokeEnd"], ["shakeReversal", 550, -1]],
    ]);
  });

  it("ends a combo the page hid or the screen closed where it ended, and leaves the rest to the rules", () => {
    const endsBy = (reason: ReplayFeed["end"]["reason"]) =>
      heardBy([1749, 1750, 3000], [{ kind: "touch", at: 0, point: P, counted: true }], {
        at: 1500,
        reason,
      }).map((calls) => calls.filter(([name]) => name === "endAt"));
    expect(endsBy("hidden")).toEqual([[], [["endAt", 1750, "hidden"]], []]);
    expect(endsBy("closed")).toEqual([[], [["endAt", 1750, "closed"]], []]);
    // An older combo's one-tap send ended it from outside too.
    expect(endsBy("sent")).toEqual([[], [["endAt", 1750, "closed"]], []]);
    expect(endsBy("empty").flat()).toEqual([]);
    expect(endsBy("cap").flat()).toEqual([]);
  });

  it("commits a combo that began with stroke at its first sample, once", () => {
    const inputs: FeedInput[] = [
      { kind: "strokeStart", at: 0, point: P },
      { kind: "strokeMove", at: 0, point: P, fastPass: true },
      { kind: "strokeMove", at: 40, point: { x: 130, y: 100 }, fastPass: true },
    ];
    const [heard] = heardBy([350], inputs, { at: 900, reason: "empty" }, true);
    expect(heard).toEqual([
      ["strokeStart", 250, 130, 150],
      ["unlockStroke", 250, 130, 150],
      // The pass that ended there is the commit's, not a second hit.
      ["strokeMove", 250, 130, 150, false],
      ["strokeMove", 290, 130, 100, true],
    ]);
  });
});
