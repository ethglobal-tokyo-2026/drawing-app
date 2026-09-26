export interface TierName {
  jp: string;
  en: string;
}

/** Indexed by tier: the name a tier-up slams in, with its English gloss. */
export const TIER_NAMES: readonly [TierName, TierName, TierName, TierName, TierName] = [
  { jp: "ありがと", en: "thanks" },
  { jp: "照れ", en: "blushing" },
  { jp: "ドキドキ", en: "heart racing" },
  { jp: "オーバーヒート", en: "overheat" },
  { jp: "昇天", en: "ascension" },
];
