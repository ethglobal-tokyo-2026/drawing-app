import type { KyotoSeikaSubject } from "@drawing-app/api/client";

/** The five kinds the test's subjects come in; a pair is always two of them. */
export const KINDS = ["phenomenon", "moment", "thing", "loanword", "people"] as const;
export type SubjectKind = (typeof KINDS)[number];

/** The longest word the list holds, in characters, so the balloons' word sizes always fit. */
export const MAX_SUBJECT_CHARS = 6;

const graphemes = new Intl.Segmenter("ja", { granularity: "grapheme" });
/** How many characters `word` has, as a reader counts them. */
export const charCount = (word: string) => [...graphemes.segment(word)].length;

/** One Kyoto Seika Subject as the list holds it: what the seal sends of it, and what only the deal shows. */
export type KyotoSeikaSubjectEntry = KyotoSeikaSubject & {
  kind: SubjectKind;
  /** In the evocative tier, a subject a student can picture a scene for at once: the upper balloon deals only these. */
  tier: boolean;
  /** Dealt only with "Dark subjects too" on. */
  dark: boolean;
};

/**
 * One Kyoto Seika Subject as a sheet holds it: what the seal sends of it, and the rest of its list
 * entry, which a sheet kept by an earlier build may hold in a shape this one can't read.
 */
export type DealtSubject = KyotoSeikaSubject &
  Partial<Pick<KyotoSeikaSubjectEntry, "kind" | "tier" | "dark">>;

/** Whether `word` has kanji, which take furigana. */
export const hasKanji = (word: string) => /\p{Script=Han}/u.test(word);

const isKind = (v: unknown): v is SubjectKind => KINDS.some((kind) => kind === v);

/** What the seal sends of a subject, or undefined when it can't be read. */
function readSubject(v: unknown): KyotoSeikaSubject | undefined {
  if (typeof v !== "object" || v === null || !("ja" in v && "reading" in v && "en" in v))
    return undefined;
  const { ja, reading, en } = v;
  if (typeof ja !== "string" || ja === "" || typeof en !== "string" || en === "") return undefined;
  return typeof reading === "string" ? { ja, reading, en } : undefined;
}

/** A list entry, or undefined when it can't be read. */
function readSubjectEntry(v: unknown): KyotoSeikaSubjectEntry | undefined {
  const subject = readSubject(v);
  if (!subject || typeof v !== "object" || v === null) return undefined;
  if (!("kind" in v && "tier" in v && "dark" in v)) return undefined;
  const { kind, tier, dark } = v;
  if (!isKind(kind) || typeof tier !== "boolean" || typeof dark !== "boolean") return undefined;
  return { ...subject, kind, tier, dark };
}

/**
 * A subject a sheet kept, or undefined when what the seal sends of it can't be read: the rest of its
 * entry is kept only when this build reads it.
 */
export const readDealtSubject = (v: unknown): DealtSubject | undefined =>
  readSubjectEntry(v) ?? readSubject(v);

/** The list as `subjects.json` holds it. Throws on the first entry it can't read, naming it. */
export function parseSubjectList(raw: unknown): KyotoSeikaSubjectEntry[] {
  if (!Array.isArray(raw)) throw new Error("The Kyoto Seika Subjects aren't a list");
  return raw.map((v: unknown, i) => {
    const entry = readSubjectEntry(v);
    if (!entry) throw new Error(`Kyoto Seika Subject ${i + 1} is unreadable: ${JSON.stringify(v)}`);
    return entry;
  });
}

/** The list as its chunk holds it. */
export interface SubjectList {
  subjects: readonly KyotoSeikaSubjectEntry[];
  /**
   * The list's licence and its sources' notices, which must go wherever the list goes. Carried here
   * so the build keeps them in the list's chunk: one nothing reads is dropped from the build.
   */
  notices: string;
}

let loading: Promise<SubjectList> | undefined;

/**
 * The list, from its own chunk, loaded once. A load that fails is logged and forgotten, so the next
 * call tries again.
 */
export function loadSubjectList(): Promise<SubjectList> {
  if (!loading) {
    const started = import("./subjects/subjectsModule").then(
      ({ SUBJECTS, NOTICES }): SubjectList => ({ subjects: SUBJECTS, notices: NOTICES }),
    );
    loading = started;
    started.catch((error: unknown) => {
      console.error("The Kyoto Seika Subjects didn't load", error);
      if (loading === started) loading = undefined;
    });
  }
  return loading;
}
