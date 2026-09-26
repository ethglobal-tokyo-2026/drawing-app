import { describe, expect, it } from "vitest";
import { people, sticker } from "./testFixtures";
import { toPerson, toSticker } from "./views";

describe("toSticker", () => {
  it("draws the API's sticker with the app's names and milliseconds", () => {
    const view = toSticker(sticker({ number: 147, sealedAt: "2026-09-23T11:52:00.000Z" }));
    expect(view.no).toBe(147);
    expect(view.sealedAt).toBe(Date.UTC(2026, 8, 23, 11, 52));
    expect(view.artist.name).toBe("Mika Hoshino");
  });

  it("leaves out images the sticker doesn't have", () => {
    const s = sticker();
    const view = toSticker({ ...s, images: { ...s.images, mask: "", spec: "", rim: "" } });
    expect(view.urls).toEqual({ png: s.images.png });
  });
});

describe("toPerson", () => {
  it("names someone by their LINE name, then their handle", () => {
    expect(toPerson(people.bob).name).toBe("Bob Tanaka");
    expect(toPerson({ ...people.bob, lineDisplayName: null }).name).toBe("@bob");
    expect(toPerson({ ...people.bob, lineDisplayName: null, handle: null }).name).toBe("Someone");
  });
});
