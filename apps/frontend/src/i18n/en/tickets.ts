export const tickets = {
  /** On a ticket, or beside one: how many of that kind are left. */
  count: "×{{count}}",
  /**
   * The tickets the next drawing can use, in words for screen readers: "2 daily tickets left", "2 daily tickets and
   * 5 reserve tickets left". A kind with none left isn't named.
   */
  summary: {
    /** `tickets` is one kind's count, such as "2 daily tickets". */
    left: "{{tickets}} left",
    dailyAndReserve: "{{daily}} and {{reserve}} left",
    daily_one: "{{count}} daily ticket",
    daily_other: "{{count}} daily tickets",
    reserve_one: "{{count}} reserve ticket",
    reserve_other: "{{count}} reserve tickets",
    /** Neither kind is left; `time` is when the daily tickets come back, such as "12:00 AM". */
    none: "no tickets until {{time}}",
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
  /** The Draw key's name for assistive tech; `tickets` is the summary, such as "2 daily tickets left". */
  drawWithTickets: "Draw: {{tickets}}",
  /** Opens the reserve ticket checkout. */
  buyReserveTickets: "Buy reserve tickets",
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
    /** Once they're used, a reserve ticket is spent only when asked. The ticket's badge shows the count. */
    reserve: {
      title: "Use a reserve ticket?",
      used: "Today’s daily tickets are used.",
      /** The line's quiet half: when the daily tickets come back. */
      refillAt: "New ones at {{time}}.",
      /** For screen readers, who can't see the count on the ticket's badge. */
      left_one: "You have {{count}} reserve ticket.",
      left_other: "You have {{count}} reserve tickets.",
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
