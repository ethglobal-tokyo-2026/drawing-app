import type { Section } from "../catalog";

/** The terms, privacy and sources pages in public/; each language links its own copy. */
export const pages = {
  /** Receive gift dialog, Accept sheet: where the terms line's Terms link goes, opened in LINE's in-app browser */
  terms: { en: "/terms.html", ja: "/ja/terms.html" },
  /** Receive gift dialog, Accept sheet: where the terms line's Privacy Policy link goes, opened in LINE's in-app browser */
  privacy: { en: "/privacy.html", ja: "/ja/privacy.html" },
  /** Settings note, Kyoto Seika Practice Mode: where the credit's Sources link goes, the subject list's sources and licenses */
  sources: { en: "/sources.html", ja: "/ja/sources.html" },
} as const satisfies Section;
