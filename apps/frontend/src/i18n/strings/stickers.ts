import type { Section } from "../catalog";

export const stickers = {
  duration: {
    /** A sticker's drawing time in fine print, like 4m 52s: on the sealed card, the Explore feed, a sticker's view on someone else's board, the giving screen and the Mini-game, and in a Gift Message's text */
    minutesAndSeconds: { en: "{{minutes}}m {{seconds}}s", ja: "{{minutes}}分{{seconds}}秒" },
    /** A sticker's drawing time in fine print on the minute, like 5m, wherever the 4m 52s form shows */
    minutes: { en: "{{minutes}}m", ja: "{{minutes}}分" },
    /** A sticker's drawing time in fine print under a minute, like 54s, wherever the 4m 52s form shows */
    seconds: { en: "{{seconds}}s", ja: "{{seconds}}秒" },
  },
  spokenDuration: {
    /** Screen readers only: a drawing time read aloud, the minutes then the seconds, for the fine-print time and a sticker on a board */
    minutesAndSeconds: { en: "{{minutes}} {{seconds}}", ja: "{{minutes}}{{seconds}}" },
    /** Screen readers only: the minutes of a drawing time read aloud, for 1 minute */
    minutes_one: { en: "{{count}} minute" },
    /** Screen readers only: the minutes of a drawing time read aloud */
    minutes_other: { en: "{{count}} minutes", ja: "{{count}}分" },
    /** Screen readers only: the seconds of a drawing time read aloud, for 1 second */
    seconds_one: { en: "{{count}} second" },
    /** Screen readers only: the seconds of a drawing time read aloud */
    seconds_other: { en: "{{count}} seconds", ja: "{{count}}秒" },
  },
  /** Names a sticker's Original Artist: a caption, then their handle. */
  artistChip: {
    /** Artist chip, the Original Artist's picture and name on a sticker someone else drew: its screen-reader label; {{name}} is their @handle or LINE name */
    label: { en: "Artist: {{name}}", ja: "作者：{{name}}" },
    /** Artist chip: small caption over the Original Artist's name, on a sticker's detail, its toolbar and menu, and over stickers as your board first loads */
    artist: { en: "Artist", ja: "作者" },
    /** Artist chip, one-line form for tight rows: before the Original Artist's name, as in By @alice */
    by: { en: "By", ja: "作者" },
  },
  /** An NSFW sticker, which only someone with Show 18+ stickers on sees plainly. */
  nsfw: {
    /** Over an NSFW sticker that's blurred because Show 18+ stickers is off, on a sticker board, a sticker's detail, the sticker tray, Explore, and the give sheet's picker: the small mark in its middle */
    mark: { en: "18+", ja: "18+" },
    /** Screen readers only: an NSFW sticker that's blurred because Show 18+ stickers is off, wherever the 18+ mark shows */
    veiled: { en: "Blurred: 18+ sticker", ja: "ぼかし表示：18+のシール" },
  },
  /** The stickers the give sheet picks from. */
  keptStickers: {
    /** Give sheet: alert when your stickers fail to load; {{reason}} is the error message */
    notLoaded: {
      en: "Couldn’t load your stickers: {{reason}}",
      ja: "手持ちのシールを読み込めませんでした：{{reason}}",
    },
  },
} as const satisfies Section;
