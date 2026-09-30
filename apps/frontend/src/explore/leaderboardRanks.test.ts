import { describe, expect, it } from "vitest";
import { competitionRanks } from "./leaderboardRanks";

describe("competitionRanks", () => {
  it("gives ties the first of their places and skips the places they took", () => {
    expect(competitionRanks([9, 5, 5, 5, 2])).toEqual([1, 2, 2, 2, 5]);
    expect(competitionRanks([3, 3, 1])).toEqual([1, 1, 3]);
  });

  it("ranks values that are all different in order", () => {
    expect(competitionRanks([30, 20, 10])).toEqual([1, 2, 3]);
  });
});
