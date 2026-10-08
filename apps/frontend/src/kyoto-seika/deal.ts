import { dieMood } from "./dieMood";
import type { KyotoSeikaSubjectEntry } from "./subjectList";

/** 0: the upper balloon, 1: the lower. */
export type Balloon = 0 | 1;

/** The pair on screen, and how often each balloon's die has rolled. */
export interface Deal {
  subjects: readonly [KyotoSeikaSubjectEntry, KyotoSeikaSubjectEntry];
  rolls: readonly [number, number];
}

export interface DealOptions {
  /** Words dealt on this phone lately, newest last. */
  recent: readonly string[];
  /** Dark subjects too: dealt only while both switches are on. */
  dark: boolean;
  random: () => number;
}

type List = readonly KyotoSeikaSubjectEntry[];

/**
 * The one dealing rule: what `balloon` can be dealt beside what's on screen. The upper balloon only from
 * the evocative tier, so every pair has a strong word; never a kind the other balloon holds, nor the
 * other balloon's English, nor either balloon's word, nor a dark subject without Dark subjects too;
 * words dealt lately only when nothing else is left.
 */
function poolFor(
  list: List,
  balloon: Balloon,
  shown: readonly (KyotoSeikaSubjectEntry | null)[],
  { recent, dark }: Pick<DealOptions, "recent" | "dark">,
): KyotoSeikaSubjectEntry[] {
  const other = shown[balloon === 0 ? 1 : 0];
  const onScreen = new Set(shown.flatMap((s) => (s ? [s.ja] : [])));
  const allowed = list.filter(
    (s) =>
      (balloon === 1 || s.tier) &&
      (dark || !s.dark) &&
      !onScreen.has(s.ja) &&
      s.kind !== other?.kind &&
      s.en.toLowerCase() !== other?.en.toLowerCase(),
  );
  const lately = new Set(recent);
  const fresh = allowed.filter((s) => !lately.has(s.ja));
  return fresh.length > 0 ? fresh : allowed;
}

/** A subject for `balloon`, drawn from its pool. Throws when the pool is empty, naming the balloon. */
function dealSubject(
  list: List,
  balloon: Balloon,
  shown: readonly (KyotoSeikaSubjectEntry | null)[],
  options: DealOptions,
): KyotoSeikaSubjectEntry {
  const pool = poolFor(list, balloon, shown, options);
  if (pool.length === 0)
    throw new Error(
      `No Kyoto Seika Subject is left to deal the ${balloon === 0 ? "upper" : "lower"} balloon`,
    );
  return pool[Math.floor(options.random() * pool.length)];
}

/** A fresh sheet's pair: the upper balloon first, then the lower beside it. */
export function firstDeal(list: List, options: DealOptions): Deal {
  const upper = dealSubject(list, 0, [null, null], options);
  return { subjects: [upper, dealSubject(list, 1, [upper, null], options)], rolls: [0, 0] };
}

/** A roll of `balloon`'s die: a new subject there, and one more roll. Null once that die is charred. */
export function rollDie(
  list: List,
  deal: Deal,
  balloon: Balloon,
  options: DealOptions,
): Deal | null {
  if (dieMood(deal.rolls[balloon]).charred) return null;
  const next = dealSubject(list, balloon, deal.subjects, options);
  // Literals in each branch, so the return type makes them tuples with no cast.
  return balloon === 0
    ? { subjects: [next, deal.subjects[1]], rolls: [deal.rolls[0] + 1, deal.rolls[1]] }
    : { subjects: [deal.subjects[0], next], rolls: [deal.rolls[0], deal.rolls[1] + 1] };
}
