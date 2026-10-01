import i18next, { type PostProcessorModule } from "i18next";
import { initReactI18next } from "react-i18next";
import { BREAK_HINT, resourcesIn } from "./catalog";
import { readChosenLanguage, type Language } from "./language";
import { strings } from "./strings";

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const WORD_JOINER = String.fromCharCode(0x2060);
const OPENING_BRACKET = /[（「『【〔［〈《]/g;

/**
 * A string marked with break hints, as the page shows it. A tag would show as text wherever a string
 * isn't rendered as markup; a zero-width space breaks the line and shows nothing. WebKit lets a line
 * kept to its marks end on an opening bracket, so each is joined to what follows.
 */
export const withBreakHints = (text: string) =>
  text.includes(BREAK_HINT)
    ? text
        .replace(OPENING_BRACKET, (bracket) => bracket + WORD_JOINER)
        .replaceAll(BREAK_HINT, ZERO_WIDTH_SPACE)
    : text;

const breakHints: PostProcessorModule = {
  type: "postProcessor",
  name: "breakHints",
  process: withBreakHints,
};

i18next
  .use(initReactI18next)
  .use(breakHints)
  .init({
    postProcess: breakHints.name,
    // The person's choice as this device keeps it, or English; main.tsx then applies LINE's language.
    lng: readChosenLanguage() ?? "en",
    fallbackLng: "en",
    supportedLngs: ["en", "ja"],
    resources: {
      en: { translation: resourcesIn(strings, "en") },
      ja: { translation: resourcesIn(strings, "ja") },
    },
    // Both catalogs are bundled, so the first render already has its strings.
    initAsync: false,
    // React escapes what it renders, and LINE's messages are plain text.
    interpolation: { escapeValue: false },
    // Types can't catch a call that passes no variables at all: tests fail on it, and the app logs it.
    missingInterpolationHandler: (text: string, match: RegExpExecArray) => {
      const problem = `"${text}" was given no ${match[0]}`;
      if (import.meta.env.MODE === "test") throw new Error(problem);
      console.error(problem);
      return match[0];
    },
  })
  .catch((error: unknown) => console.error("i18next didn't start", error));

/** The language the app is in. */
export const currentLanguage = (): Language => (i18next.language === "ja" ? "ja" : "en");

export { i18next };
