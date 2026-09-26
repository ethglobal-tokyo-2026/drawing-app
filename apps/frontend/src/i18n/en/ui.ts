export const ui = {
  sheet: {
    /** Names the perforation, which closes the sheet, for assistive tech; `label` names the sheet. */
    close: "Close {{label}}",
  },
  /** A gratitude combo's length, counted in hits the way fighting games count it. */
  hitCounter: {
    /** Set in small caps after the count. */
    unit_one: "hit",
    unit_other: "hits",
    /** Read out in place of the counter; `hits` is the count, grouped. */
    spoken_one: "{{hits}} hit",
    spoken_other: "{{hits}} hits",
  },
} as const;
