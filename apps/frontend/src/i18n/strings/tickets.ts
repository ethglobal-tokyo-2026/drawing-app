import type { Section } from "../catalog";

export const tickets = {
  /** The tickets behind the board's Draw key, the reserve ticket's dot badge on the ticket cards, and the sealed card's reserve ticket: how many of that kind are left */
  count: { en: "×{{count}}", ja: "×{{count}}" },
  /** The tickets the next drawing can use, in words for screen readers: "2 daily tickets left". A kind with none left isn't named. */
  summary: {
    /** Screen-reader name of a Draw key (sticker board, refilled out-of-tickets card, ticket shop after a purchase) and of the sealed card's ticket row: one kind's count, such as "2 daily tickets", with what's left */
    left: { en: "{{tickets}} left", ja: "{{tickets}}が残っています" },
    /** Screen-reader name of a Draw key and of the sealed card's ticket row: both counts, while daily tickets are left and reserve tickets are held */
    dailyAndReserve: {
      en: "{{daily}} and {{reserve}} left",
      ja: "{{daily}}と{{reserve}}が残っています",
    },
    /** Screen-reader name of a Draw key: the daily ticket count, when one is left */
    daily_one: { en: "{{count}} daily ticket" },
    /** Screen-reader name of a Draw key: the daily ticket count */
    daily_other: { en: "{{count}} daily tickets", ja: "無償チケット{{count}}枚" },
    /** Screen-reader name of a Draw key: the reserve ticket count, when one is left */
    reserve_one: { en: "{{count}} reserve ticket" },
    /** Screen-reader name of a Draw key: the reserve ticket count */
    reserve_other: { en: "{{count}} reserve tickets", ja: "有償チケット{{count}}枚" },
    /** Screen-reader name of the board's Draw key and the sealed card's ticket row with no tickets of either kind; {{time}} is when daily tickets refill, such as "12:00 AM" */
    none: { en: "no tickets until {{time}}", ja: "{{time}}までチケットはありません" },
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
  /** Start card, while daily tickets are left and you hold reserve ones: the small caption after the small reserve ticket and its count, under the daily ticket stubs */
  reserve: { en: "Reserve", ja: "有償" },
  /** The Draw key on the out-of-tickets card once the refill brings tickets back, and in the ticket shop (card or Shop tab) after a purchase */
  draw: { en: "Draw", ja: "かく" },
  /** Screen-reader name of that Draw key (refilled out-of-tickets card, ticket shop after a purchase); `tickets` names what's left, such as "2 daily tickets left" */
  drawWithTickets: { en: "Draw: {{tickets}}", ja: "かく：{{tickets}}" },
  /** Start card when only reserve tickets are left, and the out-of-tickets card: the button under the key, with the Shop's tag icon, that opens the reserve ticket checkout */
  buyReserveTickets: { en: "Buy reserve tickets", ja: "有償チケットを買う" },
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
    /** Once they're used, a reserve ticket is spent only when asked. The large reserve ticket's badge shows the count. */
    reserve: {
      /** Start card on the drawing screen once today's daily tickets are used: the title asking before a reserve ticket is spent */
      title: { en: "Use a reserve ticket?", ja: "有償チケットを使いますか？" },
      /** Start card, reserve ticket variant: the bold line under the title saying the daily tickets are gone */
      used: {
        en: "Today’s daily tickets are used.",
        ja: "今日の無償チケットは使い切りました。",
      },
      /** Start card, reserve ticket variant: the quiet line after "used", saying when new daily tickets arrive (midnight in Tokyo, in the person's own time) */
      refillAt: { en: "New ones at {{time}}.", ja: "{{time}}に新しく届きます。" },
      /** Start card, reserve ticket variant: read by screen readers only, since the count is on the ticket's badge (one) */
      left_one: { en: "You have {{count}} reserve ticket." },
      /** Start card, reserve ticket variant: read by screen readers only, since the count is on the ticket's badge */
      left_other: {
        en: "You have {{count}} reserve tickets.",
        ja: "有償チケットは{{count}}枚あります。",
      },
      /** Start card, reserve ticket variant: the blue key that spends a reserve ticket and opens the sheet */
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
  /** The reserve ticket checkout: the card that sells reserve ticket packs. */
  checkout: {
    /** Reserve ticket checkout, over the Shop or the drawing screen: the title, over the packs (over the Shop, its reserve tickets headline shows just above) */
    title: { en: "Pick a pack", ja: "パックを選んでください" },
    /** Reserve ticket checkout: the bold line under the title */
    lead: { en: "Reserve tickets never expire.", ja: "有償チケットに有効期限はありません。" },
    /** Reserve ticket checkout: the small label on the wallet row, beside your balance in yen (the JPYC in your Sui account, never named here) */
    balance: { en: "Balance", ja: "残高" },
    /** Reserve ticket checkout: the wallet row while the balance loads */
    readingBalance: { en: "Reading your balance…", ja: "残高を確認しています…" },
    /** Reserve ticket checkout: the wallet row when the balance couldn't be read, before a Try again link; `reason` is the wallet's own words */
    balanceProblem: {
      en: "Couldn’t read your balance ({{reason}}).",
      ja: "残高を確認できませんでした（{{reason}}）。",
    },
    /** Reserve ticket checkout: in the packs' place while today's prices load */
    gettingPrices: { en: "Getting today’s prices…", ja: "今日の価格を確認しています…" },
    /** Reserve ticket checkout: in the packs' place when today's prices couldn't be fetched, before a Try again link */
    pricesProblem: {
      en: "Couldn’t get today’s prices: {{reason}}",
      ja: "今日の価格を確認できませんでした：{{reason}}",
    },
    /** Reserve ticket checkout: screen-reader name of the group of pack buttons */
    packs: { en: "Ticket packs", ja: "チケットパック" },
    /** Reserve ticket checkout: a pack button's name, for the one-ticket pack */
    pack_one: { en: "{{count}} ticket" },
    /** Reserve ticket checkout: a pack button's name, such as "3 tickets" */
    pack_other: { en: "{{count}} tickets", ja: "チケット{{count}}枚" },
    /** Reserve ticket checkout: a discounted pack button's discount, in fine print before its struck-through full price */
    discount: { en: "−{{percent}}%", ja: "{{percent}}%オフ" },
    /** Reserve ticket checkout: screen-reader text for a discounted pack's struck-through full price */
    was: { en: "was {{price}}", ja: "通常価格{{price}}" },
    /** Reserve ticket checkout: the blue Pay key, before a pack's price is known */
    pay: { en: "Pay", ja: "支払う" },
    /** Reserve ticket checkout: the blue Pay key, with the chosen pack's price */
    payPrice: { en: "Pay {{price}}", ja: "{{price}}を支払う" },
    /** Reserve ticket checkout: the pay key while the payment goes through */
    paying: { en: "Paying…", ja: "支払い中…" },
    /** Reserve ticket checkout: the pay key, disabled, when your JPYC is less than the chosen pack's price */
    notEnoughJpyc: { en: "Not enough JPYC", ja: "JPYC残高不足" },
    /** Reserve ticket checkout after a purchase: the title, when one reserve ticket was added */
    added_one: { en: "{{count}} reserve ticket added" },
    /** Reserve ticket checkout after a purchase: the title saying how many reserve tickets were added */
    added_other: {
      en: "{{count}} reserve tickets added",
      ja: "有償チケットを{{count}}枚追加しました",
    },
    /** Reserve ticket checkout after a purchase: the quiet line under the title with the price paid, in yen */
    paid: { en: "Paid {{price}} in JPYC.", ja: "{{price}}をJPYCで支払いました。" },
    /** Reserve ticket checkout after a purchase: the button under Draw that goes back to the packs */
    buyMore: { en: "Buy more tickets", ja: "チケットをもっと買う" },
    /** Reserve ticket checkout when a payment fails: the title, above the reason */
    paymentFailed: { en: "Payment didn’t go through", ja: "支払いが完了しませんでした" },
    /** Reserve ticket checkout when a payment fails after the money moved: the line under the title; `digest` is the transaction's ID, `reason` the error */
    paidButNotAdded: {
      en: "The payment went through ({{digest}}), but the tickets weren’t added: {{reason}}",
      ja: "支払いは完了しました（{{digest}}）が、チケットは追加されませんでした：{{reason}}",
    },
    /** Reserve ticket checkout when a payment fails: the key that goes back to the packs */
    backToPacks: { en: "Back to the packs", ja: "パック選びに戻る" },
    /** Reserve ticket checkout: the wallet row, in the balance's place, when your Privy Sui wallet can't be used; `reason` is Privy's or the signer's own words */
    walletBroken: {
      en: "Your Sui account isn’t working ({{reason}}).",
      ja: "Suiアカウントが使えません（{{reason}}）。",
    },
    /** Reserve ticket checkout: the wallet row, in the balance's place, when the Privy sign-in behind your wallet failed; `reason` is Privy's own words */
    walletSignInFailed: {
      en: "Couldn’t sign you in to pay ({{reason}}).",
      ja: "支払いのためのサインインができませんでした（{{reason}}）。",
    },
    /** Reserve ticket checkout on the dev server: the wallet row, in the balance's place, when LIFF Mock signed you in, so there's no Privy wallet to pay from */
    walletNeedsLine: {
      en: "Paying needs LINE’s sign-in, which LIFF Mock skips.",
      ja: "支払いにはLINEでのサインインが必要ですが、LIFF Mockでは省略されます。",
    },
    /** Reserve ticket checkout, under the pay key: your ENS name, which opens your ticket purchases read from Sui */
    purchases: {
      /** Reserve ticket checkout: screen-reader name of the ENS name button; `name` is your ENS name or short Sui address */
      show: { en: "Ticket purchases by {{name}}", ja: "{{name}}のチケット購入履歴" },
      /** Reserve ticket checkout, purchases list: screen-reader status while Sui is read */
      reading: {
        en: "Reading your ticket purchases from Sui…",
        ja: "Suiからチケット購入履歴を読み込んでいます…",
      },
      /** Reserve ticket checkout, purchases list: when Sui couldn't be read; `reason` is Sui's own words */
      problem: {
        en: "Couldn’t read your ticket purchases from Sui ({{reason}}).",
        ja: "Suiからチケット購入履歴を読み込めませんでした（{{reason}}）。",
      },
      /** Reserve ticket checkout, purchases list: when you've never bought a pack */
      none: { en: "No ticket purchases yet.", ja: "チケットの購入履歴はまだありません。" },
      /** Reserve ticket checkout, purchases list: the link under the list that reads the next, older page */
      more: { en: "Older purchases", ja: "以前の購入" },
      /** Reserve ticket checkout, purchases list: screen-reader name of a row, which opens it on Suiscan; `digest` is the transaction's ID */
      open: {
        en: "Open the payment {{digest}} on Suiscan",
        ja: "支払い{{digest}}をSuiscanで開く",
      },
    },
  },
} as const satisfies Section;
