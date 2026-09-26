import type { Section } from "../catalog";

export const offers = {
  /** Heads the sheet, and names it for assistive tech. */
  title: { en: "Offer for {{no}}" },
  close: { en: "Close" },
  /** Under the sticker's No., drawing time and day. */
  credit: { en: "By {{artist}} · {{holder}} holds it" },
  kinds: {
    /** Names the choice of offer for assistive tech. */
    label: { en: "What to offer" },
    ask: {
      title: { en: "Ask for it" },
      note: { en: "A plain request. {{holder}} can say yes or no." },
    },
    swap: {
      title: { en: "Swap one of yours" },
      note: { en: "Pick one of your stickers to trade for it." },
    },
    gratitude: {
      title: { en: "Offer gratitude" },
      note: { en: "Give some of your gratitude for it." },
    },
  },
  swap: {
    /** Names the sticker picker for assistive tech. */
    picker: { en: "Your sticker to swap" },
    none: { en: "You don’t have a sticker to swap yet." },
  },
  /** Names the Gratitude amounts for assistive tech. */
  gratitudeAmounts: { en: "How much gratitude" },
  send: { en: "Send offer" },
  /** Under the send key. */
  waitsForYes: { en: "Nothing moves until {{holder}} says yes." },
  sent: {
    title: { en: "Offer sent to {{holder}}" },
    lead: { en: "Nothing moves until {{holder}} says yes. You’ll hear about it in LINE." },
    /** Fine print: offers are UI only for now. */
    demo: { en: "Demo material · offers aren’t sent anywhere yet" },
    back: { en: "Back to {{holder}}’s board" },
  },
} as const satisfies Section;
