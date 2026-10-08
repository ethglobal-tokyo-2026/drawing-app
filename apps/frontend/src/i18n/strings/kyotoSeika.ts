import type { Section } from "../catalog";

export const kyotoSeika = {
  /** The two thought balloons over a fresh sheet in Kyoto Seika Manga Expression Practice Mode. */
  balloons: {
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the two thought balloons' group name for screen readers */
    label: { en: "Your subjects", ja: "題材" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: a cloud's reroll, named for screen readers by the lettering it shows and the subject it would replace, such as "Reroll: 風, wind" */
    roll: {
      en: "Reroll: {{word}}, {{english}}",
      ja: "振り直し：{{word}}、{{english}}",
    },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the hand lettering beside the inked die under each cloud, which deals that cloud another subject; screen readers hear the die's name instead */
    reroll: { en: "Reroll", ja: "振り直し" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the sound effect lettered beside a die as it lands, hidden from screen readers; Japanese in both languages, as a drawn manga sound effect */
    rollSound: { en: "コロッ", ja: "コロッ" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode: a subject as screen readers hear it, such as "風, wind": read out politely as a balloon is dealt it, and in English in the canvas's name once begun */
    subject: { en: "{{word}}, {{english}}", ja: "{{word}}、{{english}}" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: a die's name for screen readers once it blew up from rolling too often, and read out as it does; its balloon's subject can't change */
    charred: {
      en: "The die blew up. This subject stays.",
      ja: "サイコロが爆発しました。この題材で決まりです。",
    },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode: the line in place of the balloons when the subject list didn't load */
    loadFailed: { en: "Couldn’t load the subjects.", ja: "題材を読み込めませんでした。" },
  },
  /** The key at the sheet's foot that locks the pair in and starts the clock. */
  begin: {
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the yellow key at the sheet's foot, the proctor's word for starting the test */
    key: { en: "Begin", ja: "はじめ" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the yellow key's name for screen readers; {{minutes}} is the clock's length */
    label: {
      en: "Begin: start the {{minutes}}-minute timer",
      ja: "はじめ：{{minutes}}分のタイマーをスタート",
    },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the quiet line between the two subjects' balloons and Begin, saying what the test asks of them */
    task: { en: "Draw both in one sticker", ja: "2つの題材を1枚にかく" },
  },
  /** A die rolled again and again teases in manga hand lettering beside its balloon, and at last blows up. */
  tease: {
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its first tease; also read out */
    again: { en: "Eh? Again?", ja: "ええ、また？" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its second tease; also read out */
    stillDeciding: { en: "Still deciding?", ja: "まだ決めてないの？" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its third tease; also read out */
    goodOne: { en: "Isn’t that a good one?", ja: "いい題材じゃない？" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its fourth tease ("you think the next one's god-tier?"); also read out */
    godTier: { en: "Holding out for god-tier?", ja: "次こそ神題材だとでも？" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its fifth tease; also read out */
    breakTheButton: { en: "You’ll break the button!", ja: "ボタンが壊れちゃう！" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its last warning before the countdown to the bang; also read out */
    warned: { en: "Don’t say I didn’t warn you", ja: "もう知らないよ？" },
  },
  /** The pair as a margin note in the sheet's corner once Begin locked it in. */
  print: {
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode once begun: the canvas's name for screen readers, with the pair, since the faint corner print says nothing to them; in English each subject comes with its English, such as "遊園地, amusement park", and in Japanese it's the word alone */
    canvas: {
      en: "Canvas, subjects {{first}}, and {{second}}",
      ja: "キャンバス、題材は{{first}}と{{second}}",
    },
  },
  /** The ink bar over one character of the university's name on the Settings note, like a manga censor bar. */
  censor: {
    /** Settings note: the label that peels on under the censor bar in Kyoto Seika Practice Mode's name when it's tapped */
    why: { en: "Redacted for grown-up reasons", ja: "大人の事情により伏せています" },
  },
  /** The pair a sticker drawn in Kyoto Seika Practice Mode was dealt, shown in Japanese only. */
  pair: {
    /** Sticker detail's tag and the sealed card, a sticker drawn in Kyoto Seika Practice Mode: one subject of its pair as English screen readers hear it, such as "風, wind"; Japanese says the word alone */
    subject: { en: "{{word}}, {{english}}" },
    /** Sealed card, a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for the pair under Sealed; in English each subject comes with its English, such as "風, wind" */
    spoken: { en: "Subjects: {{first}}, and {{second}}.", ja: "題材：{{first}}と{{second}}。" },
  },
  /** The tag beside Timelapse on the detail of a sticker drawn in Kyoto Seika Practice Mode. */
  tag: {
    /** Sticker detail of a sticker drawn in Kyoto Seika Practice Mode: the ink label-tape tag beside Timelapse */
    label: { en: "Entrance exam practice", ja: "入試練習" },
    /** Sticker detail of a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for the tag and its pair; in English each subject comes with its English, such as "風, wind" */
    spoken: {
      en: "Entrance exam practice. Subjects: {{first}}, and {{second}}.",
      ja: "入試練習。題材：{{first}}と{{second}}。",
    },
  },
} as const satisfies Section;
