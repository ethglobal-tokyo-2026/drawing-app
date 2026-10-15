import { dieMood } from "./dieMood";
import {
  KINDS,
  type DealtSubject,
  type KyotoSeikaSubjectEntry,
  type SubjectKind,
} from "./subjectList";

/** How many of the dealt subjects the artist picks to combine, as the exam asks. */
export const PICKS = 2;

/** The subjects on screen, the ones picked, and how often the die has rolled. */
export interface Deal {
  /** One of each kind, each keeping its place through rolls; once begun, the picked pair alone. */
  subjects: readonly DealtSubject[];
  /** The places in `subjects` picked, in the order picked: PICKS at most. */
  picked: readonly number[];
  rolls: number;
}

export interface DealOptions {
  /** Every word dealt on this phone, each once, longest ago first. */
  dealt: readonly string[];
  random: () => number;
}

type List = readonly KyotoSeikaSubjectEntry[];

/** A subject's kind: its own, or its list entry's for one kept without it. */
const kindOf = (list: List, subject: DealtSubject): SubjectKind | undefined =>
  subject.kind ?? list.find((s) => s.ja === subject.ja)?.kind;

/**
 * The one dealing rule: what a place of `kind` can be dealt beside what's on screen. Never a word on
 * screen, nor another's English. A word never dealt comes first, so a kind's every word is dealt
 * before any comes back; after that, only the half of the kind dealt longest ago.
 */
function poolFor(
  list: List,
  kind: SubjectKind,
  shown: readonly DealtSubject[],
  { dealt }: Pick<DealOptions, "dealt">,
): KyotoSeikaSubjectEntry[] {
  const onScreen = new Set(shown.map((s) => s.ja));
  const english = new Set(shown.map((s) => s.en.toLowerCase()));
  const allowed = list.filter(
    (s) => s.kind === kind && !onScreen.has(s.ja) && !english.has(s.en.toLowerCase()),
  );
  const dealtAt = new Map(dealt.map((word, i) => [word, i]));
  const fresh = allowed.filter((s) => !dealtAt.has(s.ja));
  if (fresh.length > 0) return fresh;
  const longestAgo = allowed.toSorted(
    (a, b) => (dealtAt.get(a.ja) ?? 0) - (dealtAt.get(b.ja) ?? 0),
  );
  return longestAgo.slice(0, Math.ceil(longestAgo.length / 2));
}

/**
 * Each place's kind, which a roll keeps: the deal's clouds are seated by it. A subject whose kind is
 * lost takes its place's kind in the list's order.
 */
export const dealKinds = (list: List, deal: Pick<Deal, "subjects">): SubjectKind[] =>
  deal.subjects.map((subject, place) => kindOf(list, subject) ?? KINDS[place % KINDS.length]);

const draw = <T>(pool: readonly T[], random: () => number) =>
  pool[Math.floor(random() * pool.length)];

/**
 * One subject of each kind `held` lacks, after it, in a shuffled order: a fresh sheet's deal (`held`
 * empty), or the rest of one kept by a build that dealt a pair. Throws when a kind has nothing left.
 */
export function fillDeal(list: List, held: readonly DealtSubject[], options: DealOptions) {
  const have = new Set(held.map((s) => kindOf(list, s)));
  const missing = KINDS.filter((kind) => !have.has(kind));
  for (let i = missing.length - 1; i > 0; i--) {
    const j = Math.floor(options.random() * (i + 1));
    [missing[i], missing[j]] = [missing[j], missing[i]];
  }
  const subjects = [...held];
  for (const kind of missing.slice(0, Math.max(KINDS.length - held.length, 0))) {
    const pool = poolFor(list, kind, subjects, options);
    if (pool.length === 0)
      throw new Error(`No Kyoto Seika Subject of kind ${kind} is left to deal`);
    subjects.push(draw(pool, options.random));
  }
  return subjects;
}

/** A fresh sheet's deal: one subject of each kind, none picked. */
export const firstDeal = (list: List, options: DealOptions): Deal => ({
  subjects: fillDeal(list, [], options),
  picked: [],
  rolls: 0,
});

/**
 * A roll of the die: every place not picked is dealt another subject of its kind, and the die counts
 * one more roll. A place with nothing else of its kind left keeps its subject. Null once the die is
 * charred.
 */
export function rollDie(list: List, deal: Deal, options: DealOptions): Deal | null {
  if (dieMood(deal.rolls).charred) return null;
  const subjects = [...deal.subjects];
  subjects.forEach((subject, place) => {
    if (deal.picked.includes(place)) return;
    const kind = kindOf(list, subject);
    const pool = kind ? poolFor(list, kind, subjects, options) : [];
    if (pool.length > 0) subjects[place] = draw(pool, options.random);
  });
  return { subjects, picked: deal.picked, rolls: deal.rolls + 1 };
}

/**
 * A tap on the subject at `place`: picked, it's unpicked; otherwise it's picked, unless PICKS are
 * already, when the tap is refused (null).
 */
export function togglePick(deal: Deal, place: number): Deal | null {
  if (deal.picked.includes(place))
    return { ...deal, picked: deal.picked.filter((p) => p !== place) };
  if (deal.picked.length >= PICKS || place < 0 || place >= deal.subjects.length) return null;
  return { ...deal, picked: [...deal.picked, place] };
}

/** The pair picked, in the order picked, or null until PICKS are. */
export function pickedPair(deal: Deal): readonly [DealtSubject, DealtSubject] | null {
  if (deal.picked.length !== PICKS) return null;
  const [first, second] = deal.picked.map((place) => deal.subjects[place]);
  return first && second ? [first, second] : null;
}
