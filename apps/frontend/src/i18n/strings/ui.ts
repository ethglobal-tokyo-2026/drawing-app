import type { Section } from "../catalog";

export const ui = {
  sheet: {
    /** Names the perforation, which closes the sheet, for assistive tech; `label` names the sheet. */
    close: { en: "Close {{label}}" },
  },
} as const satisfies Section;
