export const offers = {
  /** Heads the sheet, and names it for assistive tech. */
  title: "Offer for {{no}}",
  close: "Close",
  /** Under the sticker's No., drawing time and day. */
  credit: "By {{artist}} · {{holder}} holds it",
  kinds: {
    /** Names the choice of offer for assistive tech. */
    label: "What to offer",
    ask: { title: "Ask for it", note: "A plain request. {{holder}} can say yes or no." },
    swap: { title: "Swap one of yours", note: "Pick one of your stickers to trade for it." },
    gratitude: { title: "Offer gratitude", note: "Give some of your gratitude for it." },
  },
  swap: {
    /** Names the sticker picker for assistive tech. */
    picker: "Your sticker to swap",
    none: "You don’t have a sticker to swap yet.",
  },
  /** Names the Gratitude amounts for assistive tech. */
  gratitudeAmounts: "How much gratitude",
  send: "Send offer",
  /** Under the send key. */
  waitsForYes: "Nothing moves until {{holder}} says yes.",
  sent: {
    title: "Offer sent to {{holder}}",
    lead: "Nothing moves until {{holder}} says yes. You’ll hear about it in LINE.",
    /** Fine print: offers are UI only for now. */
    demo: "Demo material · offers aren’t sent anywhere yet",
    back: "Back to {{holder}}’s board",
  },
} as const;
