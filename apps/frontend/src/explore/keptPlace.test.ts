import { describe, expect, it } from "vitest";
import { placeOf, scrollToKeep, type Marker } from "./keptPlace";

/** A view 700px tall over a sticker gone by above it, one near its top, and one lower down. */
const VIEW_HEIGHT = 700;
const LAID: Marker[] = [
  { key: "past", top: -400, height: 150 },
  { key: "near", top: 30, height: 150 },
  { key: "lower", top: 300, height: 150 },
];

describe("the reader's place in the pile", () => {
  it("keeps the marker nearest the view's top the same share of itself below it, once laid out anew", () => {
    const place = placeOf(LAID, VIEW_HEIGHT);
    if (!place) throw new Error("no place kept");
    expect(place.key).toBe("near");
    // Laid out at a new width: the sticker is lower down and taller.
    const anew = { key: "near", top: 245, height: 225 };
    const below = anew.top - scrollToKeep(place, anew);
    expect(below / anew.height).toBeCloseTo(30 / 150);
  });

  it("keeps no place where the view shows no marker", () => {
    expect(placeOf([{ key: "past", top: VIEW_HEIGHT + 10, height: 400 }], VIEW_HEIGHT)).toBeNull();
    expect(placeOf([], VIEW_HEIGHT)).toBeNull();
  });
});
