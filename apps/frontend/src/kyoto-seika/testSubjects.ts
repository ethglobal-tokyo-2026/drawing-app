import type { Deal } from "./deal";
import type { KyotoSeikaSubjectEntry, SubjectKind } from "./subjectList";

/** A test's list entry; its reading is left empty unless given, as a word without kanji keeps none. */
const entry = (
  ja: string,
  kind: SubjectKind,
  { en, reading = "" }: { en: string; reading?: string },
): KyotoSeikaSubjectEntry => ({ ja, reading, en, kind });

export const WIND = entry("風", "phenomenon", { en: "wind", reading: "かぜ" });
export const REUNION = entry("再会", "moment", { en: "reunion", reading: "さいかい" });
export const SPORTS = entry("スポーツ", "loanword", { en: "sport" });

/** A tiny list: two of each kind. 泉 and 春 share the English "spring". */
export const TEST_SUBJECTS: readonly KyotoSeikaSubjectEntry[] = [
  WIND,
  entry("泉", "phenomenon", { en: "spring", reading: "いずみ" }),
  REUNION,
  entry("春", "moment", { en: "spring", reading: "はる" }),
  entry("地図", "thing", { en: "map", reading: "ちず" }),
  entry("果物", "thing", { en: "fruit", reading: "くだもの" }),
  SPORTS,
  entry("SNS", "loanword", { en: "social media" }),
  entry("双子", "people", { en: "twins", reading: "ふたご" }),
  entry("小学生", "people", { en: "schoolchild", reading: "しょうがくせい" }),
];

/** A fresh deal of 風 over 再会, neither die rolled. */
export const DEAL: Deal = { subjects: [WIND, REUNION], rolls: [0, 0] };
