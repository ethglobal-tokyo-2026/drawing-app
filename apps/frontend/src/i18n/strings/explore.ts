import type { Section } from "../catalog";

export const explore = {
  search: {
    placeholder: { en: "search artists" },
    label: { en: "Search artists by handle" },
    clear: { en: "Clear search" },
    searching: { en: "Searching…" },
    artists_one: { en: "{{count}} artist" },
    artists_other: { en: "{{count}} artists" },
    notFound: {
      title: { en: "No one here is {{handle}} yet" },
      lead: {
        en: "Handles are exact, so check the spelling with them. If they’re your LINE friend, give them a sticker from your board in a LINE chat: receiving it brings them in.",
      },
    },
  },
  loading: { en: "Loading…" },
  /** Under your own handle in a list, where others show their LINE name. */
  you: { en: "You" },
  /** Names the sticker board a tap opens, for assistive tech. */
  stickerBoard: {
    yours: { en: "Your sticker board" },
    theirs: { en: "{{handle}}'s sticker board" },
  },
  today: {
    title: { en: "Today’s stickers" },
    none: { en: "No one has sealed a sticker yet today." },
  },
  thisWeek: {
    title: { en: "This week" },
    resets: { en: "Resets Monday 4:00" },
    /** Names the leaderboard tabs for assistive tech. */
    leaderboards: { en: "This week's leaderboards" },
    empty: { en: "No one is on it yet this week." },
  },
  /** The leaderboards' tabs. */
  leaderboards: {
    mostGratitude: { en: "Most gratitude" },
    bestCombo: { en: "Best combo" },
    longestStreak: { en: "Longest streak" },
  },
  /** A leaderboard row's figure. A unit in <small> is set small beside its number. */
  figure: {
    hits: { en: "×{{hits}}" },
    streak_one: { en: "{{count}}<small>day</small>" },
    streak_other: { en: "{{count}}<small>days</small>" },
  },
  /** The activity feed. <artist/>, <giver/> and <receiver/> are handles. */
  feed: {
    sealed: { en: "<artist/> made a sticker" },
    gave: { en: "<giver/> gave a sticker to <receiver/>" },
    gaveYou: { en: "<giver/> gave a sticker to <b>you</b>" },
    /** Under the sticker: its number, drawing time and artist. */
    caption: { en: "{{number}} · <duration/> · <artist/>" },
    /** How long ago, in its largest whole unit. */
    ago: {
      minutes: { en: "{{minutes}} min" },
      hours: { en: "{{hours}} hr" },
      days: { en: "{{days}} d" },
    },
  },
  failed: {
    explore: { en: "Couldn’t load Explore" },
    searchResults: { en: "Couldn’t load search results" },
    tryAgain: { en: "Try again" },
  },
} as const satisfies Section;
