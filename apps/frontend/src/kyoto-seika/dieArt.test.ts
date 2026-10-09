import { describe, expect, it } from "vitest";
import { dieFace } from "./dieArt";
import { CHARRED_AT_ROLL } from "./dieMood";

const everyRoll = () => Array.from({ length: CHARRED_AT_ROLL + 1 }, (_, rolls) => dieFace(rolls));

describe("the reroll's die", () => {
  it("lands on a new face at every roll, and on the same face for the same roll, so a reload brings it back", () => {
    const faces = everyRoll();
    expect(faces.every((face) => Number.isInteger(face) && face >= 1 && face <= 6)).toBe(true);
    expect(faces.every((face, i) => i === 0 || face !== faces[i - 1])).toBe(true);
    expect(everyRoll()).toEqual(faces);
  });
});
