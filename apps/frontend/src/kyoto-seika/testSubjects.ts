import type { Deal } from "./deal";
import type { KyotoSeikaSubjectEntry, SubjectKind } from "./subjectList";

/** A test's list entry; its reading is left empty unless given, as a word without kanji keeps none. */
const entry = (
  ja: string,
  kind: SubjectKind,
  {
    en,
    reading = "",
    tier = false,
    dark = false,
  }: { en: string; reading?: string; tier?: boolean; dark?: boolean },
): KyotoSeikaSubjectEntry => ({ ja, reading, en, kind, tier, dark });

export const WIND = entry("風", "phenomenon", { en: "wind", reading: "かぜ", tier: true });
export const REUNION = entry("再会", "moment", { en: "reunion", reading: "さいかい" });
export const SPORTS = entry("スポーツ", "loanword", { en: "sport", tier: true });

/**
 * A tiny list: two of each kind, one of each in the evocative tier, and one dark thing. 泉 and 春
 * share the English "spring".
 */
export const TEST_SUBJECTS: readonly KyotoSeikaSubjectEntry[] = [
  WIND,
  entry("泉", "phenomenon", { en: "spring", reading: "いずみ" }),
  REUNION,
  entry("春", "moment", { en: "spring", reading: "はる", tier: true }),
  entry("地図", "thing", { en: "map", reading: "ちず", tier: true }),
  entry("果物", "thing", { en: "fruit", reading: "くだもの" }),
  SPORTS,
  entry("SNS", "loanword", { en: "social media" }),
  entry("双子", "people", { en: "twins", reading: "ふたご", tier: true }),
  entry("小学生", "people", { en: "schoolchild", reading: "しょうがくせい" }),
  entry("爆弾", "thing", { en: "bomb", reading: "ばくだん", dark: true }),
];

/** A fresh deal of 風 over 再会, neither die rolled. */
export const DEAL: Deal = { subjects: [WIND, REUNION], rolls: [0, 0] };
