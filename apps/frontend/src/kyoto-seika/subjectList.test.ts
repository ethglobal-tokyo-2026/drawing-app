import { describe, expect, it } from "vitest";
import raw from "./subjects/subjects.json";
import { charCount, hasKanji, KINDS, MAX_SUBJECT_CHARS, parseSubjectList } from "./subjectList";

describe("the subject list", () => {
  const list = parseSubjectList(raw);

  it("holds every kind, each word once, nouns of at most MAX_SUBJECT_CHARS characters", () => {
    expect(new Set(list.map((s) => s.kind))).toEqual(new Set(KINDS));
    expect(new Set(list.map((s) => s.ja)).size).toBe(list.length);
    expect(list.filter((s) => charCount(s.ja) > MAX_SUBJECT_CHARS)).toEqual([]);
  });

  it("holds every kind in the evocative tier, which the upper balloon deals from", () => {
    expect(new Set(list.filter((s) => s.tier).map((s) => s.kind))).toEqual(new Set(KINDS));
  });

  it("keeps a reading for every word with kanji to put furigana over, and for no other", () => {
    expect(list.filter((s) => (s.reading !== "") !== hasKanji(s.ja))).toEqual([]);
  });

  it("refuses an entry it can't read, naming it", () => {
    expect(() => parseSubjectList([{ ja: "風", kind: "weather" }])).toThrow(/風/);
  });
});

describe("hasKanji", () => {
  it("finds kanji to put furigana over", () => {
    expect(["風", "落ち葉", "SNS", "スポーツ", "うちわ"].map(hasKanji)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});
