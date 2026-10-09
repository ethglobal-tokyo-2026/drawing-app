import type { Section } from "../catalog";

export const tickets = {
  /** The tickets behind the board's Draw key, the reserve ticket's dot badge on the ticket cards, and the sealed card's reserve ticket: how many of that kind are left */
  count: { en: "×{{count}}", ja: "×{{count}}" },
  /** The tickets the next drawing can use, in words for screen readers: "2 daily tickets left". A kind with none left isn't named. */
  summary: {
    /** Screen-reader name of a Draw key (sticker board, refilled out-of-tickets card, reserve ticket checkout after a purchase) and of the sealed card's ticket row: one kind's count, such as "2 daily tickets", with what's left */
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
  /** Sticker board, the empty ticket backing behind the Draw key when no tickets of either kind are left, in small capitals: when new daily tickets arrive; {{time}} is the refill time, such as "12:00 AM" */
  newAt: { en: "New at {{time}}", ja: "{{time}}に届く" },
  /** Start card, while daily tickets are left and you hold reserve ones: the small caption after the small reserve ticket and its count, under the daily ticket stubs */
  reserve: { en: "Reserve", ja: "有償" },
  /** The Draw key on the out-of-tickets card once the refill brings tickets back, and in the reserve ticket checkout (card or Shop tab) after a purchase */
  draw: { en: "Draw", ja: "かく" },
  /** Screen-reader name of that Draw key (refilled out-of-tickets card, reserve ticket checkout after a purchase); `tickets` names what's left, such as "2 daily tickets left" */
  drawWithTickets: { en: "Draw: {{tickets}}", ja: "かく：{{tickets}}" },
  /** Start card when only reserve tickets are left, and the out-of-tickets card: the button under the key, with a ticket icon, that opens the reserve ticket checkout */
  buyReserveTickets: { en: "Buy reserve tickets", ja: "有償チケットを買う" },
  /** Quiet link at the foot of the start card, the tickets-didn't-load card and the reserve ticket checkout's card: closes the card without spending or buying */
  notNow: { en: "Not now", ja: "あとで" },
  /** Key on the card when tickets didn't load, and the link after the reserve ticket checkout's balance problem: tries again */
  tryAgain: { en: "Try again", ja: "もう一度" },
  /** The card that asks before a ticket is spent on a fresh sheet. */
  startDrawing: {
    /** While there are daily tickets left. */
    daily: {
      /** Start card on the drawing screen, before a fresh sheet, while daily tickets are left: the title asking to spend one */
      title: { en: "Use a ticket to draw?", ja: "チケットを使ってかきますか？" },
      /** Start card, daily ticket variant: the bold line under the title, when one daily ticket is left */
      left_one: { en: "You have {{count}} daily ticket left." },
      /** Start card, daily ticket variant: the bold line under the title saying how many daily tickets are left; it has a line of its own */
      left_other: {
        en: "You have {{count}} daily tickets left.",
        ja: "無償チケットは<wbr/>残り{{count}}枚です。",
      },
      /** Start card, daily ticket variant: the quiet line under the count, about the drawing timer; "3‑minute" is joined by a non-breaking hyphen (U+2011), so it never breaks at the hyphen */
      timer: {
        en: "Your {{minutes}}‑minute timer starts with your first stroke.",
        ja: "最初のひと筆で<wbr/>{{minutes}}分のタイマーが<wbr/>始まります。",
      },
      /** Start card, daily ticket variant: the key that spends a daily ticket and opens the sheet */
      start: { en: "Start drawing", ja: "かき始める" },
    },
    /** Once they're used, a reserve ticket is spent only when asked. The large reserve ticket's badge shows the count. */
    reserve: {
      /** Start card on the drawing screen once today's daily tickets are used: the title asking before a reserve ticket is spent */
      title: { en: "Use a reserve ticket?", ja: "有償チケットを使いますか？" },
      /** Start card, reserve ticket variant: the bold line under the title saying the daily tickets are gone; it has a line of its own, so keep it short */
      used: {
        en: "Today’s daily tickets are used.",
        ja: "今日の無償チケットは<wbr/>使い切りました。",
      },
      /** Start card, reserve ticket variant: the quiet line under "used", saying when new daily tickets arrive (midnight in Tokyo, in the person's own time) */
      refillAt: { en: "New ones at {{time}}.", ja: "{{time}}に<wbr/>新しく届きます。" },
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
    /** When a ticket couldn't be spent on a fresh sheet, the card stops asking and says why; its key tries again. */
    failed: {
      /** Start card on the drawing screen, when a ticket couldn't be spent on a fresh sheet (Draw, Keep drawing or the card's own key): the title, over the reason in Ink */
      title: { en: "Couldn’t start your sticker", ja: "シールをかき始められませんでした" },
    },
  },
  /** Out of daily and reserve tickets, until the refill turns the card over. */
  outOfTickets: {
    /** Out-of-tickets card on the drawing screen, when both daily and reserve tickets are used up: the title */
    title: { en: "Out of tickets for today", ja: "今日はもう<wbr/>チケットが<wbr/>ありません" },
    /** Out-of-tickets card: the line under the title, when new daily tickets arrive (bold) and the countdown to it (quiet) */
    refillLine: {
      en: "<strong>New daily tickets at {{time}},</strong> <countdown>{{countdown}}</countdown>",
      ja: "<strong>{{time}}に<wbr/>新しい無償チケットが<wbr/>届きます</strong><countdown>（{{countdown}}）</countdown>",
    },
    /** Out-of-tickets card: the title once the refill brings tickets back while it's open, as the card turns over */
    refilled: { en: "New tickets are here", ja: "新しい<wbr/>チケットが<wbr/>届きました" },
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
    /** Reserve ticket checkout: the balance row when the balance couldn't be read, before a Try again link; Sui's own words follow as fine print beside Copy */
    balanceProblem: {
      en: "Couldn’t read your balance.",
      ja: "残高を確認できませんでした。",
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
    /** When your balance is less than the picked pack's price: Pay stays sunk, and a line under the packs says why and what to do. */
    short: {
      /** Reserve ticket checkout, under the packs, when your balance can't cover the picked pack but covers a smaller one: what's wrong in bold, then what to do */
      pickSmaller: {
        en: "<strong>Not enough balance for this pack.</strong> Pick a smaller one, or add JPYC to your Sui account.",
        ja: "<strong>このパックには残高が足りません。</strong>小さいパックを選ぶか、SuiアカウントにJPYCを追加してください。",
      },
      /** Reserve ticket checkout, under the packs, when your balance can't cover even the smallest pack: what's wrong in bold, then what to do */
      addJpyc: {
        en: "<strong>Not enough balance for this pack.</strong> Add JPYC to your Sui account to buy it.",
        ja: "<strong>このパックには残高が足りません。</strong>購入するには、SuiアカウントにJPYCを追加してください。",
      },
    },
    /** Reserve ticket checkout, when your balance is less than the picked pack's price: your Sui address, in place under that line. */
    address: {
      /** Reserve ticket checkout, under the not-enough-balance line: the label that opens your Sui address in place; it reads the same whether open or shut */
      show: { en: "Show my Sui address", ja: "Suiアドレスを表示" },
      /** Reserve ticket checkout, once “Show my Sui address” is open: the line above the address, on where JPYC goes */
      how: {
        en: "To add JPYC, send it to this address on the Sui network.",
        ja: "JPYCを追加するには、Suiネットワークでこのアドレスに送ってください。",
      },
    },
    /** Reserve ticket checkout, after tapping Pay: what the payment in flight waits on, in a line above the Pay key, read aloud as it changes. */
    waiting: {
      /** Reserve ticket checkout, after tapping Pay: while the server starts the purchase, and its payment is built and signed */
      signing: { en: "Signing the payment…", ja: "支払いに署名しています…" },
      /** Reserve ticket checkout, after tapping Pay: while the server runs the signed payment on Sui and adds its tickets */
      adding: { en: "Adding your tickets…", ja: "チケットを追加しています…" },
    },
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
    /** Reserve ticket checkout, under “Payment didn’t go through”: one bold line per known reason, then the device's own words as fine print beside Copy. No JPYC moved in any of them. */
    paymentFailure: {
      /** Reserve ticket checkout, payment failed: when building and signing the payment took too long, so it was never sent */
      timedOut: {
        en: "Signing the payment took too long, so it wasn’t sent. Nothing was paid.",
        ja: "支払いの署名に時間がかかったため、送信されませんでした。支払いは行われていません。",
      },
      /** Reserve ticket checkout, payment failed: for any other reason */
      other: {
        en: "Something went wrong, so nothing was paid. Try again.",
        ja: "問題が発生したため、支払いは行われていません。もう一度お試しください。",
      },
    },
    /** When the answer to a signed payment never came: its key sends the same payment again, which never pays twice, and the server adds a landed payment's tickets by itself too. */
    notAdded: {
      /** Reserve ticket checkout, after paying, when the answer to the signed payment never came: the title */
      title: { en: "Tickets not added yet", ja: "チケットが未追加です" },
      /** Reserve ticket checkout, tickets not added: the line under the title, in bold, then why in quiet type; `reason` is the server's or the device's words for the lost answer */
      line: {
        en: "<strong>Adding the tickets again won’t charge you twice.</strong> <why>{{reason}}</why>",
        ja: "<strong>チケットをもう一度追加しても、二重に請求されることはありません。</strong><why>{{reason}}</why>",
      },
      /** Reserve ticket checkout, tickets not added: the blue key that sends the same signed payment again */
      add: { en: "Add the tickets", ja: "チケットを追加する" },
      /** Reserve ticket checkout, tickets not added: that key while it asks */
      adding: { en: "Adding…", ja: "追加中…" },
    },
    /** Reserve ticket checkout: the key that goes back to the packs when a payment fails, and the quiet link above Not now when its answer never came */
    backToPacks: { en: "Back to the packs", ja: "パック選びに戻る" },
    /** Reserve ticket checkout: the balance row, in the balance's place, when your Sui account can't be used; the signer's own words follow as fine print beside Copy */
    walletBroken: {
      en: "Your Sui account isn’t working.",
      ja: "Suiアカウントが使えません。",
    },
    /** Reserve ticket checkout: the balance row, in the balance's place, when the sign-in behind your Sui account failed; the sign-in's own words follow as fine print beside Copy */
    walletSignInFailed: {
      en: "Couldn’t sign you in to pay.",
      ja: "支払いのためのサインインができませんでした。",
    },
    /** Reserve ticket checkout on the dev server: the balance row, in the balance's place, when LIFF Mock signed you in, so there's no Sui account to pay from */
    walletNeedsLine: {
      en: "Paying needs LINE’s sign-in, which LIFF Mock skips.",
      ja: "支払いにはLINEでのサインインが必要ですが、LIFF Mockでは省略されます。",
    },
  },
  /** Shop, under the reserve tickets, and reserve ticket checkout, under the Pay key: your short Sui address, which opens your ticket purchases read from Sui */
  purchases: {
    /** Shop and reserve ticket checkout: the button that opens your ticket purchases, before your short Sui address */
    label: { en: "Purchases", ja: "購入履歴" },
    /** Shop and reserve ticket checkout, purchases list: screen-reader status while Sui is read */
    reading: {
      en: "Reading your ticket purchases from Sui…",
      ja: "Suiからチケット購入履歴を読み込んでいます…",
    },
    /** Shop and reserve ticket checkout, purchases list: when Sui couldn't be read, before Try again and Sui's own English words for a report */
    problem: {
      en: "Couldn’t read your ticket purchases from Sui.",
      ja: "Suiからチケット購入履歴を読み込めませんでした。",
    },
    /** Shop and reserve ticket checkout, purchases list: when you've never bought a pack */
    none: { en: "No ticket purchases yet.", ja: "チケットの購入履歴はまだありません。" },
    /** Shop and reserve ticket checkout, purchases list: the link under the list that reads the next, older page */
    more: { en: "Older purchases", ja: "以前の購入" },
    /** Shop and reserve ticket checkout, purchases list: read by screen readers only, after what a row shows (the pack, when and its price): where the row goes */
    opensSuiscan: { en: "Opens Suiscan", ja: "Suiscanでひらく" },
  },
} as const satisfies Section;
