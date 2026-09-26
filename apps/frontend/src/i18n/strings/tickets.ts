import type { Section } from "../catalog";

export const tickets = {
  /** Ticket marks on the Draw keys, the ticket cards and the sealed card: how many of that kind are left, printed after the mark */
  count: { en: "×{{count}}", ja: "×{{count}}" },
  /** Both counts in words, for screen readers: "2 daily tickets and 5 reserve tickets". */
  summary: {
    /** Screen-reader name of a Draw key (sticker board, refilled out-of-tickets card, ticket shop after a purchase): joins the two ticket counts */
    dailyAndReserve: { en: "{{daily}} and {{reserve}}", ja: "{{daily}}と{{reserve}}" },
    /** Screen-reader name of a Draw key: the daily ticket count, when one is left */
    daily_one: { en: "{{count}} daily ticket" },
    /** Screen-reader name of a Draw key: the daily ticket count */
    daily_other: { en: "{{count}} daily tickets", ja: "無償チケット{{count}}枚" },
    /** Screen-reader name of a Draw key: the reserve ticket count, when one is left */
    reserve_one: { en: "{{count}} reserve ticket" },
    /** Screen-reader name of a Draw key: the reserve ticket count */
    reserve_other: { en: "{{count}} reserve tickets", ja: "有償チケット{{count}}枚" },
  },
  /** How long until the refill, in whole minutes rounded down. */
  refillIn: {
    /** Out-of-tickets card: the countdown after the refill time, in the last minute before new daily tickets arrive */
    underAMinute: { en: "in under a minute", ja: "まもなく" },
    /** Out-of-tickets card: the countdown after the refill time, such as "in 6h 56m" */
    hoursAndMinutes: { en: "in {{hours}}h {{minutes}}m", ja: "あと{{hours}}時間{{minutes}}分" },
    /** Out-of-tickets card: the countdown after the refill time, on the hour, such as "in 6h" */
    hours: { en: "in {{hours}}h", ja: "あと{{hours}}時間" },
    /** Out-of-tickets card: the countdown after the refill time, in the last hour, such as "in 42m" */
    minutes: { en: "in {{minutes}}m", ja: "あと{{minutes}}分" },
  },
  /** Start card and out-of-tickets card: the small label beside the reserve ticket count, under the daily ticket stubs */
  reserve: { en: "Reserve", ja: "有償" },
  /** The Draw key on the out-of-tickets card once the refill brings tickets back, and in the ticket shop (card or Shop tab) after a purchase */
  draw: { en: "Draw", ja: "かく" },
  /** Screen-reader name of that Draw key (refilled out-of-tickets card, ticket shop after a purchase); `tickets` is both counts in words */
  drawWithTickets: { en: "Draw: you have {{tickets}}", ja: "かく：{{tickets}}があります" },
  /** Start card when only reserve tickets are left, and the out-of-tickets card: the button under the key that opens the ticket shop */
  shopForTickets: { en: "Shop for tickets", ja: "チケットを買う" },
  /** Out-of-tickets card (the main key, or the button under Draw once refilled) and the card shown while tickets load: goes back to the sticker board */
  goToStickerBoard: { en: "Go to sticker board", ja: "シールボードへ" },
  /** Quiet link at the foot of the start card, the tickets-didn't-load card and the ticket shop's card: closes the card without spending or buying */
  notNow: { en: "Not now", ja: "あとで" },
  /** Key on the card when tickets didn't load, and the link after the ticket shop's balance or price problem: tries again */
  tryAgain: { en: "Try again", ja: "もう一度" },
  /** The card that asks before a ticket is spent on a fresh sheet. */
  startDrawing: {
    /** While there are daily tickets left. */
    daily: {
      /** Start card on the drawing screen, before a fresh sheet, while daily tickets are left: the title asking to spend one */
      title: { en: "Use a ticket to draw?", ja: "チケットを使ってかきますか？" },
      /** Start card, daily ticket variant: the bold line under the title, when one daily ticket is left */
      left_one: { en: "You have {{count}} daily ticket left." },
      /** Start card, daily ticket variant: the bold line under the title saying how many daily tickets are left */
      left_other: {
        en: "You have {{count}} daily tickets left.",
        ja: "無償チケットは残り{{count}}枚です。",
      },
      /** Start card, daily ticket variant: the quiet line after the count, about the drawing timer */
      timer: {
        en: "Your {{minutes}}-minute timer starts with your first stroke.",
        ja: "最初のひと筆で{{minutes}}分のタイマーが始まります。",
      },
      /** Start card, daily ticket variant: the key that spends a daily ticket and opens the sheet */
      start: { en: "Start drawing", ja: "かき始める" },
    },
    /** Once they're used, a reserve ticket is spent only when asked. */
    reserve: {
      /** Start card on the drawing screen once today's daily tickets are used: the title asking before a reserve ticket is spent */
      title: { en: "Use a reserve ticket?", ja: "有償チケットを使いますか？" },
      /** Start card, reserve ticket variant: the bold line under the title, when one reserve ticket is left */
      left_one: { en: "Today’s daily tickets are used. You have {{count}} reserve ticket." },
      /** Start card, reserve ticket variant: the bold line under the title saying the daily tickets are gone and how many reserve tickets are left */
      left_other: {
        en: "Today’s daily tickets are used. You have {{count}} reserve tickets.",
        ja: "今日の無償チケットは使い切りました。有償チケットは{{count}}枚あります。",
      },
      /** Start card, reserve ticket variant: the quiet line after the count, saying when new daily tickets arrive (midnight in Tokyo, in the person's own time) */
      refillAt: {
        en: "New daily tickets at {{time}}.",
        ja: "{{time}}に新しい無償チケットが届きます。",
      },
      /** Start card, reserve ticket variant: the grape key that spends a reserve ticket and opens the sheet */
      use: { en: "Use a reserve ticket", ja: "有償チケットを使う" },
    },
  },
  /** Out of daily and reserve tickets, until the refill turns the card over. */
  outOfTickets: {
    /** Out-of-tickets card on the drawing screen, when both daily and reserve tickets are used up: the title */
    title: { en: "Out of tickets for today", ja: "今日はもうチケットがありません" },
    /** Out-of-tickets card: the line under the title, when new daily tickets arrive (bold) and the countdown to it (quiet) */
    refillLine: {
      en: "<strong>New daily tickets at {{time}},</strong> <countdown>{{countdown}}</countdown>",
      ja: "<strong>{{time}}に新しい無償チケットが届きます</strong><countdown>（{{countdown}}）</countdown>",
    },
    /** Out-of-tickets card: the title once the refill brings tickets back while it's open, as the card turns over */
    refilled: { en: "New tickets are here", ja: "新しいチケットが届きました" },
  },
  /** In the start card's place until your tickets load. */
  notLoaded: {
    /** Drawing screen, in the start card's place: the title while your tickets load */
    checking: { en: "Checking your tickets…", ja: "チケットを確認しています…" },
    /** Drawing screen, in the start card's place: the title when your tickets didn't load, above the reason */
    couldntLoad: { en: "Couldn’t load your tickets", ja: "チケットを読み込めませんでした" },
  },
  shop: {
    /** Ticket shop, as a card over the drawing screen or as the Shop tab: the title */
    title: { en: "Ticket shop", ja: "チケットショップ" },
    /** Ticket shop: the bold line under the title */
    lead: { en: "Reserve tickets never expire.", ja: "有償チケットに有効期限はありません。" },
    /** Ticket shop: the small label on the wallet row, beside your JPYC balance shown in yen */
    balance: { en: "Your JPYC", ja: "JPYC残高" },
    /** Ticket shop: the wallet row while the balance loads */
    readingBalance: { en: "Reading your balance…", ja: "残高を確認しています…" },
    /** Ticket shop: the wallet row when the balance couldn't be read, before a Try again link; `reason` is the wallet's own words */
    balanceProblem: {
      en: "Couldn’t read your balance ({{reason}}).",
      ja: "残高を確認できませんでした（{{reason}}）。",
    },
    /** Ticket shop: in the packs' place while today's prices load */
    gettingPrices: { en: "Getting today’s prices…", ja: "今日の価格を確認しています…" },
    /** Ticket shop: in the packs' place when today's prices couldn't be fetched, before a Try again link */
    pricesProblem: {
      en: "Couldn’t get today’s prices: {{reason}}",
      ja: "今日の価格を確認できませんでした：{{reason}}",
    },
    /** Ticket shop: screen-reader name of the group of pack buttons */
    packs: { en: "Ticket packs", ja: "チケットパック" },
    /** Ticket shop: a pack button's name, for the one-ticket pack */
    pack_one: { en: "{{count}} ticket" },
    /** Ticket shop: a pack button's name, such as "3 tickets" */
    pack_other: { en: "{{count}} tickets", ja: "チケット{{count}}枚" },
    /** Ticket shop: the pink sale sticker on a discounted pack button */
    discount: { en: "−{{percent}}%", ja: "{{percent}}%オフ" },
    /** Ticket shop: screen-reader text for a discounted pack's struck-through full price */
    was: { en: "was {{price}}", ja: "通常価格{{price}}" },
    /** Ticket shop: the grape pay key, before a pack's price is known */
    pay: { en: "Pay", ja: "支払う" },
    /** Ticket shop: the grape pay key, with the chosen pack's price */
    payPrice: { en: "Pay {{price}}", ja: "{{price}}を支払う" },
    /** Ticket shop: the pay key while the payment goes through */
    paying: { en: "Paying…", ja: "支払い中…" },
    /** Ticket shop: the pay key, disabled, when your JPYC is less than the chosen pack's price */
    notEnoughJpyc: { en: "Not enough JPYC", ja: "JPYC残高不足" },
    /** Ticket shop after a purchase: the title, when one reserve ticket was added */
    added_one: { en: "{{count}} reserve ticket added" },
    /** Ticket shop after a purchase: the title saying how many reserve tickets were added */
    added_other: {
      en: "{{count}} reserve tickets added",
      ja: "有償チケットを{{count}}枚追加しました",
    },
    /** Ticket shop after a purchase: the quiet line under the title with the price paid, in yen */
    paid: { en: "Paid {{price}} in JPYC.", ja: "{{price}}をJPYCで支払いました。" },
    /** Ticket shop after a purchase: the button under Draw that goes back to the packs */
    buyMore: { en: "Buy more tickets", ja: "チケットをもっと買う" },
    /** Ticket shop when a payment fails: the title, above the reason */
    paymentFailed: { en: "Payment didn’t go through", ja: "支払いが完了しませんでした" },
    /** Ticket shop when a payment fails after the money moved: the line under the title; `digest` is the transaction's ID, `reason` the error */
    paidButNotAdded: {
      en: "The payment went through ({{digest}}), but the tickets weren’t added: {{reason}}",
      ja: "支払いは完了しました（{{digest}}）が、チケットは追加されませんでした：{{reason}}",
    },
    /** Ticket shop when a payment fails: the key that goes back to the packs */
    backToShop: { en: "Back to the shop", ja: "ショップに戻る" },
    /** Ticket shop: the wallet row, in the balance's place, when your Privy Sui wallet can't be used; `reason` is Privy's or the signer's own words */
    walletBroken: {
      en: "Your Sui wallet isn’t working ({{reason}}).",
      ja: "Suiウォレットが使えません（{{reason}}）。",
    },
    /** Ticket shop: the wallet row, in the balance's place, when the Privy sign-in behind your wallet failed; `reason` is Privy's own words */
    walletSignInFailed: {
      en: "Your wallet didn’t sign in ({{reason}}).",
      ja: "ウォレットにサインインできませんでした（{{reason}}）。",
    },
    /** Ticket shop on the dev server: the wallet row, in the balance's place, when LIFF Mock signed you in, so there's no Privy wallet to pay from */
    walletNeedsLine: {
      en: "Paying needs LINE’s sign-in, which LIFF Mock skips.",
      ja: "支払いにはLINEでのサインインが必要ですが、LIFF Mockでは省略されます。",
    },
  },
} as const satisfies Section;
