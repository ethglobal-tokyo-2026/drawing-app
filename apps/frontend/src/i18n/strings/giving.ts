import type { Section } from "../catalog";

export const giving = {
  tag: {
    /** The gift tag's small label over the giver's handle, on the gift bag in Giving and in the gift a recipient opens, and before the handle in the Gift Message sent through LINE ("From @alice") */
    from: { en: "From", ja: "贈り主" },
    /** The gift tag's small label over the recipient's handle, on the gift bag in Giving when the giver picked the person from their sticker board ("For @bob") */
    for: { en: "For", ja: "贈り先" },
  },
  /** Why a gift's sticker couldn't go into or out of its bag, by cause: the reason in “couldn’t be packed” or “couldn’t be taken out” on Giving's “Not sent yet” screen, with the developer's English detail after it in brackets */
  transferProblem: {
    /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the move into the gift bag was refused; Send in LINE tries it again */
    deposit_reverted: {
      en: "Your sticker didn’t make it into the gift bag. Tap Send in LINE to try again.",
      ja: "シールがギフト袋に入りませんでした。「LINEで送る」をタップして、もう一度お試しください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be taken out”: the move out of the gift bag was refused; Take it out tries it again */
    take_out_reverted: {
      en: "Your sticker didn’t come back out of the gift bag. Tap Take it out to try again.",
      ja: "シールをギフト袋から取り出せませんでした。「取り出す」をタップして、もう一度お試しください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the move into the gift bag wasn't confirmed in time; Send in LINE checks again */
    deposit_unconfirmed: {
      en: "We couldn’t confirm that your sticker reached the gift bag. Tap Send in LINE to check again.",
      ja: "シールがギフト袋に入ったか確認できませんでした。「LINEで送る」をタップして、もう一度確認してください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be taken out”: the move out of the gift bag wasn't confirmed in time; Take it out checks again */
    take_out_unconfirmed: {
      en: "We couldn’t confirm that your sticker came out of the gift bag. Wait a moment, then tap Take it out to check again.",
      ja: "シールが袋から出たか確認できませんでした。少し待ってから、「取り出す」をタップして確認してください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the sticker came back out of the gift bag before the gift went out; Send in LINE packs it again */
    deposit_came_back: {
      en: "Your sticker came back out of the gift bag before it went out. Tap Send in LINE to pack it again.",
      ja: "送る前に、シールがギフト袋から戻ってきました。「LINEで送る」をタップして、もう一度袋に入れてください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the gift bag was already closed when the sticker was going in */
    gift_closed: {
      en: "This gift bag was already closed. Take the sticker out, then give it again.",
      ja: "このギフト袋はすでに閉じられています。シールを取り出してから、もう一度贈ってください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be taken out”: its receiver got the sticker first */
    already_received: {
      en: "Someone already received this sticker, so it can’t be taken out.",
      ja: "このシールはすでに受け取られているため、取り出せません。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be packed” or “couldn’t be taken out”: this version of the app has no gift bag to move stickers into */
    not_set_up: {
      en: "Gift bags aren’t set up in this version of Croquis yet.",
      ja: "このバージョンのクロッキーでは、ギフト袋がまだ使えません。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be packed” or “couldn’t be taken out”: what the app was told about the gift bag didn't look right, so nothing moved */
    unreadable: {
      en: "The gift bag’s details didn’t look right, so nothing was moved. Try again.",
      ja: "ギフト袋の情報が正しくなかったため、何も動かしていません。もう一度お試しください。",
    },
    /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the gift has no link to send; taking the sticker out and giving it again makes a new one */
    no_link: {
      en: "This gift came without a link to send. Take the sticker out, then give it again.",
      ja: "このギフトには送るためのリンクがありませんでした。シールを取り出してから、もう一度贈ってください。",
    },
  },
  giftMessage: {
    /** The Gift Message sent through LINE: its preview in the recipient's chat list and LINE's notification */
    altText: { en: "{{name}} sent you a sticker", ja: "{{name}}さんからシールが届きました" },
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
  /** Giving from someone else's sticker board: picking one of yours first. */
  giveSheet: {
    /** The give sheet, opened by Give on someone else's sticker board: its title */
    title: { en: "Give {{name}} a sticker", ja: "{{name}}さんにシールを贈る" },
    /** The give sheet on someone else's sticker board: the line under its title */
    lead: {
      en: "Pick one of yours, then send it to {{name}} in a LINE chat.",
      ja: "あなたのシールを1枚選んで、LINEのトークで{{name}}さんに送りましょう。",
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
    /** The give sheet on someone else's sticker board: said by assistive tech on an NSFW sticker that can't be picked because they aren't verified as an adult */
    blocked: {
      en: "for adults only, can’t be given to them",
      ja: "成人向けのため、この人には贈れません",
    },
    /** The give sheet on someone else's sticker board: fine print under the grid when some of your stickers are NSFW and <name/> isn't verified as an adult; <name/> is their handle, which keeps its own case in the capitals */
    adultsOnly: {
      en: "18+ stickers can only go to adults verified with World ID, and <name/> isn’t.",
      ja: "18+のシールは、World IDで年齢確認済みの成人にだけ贈れます。<name/>さんはまだ確認されていません。",
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
      ja: "ギフトを準備しています。次にLINEの友だち選択がひらきます。トークを選ぶまで、何も送られません。",
    },
    /** Giving's “Preparing your gift” screen: the send key's label while the sticker is being prepared */
    button: { en: "Preparing…", ja: "準備中…" },
    /** What a long wait is waiting on, by step: the line under “Preparing your gift” once it has run long. */
    slow: {
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while Croquis hasn't answered */
      asking: {
        en: "This is taking longer than usual. Still waiting for Croquis to answer.",
        ja: "いつもより時間がかかっています。クロッキーからの応答を待っています。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while the sticker comes out of an earlier gift bag first */
      earlier: {
        en: "This is taking longer than usual. Your sticker is still coming out of an earlier gift bag, then goes into this one.",
        ja: "いつもより時間がかかっています。シールを前のギフト袋から取り出しているところで、そのあとこの袋に入れます。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while the sticker goes into the gift bag */
      moving: {
        en: "This is taking longer than usual. Your sticker is still going into the gift bag.",
        ja: "いつもより時間がかかっています。シールをギフト袋に入れているところです。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while the gift bag confirms the sticker is in */
      confirming: {
        en: "This is taking longer than usual. Waiting for the gift bag to confirm your sticker is in, which can take a couple of minutes.",
        ja: "いつもより時間がかかっています。シールがギフト袋に入ったか、確認を待っています。数分かかることもあります。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the sentence after what it waits on, since Take it out is offered now */
      leave: {
        en: "Nothing is sent until you pick a chat. You can take the sticker out to start over.",
        ja: "トークを選ぶまで、何も送られません。シールを取り出して、最初からやり直すこともできます。",
      },
      /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, joining what it waits on to the sentence after it */
      lead: { en: "{{waiting}} {{leave}}", ja: "{{waiting}}{{leave}}" },
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
      ja: "シールをギフト袋から取り出しています。数分かかることもあります。",
    },
    /** Giving's “Taking it out” screen: the send key's label while the sticker comes out */
    button: { en: "Taking it out…", ja: "取り出し中…" },
  },
  /** The sticker in the open bag, until it's sent or taken out. */
  inTheBag: {
    /** Giving, once the sticker drops into the open gift bag: the sheet's title while LINE's friend picker opens and is up */
    title: { en: "In the bag", ja: "ギフト袋に入れました" },
    /** Giving, with the sticker in the open gift bag: the line under "In the bag" */
    lead: {
      en: "The bag closes when it’s sent. Pick your chat with them in LINE: whoever opens it first gets it.",
      ja: "送ると袋に封がされます。LINEで相手とのトークを選んでください。最初にひらいた人が受け取れます。",
    },
    /** Giving, after LINE's friend picker closed without sending, or a step failed: the sheet's title over the open gift bag */
    notSent: { en: "Not sent yet", ja: "まだ送っていません" },
    /** Giving's "Not sent yet" screen: the line under its title */
    notSentLead: {
      en: "It’s still in the open bag. Pick a chat again, or take it out.",
      ja: "封をしないまま、まだ袋の中にあります。もう一度トークを選ぶか、取り出してください。",
    },
    /** Giving, with the sticker in the open gift bag: the aqua key that opens LINE's friend picker (again) */
    send: { en: "Send in LINE", ja: "LINEで送る" },
    /** Giving, with the sticker in the open gift bag: the quiet link under Send in LINE that lifts it back out, back to the first screen */
    takeOut: { en: "Take it out", ja: "取り出す" },
    /** Giving's "Not sent yet" screen: an alert when Croquis couldn't pack the gift, with why */
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
      ja: "ギフトメッセージを送れたかどうか、LINEから返事がありませんでした。送れた場合は「送れました」をタップしてください。送れていない場合は、シールを取り出してから、もう一度贈ってください。",
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
      ja: "ギフトメッセージをLINEのトークに送りました。ひらけるのは一度だけです。受け取られたら、誰が受け取ったかがわかります。",
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
      sealed: { en: "The gift bag, closed", ja: "封をしたギフト袋" },
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
    /** The gift bag: printed again and again along the aqua tear tape, with the day it was closed ("CLOSED 9.23") */
    sealed: { en: "<b>Closed</b> {{date}}", ja: "<b>封印</b>{{date}}" },
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
  /** Your gifts on their way, in clear film. */
  pendingGifts: {
    /** The pending gifts badge on your own sticker board: its fine print, with one gift sent and not yet received */
    onTheirWay_one: { en: "On its way" },
    /** The pending gifts badge on your own sticker board: its fine print, with gifts sent and not yet received */
    onTheirWay_other: { en: "On their way", ja: "お届け中" },
    /** The pending gifts badge on your own sticker board: the line under "On their way", the newest gift's number and how many more */
    andMore: { en: "{{no}} and {{count}} more", ja: "{{no}}ほか{{count}}枚" },
    /** The pending gifts badge on your own sticker board: the line under "On its way" naming who one gift waits for: the person picked in the app, or whoever first opened its link */
    to: { en: "to {{name}}", ja: "{{name}}さんへ" },
    /** Names the badge for assistive tech. */
    label: {
      /** The pending gifts badge on your own sticker board: its name for assistive tech, with one gift on its way */
      one: { en: "Gifts on their way: {{no}}", ja: "お届け中のギフト：{{no}}" },
      /** The pending gifts badge on your own sticker board: its name for assistive tech, with one gift that waits for someone: the person picked in the app, or whoever first opened its link */
      oneTo: {
        en: "Gifts on their way: {{no}} to {{name}}",
        ja: "お届け中のギフト：{{name}}さんへの{{no}}",
      },
      /** The pending gifts badge on your own sticker board: its name for assistive tech, with several gifts on their way */
      several: { en: "{{count}} gifts on their way", ja: "お届け中のギフト：{{count}}件" },
    },
  },
} as const satisfies Section;
