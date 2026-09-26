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

  it("shows the WebP files, and leaves out images the sticker doesn't have", () => {
    const s = sticker();
    expect(toSticker(s).urls).toEqual({
      png: s.images.webp.sticker,
      mask: s.images.webp.mask,
      spec: s.images.webp.spec,
      rim: s.images.webp.rim,
      foil: s.images.webp.foil,
    });
    const webp = { ...s.images.webp, mask: "", spec: "", rim: "", foil: "" };
    const view = toSticker({ ...s, images: { ...s.images, webp } });
    expect(view.urls).toEqual({ png: s.images.webp.sticker });
  });
});

describe("toPerson", () => {
  it("names someone by their LINE name, then their handle", () => {
    expect(toPerson(people.bob).name).toBe("Bob Tanaka");
    expect(toPerson({ ...people.bob, lineDisplayName: null }).name).toBe("@bob");
    expect(toPerson({ ...people.bob, lineDisplayName: null, handle: null }).name).toBe("Someone");
  });
});
