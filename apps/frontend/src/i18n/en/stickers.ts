export const stickers = {
  duration: {
    minutesAndSeconds: "{{minutes}}m {{seconds}}s",
    minutes: "{{minutes}}m",
    seconds: "{{seconds}}s",
  },
  spokenDuration: {
    minutesAndSeconds: "{{minutes}} {{seconds}}",
    minutes_one: "{{count}} minute",
    minutes_other: "{{count}} minutes",
    seconds_one: "{{count}} second",
    seconds_other: "{{count}} seconds",
  },
  /** Names a sticker's Original Artist: a caption, then their handle. */
  artistChip: {
    /** Names the chip for assistive tech. */
    label: "Artist: {{name}}",
    /** Small, over the handle. */
    artist: "Artist",
    /** Before the handle, on one line. */
    by: "By",
  },
  /** The stickers the give and offer sheets pick from. */
  keptStickers: {
    notLoaded: "Couldn’t load your stickers: {{reason}}",
  },
} as const;
