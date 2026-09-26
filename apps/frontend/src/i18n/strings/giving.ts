import type { Section } from "../catalog";

export const giving = {
  tag: {
    /** The gift tag's small label over the giver's handle, on the gift bag in Giving and in the gift a recipient opens, and before the handle in the Gift Message sent through LINE ("From @alice") */
    from: { en: "From", ja: "贈り主" },
    /** The gift tag's small label over the recipient's handle, for a gift given to someone chosen in the app ("For @bob"); no screen names a recipient yet, so it isn't shown */
    for: { en: "For", ja: "贈り先" },
  },
  /** Giving's "Not sent yet" screen: the reason in “couldn’t be packed” when the chain didn't confirm the sticker's move into the gift bag in time; Send in LINE checks again */
  depositUnconfirmed: {
    en: "The Sticker transfer could not be confirmed. Tap Send in LINE to check the gift again.",
    ja: "シールの転送を確認できませんでした。LINEで送るをタップしてギフトの状態を再確認してください。",
  },
  /** Giving's "Not sent yet" screen: the reason in “couldn’t be taken out” when the chain didn't confirm the sticker left the gift bag in time */
  takeOutUnconfirmed: {
    en: "Taking out the Sticker could not be confirmed. Check the gift in the app before trying again.",
    ja: "シールを取り出せたか確認できませんでした。再試行する前にアプリでギフトの状態を確認してください。",
  },
  giftMessage: {
    /** The Gift Message sent through LINE: its preview in the recipient's chat list and LINE's notification */
    altText: { en: "{{name}} sent you a sticker", ja: "{{name}}からシールが届きました" },
    /** The Gift Message sent through LINE: the fine print after the sticker's number ("NO.0147 · ONE OF ONE") */
    oneOfOne: { en: "ONE OF ONE", ja: "一点もの" },
    /** The Gift Message sent through LINE: the line under "From @alice", with the sticker's drawing time */
    body: {
      en: "A one-of-one sticker, drawn in {{duration}}. It opens once.",
      ja: "{{duration}}でかいた、一点もののシールです。ひらけるのは一度だけです。",
    },
    /** The Gift Message sent through LINE: its button, which opens the gift in the app */
    open: { en: "Open your gift", ja: "ギフトをひらく" },
  },
  /** Giving's first screen: the sheet's title ("Give No.0147"); and the give sheet's key once a sticker is picked */
  give: { en: "Give {{no}}", ja: "{{no}}を贈る" },
  /** Giving's first screen and the give sheet: the X button's name for assistive tech */
  close: { en: "Close", ja: "閉じる" },
  /** Giving's "Sealed and sent" screen, and the giver's received notice: the button that closes it */
  backToBoard: { en: "Back to my sticker board", ja: "シールボードに戻る" },
  /** Giving from someone else's sticker board: picking one of yours first. */
  giveSheet: {
    /** The give sheet, opened by Give on someone else's sticker board: its title */
    title: { en: "Give {{name}} a sticker", ja: "{{name}}にシールを贈る" },
    /** The give sheet on someone else's sticker board: the line under its title */
    lead: {
      en: "Pick one of yours, then send it to {{name}} in a LINE chat.",
      ja: "あなたのシールを1枚選んで、LINEのトークで{{name}}に送りましょう。",
    },
    /** The give sheet on someone else's sticker board: the name of the grid of your stickers, for assistive tech */
    yourStickers: { en: "Your stickers", ja: "あなたのシール" },
    /** The give sheet on someone else's sticker board: in the grid's place when you have no sticker to give */
    none: {
      en: "You don’t have a sticker to give yet. Draw one on your board first.",
      ja: "贈れるシールがまだありません。まずはシールボードで1枚かいてみましょう。",
    },
    /** The give sheet on someone else's sticker board: an alert when LINE's friend picker can't open there, such as outside LINE */
    noPicker: {
      en: "LINE’s friend picker isn’t available here, so gifts can’t be sent from this screen.",
      ja: "ここではLINEの友だち選択が使えないため、この画面からはギフトを送れません。",
    },
    /** The give sheet on someone else's sticker board: its key, disabled, until you pick a sticker */
    pick: { en: "Pick a sticker", ja: "シールを選ぶ" },
  },
  /** Giving an NSFW sticker, which only adults can receive. */
  nsfw: {
    /** The give sheet on someone else's sticker board, and the offer sheet's swap picker: said by assistive tech on an NSFW sticker that can't be picked because they aren't verified as an adult */
    blocked: {
      en: "for adults only, can’t be given to them",
      ja: "成人向けのため、この人には贈れません",
    },
    /** The give sheet on someone else's sticker board: fine print under the grid when some of your stickers are NSFW and {{name}} isn't verified as an adult */
    adultsOnly: {
      en: "18+ stickers can only go to adults verified with World ID, and {{name}} isn’t.",
      ja: "18+のシールは、World IDで年齢確認済みの成人にだけ贈れます。{{name}}はまだ確認されていません。",
    },
    /** Giving's first screen, for an NSFW sticker: fine print on who can open the gift */
    whoCanOpen: {
      en: "18+ sticker: only an adult verified with World ID can open this gift.",
      ja: "18+のシール：World IDで年齢確認済みの成人だけがこのギフトをひらけます。",
    },
  },
  /** Giving: the sticker's fine print over the sheet, its number, drawing time, seal day and the giver's handle */
  meta: {
    en: "{{no}} · <duration/> · {{day}} · <name/>",
    ja: "{{no}}・<duration/>・{{day}}・<name/>",
  },
  /** Giving's first screen: how the sticker goes out. */
  sheet: {
    /** Giving's first screen: the bold title of the aqua row that packs the sticker and opens LINE's friend picker */
    sendInChat: { en: "Send in a LINE chat", ja: "LINEのトークで送る" },
    /** Giving's first screen: the small line under "Send in a LINE chat" */
    sendInChatHint: {
      en: "Pick your chat with them. The first to open it gets it.",
      ja: "相手とのトークを選んでください。最初にひらいた人が受け取れます。",
    },
    /** Giving's first screen: the note at the bottom, beside a sticker icon */
    leaves: {
      en: "It comes off your board and into a gift bag.",
      ja: "シールはボードからはがれて、ギフト袋に入ります。",
    },
  },
  /** "Can’t find them?", in the give sheet's place: for a friend LINE's picker leaves out. */
  cantFind: {
    /** Giving's first screen: the quiet link under "Send in a LINE chat"; and the title of the screen it opens in the sheet */
    title: { en: "Can’t find them?", ja: "相手が見つからない？" },
    /** Giving's "Can't find them?" screen: the back arrow's name for assistive tech */
    back: { en: "Back", ja: "戻る" },
    /** Giving's "Can't find them?" screen: the line under its title, on who LINE's friend picker leaves out */
    lead: {
      en: "LINE’s list leaves out anyone who turned off sharing with apps, and friends you added in the last few minutes.",
      ja: "LINEの一覧には、アプリとの共有をオフにしている人と、ここ数分で追加した友だちは表示されません。",
    },
    /** Giving's "Can't find them?" screen: the bold title of the row that opens LINE's Add friends screen */
    notFriends: { en: "Not friends in LINE yet?", ja: "まだLINEの友だちではない？" },
    /** Giving's "Can't find them?" screen: the small line under "Not friends in LINE yet?" */
    notFriendsHint: {
      en: "Add them in LINE first and say hi. Then come back and pick them.",
      ja: "まずLINEで友だちに追加して、あいさつしましょう。それから戻って選んでください。",
    },
    /** Giving's "Can't find them?" screen: an alert when tapping "Not friends in LINE yet?" fails to open LINE's Add friends screen */
    addFriendsDidntOpen: {
      en: "LINE’s Add friends screen didn’t open: {{reason}}",
      ja: "LINEの友だち追加画面がひらきませんでした：{{reason}}",
    },
  },
  preparing: {
    /** Giving, while the sticker's transfer is being confirmed before LINE's friend picker opens: the sheet's title */
    title: { en: "Preparing your gift", ja: "ギフトを準備中" },
    /** Giving, before LINE's friend picker opens: explains wallet confirmation and that the gift has not been sent */
    lead: {
      en: "Confirm in your wallet if asked, then wait for your sticker to be ready. LINE’s friend picker will open next; your gift hasn’t been sent yet.",
      ja: "ウォレットで確認を求められたら、承認してシールの準備ができるまでお待ちください。次にLINEの友だち選択がひらきます。ギフトはまだ送られていません。",
    },
    /** Giving, while the sticker is being prepared: the disabled send button */
    button: { en: "Preparing…", ja: "準備中…" },
  },
  /** The sticker in the open bag, until it's sent or taken out. */
  inTheBag: {
    /** Giving, once the sticker drops into the open gift bag: the sheet's title while LINE's friend picker opens and is up */
    title: { en: "In the bag", ja: "ギフト袋に入れました" },
    /** Giving, with the sticker in the open gift bag: the line under "In the bag" */
    lead: {
      en: "It seals when it’s sent. Pick your chat with them in LINE: whoever opens it first gets it.",
      ja: "送ると袋に封がされます。LINEで相手とのトークを選んでください。最初にひらいた人が受け取れます。",
    },
    /** Giving, after LINE's friend picker closed without sending, or a step failed: the sheet's title over the open gift bag */
    notSent: { en: "Not sent yet", ja: "まだ送っていません" },
    /** Giving's "Not sent yet" screen: the line under its title */
    notSentLead: {
      en: "It’s still in the bag, unsealed. Pick a chat again, or take it out.",
      ja: "封をしないまま、まだ袋の中にあります。もう一度トークを選ぶか、取り出してください。",
    },
    /** Giving, with the sticker in the open gift bag: the aqua key that opens LINE's friend picker (again) */
    send: { en: "Send in LINE", ja: "LINEで送る" },
    /** Giving, with the sticker in the open gift bag: the quiet link under Send in LINE that lifts it back out, back to the first screen */
    takeOut: { en: "Take it out", ja: "取り出す" },
    /** Giving's "Not sent yet" screen: an alert when the app's server couldn't pack the gift, with why */
    couldntPack: {
      en: "{{no}} couldn’t be packed: {{reason}}",
      ja: "{{no}}をギフト袋に入れられませんでした：{{reason}}",
    },
    /** Giving's "Not sent yet" screen: an alert when LINE's friend picker failed to send the Gift Message, with why */
    wasntSent: { en: "{{no}} wasn’t sent: {{reason}}", ja: "{{no}}を送れませんでした：{{reason}}" },
    /** Giving's "Not sent yet" screen: an alert when Take it out failed, with why */
    couldntTakeOut: {
      en: "{{no}} couldn’t be taken out: {{reason}}",
      ja: "{{no}}を取り出せませんでした：{{reason}}",
    },
    /** Giving's "Not sent yet" screen: an alert when the app's server couldn't record a cancelled or failed send, with why */
    couldntRecord: {
      en: "The app’s server couldn’t record that: {{reason}}",
      ja: "アプリのサーバーに記録できませんでした：{{reason}}",
    },
  },
  sent: {
    /** Giving, once the Gift Message went out through LINE: the title under the gift bag as it seals */
    title: { en: "Sealed and sent", ja: "封をして送りました" },
    /** Giving's "Sealed and sent" screen: the line under its title */
    lead: {
      en: "It’s in your LINE chat now, and the gift message opens once. When they receive it, you’ll see who did.",
      ja: "ギフトメッセージをLINEのトークに送りました。ひらけるのは一度だけです。受け取られたら、誰が受け取ったかがわかります。",
    },
    /** Giving's "Sealed and sent" screen: an alert when the Gift Message went out but the app's server couldn't record it, with why */
    couldntRecord: {
      en: "It went out in LINE, but the app’s server couldn’t record it: {{reason}}",
      ja: "LINEでは送れましたが、アプリのサーバーに記録できませんでした：{{reason}}",
    },
  },
  /** The frosted gift bag. */
  giftBag: {
    /** Names the bag's picture for assistive tech, by its state. */
    pictured: {
      /** The gift bag's picture named for assistive tech: in Giving, with the sticker in the open bag */
      open: { en: "The sticker in an open gift bag", ja: "口のあいたギフト袋に入ったシール" },
      /** The gift bag's picture named for assistive tech, sealed: Giving's "Sealed and sent" screen, and a gift that can't be received yet or here */
      sealed: { en: "The gift bag, sealed", ja: "封をしたギフト袋" },
      /** The gift bag's picture named for assistive tech: in the gift a recipient opens, once they've torn it open */
      torn: { en: "The gift bag, torn open", ja: "破ってひらいたギフト袋" },
      /** The gift bag's picture named for assistive tech: a gift that can't be received because it was already opened, taken back or returned */
      opened: { en: "The gift bag, open and empty", ja: "口があいて空になったギフト袋" },
    },
    /** The gift bag's picture named for assistive tech, for an NSFW sticker's pink bag: {{pictured}} is the bag's state, as above */
    nsfw: { en: "{{pictured}}, pink, marked 18+", ja: "{{pictured}}（ピンク、18+）" },
    /** The gift bag's picture named for assistive tech, with its tag's words after the bag's ("…, tagged From @alice") */
    tagged: {
      en: "{{pictured}}, tagged {{label}} {{name}}",
      ja: "{{pictured}}、タグに「{{label}} {{name}}」",
    },
    /** The gift bag's picture named for assistive tech, with its tag's words and the rubber stamp on the tag, on a gift that can't be received */
    taggedAndStamped: {
      en: "{{pictured}}, tagged {{label}} {{name}}, stamped {{stamp}}",
      ja: "{{pictured}}、タグに「{{label}} {{name}}」、はんこに「{{stamp}}」",
    },
    /** The gift bag: printed again and again along the aqua tear tape, with the day it was sealed ("SEALED 9.23") */
    sealed: { en: "<b>Sealed</b> {{date}}", ja: "<b>封印</b>{{date}}" },
    /** The gift a recipient opens: the pull tab's name for assistive tech, as a slider */
    pullTab: { en: "Pull the tab to open the gift", ja: "つまみを引いてギフトをひらく" },
    /** The gift bag: printed on the pull tab, beside its grip ribs */
    pull: { en: "Pull", ja: "引く" },
    /** The rubber stamps inked on the tag, by stamp: big words, some under a small line. */
    stamps: {
      "one-to-one": {
        /** The rubber stamp on the tag of a gift opened in a group chat: its small top line, over "1:1 chat" */
        small: { en: "Opens only in", ja: "ひらけるのは" },
        /** The rubber stamp on the tag of a gift opened in a group chat: its big words, under "Opens only in" */
        big: { en: "1:1 chat", ja: "1:1トーク" },
      },
      opened: {
        /** The rubber stamp on the tag of a gift someone already opened */
        big: { en: "Opened", ja: "開封済み" },
      },
      "taken-back": {
        /** The rubber stamp on the tag of a gift its giver took back before anyone received it */
        big: { en: "Taken back", ja: "取り消し" },
      },
      returned: {
        /** The rubber stamp on the tag of a gift that went back to its giver, unopened in time */
        big: { en: "Returned", ja: "返送済み" },
      },
      "adults-only": {
        /** The rubber stamp on the tag of an NSFW sticker's gift, opened by someone not verified as an adult */
        big: { en: "18+ only", ja: "18歳以上" },
      },
    },
  },
  /** The giver's moment once a gift is received. */
  receivedNotice: {
    /** The giver's received notice, over the whole phone on their sticker board once someone received their gift: its title */
    title: {
      en: "{{name}} received your sticker ♡",
      ja: "{{name}}があなたのシールを受け取りました♡",
    },
    /** The giver's received notice: the line under its title */
    lead: {
      en: "It’s on {{name}}’s sticker board now.",
      ja: "いまは{{name}}のシールボードにあります。",
    },
    /** The giver's received notice: the caption beside the sticker's silhouette, the receiver and the day they received it */
    caption: { en: "{{name}} · {{date}}", ja: "{{name}}・{{date}}" },
  },
  /** Your gifts on their way, in clear film. */
  pendingGifts: {
    /** The pending gifts badge on your own sticker board: its fine print, with one gift sent and not yet received */
    onTheirWay_one: { en: "On its way" },
    /** The pending gifts badge on your own sticker board: its fine print, with gifts sent and not yet received */
    onTheirWay_other: { en: "On their way", ja: "お届け中" },
    /** The pending gifts badge on your own sticker board: the line under "On their way", the newest gift's number and how many more */
    andMore: { en: "{{no}} and {{count}} more", ja: "{{no}}ほか{{count}}枚" },
    /** The pending gifts badge on your own sticker board: the line under "On its way" naming who one gift waits for: the person picked in the app, or whoever first opened its link */
    to: { en: "to {{name}}", ja: "{{name}}へ" },
    /** Names the badge for assistive tech. */
    label: {
      /** The pending gifts badge on your own sticker board: its name for assistive tech, with one gift on its way */
      one: { en: "Gifts on their way: {{no}}", ja: "お届け中のギフト：{{no}}" },
      /** The pending gifts badge on your own sticker board: its name for assistive tech, with one gift that waits for someone: the person picked in the app, or whoever first opened its link */
      oneTo: {
        en: "Gifts on their way: {{no}} to {{name}}",
        ja: "お届け中のギフト：{{name}}への{{no}}",
      },
      /** The pending gifts badge on your own sticker board: its name for assistive tech, with several gifts on their way */
      several: { en: "{{count}} gifts on their way", ja: "お届け中のギフト：{{count}}件" },
    },
  },
} as const satisfies Section;
