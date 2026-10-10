import type { RecordGratitude } from "./record.ts";
import type { ReplayV1 } from "./replay.ts";

// What each value in a replay's flat series' groups means. ms, x and y are changes from the value
// before.
export const TOUCH = ["ms", "x", "y", "counted"] as const;
export const STROKE_SAMPLE = ["ms", "x", "y"] as const;
export const SHAKE_REVERSAL = ["ms", "direction"] as const;

/** Where a replay doesn't record its combo's hits: the replay's field, and why. */
export interface ReplayHitProblem {
  field: "hits" | "switchedAtHit" | "strokePasses" | "shakes";
  message: string;
}

/** The touches that counted as hits. */
const countedTouches = ({ hits }: Pick<ReplayV1, "hits">) =>
  hits.filter((value, at) => TOUCH[at % TOUCH.length] === "counted" && value === 1).length;

/**
 * How a combo's replay fails to record its hits; none when it records them all. A tap combo's hits
 * are its counted touches. A stroke or shake combo's hits before its switch are taps, its counted
 * touches; from the switch on, each is a stroke pass or a shake reversal, though not every pass or
 * reversal counted. Free of server imports, so the app checks its own combos by it through the
 * typed client.
 */
export function replayHitProblems(
  { method, hits }: Pick<RecordGratitude, "method" | "hits">,
  replay: Pick<ReplayV1, "hits" | "switchedAtHit" | "strokePasses" | "shakes">,
): ReplayHitProblem[] {
  const problems: ReplayHitProblem[] = [];
  const report = (field: ReplayHitProblem["field"], message: string) =>
    problems.push({ field, message });
  const counted = countedTouches(replay);
  const { switchedAtHit } = replay;
  if (method === "tap") {
    if (counted !== hits) {
      report("hits", `${counted} counted touches in a tap combo of ${hits} hits`);
    }
    if (switchedAtHit !== null) {
      report("switchedAtHit", `${switchedAtHit} in a tap combo, which never switched`);
    }
    return problems;
  }
  if (switchedAtHit === null) {
    report("switchedAtHit", `null in a ${method} combo, which switched from tapping`);
  } else if (switchedAtHit > hits) {
    report("switchedAtHit", `${switchedAtHit}, past the combo's ${hits} hits`);
  } else {
    if (counted !== switchedAtHit) {
      report("hits", `${counted} counted touches before a switch at hit ${switchedAtHit}`);
    }
    const [field, played] =
      method === "stroke"
        ? (["strokePasses", replay.strokePasses.flat().length] as const)
        : (["shakes", replay.shakes.length / SHAKE_REVERSAL.length] as const);
    if (played < hits - switchedAtHit) {
      report(
        field,
        `${played} played, fewer than the ${hits - switchedAtHit} hits from the switch`,
      );
    }
  }
  return problems;
}
