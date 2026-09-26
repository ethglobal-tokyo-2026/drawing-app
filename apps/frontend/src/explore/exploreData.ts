/**
 * Authored demo Explore content until the activity feed and the weekly leaderboards come
 * from the server. `ME` stands for whoever is signed in; other entries are demo artist handles.
 */
export const ME = Symbol("me");

export type Who = string | typeof ME;

/** Stickers sealed today, newest first. */
export const TODAYS_STICKERS: Who[] = ["mika", ME, "ken", "ゆず", "hina"];

export type Leaderboard = "most-thanked" | "best-combo" | "longest-streak";

export const LEADERBOARDS: { id: Leaderboard; label: string }[] = [
  { id: "most-thanked", label: "Most thanked" },
  { id: "best-combo", label: "Best combo" },
  { id: "longest-streak", label: "Longest streak" },
];

export interface Standing {
  rank: number;
  who: Who;
  value: number;
}

/** The top five, plus your own standing when you're outside them. */
export const THIS_WEEK: Record<Leaderboard, Standing[]> = {
  "most-thanked": [
    { rank: 1, who: ME, value: 3066 },
    { rank: 2, who: "natsu", value: 1522 },
    { rank: 3, who: "aoi", value: 1309 },
    { rank: 4, who: "hina", value: 1188 },
    { rank: 5, who: "kaede", value: 964 },
  ],
  "best-combo": [
    { rank: 1, who: "ken", value: 88 },
    { rank: 2, who: "mika", value: 74 },
    { rank: 3, who: "aoi", value: 69 },
    { rank: 4, who: "natsu", value: 63 },
    { rank: 5, who: "kaede", value: 58 },
    { rank: 14, who: ME, value: 47 },
  ],
  "longest-streak": [
    { rank: 1, who: "natsu", value: 41 },
    { rank: 2, who: "mika", value: 38 },
    { rank: 3, who: "ren", value: 30 },
    { rank: 4, who: "hina", value: 27 },
    { rank: 5, who: "ken", value: 24 },
    { rank: 22, who: ME, value: 9 },
  ],
};

export type FeedItem =
  | { kind: "made"; who: string; minutesAgo: number; no: number; timeUsed: number }
  | { kind: "gave"; who: string; to: string; minutesAgo: number; no: number; timeUsed: number };

export const FEED: FeedItem[] = [
  { kind: "made", who: "mika", minutesAgo: 1, no: 212, timeUsed: 298 },
  { kind: "gave", who: "ken", to: "aoi", minutesAgo: 14, no: 208, timeUsed: 241 },
  { kind: "made", who: "hina", minutesAgo: 95, no: 201, timeUsed: 300 },
];
