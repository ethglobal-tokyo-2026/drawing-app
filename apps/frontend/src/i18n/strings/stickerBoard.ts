import type { Section } from "../catalog";

export const stickerBoard = {
  /** The Sticker Board's cork back: your own, or someone else's. */
  statBoard: {
    label: { en: "{{name}}’s stats" },
    /** A figure whose source didn't load: a dash on screen, words for screen readers. */
    notKnown: { mark: { en: "–" }, spoken: { en: "not known" } },
    gratitude: {
      title: { en: "Gratitude received" },
      inspired: { label: { en: "Inspired" }, reason: { en: "Gratitude for stickers they gave." } },
      magic: { label: { en: "Magic" }, reason: { en: "Gratitude sent a special way." } },
      asOriginalArtist: {
        label: { en: "Original Artist" },
        reason: { en: "A share of the gratitude when a sticker they drew is given on." },
      },
      didntLoad: { en: "Gratitude didn’t load." },
      noneYetOwn: {
        en: "No gratitude yet. It arrives when someone you give a sticker to sends you some for it.",
      },
      noneYet: {
        en: "No gratitude yet. It arrives when someone sends gratitude for a sticker they gave them.",
      },
      total: { en: "Total" },
    },
    bests: {
      title: { en: "Bests" },
      longestStreak: { en: "Longest streak" },
      /** `days` is the count, grouped. */
      days_one: { en: "{{days}} day" },
      days_other: { en: "{{days}} days" },
      bestCombo: { en: "Best combo" },
      bestComboNote: { en: "Most hits in one gratitude combo" },
      /** `hits` is the count, grouped. */
      combo: { en: "×{{hits}}" },
      mostGratitudeInADay: { en: "Most gratitude in a day" },
      noneYet: { en: "None yet" },
    },
    /** The day they joined, on label-maker tape. */
    since: { en: "Since {{day}}" },
    sinceSpoken: { en: "On the app since {{day}}" },
    streak: {
      title: { en: "Streak" },
      /** Under the day count. */
      days_one: { en: "day" },
      days_other: { en: "days" },
      notStarted: { en: "Not started" },
      rule: { en: "Miss a day and it goes back to zero. Days turn over at {{time}}." },
      startOwn: { en: "Draw a sticker today to start one." },
      start: { en: "It starts the first day they draw." },
    },
    didntLoadOwn: { en: "Your stats didn’t load." },
    didntLoad: { en: "Their stats didn’t load." },
    didntLoadOwnBecause: { en: "Your stats didn’t load: {{reason}}" },
    stamps: {
      label: { en: "Stickers" },
      made: { en: "made" },
      received: { en: "received" },
      given: { en: "given" },
    },
    flipBack: { en: "Flip back" },
    logOut: { en: "Log out of LINE" },
  },
  /** Your addresses as QR codes on the cork, and the dialog that holds one up. */
  addresses: {
    ethereum: {
      caption: { en: "Board address" },
      network: { en: "Ethereum Sepolia" },
      open: { en: "Show your board address as a QR code" },
      loading: { en: "Getting your board address…" },
      didntLoad: { en: "Board address didn’t load" },
      title: { en: "Your board address" },
      qrCode: { en: "QR code of your board address" },
      note: { en: "Your stickers are kept at this address on Ethereum Sepolia." },
      copied: { en: "Board address copied" },
      notCopied: { en: "Couldn’t copy the board address" },
      viewOnExplorer: { en: "View on Etherscan" },
      viewOnExplorerLabel: { en: "View your board address on Etherscan" },
    },
    sui: {
      caption: { en: "Sui address" },
      network: { en: "Sui Testnet" },
      open: { en: "Show your Sui address as a QR code" },
      loading: { en: "Getting your Sui address…" },
      didntLoad: { en: "Sui address didn’t load" },
      title: { en: "Your Sui address" },
      qrCode: { en: "QR code of your Sui address" },
      note: { en: "Your address on Sui Testnet." },
      copied: { en: "Sui address copied" },
      notCopied: { en: "Couldn’t copy the Sui address" },
      viewOnExplorer: { en: "View on Suiscan" },
      viewOnExplorerLabel: { en: "View your Sui address on Suiscan" },
    },
    tryAgain: { en: "Try again" },
    close: { en: "Close" },
    copy: { en: "Copy address" },
  },
  /** The Settings note, the last paper on your cork back. */
  settings: {
    title: { en: "Settings", ja: "設定" },
    language: {
      title: { en: "Language", ja: "言語" },
      /** `language` is LINE's, named in its own language. */
      sameAsLine: { en: "Same as LINE ({{language}})", ja: "LINEと同じ（{{language}}）" },
      /** Each language is named in its own language. */
      names: { en: { en: "English", ja: "English" }, ja: { en: "日本語", ja: "日本語" } },
      saving: { en: "Saving…", ja: "保存しています…" },
      notSaved: {
        en: "Your language couldn’t be saved, so it hasn’t changed: {{reason}}",
        ja: "言語を保存できなかったため、変更していません：{{reason}}",
      },
      notKept: {
        en: "Your language is saved, but this phone couldn’t keep it ({{reason}}). It changes the next time you open the app.",
        ja: "言語は保存しましたが、この端末に記録できませんでした（{{reason}}）。次にアプリをひらいたときに切り替わります。",
      },
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
  tryAgain: { en: "Try again" },
  /** Your own sticker board. */
  board: {
    /** Your name, which turns the board over to its stat board. */
    yourStats: { en: "{{name}}: your stats" },
    draw: { en: "Draw" },
    drawLabel: { en: "Draw a new sticker" },
    /** `tickets` says how many tickets you have. */
    drawLabelWithTickets: { en: "Draw a new sticker: you have {{tickets}}" },
    /** Beside Draw until the first sticker. */
    firstSticker: { en: "Make your first sticker" },
    /** Names the stickers' area for assistive tech. */
    label: { en: "Sticker board" },
    /** Read out for a focused sticker, then for the selected one. */
    focusHint: { en: "Enter selects it. Arrow keys go to the other stickers." },
    selectedHint: {
      en: "Selected. Enter opens it, and Tab reaches its toolbar. Arrow keys move it, [ and ] turn it, minus and plus resize it, Delete takes it off the board, and Escape lets go of it.",
    },
    /** In the empty board's dashed spot. */
    blank: { en: "Stickers you make or receive land here." },
    didntLoad: { en: "Your stickers didn’t load." },
    /** `stickers` lists their numbers; `reasons`, why. */
    unsaved_one: { en: "Couldn’t save where {{stickers}} sits: {{reasons}}" },
    unsaved_other: { en: "Couldn’t save where {{stickers}} sit: {{reasons}}" },
  },
  /** A sticker on a board, as screen readers name it: "3 of 6" is its place in reading order. */
  placedSticker: {
    roleDescription: { en: "sticker" },
    label: { en: "{{no}}, drawn in {{duration}}, {{position}} of {{setSize}}" },
    /** Drawn by someone other than the board's owner. */
    labelBy: { en: "{{no}}, drawn in {{duration}}, by {{artist}}, {{position}} of {{setSize}}" },
  },
  /** Where a sticker you gave sat on your board. */
  givenStickerSilhouette: {
    /** Who has it, when it went through LINE's friend picker, which never says who was picked. */
    aFriend: { en: "a friend" },
    label: { en: "{{no}}, given to {{recipient}} on {{day}}. Open it" },
    labelToAFriend: { en: "{{no}}, given to a friend on {{day}}. Open it" },
  },
  /** Beside the selected sticker on the board. */
  toolbar: {
    give: { en: "Give" },
    view: { en: "View" },
    remove: { en: "Remove" },
  },
  /** The sticker tray, zipped down the board's right edge. */
  tray: {
    /** The Zipper's pull, which opens the tray. */
    zipper: { en: "Your stickers" },
    sheets: { en: "Your sticker sheets" },
    /** Names the folder tabs, which pick the stickers shown. */
    tabs: { en: "Show" },
    filters: {
      all: { en: "All" },
      mine: { en: "Mine" },
      gifts: { en: "Gifts" },
    },
    /** On a sticker the open tray hasn't shown before. */
    new: { en: "NEW" },
    slot: {
      /** Out on the board, so its used sticker silhouette holds its spot. */
      used: { en: "{{no}}, on your board. Show it" },
      onSheet: { en: "{{no}}. Drag it onto your board, or tap to stick it on" },
      newOnSheet: { en: "{{no}}, new. Drag it onto your board, or tap to stick it on" },
    },
    /** The button for the sheets past the ones that show behind the front sheet. */
    moreSheets_one: { en: "{{count}} more sheet. Spread every sheet out" },
    moreSheets_other: { en: "{{count}} more sheets. Spread every sheet out" },
    /** A sheet behind the front one, or laid out in the spread; `dates` is when its stickers came. */
    sheet: { en: "Sheet {{number}}, {{dates}}. Bring it to the front" },
    sheetInFront: { en: "Sheet {{number}}, {{dates}}, in front now. Bring it to the front" },
    /** On a sheet pulled out over the board. */
    putBack: { en: "Put this sheet back in the tray" },
  },
  /** One sticker large, paging through the rest. */
  detail: {
    /** Names it for assistive tech when it has no sticker to show. */
    label: { en: "Sticker" },
    back: { en: "Sticker board" },
    yourStickers: { en: "Your stickers" },
    stickersYouGave: { en: "Stickers you gave" },
    previous: { en: "Previous sticker" },
    next: { en: "Next sticker" },
    count: { en: "{{position}} / {{setSize}}" },
    countSpoken: { en: "{{no}}, {{position}} of {{setSize}}" },
    /** "sticker" stands in for its name, which no data carries yet; `<no/>` is its number. */
    title: { en: "sticker <no/>" },
    by: { en: "by {{artist}}" },
    /** `<duration/>` is how long it took to draw. */
    drawnIn: { en: "· drawn in <duration/>" },
    sealedOn: { en: "· {{day}}" },
    youGaveIt: { en: "You gave it to {{receiver}} · {{day}}" },
    /** Sent, it waits for its friend. */
    onItsWay: { en: "On its way" },
    onItsWayTo: { en: "On its way to {{receiver}}" },
    sendGratitude: { en: "Send gratitude" },
    give: { en: "Give" },
    checkFailed: {
      en: "Couldn’t load where it’s been, or whether you’ve sent gratitude for it: {{reason}}",
    },
    none: { en: "No sticker here yet." },
  },
  /** Where a sticker has been: one row per time it was given, newest first. */
  transferTrail: {
    label: { en: "Where it’s been" },
    /** A row: `<giver/>` and `<receiver/>` are their names, and `<at>` holds the day. */
    handOff: {
      between: { en: "<giver/> gave it to <receiver/><at> · {{day}}</at>" },
      byYou: { en: "<b>You</b> gave it to <receiver/><at> · {{day}}</at>" },
      toYou: { en: "<giver/> gave it to <b>you</b><at> · {{day}}</at>" },
    },
    /** A closed row's Gratitude; `<hidden>` is for screen readers only. */
    amount: { en: "{{amount}}<hidden> gratitude</hidden>" },
    /** Who the open row's Gratitude came from. */
    fromYou: { en: "From you" },
    from: { en: "From {{name}}" },
    replay: { en: "Replay" },
    replayYours: { en: "Play the replay of your {{amount}} gratitude" },
    replayTheirs: { en: "Play the replay of {{name}}’s {{amount}} gratitude" },
    /** The Original Artist Gratitude Share, out of the giver's part. Never money words. */
    artistShare: {
      youDrewIt: { en: "{{share}} of it came to you, its artist" },
      youGaveIt: { en: "{{kept}} came to you · {{share}} to {{artist}}, its artist" },
      between: { en: "{{kept}} to {{giver}} · {{share}} to {{artist}}, its artist" },
    },
    earlierGifts_one: { en: "{{count}} earlier gift" },
    earlierGifts_other: { en: "{{count}} earlier gifts" },
  },
  /** Someone else's sticker board, opened from Explore. */
  artistBoard: {
    /** LINE's header, and the board's name for assistive tech. */
    title: { en: "{{name}}'s sticker board" },
    theirStats: { en: "{{name}}: their stats" },
    statsDidntLoad: { en: "Their stats didn’t load: {{reason}}" },
    /** Read out for a focused sticker. */
    hint: { en: "Enter opens its menu: view it, or offer for it" },
    blank: { en: "{{name}} hasn’t stuck anything up yet." },
    didntLoad: { en: "Couldn’t load {{name}}’s board: {{reason}}" },
    /** Back to Explore. */
    explore: { en: "Explore" },
    view: { en: "View" },
    offer: { en: "Offer for it" },
    give: { en: "Give" },
    /** A sticker opened from it: `<duration/>` is how long it took, `<artist/>` who drew it. */
    drawnIn: { en: "Drawn in <duration/> · <artist/>" },
    close: { en: "Close" },
  },
} as const satisfies Section;
