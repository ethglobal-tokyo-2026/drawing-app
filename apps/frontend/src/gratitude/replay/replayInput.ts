import type { ComboInput } from "../miniGameEngine";
import type { FeedInput, ReplayFeed } from "./replayFeed";

export interface ReplayDriverOptions {
  /** The combo's first hit on the engine's clock, ms: every input's `at` counts from it. */
  firstHitAt: number;
  /**
   * The combo began with stroke. The passes that unlocked it came before its first hit, where a
   * replay's inputs begin, so it commits at its first stroke input.
   */
  startsWithStroke: boolean;
}

/** Plays every input due by `now`, on the engine's clock, then the combo's end once it's due. */
export type ReplayDrive = (now: number, input: ComboInput) => void;

/**
 * Plays a replay's inputs through the engine's handlers as its clock reaches them, each at its own
 * time: touches as a finger pressing the heart, stroke samples with the passes they ended, shake
 * reversals. A combo that ended from outside ends where it did; the rules end the rest themselves.
 */
export function createReplayDriver(feed: ReplayFeed, options: ReplayDriverOptions): ReplayDrive {
  const { firstHitAt, startsWithStroke } = options;
  let touched = false;
  let ended = false;
  /** When a combo that began with stroke committed: a fast pass forced then is the commit's own. */
  let committedAt: number | null = null;

  const play = (next: FeedInput, input: ComboInput) => {
    const t = firstHitAt + next.at;
    switch (next.kind) {
      case "touch":
        input.heartDown(t, next.point.x, next.point.y);
        // The first tap counts as it lifts, the moment a replay keeps: it presses and lifts at once.
        if (!touched) input.heartTap(t, next.point.x, next.point.y);
        touched = true;
        return;
      case "strokeStart":
        input.strokeStart(t, next.point.x, next.point.y);
        if (startsWithStroke && input.phase === "ready") {
          input.unlockStroke(t, next.point.x, next.point.y);
          committedAt = t;
        }
        return;
      case "strokeMove": {
        const commits = next.fastPass === true && t === committedAt;
        input.strokeMove(t, next.point.x, next.point.y, commits ? false : next.fastPass);
        return;
      }
      case "strokeEnd":
        input.strokeEnd();
        return;
      case "reversal":
        input.shakeReversal(t, next.direction);
    }
  };

  return (now, input) => {
    for (const next of feed.due(now - firstHitAt)) play(next, input);
    const { at, reason } = feed.end;
    if (ended || now < firstHitAt + at) return;
    ended = true;
    if (reason === "hidden") input.endAt(firstHitAt + at, "hidden");
    // An older combo's one-tap send ended it from outside, as the X does; the record doesn't say which.
    else if (reason === "closed" || reason === "sent") input.endAt(firstHitAt + at, "closed");
  };
}
