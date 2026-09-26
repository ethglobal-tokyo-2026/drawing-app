import type { ArtKey } from "./art";

/**
 * Authored demo artists until other people's profiles, stickers and figures come from the
 * server. Screens that show them carry the demo material note.
 */

export interface ArtistAvatar {
  art: ArtKey;
  /** The field behind the art, as a hex color: it's also drawn into an image, where CSS variables don't reach. */
  bg: string;
}

/** A sticker on someone else's board. */
export interface ArtistBoardSticker {
  art: ArtKey;
  /** Center, as fractions of board width and height. */
  x: number;
  y: number;
  /** Width as a fraction of board width. */
  scale: number;
  rotation: number;
  /** Who drew it, when not the board's owner: it wears foil. */
  by?: string;
  /** Gratitude it has earned; drives its glow. */
  gratitude: number;
  no: number;
  /** Seconds spent drawing. */
  timeUsed: number;
  sealedAt: number;
}

export interface ArtistStats {
  gratitude: { daily: number; inspired: number; magic: number };
  /** 0 until they draw their first day. */
  streakDays: number;
  made: number;
  received: number;
  given: number;
  bests: {
    longestStreak: number | null;
    /** Hits in their biggest single thank-you. */
    bestCombo: number | null;
    mostThanksInADay: number | null;
  };
  /** When they joined, as epoch ms. */
  since: number;
}

export interface Artist {
  handle: string;
  displayName: string;
  avatar: ArtistAvatar;
  boardAddress: string;
  stats: ArtistStats;
  /** Oldest first, so later stickers stack on top. */
  board: ArtistBoardSticker[];
}

const day = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const plainStats = (s: Partial<ArtistStats> & Pick<ArtistStats, "since">): ArtistStats => ({
  gratitude: { daily: 0, inspired: 0, magic: 0 },
  streakDays: 0,
  made: 0,
  received: 0,
  given: 0,
  bests: { longestStreak: null, bestCombo: null, mostThanksInADay: null },
  ...s,
});

/** A board of the artist's own stickers laid out down the page, newest first. */
const ownBoard = (arts: ArtKey[], firstNo: number): ArtistBoardSticker[] =>
  arts.map((art, i) => ({
    art,
    x: i % 2 ? 0.7 : 0.32,
    y: 0.16 + i * 0.2,
    scale: 0.34,
    rotation: i % 2 ? 6 : -5,
    gratitude: 120 * (arts.length - i),
    no: firstNo - i,
    timeUsed: 240 + i * 17,
    sealedAt: day("2026-09-20") - i * DAY_MS,
  }));

const artist = (
  handle: string,
  displayName: string,
  avatar: ArtistAvatar,
  stats: ArtistStats,
  board: ArtistBoardSticker[],
): Artist => ({ handle, displayName, avatar, boardAddress: `${handle}.sketch.eth`, stats, board });

export const ARTISTS: Artist[] = [
  artist(
    "mika",
    "Mika Hoshino",
    { art: "girl", bg: "#f6c0da" },
    {
      gratitude: { daily: 2340, inspired: 3105, magic: 767 },
      streakDays: 38,
      made: 64,
      received: 21,
      given: 17,
      bests: { longestStreak: 38, bestCombo: 74, mostThanksInADay: 402 },
      since: day("2026-08-03"),
    },
    [
      {
        art: "sleepy-cat",
        x: 0.3,
        y: 0.2,
        scale: 0.4,
        rotation: -4,
        gratitude: 820,
        no: 212,
        timeUsed: 298,
        sealedAt: day("2026-09-26"),
      },
      {
        art: "bird",
        x: 0.74,
        y: 0.16,
        scale: 0.34,
        rotation: 8,
        gratitude: 540,
        no: 188,
        timeUsed: 276,
        sealedAt: day("2026-09-21"),
      },
      {
        art: "rain-cloud",
        x: 0.5,
        y: 0.45,
        scale: 0.3,
        rotation: 0,
        gratitude: 310,
        no: 176,
        timeUsed: 251,
        sealedAt: day("2026-09-18"),
      },
      {
        art: "umbrella",
        x: 0.8,
        y: 0.5,
        scale: 0.3,
        rotation: 6,
        gratitude: 260,
        no: 169,
        timeUsed: 233,
        sealedAt: day("2026-09-16"),
      },
      {
        art: "fish",
        x: 0.24,
        y: 0.62,
        scale: 0.38,
        rotation: 10,
        by: "yui",
        gratitude: 0,
        no: 93,
        timeUsed: 300,
        sealedAt: day("2026-09-23"),
      },
      {
        art: "dango",
        x: 0.45,
        y: 0.84,
        scale: 0.2,
        rotation: -12,
        by: "mimi",
        gratitude: 0,
        no: 97,
        timeUsed: 190,
        sealedAt: day("2026-09-02"),
      },
      {
        art: "cherry",
        x: 0.8,
        y: 0.82,
        scale: 0.28,
        rotation: 4,
        by: "mimi",
        gratitude: 0,
        no: 88,
        timeUsed: 207,
        sealedAt: day("2026-08-30"),
      },
    ],
  ),
  artist(
    "ken",
    "Ken Mori",
    { art: "lightning", bg: "#f8e7a8" },
    plainStats({
      gratitude: { daily: 1210, inspired: 980, magic: 140 },
      streakDays: 24,
      made: 31,
      received: 9,
      given: 12,
      bests: { longestStreak: 24, bestCombo: 88, mostThanksInADay: 233 },
      since: day("2026-08-11"),
    }),
    ownBoard(["lightning", "fish", "mushroom"], 120),
  ),
  artist(
    "ゆず",
    "Yuzu Kato",
    { art: "onigiri", bg: "#e5e3ec" },
    plainStats({
      gratitude: { daily: 420, inspired: 180, magic: 0 },
      streakDays: 6,
      made: 8,
      since: day("2026-09-12"),
    }),
    ownBoard(["onigiri"], 205),
  ),
  artist(
    "natsu",
    "Natsuki Ono",
    { art: "jellyfish", bg: "#d4c9f9" },
    plainStats({
      gratitude: { daily: 880, inspired: 520, magic: 122 },
      streakDays: 41,
      made: 44,
      received: 15,
      given: 10,
      bests: { longestStreak: 41, bestCombo: 63, mostThanksInADay: 310 },
      since: day("2026-08-01"),
    }),
    ownBoard(["jellyfish", "moon"], 150),
  ),
  artist(
    "aoi",
    "Aoi Takeda",
    { art: "fox", bg: "#f8e7a8" },
    plainStats({
      gratitude: { daily: 700, inspired: 480, magic: 129 },
      streakDays: 12,
      made: 22,
      received: 11,
      given: 8,
      bests: { longestStreak: 19, bestCombo: 69, mostThanksInADay: 188 },
      since: day("2026-08-20"),
    }),
    ownBoard(["fox", "cherry"], 160),
  ),
  artist(
    "hina",
    "Hina Sakamoto",
    { art: "ghost", bg: "#e5e3ec" },
    plainStats({
      gratitude: { daily: 660, inspired: 410, magic: 118 },
      streakDays: 27,
      made: 29,
      received: 7,
      given: 6,
      bests: { longestStreak: 27, bestCombo: 52, mostThanksInADay: 170 },
      since: day("2026-08-14"),
    }),
    ownBoard(["ghost", "bunny"], 170),
  ),
  artist(
    "kaede",
    "Kaede Shimizu",
    { art: "planet", bg: "#d4c9f9" },
    plainStats({
      gratitude: { daily: 560, inspired: 330, magic: 74 },
      streakDays: 9,
      made: 18,
      received: 5,
      given: 4,
      bests: { longestStreak: 14, bestCombo: 58, mostThanksInADay: 140 },
      since: day("2026-08-25"),
    }),
    ownBoard(["planet", "moon"], 180),
  ),
  artist(
    "ren",
    "Ren Kuroda",
    { art: "daruma", bg: "#f6c0da" },
    plainStats({
      gratitude: { daily: 610, inspired: 240, magic: 30 },
      streakDays: 30,
      made: 30,
      received: 4,
      given: 3,
      bests: { longestStreak: 30, bestCombo: 41, mostThanksInADay: 120 },
      since: day("2026-08-27"),
    }),
    ownBoard(["daruma"], 190),
  ),
  artist(
    "michiru",
    "Michiru Hoshino",
    { art: "moon", bg: "#27305e" },
    plainStats({
      gratitude: { daily: 300, inspired: 90, magic: 0 },
      streakDays: 5,
      made: 7,
      since: day("2026-09-10"),
    }),
    ownBoard(["moon"], 196),
  ),
  artist(
    "mimi",
    "Mimi Kato",
    { art: "bunny", bg: "#f6c0da" },
    plainStats({
      gratitude: { daily: 380, inspired: 460, magic: 40 },
      streakDays: 11,
      made: 16,
      received: 2,
      given: 9,
      bests: { longestStreak: 11, bestCombo: 33, mostThanksInADay: 96 },
      since: day("2026-09-01"),
    }),
    ownBoard(["bunny", "cherry", "dango"], 86),
  ),
  artist(
    "minato",
    "Minato Abe",
    { art: "sailboat", bg: "#cfe9ff" },
    plainStats({
      gratitude: { daily: 140, inspired: 0, magic: 0 },
      streakDays: 3,
      made: 3,
      since: day("2026-09-19"),
    }),
    ownBoard(["mushroom"], 209),
  ),
  artist(
    "yui",
    "Yui Ogawa",
    { art: "girl", bg: "#f8e7a8" },
    plainStats({
      gratitude: { daily: 520, inspired: 610, magic: 88 },
      streakDays: 16,
      made: 21,
      given: 11,
      bests: { longestStreak: 16, bestCombo: 45, mostThanksInADay: 130 },
      since: day("2026-08-22"),
    }),
    ownBoard(["fish", "bird"], 93),
  ),
  artist(
    "bob",
    "Bob Tanaka",
    { art: "boy", bg: "#abe6ec" },
    plainStats({
      received: 1,
      bests: { longestStreak: null, bestCombo: 64, mostThanksInADay: null },
      since: day("2026-09-23"),
    }),
    [
      {
        art: "cherry",
        x: 0.5,
        y: 0.4,
        scale: 0.4,
        rotation: -6,
        by: "mimi",
        gratitude: 0,
        no: 91,
        timeUsed: 199,
        sealedAt: day("2026-08-31"),
      },
    ],
  ),
];

export const artistByHandle = new Map(ARTISTS.map((a) => [a.handle, a]));

/** Their newest sticker of their own, which leads their rows in Explore; their picture before they've made one. */
export const latestArt = (a: Artist): ArtKey => {
  const own = a.board.filter((s) => !s.by);
  return own.length ? own.reduce((n, s) => (s.no > n.no ? s : n)).art : a.avatar.art;
};

export const gratitudeTotal = (s: ArtistStats) =>
  s.gratitude.daily + s.gratitude.inspired + s.gratitude.magic;
