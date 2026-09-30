import type { Section } from "../catalog";

export const ui = {
  lazyScreen: {
    /** A note at the top of any screen, when the code for what it opened (Explore, the drawing screen, the sticker tray, a sticker's detail, Giving, the stat board, the Mini-game, a gift, World ID) didn't load: over the browser's reason, beside Reload */
    didntLoad: {
      en: "Part of Croquis didn’t load. Reload to try again.",
      ja: "クロッキーの一部を読み込めませんでした。再読み込みして、もう一度お試しください。",
    },
    /** The same note: the button that reloads the page */
    reload: { en: "Reload", ja: "再読み込み" },
  },
  sheet: {
    /** Every bottom sheet, such as Accept and Send gratitude: the perforation's name for assistive tech, a button that closes the sheet when tapped or dragged down; {{label}} is the sheet's name */
    close: { en: "Close {{label}}", ja: "「{{label}}」を閉じる" },
  },
  /** A gratitude combo's length, counted in hits the way fighting games count it. */
  hitCounter: {
    /** The hit counter, on the stat board's Bests and Explore's Best combo board: the word set in small caps after the count, when it's 1 */
    unit_one: { en: "hit" },
    /** The hit counter: the word set in small caps after the count, such as "64" then "HITS" */
    unit_other: { en: "hits", ja: "ヒット" },
    /** The hit counter: what screen readers say in its place when it's 1; {{hits}} is the count */
    spoken_one: { en: "{{hits}} hit" },
    /** The hit counter: what screen readers say in its place, such as "64 hits"; {{hits}} is the count, grouped */
    spoken_other: { en: "{{hits}} hits", ja: "{{hits}}ヒット" },
  },
} as const satisfies Section;
