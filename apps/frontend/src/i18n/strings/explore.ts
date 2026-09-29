import type { Section } from "../catalog";

export const explore = {
  search: {
    /** Explore tab, top: placeholder text in the artist search field, beside its @ icon, until you type */
    placeholder: { en: "Search artists", ja: "アーティストをさがす" },
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
  /** Explore tab, on opening it: what screen readers hear while the sticker pile or the leaderboards load */
  loading: { en: "Loading…", ja: "読み込み中…" },
  /** Explore tab, a search result or leaderboard row that is you: under your handle, where other people's rows show their LINE name */
  you: { en: "You", ja: "あなた" },
  /** Names the sticker board a tap opens, for assistive tech. */
  stickerBoard: {
    /** Explore tab: screen readers' name for your search result or leaderboard row, which opens your sticker board when tapped */
    yours: { en: "Your sticker board", ja: "あなたのシールボード" },
    /** Explore tab: screen readers' name for someone's search result or leaderboard row, which opens their sticker board when tapped */
    theirs: { en: "{{handle}}'s sticker board", ja: "{{handle}}さんのシールボード" },
  },
  /** The switch under the search between Explore's two views. */
  views: {
    /** Explore tab, under the search field: screen readers' name for the switch between the sticker pile and This week */
    label: { en: "Explore", ja: "さがす" },
    /** Explore tab, under the search field: the switch's first half, which shows the sticker pile */
    stickers: { en: "Stickers", ja: "シール" },
    /** Explore tab, under the search field: the switch's second half, which shows this week's leaderboards */
    thisWeek: { en: "This week", ja: "今週" },
  },
  /** The sticker pile: each day's stickers heaped on its own perforated floor. */
  pile: {
    /** Explore tab, Stickers view: screen readers' heading for today's heap */
    today: { en: "Today", ja: "今日" },
    /** Explore tab, Stickers view: screen readers' heading for yesterday's heap; older days are their date, in the app's language */
    yesterday: { en: "Yesterday", ja: "昨日" },
    /** Explore tab, Stickers view: the yellow dot badge on today's perforation, with the date, such as 9.26 */
    todayBadge: { en: "Today {{date}}", ja: "今日{{date}}" },
    /** Explore tab, Stickers view: screen readers' name for a sticker in the pile, such as "No.0147 by @mika, 5 min ago"; a tap opens it */
    sticker: { en: "{{number}} by {{artist}}, {{ago}}", ja: "{{artist}}の{{number}}、{{ago}}" },
    /** Explore tab, Stickers view: screen readers' name for a sticker in the pile that was given, with who it last went to */
    stickerGiven: {
      en: "{{number}} by {{artist}}, {{ago}}, given to {{receiver}}",
      ja: "{{artist}}の{{number}}、{{ago}}、{{receiver}}さんに贈られました",
    },
    /** Explore tab, Stickers view: the aqua tag under a given sticker's name tag; <handle/> is who it went to */
    to: { en: "to <handle/>", ja: "<handle/>さんへ" },
    /** Explore tab, Stickers view: the line under a faint sticker outline on today's floor while no one has sealed a sticker today */
    empty: {
      en: "The first sticker sealed today lands here.",
      ja: "今日さいしょに仕上がったシールが、ここに落ちてきます。",
    },
    /** Explore tab, Stickers view: what screen readers hear once as the pile opens, when one sticker arrived since your last look */
    arrivals_one: { en: "{{count}} new sticker since you last looked" },
    /** Explore tab, Stickers view: what screen readers hear once as the pile opens, when stickers arrived since your last look */
    arrivals_other: {
      en: "{{count}} new stickers since you last looked",
      ja: "前に見たときから、新しいシールが{{count}}枚あります",
    },
    /** How long ago a sticker was sealed, in its largest whole unit. */
    ago: {
      /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed under a minute ago */
      justNow: { en: "just now", ja: "たった今" },
      /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed a minute to an hour ago */
      minutes: { en: "{{minutes}} min ago", ja: "{{minutes}}分前" },
      /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed an hour to a day ago */
      hours: { en: "{{hours}} hr ago", ja: "{{hours}}時間前" },
      /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed a day ago */
      days_one: { en: "{{count}} day ago" },
      /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed days ago */
      days_other: { en: "{{count}} days ago", ja: "{{count}}日前" },
    },
  },
  thisWeek: {
    /** Explore tab, This week view: screen readers' heading for the leaderboards */
    title: { en: "This week", ja: "今週" },
    /** Explore tab, This week view: fine print under the leaderboard, when the week's leaderboards start over */
    resets: { en: "Resets Monday 12:00 AM", ja: "月曜0:00にリセット" },
    /** Explore tab, This week view: screen readers' name for the row of three leaderboard tabs */
    leaderboards: { en: "This week's leaderboards", ja: "今週のランキング" },
    /** Explore tab, This week view: fine print in place of the rows when the chosen leaderboard has no one on it this week */
    empty: { en: "No one is on it yet this week.", ja: "今週はまだ誰もランクインしていません。" },
  },
  /** The leaderboards' tabs. */
  leaderboards: {
    /** Explore tab, This week view: the first tab, ranking people by the gratitude they earned this week */
    mostGratitude: { en: "Most gratitude", ja: "感謝の数" },
    /** Explore tab, This week view: the second tab, ranking people by the most hits in one gratitude combo this week */
    bestCombo: { en: "Best combo", ja: "最大コンボ" },
    /** Explore tab, This week view: the third tab, ranking people by their current streak of days sealing a sticker */
    longestStreak: { en: "Longest streak", ja: "連続日数" },
  },
  /** A leaderboard row's figure. A unit in <small> is set small beside its number. */
  figure: {
    /** Explore tab, Longest streak leaderboard: the figure at the end of a row whose streak is one day, the unit set small */
    streak_one: { en: "{{count}}<small>day</small>" },
    /** Explore tab, Longest streak leaderboard: the figure at the end of each row, that person's streak in days, the unit set small */
    streak_other: { en: "{{count}}<small>days</small>", ja: "{{count}}<small>日</small>" },
  },
  failed: {
    /** Explore tab, when it fails to load: the heading of the error, over the reason and a Try again button */
    explore: { en: "Couldn’t load Explore", ja: "「さがす」を読み込めませんでした" },
    /** Explore tab, when a search fails to load: the heading of the error, over the reason and a Try again button */
    searchResults: { en: "Couldn’t load search results", ja: "検索結果を読み込めませんでした" },
    /** Explore, opened from a croquis.eth name's link: the heading of the error when nobody holds the name or their board didn't load; {{name}} is the whole name, such as alice.croquis.eth */
    ensName: { en: "Couldn’t load {{name}}", ja: "{{name}}を読み込めませんでした" },
    /** Explore tab, when it or a search fails to load: the small button under the error's reason that asks again */
    tryAgain: { en: "Try again", ja: "もう一度" },
  },
  /** A sticker lifted off the pile into a sheet. {{artist}} is its artist's @handle, or LINE name. */
  lifted: {
    /** Explore tab, lifted sticker: screen readers' name for the sheet, the sticker's number and who drew it */
    label: { en: "{{no}} by {{artist}}", ja: "{{artist}}さんの{{no}}" },
    /** Explore tab, lifted sticker: fine print under the artist chip: the number, drawing time and the day it was sealed */
    caption: { en: "{{no}} · <duration/> · {{day}}", ja: "{{no}}・<duration/>・{{day}}" },
    /** Explore tab, lifted sticker: the same fine print for a sticker someone was given; <receiver/> is their @handle */
    captionGiven: {
      en: "{{no}} · <duration/> · {{day}} · to <receiver/>",
      ja: "{{no}}・<duration/>・{{day}}・<receiver/>さんへ",
    },
    /** Explore tab, lifted sticker: label stock under the fine print that opens the artist's sticker board */
    goToBoard: { en: "Go to {{artist}}'s sticker board", ja: "{{artist}}さんのシールボードへ" },
    /** Explore tab, lifted sticker: the same label stock on a sticker you drew, opening your own board */
    goToYourBoard: { en: "Go to your sticker board", ja: "あなたのシールボードへ" },
    /** Explore tab, lifted sticker: the quiet link at the sheet's foot that puts the sticker back on the pile */
    putBack: { en: "Put back", ja: "もどす" },
    /** Explore tab, lifted sticker: screen readers' name for the small arrow left of the sticker, which lifts the one before it */
    previous: { en: "Previous sticker", ja: "前のシール" },
    /** Explore tab, lifted sticker: screen readers' name for the small arrow right of the sticker, which lifts the one after it */
    next: { en: "Next sticker", ja: "次のシール" },
    /** Explore tab, lifted sticker: what screen readers hear on paging: the sticker, its artist and where it is in the pile */
    shown: {
      en: "{{no}} by {{artist}}, {{position}} of {{setSize}}",
      ja: "{{artist}}さんの{{no}}、{{setSize}}枚中{{position}}枚目",
    },
  },
} as const satisfies Section;
