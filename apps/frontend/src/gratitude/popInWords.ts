import type { Tier } from "./combo";

export interface PopInWord {
  jp: string;
  gloss: string;
}

/** A tier's words, stroking's, shaking's, or 昇天's climax: short words that keep clear of the limp face. */
export type PopInBank = Tier | "stroke" | "shake" | "climax";

/** Onomatopoeia that flash up for a moment, never labels. Suggestive, never explicit. */
export const POP_IN_WORDS: Record<PopInBank, readonly PopInWord[]> = {
  0: [
    { jp: "ありがと", gloss: "thanks" },
    { jp: "ぺこり", gloss: "*bow*" },
    { jp: "えへへ", gloss: "*hehe*" },
    { jp: "うれしい", gloss: "so happy" },
    { jp: "にこっ", gloss: "*smile*" },
    { jp: "キラッ", gloss: "*sparkle*" },
    { jp: "どうも〜", gloss: "thank you kindly" },
    { jp: "ほわ〜", gloss: "*warm fuzzies*" },
    { jp: "やった", gloss: "yay" },
  ],
  1: [
    { jp: "ぽっ", gloss: "*blush*" },
    { jp: "てれてれ", gloss: "*so shy*" },
    { jp: "もじもじ", gloss: "*fidget*" },
    { jp: "あわわ", gloss: "*flustered*" },
    { jp: "はわわ", gloss: "*eep*" },
    { jp: "きゃっ", gloss: "*eek*" },
    { jp: "そんな…", gloss: "oh, stop…" },
    { jp: "照れる…", gloss: "you’ll make me blush" },
    { jp: "ドキッ", gloss: "*ba-dump*" },
  ],
  2: [
    { jp: "ドキドキ", gloss: "*ba-dump ba-dump*" },
    { jp: "バクバク", gloss: "*thump thump*" },
    { jp: "きゅんきゅん", gloss: "*squee*" },
    { jp: "はぅっ", gloss: "*gasp*" },
    { jp: "ずっきゅん", gloss: "*direct hit*" },
    { jp: "ふわぁ", gloss: "*swoon*" },
    { jp: "もっと…", gloss: "more…" },
    { jp: "だめ…", gloss: "no fair…" },
  ],
  3: [
    { jp: "ハァハァ", gloss: "*pant pant*" },
    { jp: "アツい…", gloss: "so hot…" },
    { jp: "ぷしゅー", gloss: "*steam*" },
    { jp: "とけちゃう", gloss: "I’m melting" },
    { jp: "もうだめ", gloss: "can’t take it" },
    { jp: "はげしい", gloss: "so intense" },
    { jp: "ビクッ", gloss: "*twitch*" },
    { jp: "ぜぇぜぇ", gloss: "*wheeze*" },
    { jp: "ブッ", gloss: "*nosebleed*" },
    { jp: "そこ…", gloss: "right there…" },
  ],
  4: [
    { jp: "尊い…", gloss: "*too precious…*" },
    { jp: "昇天", gloss: "ascension" },
    { jp: "天国…", gloss: "heaven…" },
    { jp: "召される", gloss: "being called home" },
    { jp: "真っ白…", gloss: "all white…" },
    { jp: "限界", gloss: "at the limit" },
    { jp: "ありがたや", gloss: "bless" },
    { jp: "成仏", gloss: "at peace" },
    { jp: "あぁ…", gloss: "ahh…" },
  ],
  stroke: [
    { jp: "なでなで", gloss: "*pat pat*" },
    { jp: "すりすり", gloss: "*nuzzle*" },
    { jp: "シュッ", gloss: "*swish*" },
    { jp: "ぞくぞく", gloss: "*shiver*" },
    { jp: "もふもふ", gloss: "*fluff fluff*" },
    { jp: "よしよし", gloss: "*there, there*" },
    { jp: "ゴロゴロ", gloss: "*purr*" },
    { jp: "うっとり", gloss: "*entranced*" },
  ],
  shake: [
    { jp: "ぶるぶる", gloss: "*wobble*" },
    { jp: "ゆさゆさ", gloss: "*sway*" },
    { jp: "ガクガク", gloss: "*rattle*" },
    { jp: "ぐわんぐわん", gloss: "*dizzy*" },
  ],
  climax: [
    { jp: "尊い…", gloss: "*too precious…*" },
    { jp: "天国…", gloss: "heaven…" },
  ],
};

/**
 * Picks a word from a bank at random: never one already on screen, and not the one it last picked
 * from that bank while another will do. Null when every word in the bank is on screen.
 */
export function createPopInPicker(
  random: () => number,
): (bank: PopInBank, onScreen: ReadonlySet<string>) => PopInWord | null {
  const lastPicked = new Map<PopInBank, PopInWord>();
  return (bank, onScreen) => {
    const words = POP_IN_WORDS[bank].filter((word) => !onScreen.has(word.jp));
    const fresh = words.filter((word) => word !== lastPicked.get(bank));
    const choices = fresh.length > 0 ? fresh : words;
    if (choices.length === 0) return null;
    const word = choices[Math.floor(random() * choices.length)];
    lastPicked.set(bank, word);
    return word;
  };
}
