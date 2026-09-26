export type Language = "en" | "ja";

/** A BCP 47 tag's language: Japanese for `ja` and `ja-*`, English for anything else. */
export const languageOf = (tag: string): Language => (/^ja(?:-|$)/i.test(tag) ? "ja" : "en");

// Japanese joins when the Japanese catalog is complete (see the spec); the developer slip shows it meanwhile.
const AUTOMATIC: ReadonlySet<Language> = new Set(["en"]);

/** The language to start in: the developer slip's choice, else LINE's once it's automatic, else English. */
export function startLanguage(chosen: Language | null, lineTag: string): Language {
  if (chosen) return chosen;
  const line = languageOf(lineTag);
  return AUTOMATIC.has(line) ? line : "en";
}

const CHOSEN = "draw.language";

/** The developer slip's choice, or null for LINE's language. */
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

/** Keeps the developer slip's choice, or null for LINE's language, for the next start; throws when it can't. */
export function keepChosenLanguage(language: Language | null): void {
  if (language) localStorage.setItem(CHOSEN, language);
  else localStorage.removeItem(CHOSEN);
}
