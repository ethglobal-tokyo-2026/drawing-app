export const shop = {
  /** The Shop tab's page title. */
  title: "Shop",
  /** The reserve tickets section: the Shop's one thing on sale. */
  reserve: {
    title: "Reserve tickets",
    /** What they're for, in one line. */
    lead: "Keep drawing after your daily tickets run out.",
    /** The reserve tickets you hold: `count` is the ticket mark and its ×count. */
    held: "You have <count/>",
    /** The same, for screen readers. */
    heldSpoken_one: "You have {{count}} reserve ticket.",
    heldSpoken_other: "You have {{count}} reserve tickets.",
    /** The one-ticket pack's price, while some pack is discounted. */
    priceWithPacks: "{{price}} each, less in packs",
    /** The one-ticket pack's price, while no pack is discounted. */
    price: "{{price}} each",
    /** The key that opens the reserve ticket checkout. */
    buy: "Buy reserve tickets",
  },
  /** Under the Pay key and at the foot of the reserve tickets section; `logo` is Sui's logo. */
  paymentsOn: "Payments on <logo/>",
  /** Beside each coming-soon shelf's name. */
  comingSoon: "Coming soon",
  /** On the first tile of each shelf: what you already have. */
  yours: "Yours",
  shelves: {
    laminates: {
      title: "Laminates",
      lead: "The finish your stickers are sealed with.",
      items: { gloss: "Gloss", matte: "Matte", glitter: "Glitter", prism: "Prism" },
    },
    brushes: {
      title: "Brushes",
      lead: "More ways to lay down ink.",
      items: { brush: "Brush", marker: "Marker", fineliner: "Fineliner", pixelPen: "Pixel pen" },
    },
    backingFoils: {
      title: "Backing foils",
      lead: "The foil your stickers wear on other people’s sticker boards.",
      items: { holo: "Holo", gold: "Gold", silver: "Silver", roseGold: "Rose gold" },
    },
  },
} as const;
