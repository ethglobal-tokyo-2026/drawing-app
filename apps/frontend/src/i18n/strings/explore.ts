import type { Section } from "../catalog";

export const explore = {
  search: {
    /** Explore tab, top: placeholder text in the artist search field, beside its @ icon, until you type */
    placeholder: { en: "search artists", ja: "アーティストをさがす" },
    /** Explore tab, top: screen readers' name for the artist search field */
    label: { en: "Search artists by handle", ja: "ユーザー名でアーティストをさがす" },
    /** Explore tab, top: screen readers' name for the X button that appears in the search field once you've typed, and empties it */
    clear: { en: "Clear search", ja: "検索をクリア" },
    /** Explore tab, while searching: fine print where the results will be, while the search is loading */
    searching: { en: "Searching…", ja: "検索中…" },
    /** Explore tab, while searching: fine print over the results when one artist's handle matches */
    artists_one: { en: "{{count}} artist" },
    /** Explore tab, while searching: fine print over the results with how many artists' handles match */
    artists_other: { en: "{{count}} artists", ja: "アーティスト{{count}}人" },
    notFound: {
      /** Explore tab, after a search that matches no one: the heading, with the searched handle */
      title: {
        en: "No one here is {{handle}} yet",
        ja: "{{handle}}さんはまだクロッキーにいません",
      },
      /** Explore tab, after a search that matches no one: the paragraph under the heading, on checking the spelling or inviting a LINE friend with a sticker */
      lead: {
        en: "Handles are exact, so check the spelling with them. If they’re your LINE friend, give them a sticker from your board in a LINE chat: receiving it brings them in.",
        ja: "ユーザー名はつづりが正確でないと見つかりません。本人に確認してください。LINEの友だちなら、シールボードからトークでシールを贈りましょう。受け取れば、その友だちもクロッキーに参加できます。",
      },
    },
  },
  /** Explore tab, on opening it: fine print under the search field while today's stickers, the leaderboards and the activity feed load */
  loading: { en: "Loading…", ja: "読み込み中…" },
  /** Explore tab, a search result or leaderboard row that is you: under your handle, where other people's rows show their LINE name */
  you: { en: "You", ja: "あなた" },
  /** Names the sticker board a tap opens, for assistive tech. */
  stickerBoard: {
    /** Explore tab: screen readers' name for anything of yours that opens your sticker board when tapped: your search result or leaderboard row, your sticker in Today's stickers, or your post's head in the activity feed */
    yours: { en: "Your sticker board", ja: "あなたのシールボード" },
    /** Explore tab: screen readers' name for someone's search result or leaderboard row, their sticker in Today's stickers, or their post's head in the activity feed, which opens their sticker board when tapped */
    theirs: { en: "{{handle}}'s sticker board", ja: "{{handle}}さんのシールボード" },
  },
  today: {
    /** Explore tab, below the search field: the heading of the first section, today's sealed stickers, beside a date badge */
    title: { en: "Today’s stickers", ja: "今日のシール" },
    /** Explore tab, Today's stickers section: fine print in place of the stickers when no one has sealed one today */
    none: {
      en: "No one has sealed a sticker yet today.",
      ja: "今日はまだ誰もシールを仕上げていません。",
    },
  },
  thisWeek: {
    /** Explore tab: the heading of the leaderboards section, below Today's stickers */
    title: { en: "This week", ja: "今週" },
    /** Explore tab, leaderboards section: fine print beside the heading, when the week's leaderboards start over */
    resets: { en: "Resets Monday 4:00", ja: "月曜4:00にリセット" },
    /** Explore tab, leaderboards section: screen readers' name for the row of three leaderboard tabs */
    leaderboards: { en: "This week's leaderboards", ja: "今週のランキング" },
    /** Explore tab, leaderboards section: fine print in place of the rows when the chosen leaderboard has no one on it this week */
    empty: { en: "No one is on it yet this week.", ja: "今週はまだ誰もランクインしていません。" },
  },
  /** The leaderboards' tabs. */
  leaderboards: {
    /** Explore tab, leaderboards section: the first tab, ranking people by the gratitude they earned this week */
    mostGratitude: { en: "Most gratitude", ja: "感謝の数" },
    /** Explore tab, leaderboards section: the second tab, ranking people by the most hits in one gratitude combo this week */
    bestCombo: { en: "Best combo", ja: "最大コンボ" },
    /** Explore tab, leaderboards section: the third tab, ranking people by their current streak of days sealing a sticker */
    longestStreak: { en: "Longest streak", ja: "連続日数" },
  },
  /** A leaderboard row's figure. A unit in <small> is set small beside its number. */
  figure: {
    /** Explore tab, Best combo leaderboard: the figure at the end of each row, that person's hits in their best combo */
    hits: { en: "×{{hits}}", ja: "×{{hits}}" },
    /** Explore tab, Longest streak leaderboard: the figure at the end of a row whose streak is one day, the unit set small */
    streak_one: { en: "{{count}}<small>day</small>" },
    /** Explore tab, Longest streak leaderboard: the figure at the end of each row, that person's streak in days, the unit set small */
    streak_other: { en: "{{count}}<small>days</small>", ja: "{{count}}<small>日</small>" },
  },
  /** The activity feed. <artist/>, <giver/> and <receiver/> are handles. */
  feed: {
    /** Explore tab, activity feed: a post's line when someone sealed a sticker, their handle in bold */
    sealed: { en: "<artist/> made a sticker", ja: "<artist/>さんがシールをつくりました" },
    /** Explore tab, activity feed: a post's line when someone gave a sticker to someone else, both handles in bold */
    gave: {
      en: "<giver/> gave a sticker to <receiver/>",
      ja: "<giver/>さんが<receiver/>さんにシールを贈りました",
    },
    /** Explore tab, activity feed: a post's line when someone gave a sticker to you, their handle and "you" in bold */
    gaveYou: {
      en: "<giver/> gave a sticker to <b>you</b>",
      ja: "<giver/>さんが<b>あなた</b>にシールを贈りました",
    },
    /** Explore tab, activity feed: fine print under a post's sticker: its number, drawing time and artist's handle */
    caption: {
      en: "{{number}} · <duration/> · <artist/>",
      ja: "{{number}}・<duration/>・<artist/>",
    },
    /** How long ago, in its largest whole unit. */
    ago: {
      /** Explore tab, activity feed: fine print at the end of a post's head, how long ago it happened, under an hour */
      minutes: { en: "{{minutes}} min", ja: "{{minutes}}分前" },
      /** Explore tab, activity feed: fine print at the end of a post's head, how long ago it happened, from an hour to a day */
      hours: { en: "{{hours}} hr", ja: "{{hours}}時間前" },
      /** Explore tab, activity feed: fine print at the end of a post's head, how long ago it happened, a day or more */
      days: { en: "{{days}} d", ja: "{{days}}日前" },
    },
  },
  failed: {
    /** Explore tab, when it fails to load: the heading of the error, over the reason and a Try again button */
    explore: { en: "Couldn’t load Explore", ja: "「さがす」を読み込めませんでした" },
    /** Explore tab, when a search fails to load: the heading of the error, over the reason and a Try again button */
    searchResults: { en: "Couldn’t load search results", ja: "検索結果を読み込めませんでした" },
    /** A name's link that nobody holds, or that didn't load. */
    ensName: { en: "Couldn’t load {{name}}" },
    /** Explore tab, when it or a search fails to load: the small button under the error's reason that asks again */
    tryAgain: { en: "Try again", ja: "もう一度" },
  },
} as const satisfies Section;
