import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ja } from "./ja";
import { readChosenLanguage, type Language } from "./language";

i18next
  .use(initReactI18next)
  .init({
    // The developer slip's choice, or English; main.tsx then applies LINE's language.
    lng: readChosenLanguage() ?? "en",
    fallbackLng: "en",
    supportedLngs: ["en", "ja"],
    resources: { en: { translation: en }, ja: { translation: ja } },
    // Both catalogs are bundled, so the first render already has its strings.
    initAsync: false,
    // React escapes what it renders, and LINE's messages are plain text.
    interpolation: { escapeValue: false },
  })
  .catch((error: unknown) => console.error("i18next didn't start", error));

/** The language the app is in. */
export const currentLanguage = (): Language => (i18next.language === "ja" ? "ja" : "en");

export { i18next };
