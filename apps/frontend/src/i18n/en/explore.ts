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
      justNow: "just now",
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
} as const;
