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
  /** The switch under the search between Explore's two views. */
  views: {
    /** Names the switch for assistive tech. */
    label: "Explore",
    stickers: "Stickers",
    thisWeek: "This week",
  },
  /** The sticker pile: each day's stickers heaped on its own floor. */
  pile: {
    /** Each day's heading, for assistive tech. An older day is its date, in the app's language. */
    today: "Today",
    yesterday: "Yesterday",
    /** Today's dot badge, on its perforation: "Today 9.26". */
    todayBadge: "Today {{date}}",
    /** A sticker in the pile, for assistive tech: "No.0147 by @mika, 5 min ago". */
    sticker: "{{number}} by {{artist}}, {{ago}}",
    /** A given sticker, with who it last went to. */
    stickerGiven: "{{number}} by {{artist}}, {{ago}}, given to {{receiver}}",
    /** The aqua tag on a given sticker. <handle/> is who it went to. */
    to: "to <handle/>",
    /** Today's floor while it has no stickers. */
    empty: "The first sticker sealed today lands here.",
    /** Said once as the pile opens, when stickers arrived since your last look. */
    arrivals_one: "{{count}} new sticker since you last looked",
    arrivals_other: "{{count}} new stickers since you last looked",
    /** How long ago a sticker was sealed, in its largest whole unit. */
    ago: {
      justNow: "just now",
      minutes: "{{minutes}} min ago",
      hours: "{{hours}} hr ago",
      days_one: "{{count}} day ago",
      days_other: "{{count}} days ago",
    },
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
  failed: {
    explore: "Couldn’t load Explore",
    searchResults: "Couldn’t load search results",
    /** A name's link that nobody holds, or that didn't load. */
    ensName: "Couldn’t load {{name}}",
    tryAgain: "Try again",
  },
} as const;
