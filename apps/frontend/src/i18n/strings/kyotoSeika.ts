import type { Section } from "../catalog";

export const kyotoSeika = {
  /** The five thought clouds over a fresh sheet in Kyoto Seika Manga Expression Practice Mode. */
  balloons: {
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the five thought clouds' group name for screen readers */
    label: { en: "Your subjects", ja: "題材" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the hand lettering beside the inked die by the last cloud, and the die's name; a roll deals every subject not picked another */
    reroll: { en: "Reroll", ja: "振り直し" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the sound effect lettered beside the die as it lands, hidden from screen readers; Japanese in both languages, as a drawn manga sound effect */
    rollSound: { en: "コロッ", ja: "コロッ" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode: a subject as screen readers hear it, such as "風, wind": read out politely as a roll deals it, and in English as a cloud's name and in the canvas's name once begun */
    subject: { en: "{{word}}, {{english}}", ja: "{{word}}、{{english}}" },
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the die's name for screen readers once it blew up from rolling too often, and read out as it does; the subjects not picked can't change */
    charred: {
      en: "The die blew up. The subjects stay as they are.",
      ja: "サイコロが爆発しました。題材はもう変わりません。",
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
    /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the sunk yellow key's label and name until two of the five subjects are picked */
    pick: { en: "Pick 2", ja: "2つ選ぶ" },
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
    /** Seal sheet and sealed card, a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for the pair under the title; in English each subject comes with its English, such as "風, wind" */
    spoken: { en: "Subjects: {{first}}, and {{second}}.", ja: "題材：{{first}}と{{second}}。" },
  },
  /** The help sheet Settings' "?" opens beside Kyoto Seika Practice Mode's legend: three manga panels of the real screens, each captioned. */
  help: {
    /** Kyoto Seika Practice Mode's help sheet: the characters under the censor bar in its lines' "Kyoto ■ka", never shown */
    hidden: { en: "Sei", ja: "精" },
    /** Kyoto Seika Practice Mode's help sheet, under its title: what the mode is for; <bar/> blacks out one character of the university's name */
    lead: {
      en: "Practice for Kyoto <bar/>ka University’s manga expression entrance exam.",
      ja: "京都<bar/>華大学マンガ表現入試の練習モードです。",
    },
    /** Kyoto Seika Practice Mode's help sheet: the caption under the first panel, the two subject balloons a sheet deals */
    subjects: {
      en: "Two subjects to combine in every sticker",
      ja: "題材を2つ<wbr/>組み合わせてかく",
    },
    /** Kyoto Seika Practice Mode's help sheet: the caption under the second panel, the timer at the clock's full length; {{minutes}} is that length */
    clock: { en: "{{minutes}} minutes on the clock", ja: "タイマー{{minutes}}分" },
    /** Kyoto Seika Practice Mode's help sheet: the caption under the third panel, the daily ticket count; {{tickets}} is the day's daily tickets in the mode */
    tickets: { en: "{{tickets}} daily tickets", ja: "無償チケット<wbr/>1日{{tickets}}枚" },
    /** Kyoto Seika Practice Mode's help sheet, fine print: in its maker's voice, that Croquis has no connection with the university; <bar/> blacks out one character of its name */
    maker: {
      en: "Croquis isn’t affiliated with Kyoto <bar/>ka. I’m applying there myself, and made this mode to practice.",
      ja: "クロッキーは京都<bar/>華大学とは関係ありません。作者も受験生で、自分の練習のために作りました。",
    },
    /** Kyoto Seika Practice Mode's help sheet, fine print at its foot: the subject list's credit, a link that opens its sources and licenses */
    credit: { en: "Subjects: JMdict (EDRDG)", ja: "題材：JMdict（EDRDG）" },
  },
  /** The pair a sticker drawn in Kyoto Seika Practice Mode was dealt, in thought clouds on its detail and peeking from it on a board. */
  thought: {
    /** Sticker detail and sticker boards, a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for its pair, in place of the thought clouds, and in the sticker's name on a board; in English each subject comes with its English, such as "風, wind" */
    spoken: {
      en: "Manga expression practice. Subjects: {{first}}, and {{second}}.",
      ja: "マンガ表現練習。題材：{{first}}と{{second}}。",
    },
  },
} as const satisfies Section;
