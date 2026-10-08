import { describe, expect, it } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import { firstDeal, rollDie, type DealOptions } from "./deal";
import { CHARRED_AT_ROLL } from "./dieMood";
import { TEST_SUBJECTS } from "./testSubjects";

const options = (over: Partial<DealOptions> = {}): DealOptions => ({
  recent: [],
  dark: false,
  random: seededRandom(1),
  ...over,
});
/** `n` first deals, one per seed. */
const deals = (n: number, base: DealOptions) =>
  Array.from({ length: n }, (_, seed) =>
    firstDeal(TEST_SUBJECTS, { ...base, random: seededRandom(seed) }),
  );

describe("dealing Kyoto Seika Subjects", () => {
  it("deals two subjects of different kinds, never a dark one without Dark subjects too", () => {
    for (const deal of deals(200, options())) {
      const [upper, lower] = deal.subjects;
      expect(upper.kind).not.toBe(lower.kind);
      expect(deal.subjects.some((s) => s.dark)).toBe(false);
    }
    expect(deals(200, options({ dark: true })).some((d) => d.subjects.some((s) => s.dark))).toBe(
      true,
    );
  });

  it("rolls a balloon to a new word of another kind than the other balloon's, never either word on screen", () => {
    let deal = firstDeal(TEST_SUBJECTS, options());
    for (let i = 0; i < 20; i++) {
      const before = deal;
      deal = rollDie(TEST_SUBJECTS, deal, 0, options({ random: seededRandom(i) })) ?? deal;
      expect(before.subjects.map((s) => s.ja)).not.toContain(deal.subjects[0].ja);
      expect(deal.subjects[0].kind).not.toBe(deal.subjects[1].kind);
      expect(deal.subjects[1]).toBe(before.subjects[1]);
    }
    expect(deal.rolls).toEqual([20, 0]);
  });

  it("never pairs two words that share their English", () => {
    // The fixture's 泉 (phenomenon) and 春 (moment) are both "spring".
    for (const deal of deals(200, options()))
      expect(deal.subjects[0].en).not.toBe(deal.subjects[1].en);
  });

  it("skips the words dealt lately, unless nothing else is left", () => {
    const lately = TEST_SUBJECTS.filter((s) => s.kind !== "people").map((s) => s.ja);
    const deal = firstDeal(TEST_SUBJECTS, options({ recent: lately }));
    expect(deal.subjects.filter((s) => lately.includes(s.ja))).toHaveLength(1);
  });

  it("deals and rolls the upper balloon from the tier, and the lower from any kind but the upper's", () => {
    for (const deal of deals(200, options())) {
      expect(deal.subjects[0].tier).toBe(true);
      expect(deal.subjects[1].kind).not.toBe(deal.subjects[0].kind);
    }
    expect(deals(200, options()).some((d) => !d.subjects[1].tier)).toBe(true);
    let deal = firstDeal(TEST_SUBJECTS, options());
    for (let i = 0; i < 20; i++) {
      deal = rollDie(TEST_SUBJECTS, deal, 0, options({ random: seededRandom(i) })) ?? deal;
      expect(deal.subjects[0].tier).toBe(true);
    }
  });

  it("takes no roll once the die is charred", () => {
    const charred = {
      ...firstDeal(TEST_SUBJECTS, options()),
      rolls: [CHARRED_AT_ROLL, 0] as const,
    };
    expect(rollDie(TEST_SUBJECTS, charred, 0, options())).toBeNull();
  });
});
