import type { Section } from "../catalog";

export const offers = {
  /** Offer sheet, opened by Offer for it in a sticker's menu on someone else's sticker board: its heading and its screen-reader name; {{no}} is the sticker's No., like No.0042 */
  title: { en: "Offer for {{no}}", ja: "{{no}}へのオファー" },
  /** Offer sheet: screen-reader label of the X button in the sheet's header, which closes it */
  close: { en: "Close", ja: "閉じる" },
  /** Offer sheet: fine print beside the sticker, under its No., drawing time and day; <artist/> is the Original Artist, <holder/> the owner of the board it's on, each an @handle or LINE name, which keeps its own case in the capitals */
  credit: { en: "By <artist/> · <holder/> holds it", ja: "作者：<artist/>・持ち主：<holder/>" },
  kinds: {
    /** Offer sheet: screen-reader name of the three offer choices (ask, swap, Gratitude) */
    label: { en: "What to offer", ja: "オファーの内容" },
    ask: {
      /** Offer sheet: bold title of the first offer choice, a plain request for the sticker */
      title: { en: "Ask for it", ja: "お願いする" },
      /** Offer sheet: line under the Ask for it choice; {{holder}} is the board's owner */
      note: {
        en: "A plain request. {{holder}} can say yes or no.",
        ja: "ふつうのお願いです。受けるかどうかは{{holder}}さんが決めます。",
      },
    },
    swap: {
      /** Offer sheet: bold title of the second offer choice, trading one of your stickers for it */
      title: { en: "Swap one of yours", ja: "自分のシールと交換する" },
      /** Offer sheet: line under the Swap one of yours choice */
      note: {
        en: "Pick one of your stickers to trade for it.",
        ja: "交換に出すシールを1枚選びます。",
      },
    },
    gratitude: {
      /** Offer sheet: bold title of the third offer choice, giving some of your Gratitude for the sticker */
      title: { en: "Offer gratitude", ja: "感謝を差し出す" },
      /** Offer sheet: line under the Offer gratitude choice */
      note: {
        en: "Give some of your gratitude for it.",
        ja: "手持ちの感謝を少し渡して、ゆずってもらいます。",
      },
    },
  },
  swap: {
    /** Offer sheet, with Swap chosen: screen-reader name of the row of your stickers to pick from */
    picker: { en: "Your sticker to swap", ja: "交換に出すシール" },
    /** Offer sheet, with Swap chosen: shown in place of the sticker picker when you have no sticker to trade */
    none: {
      en: "You don’t have a sticker to swap yet.",
      ja: "交換に出せるシールがまだありません。",
    },
  },
  /** Offer sheet, with Offer gratitude chosen: screen-reader name of the amount choices (100, 250, 500) */
  gratitudeAmounts: { en: "How much gratitude", ja: "渡す感謝の量" },
  /** Offer sheet: the main key at the bottom, which sends the offer */
  send: { en: "Send offer", ja: "オファーを送る" },
  /** Offer sheet: small line under the Send offer key; {{holder}} is the board's owner */
  waitsForYes: {
    en: "Nothing moves until {{holder}} says yes.",
    ja: "{{holder}}さんがOKするまで、やりとりは始まりません。",
  },
  sent: {
    /** Offer sheet, after Send offer: heading of the confirmation that replaces the sheet's choices */
    title: { en: "Offer sent to {{holder}}", ja: "{{holder}}さんにオファーを送りました" },
    /** Offer sheet, after Send offer: line under the confirmation's heading */
    lead: {
      en: "Nothing moves until {{holder}} says yes. You’ll hear about it in LINE.",
      ja: "{{holder}}さんがOKするまで、やりとりは始まりません。返事はLINEでお知らせします。",
    },
    /** Offer sheet, after Send offer: fine print saying the offer is a demo that went nowhere */
    demo: {
      en: "Demo material · offers aren’t sent anywhere yet",
      ja: "デモ表示・オファーはまだどこにも送られません",
    },
    /** Offer sheet, after Send offer: the button that closes the sheet, back to the owner's sticker board */
    back: { en: "Back to {{holder}}’s board", ja: "{{holder}}さんのボードに戻る" },
  },
} as const satisfies Section;
