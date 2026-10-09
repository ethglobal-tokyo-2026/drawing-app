import { currentLanguage, i18next } from "./i18n";
import { releaseJapaneseFont, requestJapaneseFont } from "./japaneseFont";
import {
  keepChosenLanguage,
  languageOf,
  readChosenLanguage,
  startLanguage,
  type Language,
} from "./language";

let line: Language = "en";

/** LINE's language, or the device's outside LINE's iOS app, as the app speaks it. */
export const lineLanguage = (): Language => line;

async function switchTo(language: Language) {
  if (language === currentLanguage()) return;
  try {
    await i18next.changeLanguage(language);
  } catch (error) {
    console.error(`The app couldn't switch to ${language}`, error);
  }
}

/** Switches to LINE's language at start, unless this device keeps the person's choice. */
export function startInLineLanguage(lineTag: string): void {
  line = languageOf(lineTag);
  void switchTo(startLanguage(readChosenLanguage(), line));
}

/** Switches the app to the language picked in Settings. */
export const followLanguageChoice = (choice: Language): Promise<void> => switchTo(choice);

/**
 * After sign-in, the account's language wins over this device's: the device keeps it for the next
 * start, and the app switches to it before it opens.
 */
export async function followAccountLanguage(language: Language): Promise<void> {
  if (language === readChosenLanguage()) return;
  try {
    keepChosenLanguage(language);
  } catch (error) {
    // Nothing on screen can fix storage, and the app still switches: only the next start's first
    // screen, before sign-in, is in the old language.
    console.error("The account's language couldn't be kept on this device", error);
  }
  await followLanguageChoice(language);
}

/**
 * Keeps `<html lang>`, the page's title and LIFF's own text in the app's language, and asks for the
 * Japanese face while it's Japanese.
 */
export function followLanguageOnPage(setLiffLanguage: (language: Language) => Promise<void>): void {
  const apply = () => {
    const language = currentLanguage();
    document.documentElement.lang = language;
    document.title = i18next.t(($) => $.app.title);
    if (language === "ja") requestJapaneseFont();
    else releaseJapaneseFont();
    setLiffLanguage(language).catch((error: unknown) =>
      console.error(`LIFF's own text didn't switch to ${language}`, error),
    );
  };
  apply();
  i18next.on("languageChanged", apply);
}
