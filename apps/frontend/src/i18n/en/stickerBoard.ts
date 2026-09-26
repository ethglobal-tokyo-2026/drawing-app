export const stickerBoard = {
  /** A name under croquis.eth, which opens in the ENS app. */
  ensName: {
    open: "Open {{name}} in the ENS app",
  },
  /** The Sticker Board's cork back: your own, or someone else's. */
  statBoard: {
    label: "{{name}}’s stats",
    /** A figure whose source didn't load: a dash on screen, words for screen readers. */
    notKnown: { mark: "–", spoken: "not known" },
    gratitude: {
      title: "Gratitude received",
      inspired: { label: "Inspired", reason: "Gratitude for stickers they gave." },
      magic: { label: "Magic", reason: "Gratitude sent a special way." },
      asOriginalArtist: {
        label: "Original Artist",
        reason: "A share of the gratitude when a sticker they drew is given on.",
      },
      didntLoad: "Gratitude didn’t load.",
      noneYetOwn:
        "No gratitude yet. It arrives when someone you give a sticker to sends you some for it.",
      noneYet:
        "No gratitude yet. It arrives when someone sends gratitude for a sticker they gave them.",
      total: "Total",
    },
    bests: {
      title: "Bests",
      longestStreak: "Longest streak",
      /** `days` is the count, grouped. */
      days_one: "{{days}} day",
      days_other: "{{days}} days",
      bestCombo: "Best combo",
      bestComboNote: "Most hits in one gratitude combo",
      /** `hits` is the count, grouped. */
      combo: "×{{hits}}",
      mostGratitudeInADay: "Most gratitude in a day",
      noneYet: "None yet",
    },
    /** The day they joined, on label-maker tape. */
    since: "Since {{day}}",
    sinceSpoken: "On the app since {{day}}",
    streak: {
      title: "Streak",
      /** Under the day count. */
      days_one: "day",
      days_other: "days",
      notStarted: "Not started",
      rule: "Miss a day and it goes back to zero. Days turn over at {{time}}.",
      startOwn: "Draw a sticker today to start one.",
      start: "It starts the first day they draw.",
    },
    didntLoadOwn: "Your stats didn’t load.",
    didntLoad: "Their stats didn’t load.",
    didntLoadOwnBecause: "Your stats didn’t load: {{reason}}",
    stamps: { label: "Stickers", made: "made", received: "received", given: "given" },
    flipBack: "Flip back",
    logOut: "Log out of LINE",
  },
  /** Your addresses as QR codes on the cork, and the dialog that holds one up. */
  addresses: {
    ethereum: {
      caption: "Board address",
      network: "Ethereum Sepolia",
      open: "Show your board address as a QR code",
      loading: "Getting your board address…",
      didntLoad: "Board address didn’t load",
      title: "Your board address",
      qrCode: "QR code of your board address",
      note: "Your stickers are kept at this address on Ethereum Sepolia.",
      copied: "Board address copied",
      notCopied: "Couldn’t copy the board address",
      viewOnExplorer: "View on Etherscan",
      viewOnExplorerLabel: "View your board address on Etherscan",
    },
    sui: {
      caption: "Sui address",
      network: "Sui Testnet",
      open: "Show your Sui address as a QR code",
      loading: "Getting your Sui address…",
      didntLoad: "Sui address didn’t load",
      title: "Your Sui address",
      qrCode: "QR code of your Sui address",
      note: "Your address on Sui Testnet.",
      copied: "Sui address copied",
      notCopied: "Couldn’t copy the Sui address",
      viewOnExplorer: "View on Suiscan",
      viewOnExplorerLabel: "View your Sui address on Suiscan",
    },
    tryAgain: "Try again",
    close: "Close",
    copy: "Copy address",
  },
  /** The Settings note, the last paper on your cork back. */
  settings: {
    title: "Settings",
    language: {
      title: "Language",
      /** `language` is LINE's, named in its own language. */
      sameAsLine: "Same as LINE ({{language}})",
      /** Each language is named in its own language. */
      names: { en: "English", ja: "日本語" },
      saving: "Saving…",
      notSaved: "Your language couldn’t be saved, so it hasn’t changed: {{reason}}",
      notKept:
        "Your language is saved, but this phone couldn’t keep it ({{reason}}). It changes the next time you open the app.",
    },
  },
  /** The developer slip: English only, so the Japanese catalog never translates it. */
  developer: {
    label: "Developer tools",
    title: "LINE and Privy",
    privy: {
      signedIn: "Signed in to Privy",
      signingIn: "Signing in to Privy…",
      failed: "Privy sign-in failed: {{reason}}",
      off: "Privy is off on the dev server, where LIFF Mock signs you in",
      tryAgain: "Try again",
    },
    gratitudeDemo: {
      title: "Gratitude mini-game",
      try: "Try the gratitude mini-game",
      drawFirst: "Draw a sticker first",
      fullEffects: "Full effects",
      showFrameTimes: "Show frame times",
    },
    performance: {
      title: "Performance",
      record: "Record performance",
      what: "Slow frames and what happened around them. While it’s on, it records from the app’s start.",
      nothingYet: "Nothing recorded yet",
      copy: "Copy report",
      clear: "Clear",
      copied: "Copied. Paste it into the chat.",
      /** It switched, but its setting wasn't kept for the next start. */
      onUntilRestart: "Recording is on until the app restarts: {{reason}}",
      offUntilRestart: "Recording is off until the app restarts: {{reason}}",
      couldntStart: "Recording couldn't start: {{reason}}",
      couldntStop: "Recording couldn't stop: {{reason}}",
      notCopied: "The report couldn't be copied: {{reason}}. It's below to copy by hand.",
      report: "Performance report",
    },
  },
  tryAgain: "Try again",
  /** Your own sticker board. */
  board: {
    /** Your name, which turns the board over to its stat board. */
    yourStats: "{{name}}: your stats",
    draw: "Draw",
    drawLabel: "Draw a new sticker",
    /** `tickets` names the tickets the next drawing can use, such as "2 daily tickets left" or "no tickets until 12:00 AM". */
    drawLabelWithTickets: "Draw a new sticker: {{tickets}}",
    /** Beside Draw until the first sticker. */
    firstSticker: "Make your first sticker",
    /** Names the stickers' area for assistive tech. */
    label: "Sticker board",
    /** Read out for a focused sticker, then for the selected one. */
    focusHint: "Enter selects it. Arrow keys go to the other stickers.",
    selectedHint:
      "Selected. Enter opens it, and Tab reaches its toolbar. Arrow keys move it, [ and ] turn it, minus and plus resize it, Delete takes it off the board, and Escape lets go of it.",
    /** In the empty board's dashed spot. */
    blank: "Stickers you make or receive land here.",
    /** Read out while the board's faint placeholder stickers show. */
    loading: "Loading your stickers",
    didntLoad: "Your stickers didn’t load.",
    /** `stickers` lists their numbers; `reasons`, why. */
    unsaved_one: "Couldn’t save where {{stickers}} sits: {{reasons}}",
    unsaved_other: "Couldn’t save where {{stickers}} sit: {{reasons}}",
  },
  /** A sticker on a board, as screen readers name it: "3 of 6" is its place in reading order. */
  placedSticker: {
    roleDescription: "sticker",
    label: "{{no}}, drawn in {{duration}}, {{position}} of {{setSize}}",
    /** Drawn by someone other than the board's owner. */
    labelBy: "{{no}}, drawn in {{duration}}, by {{artist}}, {{position}} of {{setSize}}",
  },
  /** Where a sticker you gave sat on your board. */
  givenStickerSilhouette: {
    /** Who has it, when it went through LINE's friend picker, which never says who was picked. */
    aFriend: "a friend",
    label: "{{no}}, given to {{recipient}} on {{day}}. Open it",
    labelToAFriend: "{{no}}, given to a friend on {{day}}. Open it",
  },
  /** Beside the selected sticker on the board. */
  toolbar: {
    give: "Give",
    view: "View",
    remove: "Remove",
  },
  /** The sticker tray, zipped down the board's right edge. */
  tray: {
    /** The Zipper's pull, which opens the tray. */
    zipper: "Your stickers",
    sheets: "Your sticker sheets",
    /** Names the folder tabs, which pick the stickers shown. */
    tabs: "Show",
    filters: {
      all: "All",
      mine: "Mine",
      gifts: "Gifts",
    },
    /** On a sticker the open tray hasn't shown before. */
    new: "NEW",
    slot: {
      /** Out on the board, so its used sticker silhouette holds its spot. */
      used: "{{no}}, on your board. Show it",
      onSheet: "{{no}}. Drag it onto your board, or tap to stick it on",
      newOnSheet: "{{no}}, new. Drag it onto your board, or tap to stick it on",
    },
    /** The button for the sheets past the ones that show behind the front sheet. */
    moreSheets_one: "{{count}} more sheet. Spread every sheet out",
    moreSheets_other: "{{count}} more sheets. Spread every sheet out",
    /** A sheet behind the front one, or laid out in the spread; `dates` is when its stickers came. */
    sheet: "Sheet {{number}}, {{dates}}. Bring it to the front",
    sheetInFront: "Sheet {{number}}, {{dates}}, in front now. Bring it to the front",
    /** On a sheet pulled out over the board. */
    putBack: "Put this sheet back in the tray",
  },
  /** One sticker large, paging through the rest. */
  detail: {
    /** Names it for assistive tech when it has no sticker to show. */
    label: "Sticker",
    back: "Sticker board",
    yourStickers: "Your stickers",
    stickersYouGave: "Stickers you gave",
    previous: "Previous sticker",
    next: "Next sticker",
    count: "{{position}} / {{setSize}}",
    countSpoken: "{{no}}, {{position}} of {{setSize}}",
    /** "sticker" stands in for its name, which no data carries yet; `<no/>` is its number. */
    title: "sticker <no/>",
    by: "by {{artist}}",
    /** `<duration/>` is how long it took to draw. */
    drawnIn: "· drawn in <duration/>",
    sealedOn: "· {{day}}",
    youGaveIt: "You gave it to {{receiver}} · {{day}}",
    /** Sent, it waits for its friend. */
    onItsWay: "On its way",
    onItsWayTo: "On its way to {{receiver}}",
    sendGratitude: "Send gratitude",
    give: "Give",
    checkFailed:
      "Couldn’t load where it’s been, or whether you’ve sent gratitude for it: {{reason}}",
    none: "No sticker here yet.",
  },
  /** Where a sticker has been: one row per time it was given, newest first. */
  transferTrail: {
    label: "Where it’s been",
    /** A row: `<giver/>` and `<receiver/>` are their names, and `<at>` holds the day. */
    handOff: {
      between: "<giver/> gave it to <receiver/><at> · {{day}}</at>",
      byYou: "<b>You</b> gave it to <receiver/><at> · {{day}}</at>",
      toYou: "<giver/> gave it to <b>you</b><at> · {{day}}</at>",
    },
    /** A closed row's Gratitude; `<hidden>` is for screen readers only. */
    amount: "{{amount}}<hidden> gratitude</hidden>",
    /** Who the open row's Gratitude came from. */
    fromYou: "From you",
    from: "From {{name}}",
    replay: "Replay",
    replayYours: "Play the replay of your {{amount}} gratitude",
    replayTheirs: "Play the replay of {{name}}’s {{amount}} gratitude",
    /** The Original Artist Gratitude Share, out of the giver's part. Never money words. */
    artistShare: {
      youDrewIt: "{{share}} of it came to you, its artist",
      youGaveIt: "{{kept}} came to you · {{share}} to {{artist}}, its artist",
      between: "{{kept}} to {{giver}} · {{share}} to {{artist}}, its artist",
    },
    earlierGifts_one: "{{count}} earlier gift",
    earlierGifts_other: "{{count}} earlier gifts",
  },
  /** Someone else's sticker board, opened from Explore. */
  artistBoard: {
    /** LINE's header, and the board's name for assistive tech. */
    title: "{{name}}'s sticker board",
    theirStats: "{{name}}: their stats",
    statsDidntLoad: "Their stats didn’t load: {{reason}}",
    /** Read out for a focused sticker. */
    hint: "Enter opens its menu: view it, or offer for it",
    blank: "{{name}} hasn’t stuck anything up yet.",
    didntLoad: "Couldn’t load {{name}}’s board: {{reason}}",
    /** Back to Explore. */
    explore: "Explore",
    view: "View",
    offer: "Offer for it",
    give: "Give",
    /** A sticker opened from it: `<duration/>` is how long it took, `<artist/>` who drew it. */
    drawnIn: "Drawn in <duration/> · <artist/>",
    close: "Close",
  },
} as const;
