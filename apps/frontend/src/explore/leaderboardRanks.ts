/**
 * Each row's rank on a leaderboard, highest first: equal values share the first of their places, so
 * ties read 1, 1, 3, and a streak of days isn't ranked by whose handle comes first.
 */
export const competitionRanks = (values: readonly number[]): number[] =>
  values.map((value) => values.indexOf(value) + 1);
