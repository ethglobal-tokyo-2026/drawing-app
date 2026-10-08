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
export const SWEAT_FROM_ROLL = 10;
export const ANGER_FROM_ROLL = 19;
export const SHIVER_FROM_ROLL = 22;
export const COUNTDOWN_FROM_ROLL = 26;
/** The roll that blows the die up: it's charred, and takes no more. */
export const CHARRED_AT_ROLL = 30;

/** How a die and its balloon look after some rolls, and what the last roll says as it lands. */
export interface DieMood {
  /** The tease this roll earns, or null. */
  line: TeaseLine | null;
  /** The number over the die as it counts down to the bang, or null outside the countdown. */
  countdown: number | null;
  /** The balloon's sweat drop. */
  sweat: boolean;
  /** The balloon's anger vein. */
  anger: boolean;
  /** The balloon shivers. */
  shiver: boolean;
  /** The die smokes. */
  smoking: boolean;
  /** The die blew up: its balloon's subject stays. */
  charred: boolean;
}

/** How a die and its balloon look after `rolls` rolls, and what this roll says as it lands. */
export function dieMood(rolls: number): DieMood {
  const counting = rolls >= COUNTDOWN_FROM_ROLL && rolls <= CHARRED_AT_ROLL;
  return {
    line: TEASE_LINES.get(rolls) ?? null,
    countdown: counting ? CHARRED_AT_ROLL + 1 - rolls : null,
    sweat: rolls >= SWEAT_FROM_ROLL,
    anger: rolls >= ANGER_FROM_ROLL,
    shiver: rolls >= SHIVER_FROM_ROLL,
    smoking: rolls >= COUNTDOWN_FROM_ROLL,
    charred: rolls >= CHARRED_AT_ROLL,
  };
}
