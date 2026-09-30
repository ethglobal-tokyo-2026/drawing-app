import type { Section } from "../catalog";

export const stickerBoard = {
  /** A name under croquis.eth, which opens in the ENS app. */
  ensName: {
    /** Sticker detail, under the title, and the stat board's label-maker tape: screen readers' name for the croquis.eth name's link, which opens it in the ENS app; {{name}} is the whole name */
    open: { en: "Open {{name}} in the ENS app", ja: "{{name}}をENSアプリでひらく" },
  },
  /** The Sticker Board's cork back: your own, or someone else's. */
  statBoard: {
    /** Stat board (a sticker board's cork back, yours or someone else's): screen readers' name for the dialog; {{name}} is the board owner's LINE name */
    label: { en: "{{name}}’s stats", ja: "{{name}}さんの記録" },
    /** A figure whose source didn't load: a dash on screen, words for screen readers. */
    notKnown: {
      /** Stat board: the dash in place of a figure whose data didn't load (hidden from screen readers) */
      mark: { en: "–", ja: "–" },
      /** Stat board: what screen readers say in place of a figure whose data didn't load */
      spoken: { en: "not known", ja: "不明" },
    },
    gratitude: {
      /** Stat board: the heading of the Gratitude receipt, the paper under the pink pushpin */
      title: { en: "Gratitude received", ja: "受け取った感謝" },
      /** Stat board, Gratitude receipt: the row for gratitude sent for stickers they gave, beside its amount */
      direct: { en: "Direct", ja: "直接" },
      /** Stat board, Gratitude receipt: the row for the Original Artist Gratitude Share, from stickers they drew that others gave on, beside its amount */
      residual: { en: "Residual", ja: "作者として" },
      /** Your stat board, Gratitude receipt: in place of the rows before you've received any gratitude */
      noneYetOwn: {
        en: "No gratitude yet. It arrives when someone you give a sticker to sends you some for it.",
        ja: "まだ感謝はありません。シールを贈った相手が感謝を送ると、ここに届きます。",
      },
      /** Someone else's stat board, Gratitude receipt: in place of the rows before they've received any gratitude */
      noneYet: {
        en: "No gratitude yet. It arrives when someone sends gratitude for a sticker they gave them.",
        ja: "まだ感謝はありません。贈ったシールに相手が感謝を送ると、ここに届きます。",
      },
      /** Stat board, Gratitude receipt: the label of the total line at its foot */
      total: { en: "Total", ja: "合計" },
    },
    bests: {
      /** Stat board: the heading of the Bests scrap */
      title: { en: "Bests", ja: "自己ベスト" },
      /** Stat board, Bests scrap: the Longest streak row's label */
      longestStreak: { en: "Longest streak", ja: "最長連続日数" },
      /** Stat board, Bests scrap: the Longest streak figure when it's one day; {{days}} is the count */
      days_one: { en: "{{days}} day" },
      /** Stat board, Bests scrap: the Longest streak figure, such as "12 days"; {{days}} is the count */
      days_other: { en: "{{days}} days", ja: "{{days}}日" },
      /** Stat board, Bests scrap: the Best combo row's label */
      bestCombo: { en: "Best combo", ja: "最高コンボ" },
      /** Stat board, Bests scrap: the Most gratitude in a day row's label */
      mostGratitudeInADay: { en: "Most gratitude in a day", ja: "1日の最多感謝" },
      /** Stat board, Bests scrap: in place of a best that has no figure yet */
      noneYet: { en: "None yet", ja: "まだなし" },
    },
    /** Stat board: the label-maker tape with the day they joined, such as "Since 2026.09.01" (hidden from screen readers) */
    since: { en: "Since {{day}}", ja: "{{day}}から" },
    /** Stat board: what screen readers say for the label-maker tape with the day they joined */
    sinceSpoken: { en: "On the app since {{day}}", ja: "{{day}}からクロッキーを使っています" },
    streak: {
      /** Stat board: the heading of the Streak leaf, over the day count */
      title: { en: "Streak", ja: "連続日数" },
      /** Stat board, Streak leaf: the word under the day count when it's 1 */
      days_one: { en: "day" },
      /** Stat board, Streak leaf: the word under the day count, such as "12" over "days" */
      days_other: { en: "days", ja: "日" },
      /** Stat board, Streak leaf: in place of the day count while there's no streak */
      notStarted: { en: "Not started", ja: "まだこれから" },
    },
    /** Your stat board, Gratitude receipt: in place of its rows when your User Stats fail to load, with the reason */
    didntLoadOwnBecause: {
      en: "Your stats didn’t load: {{reason}}",
      ja: "記録を読み込めませんでした：{{reason}}",
    },
    stamps: {
      /** Stat board: screen readers' name for the three stamps that count stickers made, received and given */
      label: { en: "Stickers", ja: "シール" },
      /** Stat board: the word under the count on the stamp for stickers made */
      made: { en: "made", ja: "つくった" },
      /** Stat board: the word under the count on the stamp for stickers received */
      received: { en: "received", ja: "受け取った" },
      /** Stat board: the word under the count on the stamp for stickers given */
      given: { en: "given", ja: "贈った" },
    },
    /** Stat board: the Flip back button, which turns the board back over to its stickers */
    flipBack: { en: "Flip back", ja: "表に戻す" },
    /** Your stat board, opened outside LINE's app: the button under Flip back that logs out of LINE */
    logOut: { en: "Log out of LINE", ja: "LINEからログアウト" },
  },
  /** Your addresses as QR codes on the cork, and the dialog that holds one up. */
  addresses: {
    ethereum: {
      /** Your stat board: the caption on the board address's QR code paper */
      caption: { en: "Board address", ja: "ボードアドレス" },
      /** Your stat board: the network's name under the board address paper's caption */
      network: { en: "Ethereum Sepolia", ja: "Ethereum Sepolia" },
      /** Your stat board: screen readers' name for the board address paper, a button that holds its QR code up in the address dialog */
      open: { en: "Show your board address as a QR code", ja: "ボードアドレスをQRコードで表示" },
      /** Your stat board: on the board address paper while the address loads */
      loading: { en: "Getting your board address…", ja: "ボードアドレスを取得しています…" },
      /** Your stat board: on the board address paper when the address didn't load, over Try again */
      didntLoad: { en: "Board address didn’t load", ja: "ボードアドレスを読み込めませんでした" },
      /** Address dialog for the board address: its heading, under the large QR code */
      title: { en: "Your board address", ja: "あなたのボードアドレス" },
      /** Address dialog for the board address: screen readers' name for the large QR code */
      qrCode: { en: "QR code of your board address", ja: "ボードアドレスのQRコード" },
      /** Address dialog for the board address: the note under the address */
      note: {
        en: "Your stickers are kept at this address on Ethereum Sepolia.",
        ja: "あなたのシールは、Ethereum Sepoliaのこのアドレスに保管されています。",
      },
      /** Address dialog for the board address: the toast after Copy address copies it */
      copied: { en: "Board address copied", ja: "ボードアドレスをコピーしました" },
      /** Address dialog for the board address: the toast when Copy address can't copy it */
      notCopied: {
        en: "Couldn’t copy the board address",
        ja: "ボードアドレスをコピーできませんでした",
      },
      /** Address dialog for the board address: the link under Copy address that opens the address on Etherscan */
      viewOnExplorer: { en: "View on Etherscan", ja: "Etherscanで見る" },
      /** Address dialog for the board address: screen readers' name for the Etherscan link */
      viewOnExplorerLabel: {
        en: "View your board address on Etherscan",
        ja: "ボードアドレスをEtherscanで見る",
      },
    },
    sui: {
      /** Your stat board: the caption on the Sui address's QR code paper */
      caption: { en: "Sui address", ja: "Suiアドレス" },
      /** Your stat board: the network's name under the Sui address paper's caption */
      network: { en: "Sui Testnet", ja: "Sui Testnet" },
      /** Your stat board: screen readers' name for the Sui address paper, a button that holds its QR code up in the address dialog */
      open: { en: "Show your Sui address as a QR code", ja: "SuiアドレスをQRコードで表示" },
      /** Your stat board: on the Sui address paper while the address loads */
      loading: { en: "Getting your Sui address…", ja: "Suiアドレスを取得しています…" },
      /** Your stat board: on the Sui address paper when the address didn't load, over Try again */
      didntLoad: { en: "Sui address didn’t load", ja: "Suiアドレスを読み込めませんでした" },
      /** Address dialog for the Sui address: its heading, under the large QR code */
      title: { en: "Your Sui address", ja: "あなたのSuiアドレス" },
      /** Address dialog for the Sui address: screen readers' name for the large QR code */
      qrCode: { en: "QR code of your Sui address", ja: "SuiアドレスのQRコード" },
      /** Address dialog for the Sui address: the note under the address */
      note: { en: "Your address on Sui Testnet.", ja: "Sui Testnetでのあなたのアドレスです。" },
      /** Address dialog for the Sui address: the toast after Copy address copies it */
      copied: { en: "Sui address copied", ja: "Suiアドレスをコピーしました" },
      /** Address dialog for the Sui address: the toast when Copy address can't copy it */
      notCopied: { en: "Couldn’t copy the Sui address", ja: "Suiアドレスをコピーできませんでした" },
      /** Address dialog for the Sui address: the link under Copy address that opens the address on Suiscan */
      viewOnExplorer: { en: "View on Suiscan", ja: "Suiscanで見る" },
      /** Address dialog for the Sui address: screen readers' name for the Suiscan link */
      viewOnExplorerLabel: {
        en: "View your Sui address on Suiscan",
        ja: "SuiアドレスをSuiscanで見る",
      },
    },
    /** Your stat board: the link on an address paper whose address didn't load */
    tryAgain: { en: "Try again", ja: "もう一度" },
    /** Address dialog: screen readers' name for the X button that puts the paper back on the cork */
    close: { en: "Close", ja: "閉じる" },
    /** Address dialog: the Copy address button under the card */
    copy: { en: "Copy address", ja: "アドレスをコピー" },
  },
  /** The Settings note, the first paper under the stats on your cork back. */
  settings: {
    /** Your stat board: the title of the Settings note, the first paper under the stats on the cork, which peeks up from the cork's foot until it's scrolled into view */
    title: { en: "Settings", ja: "設定" },
    language: {
      /** Settings note: the heading over the language choices */
      title: { en: "Language", ja: "言語" },
      /** Settings note: the first language choice, which follows LINE's language; {{language}} is that language's own name, such as "日本語" */
      sameAsLine: { en: "Same as LINE ({{language}})", ja: "LINEと同じ（{{language}}）" },
      /** Each language is named in its own language. */
      names: {
        /** Settings note: the English choice, named in English; also LINE's language in Same as LINE */
        en: { en: "English", ja: "English" },
        /** Settings note: the Japanese choice, named in Japanese; also LINE's language in Same as LINE */
        ja: { en: "日本語", ja: "日本語" },
      },
      /** Settings note: the status line while a language choice saves, which screen readers announce */
      saving: { en: "Saving…", ja: "保存しています…" },
      /** Settings note: the alert when the language choice didn't save to your account, with the reason */
      notSaved: {
        en: "Your language couldn’t be saved, so it hasn’t changed: {{reason}}",
        ja: "言語を保存できなかったため、変更していません：{{reason}}",
      },
      /** Settings note: the alert when the language saved to your account but this phone couldn't keep it for the next start, with the reason */
      notKept: {
        en: "Your language is saved, but this phone couldn’t keep it ({{reason}}). It changes the next time you open the app.",
        ja: "言語は保存しましたが、この端末には残せませんでした（{{reason}}）。次にアプリをひらいたときに切り替わります。",
      },
    },
  },
  /** Your stat board's Age verification paper, where an Orb-verified World ID proves you're 18 or older. */
  ageVerification: {
    /** Your stat board, Age verification paper: its title */
    title: { en: "Age verification", ja: "年齢確認" },
    /** Your stat board, Age verification paper, before you've verified: what verifying does, over the Verify your age button */
    lead: {
      en: "Prove you’re 18 or older with a World ID verified at an Orb, which World gives only to people 18 or older. Croquis learns nothing else about you.",
      ja: "Orbで認証したWorld IDで、18歳以上であることを証明します。Orbでの認証は18歳以上の人しか受けられません。クロッキーには、それ以外の情報は伝わりません。",
    },
    /** Your stat board, Age verification paper: the button that opens World ID to verify your age */
    verify: { en: "Verify your age", ja: "年齢を確認する" },
    /** Your stat board, Age verification paper: the button's text while World ID opens, after tapping Verify your age */
    opening: { en: "Opening World ID…", ja: "World IDをひらいています…" },
    /** Your stat board, Age verification paper, once World ID proved your age: in place of the button */
    verified: { en: "Verified 18+ with World ID", ja: "World IDで18歳以上を確認済み" },
    /** Your stat board, Age verification paper: the alert when verifying failed, with the reason */
    failed: {
      en: "Your age couldn’t be verified: {{reason}}",
      ja: "年齢を確認できませんでした：{{reason}}",
    },
    /** Your stat board, Age verification paper: the reason in “couldn’t be verified” when World App sent a proof that isn't for verifying your age */
    otherProof: {
      en: "World App sent a different kind of proof. Update World App, then try again.",
      ja: "World Appから別の種類の証明が届きました。World Appを更新してから、もう一度お試しください。",
    },
    /** Your stat board, Age verification paper: the reason in “couldn’t be verified” when World App failed; {{code}} is World ID's error code, such as credential_unavailable */
    worldAppFailed: {
      en: "World App couldn’t finish ({{code}}).",
      ja: "World Appで確認を完了できませんでした（{{code}}）。",
    },
  },
  /** The developer slip: English only, so the Japanese catalog never translates it. */
  developer: {
    label: { en: "Developer tools" },
    title: { en: "LINE and Privy" },
    privy: {
      signedIn: { en: "Signed in to Privy" },
      signingIn: { en: "Signing in to Privy…" },
      failed: { en: "Privy sign-in failed: {{reason}}" },
      off: { en: "Privy is off on the dev server, where LIFF Mock signs you in" },
      tryAgain: { en: "Try again" },
    },
    gratitudeDemo: {
      title: { en: "Gratitude mini-game" },
      try: { en: "Try the gratitude mini-game" },
      drawFirst: { en: "Draw a sticker first" },
      fullEffects: { en: "Full effects" },
      showFrameTimes: { en: "Show frame times" },
    },
    performance: {
      title: { en: "Performance" },
      record: { en: "Record performance" },
      what: {
        en: "Slow frames and what happened around them. While it’s on, it records from the app’s start.",
      },
      nothingYet: { en: "Nothing recorded yet" },
      copy: { en: "Copy report" },
      clear: { en: "Clear" },
      copied: { en: "Copied. Paste it into the chat." },
      /** It switched, but its setting wasn't kept for the next start. */
      onUntilRestart: { en: "Recording is on until the app restarts: {{reason}}" },
      offUntilRestart: { en: "Recording is off until the app restarts: {{reason}}" },
      couldntStart: { en: "Recording couldn't start: {{reason}}" },
      couldntStop: { en: "Recording couldn't stop: {{reason}}" },
      notCopied: { en: "The report couldn't be copied: {{reason}}. It's below to copy by hand." },
      report: { en: "Performance report" },
    },
  },
  /** Retry button after a failure: your sticker board's load error and its unsaved-positions alert, the sticker detail's failed check, its timelapse and its Transfer Trail replay, and someone else's sticker board that didn't load */
  tryAgain: { en: "Try again", ja: "もう一度" },
  /** Your own sticker board. */
  board: {
    /** Your sticker board, top left: screen readers' name for the button with your photo and name, which turns the board over to your stat board */
    yourStats: { en: "{{name}}: your stats", ja: "{{name}}：あなたの記録" },
    /** Your sticker board: the Draw key's visible label; your tickets tuck behind the key's right end */
    draw: { en: "Draw", ja: "かく" },
    /** Your sticker board: screen readers' name for the Draw key while your tickets haven't loaded */
    drawLabel: { en: "Draw a new sticker", ja: "新しいシールをかく" },
    /** Your sticker board: screen readers' name for the Draw key; {{tickets}} names the tickets the next drawing can use, such as "2 daily tickets left" or "no tickets until 12:00 AM" */
    drawLabelWithTickets: {
      en: "Draw a new sticker: {{tickets}}",
      ja: "新しいシールをかく：{{tickets}}",
    },
    /** Your sticker board with no stickers yet: the nudge beside the Draw key (hidden from screen readers) */
    firstSticker: { en: "Make your first sticker", ja: "はじめてのシールをつくろう" },
    /** Your sticker board: screen readers' name for the region that holds your stickers */
    label: { en: "Sticker board", ja: "シールボード" },
    /** Your sticker board: read out by screen readers when keyboard focus lands on a sticker */
    focusHint: {
      en: "Enter selects it. Arrow keys go to the other stickers.",
      ja: "Enterキーで選択します。矢印キーでほかのシールに移動します。",
    },
    /** Your sticker board: read out by screen readers for the selected sticker, listing its keyboard controls */
    selectedHint: {
      en: "Selected. Enter opens it, and Tab reaches its toolbar. Arrow keys move it, [ and ] turn it, minus and plus resize it, Delete takes it off the board, and Escape lets go of it.",
      ja: "選択中です。Enterキーでひらき、Tabキーでツールバーに移動します。矢印キーで動かし、[キーと]キーで回し、マイナスキーとプラスキーで大きさを変え、Deleteキーでボードからはがし、Escapeキーで選択を解除します。",
    },
    /** Your empty sticker board: the note in the dashed spot where the first sticker lands */
    blank: {
      en: "Stickers you make or receive land here.",
      ja: "つくったシールや受け取ったシールは、ここに貼られます。",
    },
    /** Your sticker board while its stickers load: read out to screen readers as faint placeholder stickers show */
    loading: { en: "Loading your stickers", ja: "シールを読み込んでいます" },
    /** Your sticker board, when your stickers fail to load: the alert in the dashed spot, above the reason and Try again */
    didntLoad: { en: "Your stickers didn’t load.", ja: "シールを読み込めませんでした。" },
    /** Your sticker board: the alert when one moved sticker's new position didn't save; {{stickers}} is its number, {{reasons}} why */
    unsaved_one: { en: "Couldn’t save where {{stickers}} sits: {{reasons}}" },
    /** Your sticker board: the alert when moved stickers' new positions didn't save; {{stickers}} lists their numbers, {{reasons}} why */
    unsaved_other: {
      en: "Couldn’t save where {{stickers}} sit: {{reasons}}",
      ja: "{{stickers}}の位置を保存できませんでした：{{reasons}}",
    },
  },
  /** A sticker on a board, as screen readers name it: "3 of 6" is its place in reading order. */
  placedSticker: {
    /** Any sticker board: screen readers' role name for each sticker on it, read after its label */
    roleDescription: { en: "sticker", ja: "シール" },
    /** Any sticker board: screen readers' name for a sticker the board's owner drew; {{position}} of {{setSize}} is its place in reading order */
    label: {
      en: "{{no}}, drawn in {{duration}}, {{position}} of {{setSize}}",
      ja: "{{no}}、制作時間{{duration}}、{{setSize}}枚中{{position}}枚目",
    },
    /** Any sticker board: screen readers' name for a sticker someone other than the board's owner drew; {{artist}} is its Original Artist */
    labelBy: {
      en: "{{no}}, drawn in {{duration}}, by {{artist}}, {{position}} of {{setSize}}",
      ja: "{{no}}、制作時間{{duration}}、作者：{{artist}}、{{setSize}}枚中{{position}}枚目",
    },
  },
  /** Beside the selected sticker on the board. */
  toolbar: {
    /** Your sticker board, a sticker selected: the toolbar's Give key, which starts giving it through LINE */
    give: { en: "Give", ja: "贈る" },
    /** Your sticker board, a sticker selected: the toolbar's View key, which opens its sticker detail */
    view: { en: "View", ja: "見る" },
    /** Your sticker board, a sticker selected: the toolbar's Remove key, which takes it off the board and back into the sticker tray */
    remove: { en: "Remove", ja: "はがす" },
  },
  /** The sticker tray, zipped down the board's right edge. */
  tray: {
    /** Your sticker board: screen readers' name for the Zipper's pull down the right edge, which opens the sticker tray */
    zipper: { en: "Your stickers", ja: "手持ちのシール" },
    /** Sticker tray: screen readers' name for the stack of sticker sheets */
    sheets: { en: "Your sticker sheets", ja: "手持ちのシールシート" },
    /** Sticker tray: screen readers' name for the folder tabs (All, Mine, Gifts), which pick the stickers shown; the tabs show once the tray holds a gift */
    tabs: { en: "Show", ja: "表示するシール" },
    filters: {
      /** Sticker tray: the folder tab that shows every sticker */
      all: { en: "All", ja: "すべて" },
      /** Sticker tray: the folder tab that shows only the stickers you drew */
      mine: { en: "Mine", ja: "自作" },
      /** Sticker tray: the folder tab that shows only the stickers you received */
      gifts: { en: "Gifts", ja: "ギフト" },
    },
    /** Sticker tray: the badge on a sticker the open tray hasn't shown before (hidden from screen readers) */
    new: { en: "NEW", ja: "NEW" },
    slot: {
      /** Sticker tray: screen readers' name for a used sticker silhouette, whose sticker is on the board; a tap makes that sticker pulse there */
      used: {
        en: "{{no}}, on your board. Show it",
        ja: "{{no}}、ボードに貼ってあります。ボードで見る",
      },
      /** Sticker tray, the sheet in front: screen readers' name for a sticker on it; the sheet's description says what to do with it */
      onSheet: { en: "{{no}}", ja: "{{no}}" },
      /** Sticker tray, the sheet in front: screen readers' name for a sticker on it that the tray hasn't shown before */
      newOnSheet: { en: "{{no}}, new", ja: "{{no}}、新着" },
      /** Sticker tray: screen readers' name for the blank spot a sticker you gave left on its sheet, a button that opens it among the stickers you gave; {{recipient}} is who received it, such as "@bob" */
      given: {
        en: "{{no}}, given to {{recipient}}. Open it",
        ja: "{{no}}、{{recipient}}さんへ贈ったシールをひらく",
      },
    },
    /** Sticker tray: screen readers' name for the +1 button under the stack, which spreads every sheet out over the board */
    moreSheets_one: { en: "{{count}} more sheet. Spread every sheet out" },
    /** Sticker tray: screen readers' name for the +N button under the stack, which spreads every sheet out over the board */
    moreSheets_other: {
      en: "{{count}} more sheets. Spread every sheet out",
      ja: "ほかに{{count}}枚のシート。すべてのシートを広げる",
    },
    /** Sticker tray: screen readers' name for a sheet behind the front one, or one laid out in the spread; {{dates}} is when its stickers came, such as "9.20–9.23" */
    sheet: {
      en: "Sheet {{number}}, {{dates}}. Bring it to the front",
      ja: "シート{{number}}、{{dates}}。手前に出す",
    },
    /** Sticker tray, the sheet in front: what screen readers say about it after its name, once for every sticker on it */
    slotHint: {
      en: "Drag a sticker onto your board, or tap it to stick it on",
      ja: "シールはボードへドラッグするか、タップすると貼れます",
    },
    /** Sticker tray: screen readers' name for the sheet in front, which holds the stickers you can stick on; {{dates}} is when its stickers came, such as "9.20–9.23" */
    frontSheet: {
      en: "Sheet {{number}}, {{dates}}, in front",
      ja: "シート{{number}}、{{dates}}、手前",
    },
    /** Sticker tray: screen readers' name for the sheet pulled out over the board; {{dates}} is when its stickers came, such as "9.20–9.23" */
    pulledSheet: {
      en: "Sheet {{number}}, {{dates}}, pulled out",
      ja: "シート{{number}}、{{dates}}、引き出し中",
    },
    /** Sticker tray, sheets spread over the board: screen readers' name for the sheet that's in front now */
    sheetInFront: {
      en: "Sheet {{number}}, {{dates}}, in front now. Bring it to the front",
      ja: "シート{{number}}、{{dates}}、いま手前にあります。手前に出す",
    },
    /** Sticker tray: screen readers' name for the X on a sheet pulled out over the board */
    putBack: { en: "Put this sheet back in the tray", ja: "このシートをシールトレイに戻す" },
  },
  /** One sticker large, paging through the rest. */
  detail: {
    /** Sticker detail: screen readers' name for the screen when it has no sticker to show */
    label: { en: "Sticker", ja: "シール" },
    /** Sticker detail: the back button at the top, with the sticker board icon */
    back: { en: "Sticker board", ja: "シールボード" },
    /** Sticker detail, opened from a sticker you hold: screen readers' name for the strip of sticker thumbnails at the top */
    yourStickers: { en: "Your stickers", ja: "手持ちのシール" },
    /** Sticker detail, opened from a given sticker's blank spot in the sticker tray: screen readers' name for the strip of thumbnails of the stickers you gave */
    stickersYouGave: { en: "Stickers you gave", ja: "贈ったシール" },
    /** Sticker detail: screen readers' name for the left arrow under the sticker, which pages to the previous one */
    previous: { en: "Previous sticker", ja: "前のシール" },
    /** Sticker detail: screen readers' name for the right arrow under the sticker, which pages to the next one */
    next: { en: "Next sticker", ja: "次のシール" },
    /** Sticker detail: the page count between the arrows, such as "3 / 6" (hidden from screen readers) */
    count: { en: "{{position}} / {{setSize}}", ja: "{{position}} / {{setSize}}" },
    /** Sticker detail: what screen readers announce after paging, naming the sticker and its place */
    countSpoken: {
      en: "{{no}}, {{position}} of {{setSize}}",
      ja: "{{no}}、{{setSize}}枚中{{position}}枚目",
    },
    /** Sticker detail: the sticker's heading under the pager; <no/> is its number, such as "No.0012" */
    title: { en: "sticker <no/>", ja: "シール<no/>" },
    /** Sticker detail, a sticker the board's owner drew: the fine print naming its Original Artist, first on the line; <artist/> is their handle, which keeps its own case in the capitals */
    by: { en: "by <artist/>", ja: "作者：<artist/>" },
    /** Sticker detail: the fine print after the artist, with how long it took to draw, such as "4m 52s" */
    drawnIn: { en: "· drawn in <duration/>", ja: "・制作時間<duration/>" },
    /** Sticker detail: the fine print ending the artist line, the day it was sealed, such as "2026.09.23" */
    sealedOn: { en: "· {{day}}", ja: "・{{day}}" },
    /** Sticker detail, a sticker you gave: the fine print naming who received it and when, until its Transfer Trail loads; <receiver/> is their handle, which keeps its own case in the capitals */
    youGaveIt: {
      en: "You gave it to <receiver/> · {{day}}",
      ja: "<receiver/>さんに贈りました・{{day}}",
    },
    /** Sticker detail, a sticker you've sent that hasn't been received: shown in place of Give, beside its sleeve */
    onItsWay: { en: "On its way", ja: "お届け中" },
    /** Sticker detail, a sticker you've sent to someone in the app that hasn't been received: shown in place of Give, beside its sleeve */
    onItsWayTo: { en: "On its way to {{receiver}}", ja: "{{receiver}}さんへお届け中" },
    /** Sticker detail, a sticker you received and haven't sent gratitude for: the pink key that opens the Gratitude Mini-game */
    sendGratitude: { en: "Send gratitude", ja: "感謝を送る" },
    /** Sticker detail, a sticker you hold: the Give key, or the smaller Give button under Send gratitude */
    give: { en: "Give", ja: "贈る" },
    /** Sticker detail: the alert when its Transfer Trail and gratitude check fail to load, before Try again */
    checkFailed: {
      en: "Couldn’t load where it’s been, or whether you’ve sent gratitude for it: {{reason}}",
      ja: "来歴と、感謝を送ったかどうかを読み込めませんでした：{{reason}}",
    },
    /** Sticker detail: in place of the sticker when there's none to show */
    none: { en: "No sticker here yet.", ja: "まだシールがありません。" },
  },
  /** The sticker detail's timelapse, which plays how the sticker was drawn. */
  timelapse: {
    /** Sticker detail: the Timelapse button at the end of the fine print, which plays how the sticker was drawn */
    watch: { en: "Timelapse", ja: "タイムラプス" },
    /** Sticker detail: the Timelapse button while the timelapse loads */
    loading: { en: "Loading…", ja: "読み込み中…" },
    /** Sticker detail: the Timelapse button while it gets the timelapse's fills ready */
    preparing: { en: "Preparing…", ja: "準備中…" },
    /** Sticker detail: the Timelapse button while the timelapse plays; a tap shows the finished sticker at once */
    skip: { en: "Skip", ja: "スキップ" },
    /** Sticker detail: screen readers' name for the Timelapse button; {{no}} is the sticker's number, such as "No.0012" */
    watchLabel: {
      en: "Timelapse: watch {{no}} being drawn",
      ja: "タイムラプス：{{no}}をかく様子を見る",
    },
    /** Sticker detail: screen readers' name for Skip while the timelapse plays */
    skipLabel: { en: "Skip to the end", ja: "最後までスキップ" },
    /** Sticker detail: read out as the timelapse starts; {{no}} is the sticker's number */
    playing: { en: "Playing how {{no}} was drawn", ja: "{{no}}をかいた様子を再生しています" },
    /** Sticker detail: read out when the timelapse ends */
    done: { en: "Done", ja: "再生が終わりました" },
    /** Sticker detail: the alert under the fine print when the timelapse fails to load or play, before Try again */
    failed: {
      en: "Couldn’t load the timelapse: {{reason}}",
      ja: "タイムラプスを読み込めませんでした：{{reason}}",
    },
    /** Sticker detail: the timelapse alert's reason when this phone couldn't play it; {{detail}} is the player's error, in English */
    notPlayed: {
      en: "It couldn’t play here ({{detail}}).",
      ja: "この端末では再生できませんでした（{{detail}}）。",
    },
  },
  /** Where a sticker has been: one row per time it was given, newest first. */
  transferTrail: {
    /** Sticker detail: screen readers' name for the Transfer Trail section under the sticker */
    label: { en: "Where it’s been", ja: "来歴" },
    /** A row: `<giver/>` and `<receiver/>` are their names, and `<at>` holds the day. */
    handOff: {
      /** Transfer Trail: a row for a gift between two other people; <at> holds the day, such as "9.23" */
      between: {
        en: "<giver/> gave it to <receiver/><at> · {{day}}</at>",
        ja: "<giver/>さんが<receiver/>さんに贈りました<at>・{{day}}</at>",
      },
      /** Transfer Trail: a row for a gift you gave; <at> holds the day */
      byYou: {
        en: "<b>You</b> gave it to <receiver/><at> · {{day}}</at>",
        ja: "<b>あなた</b>が<receiver/>さんに贈りました<at>・{{day}}</at>",
      },
      /** Transfer Trail: a row for a gift you received; <at> holds the day */
      toYou: {
        en: "<giver/> gave it to <b>you</b><at> · {{day}}</at>",
        ja: "<giver/>さんが<b>あなた</b>に贈りました<at>・{{day}}</at>",
      },
    },
    /** Transfer Trail: a closed row's gratitude amount beside a heart; the <hidden> words are for screen readers only */
    amount: { en: "{{amount}}<hidden> gratitude</hidden>", ja: "<hidden>感謝</hidden>{{amount}}" },
    /** Transfer Trail, the open row: under the gratitude total, when you sent it */
    fromYou: { en: "From you", ja: "あなたから" },
    /** Transfer Trail, the open row: under the gratitude total, naming who sent it; <name/> is their handle, which keeps its own case in the capitals */
    from: { en: "From <name/>", ja: "<name/>さんから" },
    /** Transfer Trail, the open row: the Replay button beside the gratitude total, which plays the combo inside the card */
    replay: { en: "Replay", ja: "リプレイ" },
    /** Transfer Trail, the open row: screen readers' name for Replay when you sent the gratitude */
    replayYours: {
      en: "Play the replay of your {{amount}} gratitude",
      ja: "あなたが送った感謝{{amount}}のリプレイを再生",
    },
    /** Transfer Trail, the open row: screen readers' name for Replay when someone else sent the gratitude */
    replayTheirs: {
      en: "Play the replay of {{name}}’s {{amount}} gratitude",
      ja: "{{name}}さんが送った感謝{{amount}}のリプレイを再生",
    },
    /** The open row while its gratitude replays inside it. */
    replaying: {
      /** Transfer Trail, the open row: the Replay button while the replay plays, which stops it */
      stop: { en: "Stop", ja: "停止" },
      /** Transfer Trail, the open row: screen readers' name for Stop while the replay plays */
      stopLabel: { en: "Stop the replay", ja: "リプレイを停止" },
      /** Transfer Trail, the open row: read out as the replay of gratitude you sent starts; {{amount}} is its total */
      yours: {
        en: "Replaying your {{amount}} gratitude",
        ja: "あなたが送った感謝{{amount}}をリプレイしています",
      },
      /** Transfer Trail, the open row: read out as the replay of someone else's gratitude starts; {{name}} sent it */
      theirs: {
        en: "Replaying {{name}}’s {{amount}} gratitude",
        ja: "{{name}}さんが送った感謝{{amount}}をリプレイしています",
      },
      /** Transfer Trail, the open row: read out when the replayed heart has landed in its dot */
      ended: { en: "Replay ended", ja: "リプレイが終わりました" },
      /** Transfer Trail, the open row: the alert under the card when the replay fails to load, before Try again */
      didntLoad: {
        en: "Couldn’t load the replay: {{reason}}",
        ja: "リプレイを読み込めませんでした：{{reason}}",
      },
      /** Transfer Trail, the open row: the alert when the replay fails while it plays; {{reason}} is the Mini-game engine's error, in English */
      stopped: { en: "The replay stopped: {{reason}}", ja: "リプレイが止まりました：{{reason}}" },
      /** Transfer Trail, the open row of gratitude sent to you: the fine print when your watching it couldn't be saved */
      notMarkedSeen: {
        en: "Couldn’t mark this gratitude watched: {{reason}}",
        ja: "この感謝を見たことを保存できませんでした：{{reason}}",
      },
    },
    /** The Original Artist Gratitude Share, out of the giver's part. Never money words. */
    artistShare: {
      /** Transfer Trail, the open row of a sticker you drew that others passed on: the fine print for your Original Artist Gratitude Share */
      youDrewIt: {
        en: "{{share}} of it came to you, its artist",
        ja: "このうち{{share}}が、作者のあなたに届きました",
      },
      /** Transfer Trail, the open row of a gift you gave of someone else's sticker: the fine print splitting its gratitude between you and its Original Artist */
      youGaveIt: {
        en: "{{kept}} came to you · {{share}} to {{artist}}, its artist",
        ja: "{{kept}}はあなたに・{{share}}は作者の{{artist}}さんに",
      },
      /** Transfer Trail, the open row of a gift between others: the fine print splitting its gratitude between the giver and the Original Artist */
      between: {
        en: "{{kept}} to {{giver}} · {{share}} to {{artist}}, its artist",
        ja: "{{kept}}は{{giver}}さんに・{{share}}は作者の{{artist}}さんに",
      },
    },
    /** Transfer Trail: the fold under the newest row, holding one earlier gift; a tap unfolds it */
    earlierGifts_one: { en: "{{count}} earlier gift" },
    /** Transfer Trail: the fold under the newest row, holding the earlier gifts; a tap unfolds them */
    earlierGifts_other: { en: "{{count}} earlier gifts", ja: "それより前のギフト{{count}}件" },
  },
  /** Someone else's sticker board, opened from Explore. */
  artistBoard: {
    /** Someone else's sticker board, opened from Explore: LINE's header, and screen readers' name for the board */
    title: { en: "{{name}}'s sticker board", ja: "{{name}}さんのシールボード" },
    /** Someone else's sticker board: screen readers' name for the button with their photo and name, which turns the board over to their stat board */
    theirStats: { en: "{{name}}: their stats", ja: "{{name}}さんの記録" },
    /** Someone else's stat board, Gratitude receipt: in place of its rows when their User Stats fail to load, with the reason */
    statsDidntLoad: {
      en: "Their stats didn’t load: {{reason}}",
      ja: "記録を読み込めませんでした：{{reason}}",
    },
    /** Someone else's sticker board: read out by screen readers when keyboard focus lands on a sticker */
    hint: {
      en: "Enter opens its menu: view it, or offer for it",
      ja: "Enterキーでメニューをひらきます。シールを見たり、オファーしたりできます。",
    },
    /** Someone else's empty sticker board: the note in the dashed spot */
    blank: {
      en: "{{name}} hasn’t stuck anything up yet.",
      ja: "{{name}}さんはまだ何も貼っていません。",
    },
    /** Someone else's sticker board, when it fails to load: the alert above Try again */
    didntLoad: {
      en: "Couldn’t load {{name}}’s board: {{reason}}",
      ja: "{{name}}さんのシールボードを読み込めませんでした：{{reason}}",
    },
    /** Someone else's sticker board: the back chip at the top that returns to Explore */
    explore: { en: "Explore", ja: "さがす" },
    /** Someone else's sticker board, a sticker tapped: the menu's View button, which opens it large */
    view: { en: "View", ja: "見る" },
    /** Someone else's sticker board, a sticker tapped: the menu's Offer for it button, which opens an offer for that sticker */
    offer: { en: "Offer for it", ja: "オファーする" },
    /** Someone else's sticker board: the Give key in Draw's place, which gives them one of your stickers */
    give: { en: "Give", ja: "贈る" },
    /** Someone else's sticker board, a sticker opened large: the fine print under its number; <duration/> is how long it took to draw, <artist/> its Original Artist */
    drawnIn: { en: "Drawn in <duration/> · <artist/>", ja: "制作時間<duration/>・<artist/>" },
    /** Someone else's sticker board, a sticker opened large: the Close link under it */
    close: { en: "Close", ja: "閉じる" },
  },
} as const satisfies Section;
