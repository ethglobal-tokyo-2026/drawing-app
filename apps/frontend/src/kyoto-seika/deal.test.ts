import { describe, expect, it } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import {
  fillDeal,
  firstDeal,
  pickedPair,
  PICKS,
  rollDie,
  togglePick,
  type Deal,
  type DealOptions,
} from "./deal";
import { CHARRED_AT_ROLL } from "./dieMood";
import { KINDS, type KyotoSeikaSubjectEntry } from "./subjectList";
import { REUNION, TEST_SUBJECTS, WIND } from "./testSubjects";

const options = (over: Partial<DealOptions> = {}): DealOptions => ({
  dealt: [],
  random: seededRandom(1),
  ...over,
});
/** A list of `perKind` words of each kind, no two sharing their English. */
const listOf = (perKind: number): KyotoSeikaSubjectEntry[] =>
  KINDS.flatMap((kind) =>
    Array.from({ length: perKind }, (_, i) => ({
      ja: `${kind}${i}`,
      reading: "",
      en: `${kind} ${i}`,
      kind,
    })),
  );
/** `n` first deals, one per seed. */
const deals = (n: number) =>
  Array.from({ length: n }, (_, seed) =>
    firstDeal(TEST_SUBJECTS, options({ random: seededRandom(seed) })),
  );
/** `deal` with the places `picks` picked, in that order. */
const picking = (deal: Deal, ...picks: number[]) =>
  picks.reduce<Deal>((d, place) => togglePick(d, place) ?? d, deal);
const kinds = (deal: Deal) => deal.subjects.map((s) => s.kind);

describe("dealing Kyoto Seika Subjects", () => {
  it("deals one subject of each kind, none picked", () => {
    for (const deal of deals(200)) {
      expect(kinds(deal)).toHaveLength(KINDS.length);
      expect(new Set(kinds(deal))).toEqual(new Set(KINDS));
      expect(deal.picked).toEqual([]);
    }
  });

  it("never deals two words that share their English", () => {
    // The fixture's 泉 (phenomenon) and 春 (moment) are both "spring".
    for (const deal of deals(200)) {
      const english = deal.subjects.map((s) => s.en);
      expect(new Set(english).size).toBe(english.length);
    }
  });

  it("deals every word of a kind before any comes back, then only the half dealt longest ago", () => {
    const list = listOf(6);
    const dealt: string[] = [];
    for (let seed = 0; seed < 6; seed++) {
      const deal = firstDeal(list, options({ dealt, random: seededRandom(seed) }));
      dealt.push(...deal.subjects.map((s) => s.ja));
    }
    expect(new Set(dealt).size).toBe(list.length);
    const kindOf = new Map(list.map((s) => [s.ja, s.kind]));
    const longestAgo = new Set(
      KINDS.flatMap((kind) => dealt.filter((word) => kindOf.get(word) === kind).slice(0, 3)),
    );
    for (let seed = 0; seed < 50; seed++) {
      const again = firstDeal(list, options({ dealt, random: seededRandom(seed) }));
      expect(again.subjects.filter((s) => !longestAgo.has(s.ja))).toEqual([]);
    }
  });

  it("rolls every unpicked place to another word of its kind, and leaves the picks", () => {
    let deal = picking(firstDeal(TEST_SUBJECTS, options()), 3, 1);
    for (let i = 0; i < 20; i++) {
      const before = deal;
      deal = rollDie(TEST_SUBJECTS, deal, options({ random: seededRandom(i) })) ?? deal;
      expect(kinds(deal)).toEqual(kinds(before));
      expect(deal.picked).toEqual([3, 1]);
      deal.subjects.forEach((subject, place) => {
        if (place === 1 || place === 3) expect(subject).toBe(before.subjects[place]);
      });
    }
    expect(deal.rolls).toBe(20);
    // With a word of its kind left that's off screen, an unpicked place always changes.
    const fresh = firstDeal(TEST_SUBJECTS, options());
    const rolled = rollDie(TEST_SUBJECTS, fresh, options({ random: seededRandom(5) }));
    expect(rolled?.subjects.some((s, place) => s !== fresh.subjects[place])).toBe(true);
  });

  it("refuses a third pick until one is unpicked", () => {
    const two = picking(firstDeal(TEST_SUBJECTS, options()), 0, 4);
    expect(two.picked).toHaveLength(PICKS);
    expect(togglePick(two, 2)).toBeNull();
    const unpicked = togglePick(two, 0);
    expect(unpicked?.picked).toEqual([4]);
    expect(unpicked && togglePick(unpicked, 2)?.picked).toEqual([4, 2]);
  });

  it("makes the pair the picks, in the order picked, once two are", () => {
    const deal = firstDeal(TEST_SUBJECTS, options());
    expect(pickedPair(picking(deal, 2))).toBeNull();
    expect(pickedPair(picking(deal, 2, 0))).toEqual([deal.subjects[2], deal.subjects[0]]);
  });

  it("takes no roll once the die is charred", () => {
    const charred = { ...firstDeal(TEST_SUBJECTS, options()), rolls: CHARRED_AT_ROLL };
    expect(rollDie(TEST_SUBJECTS, charred, options())).toBeNull();
  });

  it("fills a pair kept by an earlier build with the kinds it lacks", () => {
    // Kept without its kind, as a build before kinds kept it: the list's entry tells it.
    const { kind: _, ...windKeptBare } = WIND;
    const filled = fillDeal(TEST_SUBJECTS, [windKeptBare, REUNION], options());
    expect(filled.slice(0, 2)).toEqual([windKeptBare, REUNION]);
    expect(filled).toHaveLength(KINDS.length);
    expect(new Set(filled.slice(2).map((s) => s.kind))).toEqual(
      new Set(KINDS.filter((k) => k !== WIND.kind && k !== REUNION.kind)),
    );
  });
});
