export const tickets = {
  /** Beside a ticket mark: how many of that kind are left. */
  count: "×{{count}}",
  /** Both counts in words, for screen readers: "2 daily tickets and 5 reserve tickets". */
  summary: {
    dailyAndReserve: "{{daily}} and {{reserve}}",
    daily_one: "{{count}} daily ticket",
    daily_other: "{{count}} daily tickets",
    reserve_one: "{{count}} reserve ticket",
    reserve_other: "{{count}} reserve tickets",
  },
  /** How long until the refill, in whole minutes rounded down. */
  refillIn: {
    underAMinute: "in under a minute",
    hoursAndMinutes: "in {{hours}}h {{minutes}}m",
    hours: "in {{hours}}h",
    minutes: "in {{minutes}}m",
  },
  /** Beside the reserve count on the cards. */
  reserve: "Reserve",
  draw: "Draw",
  /** The Draw key's name for assistive tech; `tickets` is the summary. */
  drawWithTickets: "Draw: you have {{tickets}}",
  shopForTickets: "Shop for tickets",
  goToStickerBoard: "Go to sticker board",
  notNow: "Not now",
  tryAgain: "Try again",
  /** The card that asks before a ticket is spent on a fresh sheet. */
  startDrawing: {
    /** While there are daily tickets left. */
    daily: {
      title: "Use a ticket to draw?",
      left_one: "You have {{count}} daily ticket left.",
      left_other: "You have {{count}} daily tickets left.",
      timer: "Your {{minutes}}-minute timer starts with your first stroke.",
      start: "Start drawing",
    },
    /** Once they're used, a reserve ticket is spent only when asked. */
    reserve: {
      title: "Use a reserve ticket?",
      left_one: "Today’s daily tickets are used. You have {{count}} reserve ticket.",
      left_other: "Today’s daily tickets are used. You have {{count}} reserve tickets.",
      refillAt: "New daily tickets at {{time}}.",
      use: "Use a reserve ticket",
    },
  },
  /** Out of daily and reserve tickets, until the refill turns the card over. */
  outOfTickets: {
    title: "Out of tickets for today",
    /** The countdown is the line's quiet half. */
    refillLine:
      "<strong>New daily tickets at {{time}},</strong> <countdown>{{countdown}}</countdown>",
    refilled: "New tickets are here",
  },
  /** In the start card's place until your tickets load. */
  notLoaded: {
    checking: "Checking your tickets…",
    couldntLoad: "Couldn’t load your tickets",
  },
  shop: {
    title: "Ticket shop",
    lead: "Reserve tickets never expire.",
    balance: "Your JPYC",
    readingBalance: "Reading your balance…",
    /** `reason` is the wallet's own words. */
    balanceProblem: "Couldn’t read your balance ({{reason}}).",
    gettingPrices: "Getting today’s prices…",
    pricesProblem: "Couldn’t get today’s prices: {{reason}}",
    packs: "Ticket packs",
    pack_one: "{{count}} ticket",
    pack_other: "{{count}} tickets",
    discount: "−{{percent}}%",
    /** The struck-through price before the discount. */
    was: "was {{price}}",
    pay: "Pay",
    payPrice: "Pay {{price}}",
    paying: "Paying…",
    notEnoughJpyc: "Not enough JPYC",
    added_one: "{{count}} reserve ticket added",
    added_other: "{{count}} reserve tickets added",
    paid: "Paid {{price}} in JPYC.",
    buyMore: "Buy more tickets",
    paymentFailed: "Payment didn’t go through",
    paidButNotAdded:
      "The payment went through ({{digest}}), but the tickets weren’t added: {{reason}}",
    backToShop: "Back to the shop",
    /** `reason` is Privy's or the signer's own words. */
    walletBroken: "Your Sui wallet isn’t working ({{reason}}).",
    walletSignInFailed: "Your wallet didn’t sign in ({{reason}}).",
    walletNeedsLine: "Paying needs LINE’s sign-in, which LIFF Mock skips.",
  },
} as const;
