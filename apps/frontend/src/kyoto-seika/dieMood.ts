const LINES_BY_ROLL = [
  [10, "again"],
  [13, "stillDeciding"],
  [16, "goodOne"],
  [19, "godTier"],
  [22, "breakTheButton"],
  [25, "warned"],
] as const;
/** A die's line: its key under the catalog's kyotoSeika.tease. */
export type TeaseLine = (typeof LINES_BY_ROLL)[number][1];
/** A die's lines, by the roll that earns each. */
export const TEASE_LINES: ReadonlyMap<number, TeaseLine> = new Map(LINES_BY_ROLL);
/** The die starts to shake after this many rolls, a little at first. */
export const SHAKE_FROM_ROLL = 9;
/** How the shake builds to its worst on the roll before the bang: steeper the higher this is. */
const SHAKE_CURVE = 2.2;
export const COUNTDOWN_FROM_ROLL = 26;
/** The roll that blows the die up: it's charred, and takes no more. */
export const CHARRED_AT_ROLL = 30;

/** How a die looks after some rolls, and what the last roll says as it lands. */
export interface DieMood {
  /** The tease this roll earns, or null. */
  line: TeaseLine | null;
  /** The number by the die as it counts down to the bang, or null outside the countdown. */
  countdown: number | null;
  /** How hard the die shakes, 0 to 1. */
  shake: number;
  /** The die smokes. */
  smoking: boolean;
  /** The die blew up: its cloud's subject stays. */
  charred: boolean;
}

/** How a die looks after `rolls` rolls, and what this roll says as it lands. */
export function dieMood(rolls: number): DieMood {
  // The count reaches 1 on the roll before the bang, which goes off at once, with no count of its own.
  const counting = rolls >= COUNTDOWN_FROM_ROLL && rolls < CHARRED_AT_ROLL;
  const charred = rolls >= CHARRED_AT_ROLL;
  // Nothing until the shake starts, then each roll shakes it harder than the last did, up to the bang.
  const building = (rolls - SHAKE_FROM_ROLL) / (CHARRED_AT_ROLL - 1 - SHAKE_FROM_ROLL);
  return {
    line: TEASE_LINES.get(rolls) ?? null,
    countdown: counting ? CHARRED_AT_ROLL - rolls : null,
    shake: charred ? 0 : Math.min(Math.max(building, 0), 1) ** SHAKE_CURVE,
    smoking: rolls >= COUNTDOWN_FROM_ROLL,
    charred,
  };
}
