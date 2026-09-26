import type { Section } from "../catalog";

export const tickets = {
  /** Beside a ticket mark: how many of that kind are left. */
  count: { en: "×{{count}}" },
  /** Both counts in words, for screen readers: "2 daily tickets and 5 reserve tickets". */
  summary: {
    dailyAndReserve: { en: "{{daily}} and {{reserve}}" },
    daily_one: { en: "{{count}} daily ticket" },
    daily_other: { en: "{{count}} daily tickets" },
    reserve_one: { en: "{{count}} reserve ticket" },
    reserve_other: { en: "{{count}} reserve tickets" },
  },
  /** How long until the refill, in whole minutes rounded down. */
  refillIn: {
    underAMinute: { en: "in under a minute" },
    hoursAndMinutes: { en: "in {{hours}}h {{minutes}}m" },
    hours: { en: "in {{hours}}h" },
    minutes: { en: "in {{minutes}}m" },
  },
  /** Beside the reserve count on the cards. */
  reserve: { en: "Reserve" },
  draw: { en: "Draw" },
  /** The Draw key's name for assistive tech; `tickets` is the summary. */
  drawWithTickets: { en: "Draw: you have {{tickets}}" },
  shopForTickets: { en: "Shop for tickets" },
  goToStickerBoard: { en: "Go to sticker board" },
  notNow: { en: "Not now" },
  tryAgain: { en: "Try again" },
  /** The card that asks before a ticket is spent on a fresh sheet. */
  startDrawing: {
    /** While there are daily tickets left. */
    daily: {
      title: { en: "Use a ticket to draw?" },
      left_one: { en: "You have {{count}} daily ticket left." },
      left_other: { en: "You have {{count}} daily tickets left." },
      timer: { en: "Your {{minutes}}-minute timer starts with your first stroke." },
      start: { en: "Start drawing" },
    },
    /** Once they're used, a reserve ticket is spent only when asked. */
    reserve: {
      title: { en: "Use a reserve ticket?" },
      left_one: { en: "Today’s daily tickets are used. You have {{count}} reserve ticket." },
      left_other: { en: "Today’s daily tickets are used. You have {{count}} reserve tickets." },
      refillAt: { en: "New daily tickets at {{time}}." },
      use: { en: "Use a reserve ticket" },
    },
  },
  /** Out of daily and reserve tickets, until the refill turns the card over. */
  outOfTickets: {
    title: { en: "Out of tickets for today" },
    /** The countdown is the line's quiet half. */
    refillLine: {
      en: "<strong>New daily tickets at {{time}},</strong> <countdown>{{countdown}}</countdown>",
    },
    refilled: { en: "New tickets are here" },
  },
  /** In the start card's place until your tickets load. */
  notLoaded: {
    checking: { en: "Checking your tickets…" },
    couldntLoad: { en: "Couldn’t load your tickets" },
  },
  shop: {
    title: { en: "Ticket shop" },
    lead: { en: "Reserve tickets never expire." },
    balance: { en: "Your JPY" },
    readingBalance: { en: "Reading your balance…" },
    /** `reason` is the wallet's own words. */
    balanceProblem: { en: "Couldn’t read your balance ({{reason}})." },
    gettingPrices: { en: "Getting today’s prices…" },
    pricesProblem: { en: "Couldn’t get today’s prices: {{reason}}" },
    packs: { en: "Ticket packs" },
    pack_one: { en: "{{count}} ticket" },
    pack_other: { en: "{{count}} tickets" },
    discount: { en: "−{{percent}}%" },
    /** The struck-through price before the discount. */
    was: { en: "was {{price}}" },
    pay: { en: "Pay" },
    payPrice: { en: "Pay {{price}}" },
    paying: { en: "Paying…" },
    notEnoughYen: { en: "Not enough yen" },
    added_one: { en: "{{count}} reserve ticket added" },
    added_other: { en: "{{count}} reserve tickets added" },
    paid: { en: "Paid {{price}}." },
    buyMore: { en: "Buy more tickets" },
    paymentFailed: { en: "Payment didn’t go through" },
    paidButNotAdded: {
      en: "The payment went through ({{digest}}), but the tickets weren’t added: {{reason}}",
    },
    backToShop: { en: "Back to the shop" },
  },
} as const satisfies Section;
