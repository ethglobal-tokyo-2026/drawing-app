export const stickerBoard = {
  /** The developer slip: English only, so the Japanese catalog never translates it. */
  developer: {
    language: {
      title: "Language: {{language}}",
      line: "LINE's",
      english: "English",
      japanese: "日本語",
      notKept: "The choice couldn't be kept: {{reason}}",
    },
  },
  tryAgain: "Try again",
  /** Your own sticker board. */
  board: {
    /** Your name, which turns the board over to its stat board. */
    yourStats: "{{name}}: your stats",
    draw: "Draw",
    drawLabel: "Draw a new sticker",
    /** `tickets` says how many tickets you have. */
    drawLabelWithTickets: "Draw a new sticker: you have {{tickets}}",
    /** Beside Draw until the first sticker. */
    firstSticker: "Make your first sticker",
    label: "Sticker board",
    /** Read out for a focused sticker, then for the selected one. */
    focusHint: "Enter selects it. Arrow keys go to the other stickers.",
    selectedHint:
      "Selected. Enter opens it, and Tab reaches its toolbar. Arrow keys move it, [ and ] turn it, minus and plus resize it, Delete takes it off the board, and Escape lets go of it.",
    /** In the empty board's dashed spot. */
    blank: "Stickers you make or receive land here.",
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
    label: "Sticker",
    back: "Sticker board",
    yourStickers: "Your stickers",
    stickersYouGave: "Stickers you gave",
    previous: "Previous sticker",
    next: "Next sticker",
    count: "{{position}} / {{setSize}}",
    countSpoken: "{{no}}, {{position}} of {{setSize}}",
    /** "sticker" stands in for the sticker's name, which no data carries yet; `<no/>` is its number. */
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
      toYou: "{{share}} of it came to you, its artist",
      fromYou: "{{kept}} came to you · {{share}} to {{artist}}, its artist",
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
    /** A sticker opened from their board: `<duration/>` is how long it took, `<artist/>` who drew it. */
    drawnIn: "Drawn in <duration/> · <artist/>",
    close: "Close",
  },
} as const;
