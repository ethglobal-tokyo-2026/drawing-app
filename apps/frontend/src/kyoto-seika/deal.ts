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
  /** Words dealt on this phone lately, newest last. */
  recent: readonly string[];
  random: () => number;
}

type List = readonly KyotoSeikaSubjectEntry[];

/** A subject's kind: its own, or its list entry's for one kept without it. */
const kindOf = (list: List, subject: DealtSubject): SubjectKind | undefined =>
  subject.kind ?? list.find((s) => s.ja === subject.ja)?.kind;

/**
 * The one dealing rule: what a place of `kind` can be dealt beside what's on screen. Never a word on
 * screen, nor another's English; words dealt lately only when nothing else is left.
 */
function poolFor(
  list: List,
  kind: SubjectKind,
  shown: readonly DealtSubject[],
  { recent }: Pick<DealOptions, "recent">,
): KyotoSeikaSubjectEntry[] {
  const onScreen = new Set(shown.map((s) => s.ja));
  const english = new Set(shown.map((s) => s.en.toLowerCase()));
  const allowed = list.filter(
    (s) => s.kind === kind && !onScreen.has(s.ja) && !english.has(s.en.toLowerCase()),
  );
  const lately = new Set(recent);
  const fresh = allowed.filter((s) => !lately.has(s.ja));
  return fresh.length > 0 ? fresh : allowed;
}

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

/** The places a roll would deal again: every one not picked. */
export const unpicked = (deal: Deal) =>
  deal.subjects.flatMap((_, place) => (deal.picked.includes(place) ? [] : [place]));

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
