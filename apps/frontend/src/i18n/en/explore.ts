export const explore = {
  search: {
    placeholder: "search artists",
    label: "Search artists by handle",
    clear: "Clear search",
    searching: "Searching…",
    artists_one: "{{count}} artist",
    artists_other: "{{count}} artists",
    notFound: {
      title: "No one here is {{handle}} yet",
      lead: "Handles are exact, so check the spelling with them. If they’re your LINE friend, give them a sticker from your board in a LINE chat: receiving it brings them in.",
    },
  },
  loading: "Loading…",
  /** Under your own handle in a list, where others show their LINE name. */
  you: "You",
  /** Names the sticker board a tap opens, for assistive tech. */
  stickerBoard: {
    yours: "Your sticker board",
    theirs: "{{handle}}'s sticker board",
  },
  today: {
    title: "Today’s stickers",
    none: "No one has sealed a sticker yet today.",
  },
  thisWeek: {
    title: "This week",
    resets: "Resets Monday 4:00",
    /** Names the leaderboard tabs for assistive tech. */
    leaderboards: "This week's leaderboards",
    empty: "No one is on it yet this week.",
  },
  /** The leaderboards' tabs. */
  leaderboards: {
    mostGratitude: "Most gratitude",
    bestCombo: "Best combo",
    longestStreak: "Longest streak",
  },
  /** A leaderboard row's figure. A unit in <small> is set small beside its number. */
  figure: {
    hits: "×{{hits}}",
    streak_one: "{{count}}<small>day</small>",
    streak_other: "{{count}}<small>days</small>",
  },
  /** The activity feed. <artist/>, <giver/> and <receiver/> are handles. */
  feed: {
    sealed: "<artist/> made a sticker",
    gave: "<giver/> gave a sticker to <receiver/>",
    gaveYou: "<giver/> gave a sticker to <b>you</b>",
    /** Under the sticker: its number, drawing time and artist. */
    caption: "{{number}} · <duration/> · <artist/>",
    /** How long ago, in its largest whole unit. */
    ago: {
      minutes: "{{minutes}} min",
      hours: "{{hours}} hr",
      days: "{{days}} d",
    },
  },
  failed: {
    explore: "Couldn’t load Explore",
    searchResults: "Couldn’t load search results",
    /** A name's link that nobody holds, or that didn't load. */
    ensName: "Couldn’t load {{name}}",
    tryAgain: "Try again",
  },
  /** A sticker lifted off the pile into a sheet. {{artist}} is its artist's handle, or LINE name. */
  lifted: {
    /** Explore tab, lifted sticker: screen readers' name for the sheet, the sticker's number and who drew it */
    label: "{{no}} by {{artist}}",
    /** Explore tab, lifted sticker: fine print under the artist chip, the number, drawing time and the day it was sealed */
    caption: "{{no}} · <duration/> · {{day}}",
    /** Explore tab, lifted sticker: the same fine print for a sticker someone was given; <receiver/> is their handle */
    captionGiven: "{{no}} · <duration/> · {{day}} · to <receiver/>",
    /** Explore tab, lifted sticker: label stock under the fine print that opens the artist's sticker board */
    goToBoard: "Go to {{artist}}'s sticker board",
    /** Explore tab, lifted sticker: the same label stock on a sticker you drew, opening your own board */
    goToYourBoard: "Go to your sticker board",
    /** Explore tab, lifted sticker: the quiet link at the sheet's foot that puts the sticker back on the pile */
    putBack: "Put back",
    /** Explore tab, lifted sticker: screen readers' names for the small arrows either side of the sticker */
    previous: "Previous sticker",
    next: "Next sticker",
    /** Explore tab, lifted sticker: what screen readers hear on paging, the sticker, its artist and where it is in the pile */
    shown: "{{no}} by {{artist}}, {{position}} of {{setSize}}",
  },
} as const;
