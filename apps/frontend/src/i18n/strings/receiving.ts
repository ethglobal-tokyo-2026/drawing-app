import type { Section } from "../catalog";

export const receiving = {
  /** Receive gift dialog, once the gift's preview names the giver: LINE's header and the dialog's name for assistive tech */
  title: { en: "A gift from {{name}}", ja: "{{name}}さんからのギフト" },
  /** Receive gift dialog, while the gift loads, when loading it failed, or on a refusal that came without the giver: LINE's header and the dialog's name for assistive tech */
  title_unknownGiver: { en: "A gift", ja: "ギフト" },
  /** The gift itself: the sealed bag and its pull tab, then the reveal and Accept. */
  gift: {
    /** Receive gift dialog, from the sealed bag through Accept: the heading beside the giver's picture */
    title: { en: "{{name}} sent you a sticker", ja: "{{name}}さんからシールが届きました" },
    /** Receive gift dialog, sealed bag: the two-line hint under the bag, the pull tab first, then the other ways to open it; it fades as the sticker rises */
    pullTabHint: {
      en: "<b>Pull the tab to open it</b><span>or double-tap, or press and hold</span>",
      ja: "<b>つまみを引いてひらいてください</b><span>ダブルタップや長押しでもひらけます</span>",
    },
    /** Receive gift dialog, once the pull tab snaps and the sticker rises: the Accept sheet's name for assistive tech, also read in its perforation's Close name */
    acceptSheet: { en: "Accept this sticker", ja: "このシールを受け取る" },
    /** Receive gift dialog, Accept sheet: the first line, naming the person opening the gift in bold */
    forYou: { en: "This sticker is for you, <name/>.", ja: "<name/>さんへのシールです。" },
    /** Receive gift dialog, Accept sheet: the fine print under the first line, with the sticker's number, drawing time, seal day and Original Artist */
    finePrint: {
      en: "{{no}} · <duration/> · {{day}} · by <artist/>",
      ja: "{{no}}・<duration/>・{{day}}・作者：<artist/>",
    },
    /** Receive gift dialog, Accept sheet, after tapping Accept fails: the alert above Accept, with the reason */
    notReceived: {
      en: "{{no}} wasn’t received. {{reason}} Tap Accept to try again.",
      ja: "{{no}}を受け取れませんでした。{{reason}}「受け取る」をタップして、もう一度お試しください。",
    },
    /** Receive gift dialog, Accept sheet: the main key, which receives the sticker */
    accept: { en: "Accept", ja: "受け取る" },
    /** Receive gift dialog, Accept sheet, after tapping Accept: the key's label while the sticker is being received */
    accepting: { en: "Accepting…", ja: "受け取り中…" },
    /** Receive gift dialog, Accept sheet: the quiet link under Accept that closes the dialog without receiving */
    notNow: { en: "Not now", ja: "あとで" },
  },
  /** Receive gift dialog, Accept sheet: the small line at the bottom, naming the giver, with links to the Terms and Privacy Policy pages */
  termsLine: {
    en: "Receiving it shows <name/> your LINE name and picture. You agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.",
    ja: "受け取ると、<name/>さんにあなたのLINEの名前とプロフィール画像が表示され、<terms>利用規約</terms>と<privacy>プライバシーポリシー</privacy>に同意したことになります。",
  },
  /**
   * A gift that can't be received here: a title and one line, by refusal. The `_unknownGiver`
   * text is for a refusal that came without the giver, so it says "the giver".
   */
  refusals: {
    adultsOnly: {
      /** Gift refusal screen, when the gift holds an NSFW sticker and you aren't verified as an adult: the title */
      title: { en: "This gift is for adults", ja: "このギフトは成人向けです" },
      /** Gift refusal screen, when the gift holds an NSFW sticker and you aren't verified as an adult: the line under the title; {{name}} is the giver */
      line: {
        en: "{{name}} sent an 18+ sticker. Only adults verified with World ID can open it.",
        ja: "{{name}}さんが18+のシールを送りました。World IDで年齢確認済みの成人だけがひらけます。",
      },
      /** Gift refusal screen, for an NSFW sticker, when the refusal came without the giver: the line under the title */
      line_unknownGiver: {
        en: "This is an 18+ sticker. Only adults verified with World ID can open it.",
        ja: "18+のシールです。World IDで年齢確認済みの成人だけがひらけます。",
      },
    },
    groupChat: {
      /** Gift refusal screen, when the gift message was opened in a group chat: the title */
      title: {
        en: "Open this in your chat with {{name}}",
        ja: "{{name}}さんとのトークでひらいてください",
      },
      /** Gift refusal screen, when the gift message was opened in a group chat and the refusal came without the giver: the title */
      title_unknownGiver: {
        en: "Open this in your chat with the giver",
        ja: "贈り主とのトークでひらいてください",
      },
      /** Gift refusal screen, when the gift message was opened in a group chat: the line under the title */
      line: {
        en: "Gifts open only in the private chat they were sent to. If {{name}} sent it to you, open it there.",
        ja: "ギフトは、送られてきた1対1のトークでしかひらけません。{{name}}さんからあなたに届いたギフトなら、そのトークでひらいてください。",
      },
      /** Gift refusal screen, when the gift message was opened in a group chat and the refusal came without the giver: the line under the title */
      line_unknownGiver: {
        en: "Gifts open only in the private chat they were sent to. If the giver sent it to you, open it there.",
        ja: "ギフトは、送られてきた1対1のトークでしかひらけません。贈り主からあなたに届いたギフトなら、そのトークでひらいてください。",
      },
    },
    /** Never who received it: anyone holding a forwarded link would see. */
    alreadyReceived: {
      /** Gift refusal screen, when the gift was already received: the title, over the open, empty bag */
      title: { en: "Already opened", ja: "開封済み" },
      /** Gift refusal screen, when the gift was already received: the line under the title */
      line: {
        en: "Each gift message opens once. If it was you, the sticker’s on your sticker board.",
        ja: "ギフトメッセージをひらけるのは一度だけです。あなたがひらいたなら、シールはシールボードにあります。",
      },
    },
    ownGift: {
      /** Gift refusal screen, when the giver opens their own gift message: the title */
      title: { en: "This gift is on its way", ja: "このギフトはお届け中です" },
      /** Gift refusal screen, when the giver opens their own gift message: the line under the title */
      line: {
        en: "Only the friend you sent it to can open it.",
        ja: "ひらけるのは、贈り先の友だちだけです。",
      },
    },
    takenBack: {
      /** Gift refusal screen, when the giver took the gift back before anyone received it: the title */
      title: { en: "{{name}} took this one back", ja: "{{name}}さんがこのギフトを取り消しました" },
      /** Gift refusal screen, when the giver took the gift back and the refusal came without the giver: the title */
      title_unknownGiver: {
        en: "The giver took this one back",
        ja: "贈り主がこのギフトを取り消しました",
      },
      /** Gift refusal screen, when the giver took the gift back before anyone received it: the line under the title */
      line: {
        en: "It went back to their sticker board before anyone received it.",
        ja: "だれかが受け取る前に、シールは贈り主のシールボードに戻りました。",
      },
    },
    /** Returned, or expired: either way it's back with the giver. */
    giftReturned: {
      /** Gift refusal screen, when the gift was returned or expired unopened: the title */
      title: { en: "This one went back to {{name}}", ja: "このギフトは{{name}}さんに戻りました" },
      /** Gift refusal screen, when the gift was returned or expired and the refusal came without the giver: the title */
      title_unknownGiver: {
        en: "This one went back to the giver",
        ja: "このギフトは贈り主に戻りました",
      },
      /** Gift refusal screen, when the gift was returned or expired unopened: the line under the title */
      line: {
        en: "Gifts wait a week. This one wasn’t opened in time, so it’s back on their sticker board.",
        ja: "ギフトの受け取り期限は1週間です。期限内にひらかれなかったので、シールは贈り主のシールボードに戻りました。",
      },
    },
    notDeposited: {
      /** Gift refusal screen, when the gift hasn't reached the escrow yet: the title, above Try again */
      title: { en: "Almost here", ja: "もうすぐ届きます" },
      /** Gift refusal screen, when the gift hasn't reached the escrow yet: the line under the title */
      line: {
        en: "This gift is still on its way. Try again in a few seconds.",
        ja: "このギフトはまだお届け中です。数秒後にもう一度お試しください。",
      },
    },
    giftNotFound: {
      /** Gift refusal screen, when the link's Gift Claim Token matches no gift: the title */
      title: { en: "This link doesn’t open a gift", ja: "このリンクではギフトをひらけません" },
      /** Gift refusal screen, when the link's Gift Claim Token matches no gift: the line under the title */
      line: {
        en: "Open it again from the gift message in your chat.",
        ja: "トークのギフトメッセージから、もう一度ひらいてください。",
      },
    },
    needsServer: {
      /** Gift refusal screen, when the app is running without its server: the title */
      title: { en: "Gifts can’t be opened yet", ja: "ギフトはまだひらけません" },
      /** Gift refusal screen, when the app is running without its server: the line under the title */
      line: {
        en: "Opening a gift needs the app’s server, which isn’t running yet.",
        ja: "ギフトをひらくにはアプリのサーバーが必要ですが、まだ動いていません。",
      },
    },
  },
  /** A preview that failed, and the line for a preview that came back without what it needed. */
  previewFailed: {
    /** Gift refusal screen, when loading the gift's preview failed: the title, above Try again */
    title: { en: "Couldn’t open the gift", ja: "ギフトをひらけませんでした" },
    /** Gift refusal screen, when the preview says the gift can be received but has no sticker: the line under the title */
    withoutSticker: {
      en: "The gift's preview came without its sticker.",
      ja: "ギフトのプレビューにシールが含まれていませんでした。",
    },
    /** Gift refusal screen, when the preview says the gift can't be received but gives no reason: the line under the title */
    withoutRefusal: {
      en: "The gift's preview refused it without saying why.",
      ja: "ギフトを受け取れない理由が、プレビューに含まれていませんでした。",
    },
  },
  /** Gift refusal screen, inside LINE's app: the button that closes LINE's window, or the quiet link under Try again */
  backToLine: { en: "Back to LINE", ja: "LINEに戻る" },
  /** Gift refusal screen: the button when the gift was already received or is your own; outside LINE's app, also in Back to LINE's place */
  goToStickerBoard: { en: "Go to my sticker board", ja: "自分のシールボードへ" },
  /** Gift refusal screen, when the gift is still on its way or its preview failed: the button that loads the gift again */
  tryAgain: { en: "Try again", ja: "もう一度" },
  /** Asks, once a received sticker is on the board, whether to send its giver gratitude now. */
  sendGratitude: {
    /** Send gratitude sheet, over the sticker board once a received sticker has stuck to it: the title beside the giver's picture, also the sheet's name */
    title: { en: "Send {{name}} gratitude?", ja: "{{name}}さんに感謝を送りますか？" },
    /** Send gratitude sheet, when the giver isn't the sticker's Original Artist: the line under the title */
    line: {
      en: "It’s on your board, from {{name}}. Gratitude never expires.",
      ja: "{{name}}さんからのシールが、シールボードに貼られました。感謝はいつでも送れます。",
    },
    /** Send gratitude sheet, when the giver is the sticker's Original Artist: the line under the title, with their drawing time */
    lineFromOriginalArtist: {
      en: "It’s on your board. <name/> drew it in <duration/>, and gratitude never expires.",
      ja: "シールボードに貼られました。<name/>さんが<duration/>でかいたシールです。感謝はいつでも送れます。",
    },
    /** Send gratitude sheet: the pink key that starts the Gratitude Mini-game for the giver */
    send: { en: "Send gratitude", ja: "感謝を送る" },
    /** Send gratitude sheet: the quiet link under Send gratitude, which closes the sheet without sending gratitude */
    later: { en: "Later", ja: "あとで" },
  },
  /** The badge on your own sticker board for gifts waiting for you, newest first. */
  giftsForYou: {
    /** Gifts for you badge on your own sticker board: its first line, with one gift waiting */
    title_one: { en: "A gift for you" },
    /** Gifts for you badge on your own sticker board: its first line, with gifts waiting */
    title_other: { en: "{{count}} gifts for you", ja: "ギフトが{{count}}件" },
    /** Gifts for you badge on your own sticker board: the line under the title, naming who sent the newest gift; <name/> is their handle, which keeps its own case in the capitals */
    from: { en: "from <name/>", ja: "<name/>さんから" },
    /** Gifts for you badge on your own sticker board: the line under the title, naming the newest gift's sender and how many more are waiting; <name/> is their handle, which keeps its own case in the capitals */
    fromAndMore: { en: "from <name/> and {{count}} more", ja: "<name/>さんほか{{count}}件" },
    /** Gifts for you badge on your own sticker board: its name for assistive tech, tapping it opens the newest gift */
    label_one: { en: "A gift for you from {{name}}. Open it" },
    /** Gifts for you badge on your own sticker board: its name for assistive tech with several gifts, tapping it opens the newest */
    label_other: {
      en: "{{count}} gifts for you. Open the newest, from {{name}}",
      ja: "ギフトが{{count}}件。{{name}}さんからの最新のギフトをひらく",
    },
  },
} as const satisfies Section;
