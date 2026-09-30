import { describe, expect, it } from "vitest";
import { matchIn } from "./handleMatch";

describe("matchIn", () => {
  it("splits the handle as it was written, whatever case the search is in", () => {
    expect(matchIn("Copy-EN", "y-e")).toEqual({ before: "Cop", match: "y-E", after: "N" });
  });

  it("marks the right letters when a capital's lowercase is longer", () => {
    // "İ".toLowerCase() is two code units, which moved a lowercased copy's indexes off the handle's.
    expect(matchIn("İzmirArt", "art")).toEqual({ before: "İzmir", match: "Art", after: "" });
  });

  it("takes the search's dots and other symbols as themselves", () => {
    expect(matchIn("axb.c", "a.b")).toBeNull();
    expect(matchIn("mika.draws", "a.d")).toEqual({ before: "mik", match: "a.d", after: "raws" });
  });

  it("finds nothing when the handle doesn't hold it", () => {
    expect(matchIn("mika", "ken")).toBeNull();
  });
});
