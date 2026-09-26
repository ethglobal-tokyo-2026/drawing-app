import type { Section } from "../catalog";

export const ui = {
  sheet: {
    /** Every bottom sheet, such as Accept and Send gratitude: the perforation's name for assistive tech, a button that closes the sheet when tapped or dragged down; {{label}} is the sheet's name */
    close: { en: "Close {{label}}", ja: "「{{label}}」を閉じる" },
  },
} as const satisfies Section;
