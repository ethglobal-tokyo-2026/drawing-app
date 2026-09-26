export const explore = {
  search: {
    placeholder: "search artists",
    label: "Search artists by handle",
    clear: "Clear search",
  },
  loading: "Loading…",
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
} as const;
