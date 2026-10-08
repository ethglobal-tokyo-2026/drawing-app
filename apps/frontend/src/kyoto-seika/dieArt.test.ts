import { describe, expect, it } from "vitest";
import type { Balloon } from "./deal";
import { dieFace } from "./dieArt";
import { CHARRED_AT_ROLL } from "./dieMood";

const everyRoll = (balloon: Balloon) =>
  Array.from({ length: CHARRED_AT_ROLL + 1 }, (_, rolls) => dieFace(balloon, rolls));

describe("a reroll's die", () => {
  it("lands on a new face at every roll, and on the same face for the same roll, so a reload brings it back", () => {
    for (const balloon of [0, 1] as const) {
      const faces = everyRoll(balloon);
      expect(faces.every((face) => Number.isInteger(face) && face >= 1 && face <= 6)).toBe(true);
      expect(faces.every((face, i) => i === 0 || face !== faces[i - 1])).toBe(true);
      expect(everyRoll(balloon)).toEqual(faces);
    }
  });
});
