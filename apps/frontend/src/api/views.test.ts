import { afterEach, describe, expect, it } from "vitest";
import { i18next } from "../i18n/i18n";
import { strings } from "../i18n/strings";
import { people, sticker, TEST_KYOTO_SEIKA_SUBJECTS } from "./testFixtures";
import { toPerson, toSticker } from "./views";

describe("toSticker", () => {
  it("carries the Kyoto Seika Subjects of a sticker drawn in Kyoto Seika Practice Mode, and none on any other", () => {
    const drawn = sticker({ kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS });
    expect(toSticker(drawn).kyotoSeikaSubjects).toEqual(TEST_KYOTO_SEIKA_SUBJECTS);
    expect(toSticker(sticker()).kyotoSeikaSubjects).toBeNull();
  });

  it("draws the API's sticker with the app's names and milliseconds", () => {
    const view = toSticker(sticker({ number: 147, sealedAt: "2026-09-23T11:52:00.000Z" }));
    expect(view.no).toBe(147);
    expect(view.sealedAt).toBe(Date.UTC(2026, 8, 23, 11, 52));
    expect(view.artist.name).toBe("Mika Hoshino");
  });

  it("shows the WebP files", () => {
    const s = sticker();
    expect(toSticker(s).urls).toEqual({
      png: s.images.webp.sticker,
      mask: s.images.webp.mask,
      spec: s.images.webp.spec,
      rim: s.images.webp.rim,
      foil: s.images.webp.foil,
    });
  });
});

describe("toPerson", () => {
  afterEach(() => i18next.changeLanguage("en"));

  it("names someone by their LINE name, then their handle", () => {
    expect(toPerson(people.bob).name).toBe("Bob Tanaka");
    expect(toPerson({ ...people.bob, lineDisplayName: null }).name).toBe("@bob");
  });

  it.each(["en", "ja"] as const)(
    "names someone with neither in the catalog's %s",
    async (language) => {
      await i18next.changeLanguage(language);
      const unnamed = toPerson({ ...people.bob, lineDisplayName: null, handle: null });
      expect(unnamed.name).toBe(strings.api.person.unnamed[language]);
    },
  );
});
