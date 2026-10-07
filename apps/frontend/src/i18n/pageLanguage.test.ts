// @vitest-environment happy-dom
import type { Window as HappyWindow } from "happy-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { currentLanguage, i18next } from "./i18n";
import { JAPANESE_FONT_CSS } from "./japaneseFont";
import { keepChosenLanguage } from "./language";
import { followLanguageChoice, followLanguageOnPage } from "./pageLanguage";

const japaneseFontLinks = () =>
  [...document.head.querySelectorAll("link")].filter((l) => l.href === JAPANESE_FONT_CSS);

const isHappyDom = (w: object): w is Pick<HappyWindow, "happyDOM"> => "happyDOM" in w;

// The Japanese face is a stylesheet on Google Fonts, which the tests never fetch.
beforeAll(() => {
  if (!isHappyDom(window)) throw new Error("These tests run in happy-dom");
  window.happyDOM.settings.disableCSSFileLoading = true;
});

afterEach(async () => {
  await i18next.changeLanguage("en");
  for (const link of japaneseFontLinks()) link.remove();
  localStorage.clear();
});

describe("the page's language", () => {
  it("follows the app's: <html lang>, the title and LIFF's own text", async () => {
    const setLiffLanguage = vi.fn(() => Promise.resolve());
    followLanguageOnPage(setLiffLanguage);
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("Croquis");
    await i18next.changeLanguage("ja");
    expect(document.documentElement.lang).toBe("ja");
    expect(document.title).toBe("クロッキー");
    expect(setLiffLanguage).toHaveBeenLastCalledWith("ja");
  });

  it("asks for the Japanese face while the app is in Japanese, once, and lets it go in English", async () => {
    followLanguageOnPage(() => Promise.resolve());
    expect(japaneseFontLinks()).toHaveLength(0);
    await i18next.changeLanguage("ja");
    await i18next.changeLanguage("ja");
    expect(japaneseFontLinks()).toHaveLength(1);
    await i18next.changeLanguage("en");
    expect(japaneseFontLinks()).toHaveLength(0);
    await i18next.changeLanguage("ja");
    expect(japaneseFontLinks()).toHaveLength(1);
  });

  it("switches to a language choice, or to LINE's for none, even when this phone kept it already", async () => {
    keepChosenLanguage("ja");
    await followLanguageChoice("ja");
    expect(currentLanguage()).toBe("ja");
    await followLanguageChoice(null);
    expect(currentLanguage()).toBe("en");
  });
});
