import type { Section } from "../catalog";

export const stickers = {
  duration: {
    minutesAndSeconds: { en: "{{minutes}}m {{seconds}}s", ja: "{{minutes}}分{{seconds}}秒" },
    minutes: { en: "{{minutes}}m", ja: "{{minutes}}分" },
    seconds: { en: "{{seconds}}s", ja: "{{seconds}}秒" },
  },
  spokenDuration: {
    minutesAndSeconds: { en: "{{minutes}} {{seconds}}", ja: "{{minutes}}{{seconds}}" },
    minutes_one: { en: "{{count}} minute" },
    minutes_other: { en: "{{count}} minutes", ja: "{{count}}分" },
    seconds_one: { en: "{{count}} second" },
    seconds_other: { en: "{{count}} seconds", ja: "{{count}}秒" },
  },
  /** Names a sticker's Original Artist: a caption, then their handle. */
  artistChip: {
    /** Names the chip for assistive tech. */
    label: { en: "Artist: {{name}}" },
    /** Small, over the handle. */
    artist: { en: "Artist" },
    /** Before the handle, on one line. */
    by: { en: "By" },
  },
  /** The stickers the give and offer sheets pick from. */
  keptStickers: {
    notLoaded: { en: "Couldn’t load your stickers: {{reason}}" },
  },
} as const satisfies Section;
