import type { Tier } from "./combo";

export interface PopInWord {
  jp: string;
  gloss: string;
}

export type PopInBank = Tier | "stroke" | "shake";

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
  ],
  shake: [
    { jp: "ぶるぶる", gloss: "*wobble*" },
    { jp: "ゆさゆさ", gloss: "*sway*" },
    { jp: "ガクガク", gloss: "*rattle*" },
    { jp: "ぐわんぐわん", gloss: "*dizzy*" },
  ],
};

/** Picks a word from a bank at random, never the one it last picked from that bank. */
export function createPopInPicker(random: () => number): (bank: PopInBank) => PopInWord {
  const lastPicked = new Map<PopInBank, number>();
  return (bank) => {
    const words = POP_IN_WORDS[bank];
    let i = Math.floor(random() * words.length);
    if (words.length > 1 && i === lastPicked.get(bank)) i = (i + 1) % words.length;
    lastPicked.set(bank, i);
    return words[i];
  };
}
