import type { Section } from "../catalog";

export const giving = {
  tag: {
    /** The gift tag's small label over the giver's handle, on the gift bag in Giving and in the gift a recipient opens, and before the handle in the Gift Message sent through LINE ("From @alice") */
    from: { en: "From", ja: "贈り主" },
    /** The gift tag's small label over the recipient's handle, on the gift bag in Giving when the giver picked the person from their sticker board ("For @bob") */
    for: { en: "For", ja: "贈り先" },
  },
  /** Why a packed gift can't go out, by cause: the reason in “couldn’t be packed” on Giving's “Not sent yet” screen, with the developer's English detail after it in brackets */
  transferProblem: {
    /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the gift has no link to send; taking the sticker out and giving it again makes a new one */
    no_link: {
      en: "This gift came without a link to send. Take the sticker out, then give it again.",
      ja: "このギフトには送るためのリンクがありませんでした。シールを取り出してから、もう一度贈ってください。",
    },
  },
  giftMessage: {
    /** The Gift Message sent through LINE: its preview in the recipient's chat list and LINE's notification */
    altText: { en: "{{name}} sent you a sticker", ja: "{{name}}さんからシールが届きました" },
    /** The Gift Message sent through LINE: the fine print after the sticker's number ("NO.0147 · ONE OF A KIND") */
    oneOfAKind: { en: "ONE OF A KIND", ja: "一点もの" },
    /** The Gift Message sent through LINE: the line under "From @alice", with the sticker's drawing time */
    body: {
      en: "A one-of-a-kind sticker, drawn in {{duration}}. It opens once.",
      ja: "{{duration}}でかいた、一点もののシールです。ひらけるのは一度だけです。",
    },
    /** The Gift Message sent through LINE: its button, which opens the gift in the app */
    open: { en: "Open your gift", ja: "ギフトをひらく" },
  },
  /** Giving's first screen: the sheet's title ("Give No.0147"); and the give sheet's key once a sticker is picked */
  give: { en: "Give {{no}}", ja: "{{no}}を贈る" },
  /** Giving's first screen and the give sheet: the X button's name for assistive tech */
  close: { en: "Close", ja: "閉じる" },
  /** Giving from someone else's sticker board: picking one of yours first. */
  giveSheet: {
    /** The give sheet, opened by Give on someone else's sticker board: its title */
    title: { en: "Give {{name}} a sticker", ja: "{{name}}さんにシールを贈る" },
    /** The give sheet on someone else's sticker board: the name of the grid of your stickers, for assistive tech */
    yourStickers: { en: "Your stickers", ja: "あなたのシール" },
    /** The give sheet on someone else's sticker board: in the grid's place when you have no sticker to give */
    none: {
      en: "You don’t have a sticker to give yet. Draw one on your board first.",
      ja: "贈れるシールが<wbr/>まだ<wbr/>ありません。<wbr/>まずは<wbr/>シールボードで<wbr/>1枚<wbr/>かいてみましょう。",
    },
    /** The give sheet on someone else's sticker board: an alert when LINE's friend picker can't open there, such as outside LINE */
    noPicker: {
      en: "LINE’s friend picker isn’t available here, so gifts can’t be sent from this screen.",
      ja: "ここではLINEの友だち選択が使えないため、この画面からはギフトを送れません。",
    },
    /** The give sheet on someone else's sticker board: its key, disabled, until you pick a sticker */
    pick: { en: "Pick a sticker", ja: "シールを選ぶ" },
  },
  /** Giving an NSFW sticker, which only someone with Show 18+ stickers on can receive. */
  nsfw: {
    /** The give sheet on someone else's sticker board: said by assistive tech on an NSFW sticker that can't be picked because they haven't turned on Show 18+ stickers */
    blocked: {
      en: "18+, can’t be given to them",
      ja: "18+のため、この人には贈れません",
    },
    /** The give sheet on someone else's sticker board: fine print under the grid when some of your stickers are NSFW and <name/> hasn't turned on Show 18+ stickers; <name/> is their handle, which keeps its own case in the capitals */
    notOptedIn: {
      en: "18+ stickers only go to people who turned on Show 18+ stickers, and <name/> hasn’t.",
      ja: "18+のシールは、<wbr/>「18+のシールを表示する」を<wbr/>オンにした人にだけ<wbr/>贈れます。<wbr/><name/>さんは<wbr/>オンにしていません。",
    },
    /** Giving's first screen, for an NSFW sticker: fine print on who can open the gift */
    whoCanOpen: {
      en: "18+ sticker: only someone who turned on Show 18+ stickers can open this gift.",
      ja: "18+のシール：<wbr/>「18+のシールを表示する」を<wbr/>オンにした人だけが<wbr/>このギフトを<wbr/>ひらけます。",
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
      ja: "LINEの一覧には、<wbr/>アプリとの<wbr/>共有を<wbr/>オフにしている人と、<wbr/>ここ数分で<wbr/>追加した友だちは<wbr/>表示されません。",
    },
    /** Giving's "Can't find them?" screen: the bold title of the row that opens LINE's Add friends screen */
    notFriends: { en: "Not friends in LINE yet?", ja: "まだLINEの友だちではない？" },
    /** Giving's "Can't find them?" screen: the small line under "Not friends in LINE yet?" */
    notFriendsHint: {
      en: "Add them in LINE first and say hi. Then come back and pick them.",
      ja: "まずLINEで友だちに追加して、あいさつしましょう。それから戻って選んでください。",
    },
    /** Giving's "Can't find them?" screen: an alert when tapping "Not friends in LINE yet?" fails to open LINE's Add friends screen, over LINE's own English words for a report */
    addFriendsDidntOpen: {
      en: "LINE’s Add friends screen didn’t open.",
      ja: "LINEの友だち追加画面がひらきませんでした。",
    },
  },
  preparing: {
    /** Giving, while the sticker goes into the gift bag before LINE's friend picker opens: the sheet's title */
    title: { en: "Preparing your gift", ja: "ギフトを準備中" },
    /** Giving's “Preparing your gift” screen: the line under its title, saying LINE's friend picker opens next and nothing is sent yet */
    lead: {
      en: "Getting your gift ready. LINE’s friend picker opens next; nothing is sent until you pick a chat.",
      ja: "ギフトを<wbr/>準備しています。<wbr/>次に<wbr/>LINEの<wbr/>友だち選択が<wbr/>ひらきます。<wbr/>トークを<wbr/>選ぶまで、<wbr/>何も<wbr/>送られません。",
    },
    /** Giving's “Preparing your gift” screen: the send key's label while the sticker is being prepared */
    button: { en: "Preparing…", ja: "準備中…" },
    /** What a long wait is waiting on, by step: the line under “Preparing your gift” once it has run long. */
    slow: {
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while Croquis hasn't answered */
      asking: {
        en: "This is taking longer than usual. Still waiting for Croquis to answer.",
        ja: "いつもより<wbr/>時間が<wbr/>かかっています。<wbr/>クロッキーからの<wbr/>応答を<wbr/>待っています。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while the sticker comes out of an earlier gift bag first */
      earlier: {
        en: "This is taking longer than usual. Your sticker is still coming out of an earlier gift bag, then goes into this one.",
        ja: "いつもより<wbr/>時間が<wbr/>かかっています。<wbr/>シールを<wbr/>前の<wbr/>ギフト袋から<wbr/>取り出しているところで、<wbr/>そのあと<wbr/>この袋に<wbr/>入れます。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while the sticker goes into the gift bag */
      moving: {
        en: "This is taking longer than usual. Your sticker is still going into the gift bag.",
        ja: "いつもより<wbr/>時間が<wbr/>かかっています。<wbr/>シールを<wbr/>ギフト袋に<wbr/>入れているところです。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the sentence after what it waits on, since Take it out is offered now */
      leave: {
        en: "Nothing is sent until you pick a chat. You can take the sticker out to start over.",
        ja: "トークを<wbr/>選ぶまで、<wbr/>何も<wbr/>送られません。<wbr/>シールを<wbr/>取り出して、<wbr/>最初から<wbr/>やり直すことも<wbr/>できます。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, joining what it waits on to the sentence after it */
      lead: { en: "{{waiting}} {{leave}}", ja: "{{waiting}}<wbr/>{{leave}}" },
    },
  },
  /** Giving, when the sheet moves to a new step: what screen readers hear, its title and then the line under it */
  stepHeard: { en: "{{title}}. {{lead}}", ja: "{{title}}。{{lead}}" },
  /** The sticker lifting back out of the bag after Take it out. */
  takingOut: {
    /** Giving, while the sticker comes back out of the gift bag after Take it out: the sheet's title */
    title: { en: "Taking it out", ja: "取り出し中" },
    /** Giving's “Taking it out” screen: the line under its title */
    lead: {
      en: "Your sticker is coming back out of the gift bag. This can take a minute or two.",
      ja: "シールを<wbr/>ギフト袋から<wbr/>取り出しています。<wbr/>数分<wbr/>かかることも<wbr/>あります。",
    },
    /** Giving's “Taking it out” screen: the send key's label while the sticker comes out; and the sticker detail of a sticker in a gift: Take it out's words while it runs */
    button: { en: "Taking it out…", ja: "取り出し中…" },
  },
  /** The sticker in the open bag, until it's sent or taken out. */
  inTheBag: {
    /** Giving, once the sticker drops into the open gift bag: the sheet's title while LINE's friend picker opens and is up; and the sticker detail of a sticker in a packed gift: its note */
    title: { en: "In the bag", ja: "ギフト袋に入れました" },
    /** Giving, with the sticker in the open gift bag: the line under "In the bag" */
    lead: {
      en: "The bag closes when it’s sent. Pick your chat with them in LINE: whoever opens it first gets it.",
      ja: "送ると<wbr/>袋に<wbr/>封がされます。<wbr/>LINEで<wbr/>相手との<wbr/>トークを<wbr/>選んでください。<wbr/>最初に<wbr/>ひらいた人が<wbr/>受け取れます。",
    },
    /** Giving, after LINE's friend picker closed without sending, or a step failed: the sheet's title over the open gift bag */
    notSent: { en: "Not sent yet", ja: "まだ送っていません" },
    /** Giving's "Not sent yet" screen: the line under its title */
    notSentLead: {
      en: "It’s still in the open bag. Pick a chat again, or take it out.",
      ja: "封をしないまま、<wbr/>まだ<wbr/>袋の中に<wbr/>あります。<wbr/>もう一度<wbr/>トークを<wbr/>選ぶか、<wbr/>取り出してください。",
    },
    /** Giving, with the sticker in the open gift bag: the aqua key that opens LINE's friend picker (again) */
    send: { en: "Send in LINE", ja: "LINEで送る" },
    /** Giving, with the sticker in the open gift bag: the quiet link under Send in LINE that lifts it back out, back to the first screen; and the sticker detail of a sticker in a gift: the quiet link under its note, and its confirm's key */
    takeOut: { en: "Take it out", ja: "取り出す" },
    /** Giving's "Not sent yet" screen: an alert when Croquis couldn't pack the gift, with why */
    couldntPack: {
      en: "{{no}} couldn’t be packed: {{reason}}",
      ja: "{{no}}をギフト袋に入れられませんでした：{{reason}}",
    },
    /** Giving's "Not sent yet" screen: an alert when LINE's friend picker failed to send the Gift Message, with why */
    wasntSent: { en: "{{no}} wasn’t sent: {{reason}}", ja: "{{no}}を送れませんでした：{{reason}}" },
    /** Giving's "Not sent yet" screen: an alert when Take it out failed, with why; and the sticker detail of a sticker in a gift: the alert under its note, with Try again and Dismiss */
    couldntTakeOut: {
      en: "{{no}} couldn’t be taken out: {{reason}}",
      ja: "{{no}}を取り出せませんでした：{{reason}}",
    },
    /** Giving's "Not sent yet" screen: an alert when Croquis couldn't record a cancelled or failed send, with why */
    couldntRecord: {
      en: "Croquis couldn’t record that: {{reason}}",
      ja: "クロッキーに記録できませんでした：{{reason}}",
    },
  },
  /** LINE didn't say whether the Gift Message went out, so the same one isn't offered again. */
  maybeSent: {
    /** Giving, when LINE's friend picker gave no answer on whether the Gift Message went out: the sheet's title over the open gift bag */
    title: { en: "Did it go out?", ja: "送れましたか？" },
    /** Giving's "Did it go out?" screen: the line under its title */
    lead: {
      en: "LINE didn’t say whether your gift message went out. If it did, tap It went out. If not, take the sticker out, then give it again.",
      ja: "ギフトメッセージを<wbr/>送れたかどうか、<wbr/>LINEから<wbr/>返事が<wbr/>ありませんでした。<wbr/>送れた場合は<wbr/>「送れました」を<wbr/>タップしてください。<wbr/>送れていない場合は、<wbr/>シールを<wbr/>取り出してから、<wbr/>もう一度<wbr/>贈ってください。",
    },
    /** Giving's "Did it go out?" screen: the aqua key the giver taps when the Gift Message did go out in LINE */
    itWentOut: { en: "It went out", ja: "送れました" },
  },
  sent: {
    /** Giving, once the Gift Message went out through LINE: the title under the gift bag as it closes */
    title: { en: "Closed and sent", ja: "封をして送りました" },
    /** Giving's "Closed and sent" screen: the line under its title */
    lead: {
      en: "It’s in your LINE chat now, and the gift message opens once. When they receive it, you’ll see who did.",
      ja: "ギフトメッセージを<wbr/>LINEの<wbr/>トークに<wbr/>送りました。<wbr/>ひらけるのは<wbr/>一度だけです。<wbr/>受け取られたら、<wbr/>誰が<wbr/>受け取ったかが<wbr/>わかります。",
    },
    /** Giving's "Closed and sent" screen: an alert when the Gift Message went out but Croquis couldn't record it, with why */
    couldntRecord: {
      en: "It went out in LINE, but Croquis couldn’t record it: {{reason}}",
      ja: "LINEでは送れましたが、クロッキーに記録できませんでした：{{reason}}",
    },
  },
  /** The frosted gift bag. */
  giftBag: {
    /** Names the bag's picture for assistive tech, by its state. */
    pictured: {
      /** The gift bag's picture named for assistive tech: in Giving, with the sticker in the open bag */
      open: { en: "The sticker in an open gift bag", ja: "口のあいたギフト袋に入ったシール" },
      /** The gift bag's picture named for assistive tech, closed: Giving's "Closed and sent" screen, and a gift that can't be received yet or here */
      closed: { en: "The gift bag, closed", ja: "封をしたギフト袋" },
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
    /** The closed gift bag, in Giving's "Closed and sent" screen and in a gift a recipient opens: printed again and again along the aqua tear tape, with the day it was closed ("CLOSED 9.23") */
    closed: { en: "<b>Closed</b> {{date}}", ja: "<b>封印</b>{{date}}" },
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
      nsfw: {
        /** The rubber stamp on the tag of an NSFW sticker's gift, opened by someone who hasn't turned on Show 18+ stickers */
        big: { en: "18+ only", ja: "18歳以上" },
      },
    },
  },
  /** The giver's moment once a gift is received. */
  receivedNotice: {
    /** The giver's received notice, over the whole phone on their sticker board once someone received their gift: its title. The Gratitude heart follows it. */
    title: {
      en: "{{name}} received your sticker",
      ja: "{{name}}さんがあなたのシールを受け取りました",
    },
    /** The giver's received notice: the line under its title */
    lead: {
      en: "It’s on {{name}}’s sticker board now.",
      ja: "いまは{{name}}さんのシールボードにあります。",
    },
    /** The giver's received notice: the caption beside the sticker's silhouette, the receiver and the day they received it */
    caption: { en: "{{name}} · {{date}}", ja: "{{name}}・{{date}}" },
  },
} as const satisfies Section;
