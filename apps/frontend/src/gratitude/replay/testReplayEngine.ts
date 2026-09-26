import type { GratitudeWithReplay } from "@drawing-app/api/client";
import { vi, type Mock } from "vitest";
import { gratitude, people } from "../../api/testFixtures";
import { recordGratitudeBody, TEST_OWNER } from "../../api/testing";
import type { GratitudeReplayOptions, mountGratitudeReplay } from "./mountGratitudeReplay";

/** The replayed combo's amount in tests. */
export const REPLAYED_TOTAL = 2946;

/** GET /api/gratitude/:giftId's answer for a gift you gave @bob, and his gratitude for it. */
export const replayAnswer = (giftId: string): GratitudeWithReplay => ({
  gratitude: gratitude({ giftId, total: REPLAYED_TOTAL }),
  replay: recordGratitudeBody({ giftId }).replay,
  giver: TEST_OWNER,
  receiver: people.bob,
});

/** One replay the fake engine mounted: what it was given, and its handle's calls. */
export interface MountedReplay {
  host: HTMLElement;
  options: GratitudeReplayOptions;
  stop: Mock<() => void>;
  setReduced: Mock<(reduced: boolean) => void>;
  /** Plays the landing: `finished` resolves "landed". */
  land: () => void;
  /** Fails the frame loop: `finished` rejects. */
  fail: (error: Error) => void;
}

/** Stands in for mountGratitudeReplay: it records each mount, and lands or fails when told. */
export function fakeReplayEngine() {
  const mounted: MountedReplay[] = [];
  const mount = vi.fn<typeof mountGratitudeReplay>((host, options) => {
    let settle: (outcome: "landed" | "stopped") => void = () => {};
    let fail: (error: Error) => void = () => {};
    const finished = new Promise<"landed" | "stopped">((resolve, reject) => {
      settle = resolve;
      fail = reject;
    });
    const stop = vi.fn(() => settle("stopped"));
    const setReduced = vi.fn<(reduced: boolean) => void>();
    mounted.push({ host, options, stop, setReduced, land: () => settle("landed"), fail });
    return { finished, stop, setReduced };
  });
  const last = (): MountedReplay => {
    const replay = mounted.at(-1);
    if (!replay) throw new Error("The fake engine mounted no replay");
    return replay;
  };
  return { mount, mounted, last };
}
