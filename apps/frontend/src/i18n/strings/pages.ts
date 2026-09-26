import type { Section } from "../catalog";

/** The terms and privacy pages in public/; each language links its own copy. */
export const pages = {
  terms: { en: "/terms.html", ja: "/ja/terms.html" },
  privacy: { en: "/privacy.html", ja: "/ja/privacy.html" },
} as const satisfies Section;
