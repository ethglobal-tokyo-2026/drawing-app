import { currentLanguage, i18next } from "./i18n";
import { readChosenLanguage, startLanguage, type Language } from "./language";

/** Switches to LINE's language at start, unless the developer slip chose one. */
export function startInLineLanguage(lineTag: string): void {
  const language = startLanguage(readChosenLanguage(), lineTag);
  if (language === currentLanguage()) return;
  i18next
    .changeLanguage(language)
    .catch((error: unknown) => console.error(`The app couldn't switch to ${language}`, error));
}

/** Keeps `<html lang>`, the page's title and LIFF's own text in the app's language. */
export function followLanguageOnPage(setLiffLanguage: (language: Language) => Promise<void>): void {
  const apply = () => {
    const language = currentLanguage();
    document.documentElement.lang = language;
    document.title = i18next.t(($) => $.app.title);
    setLiffLanguage(language).catch((error: unknown) =>
      console.error(`LIFF's own text didn't switch to ${language}`, error),
    );
  };
  apply();
  i18next.on("languageChanged", apply);
}
