import type { Section } from "../catalog";

/** The terms and privacy pages in public/; each language links its own copy. */
export const pages = {
  /** Receive gift dialog, Accept sheet: where the terms line's Terms link goes, opened in LINE's in-app browser */
  terms: { en: "/terms.html", ja: "/ja/terms.html" },
  /** Receive gift dialog, Accept sheet: where the terms line's Privacy Policy link goes, opened in LINE's in-app browser */
  privacy: { en: "/privacy.html", ja: "/ja/privacy.html" },
} as const satisfies Section;
