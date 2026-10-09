export type Language = "en" | "ja";

/** A BCP 47 tag's language: Japanese for `ja` and `ja-*`, English for anything else. */
export const languageOf = (tag: string): Language => (/^ja(?:-|$)/i.test(tag) ? "ja" : "en");

// LINE's language, or the device's outside LINE's iOS app, when the app speaks it.
const AUTOMATIC: ReadonlySet<Language> = new Set(["en", "ja"]);

/** The language to start in: this device's kept one, else LINE's if the app speaks it, else English. */
export function startLanguage(chosen: Language | null, lineTag: string): Language {
  if (chosen) return chosen;
  const line = languageOf(lineTag);
  return AUTOMATIC.has(line) ? line : "en";
}

const CHOSEN = "draw.language";

/** The person's language as this device keeps it, or null before it keeps one. */
export function readChosenLanguage(): Language | null {
  // Tests outside a browser have no storage, so no choice.
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem(CHOSEN);
    return stored === "en" || stored === "ja" ? stored : null;
  } catch (error) {
    console.error("The chosen language couldn't be read", error);
    return null;
  }
}

/** Keeps the person's language for the next start; throws when it can't. */
export function keepChosenLanguage(language: Language): void {
  localStorage.setItem(CHOSEN, language);
}
