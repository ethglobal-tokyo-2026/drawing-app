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
const pageListeners: Array<() => void> = [];
const followPage = (
  setLiffLanguage: (language: "en" | "ja") => Promise<void>,
  lineReady: Promise<boolean> = Promise.resolve(true),
) => {
  const stop = followLanguageOnPage(setLiffLanguage, lineReady);
  pageListeners.push(stop);
  return stop;
};

// The Japanese face is a stylesheet on Google Fonts, which the tests never fetch.
beforeAll(() => {
  if (!isHappyDom(window)) throw new Error("These tests run in happy-dom");
  window.happyDOM.settings.disableCSSFileLoading = true;
});

afterEach(async () => {
  for (const stop of pageListeners.splice(0)) stop();
  await i18next.changeLanguage("en");
  for (const link of japaneseFontLinks()) link.remove();
  localStorage.clear();
});

describe("the page's language", () => {
  it("updates the page immediately and sends only the latest choice when LINE starts", async () => {
    let finishStart: (ready: boolean) => void = () => {};
    const lineReady = new Promise<boolean>((resolve) => {
      finishStart = resolve;
    });
    const setLiffLanguage = vi.fn(() => Promise.resolve());
    const stop = followPage(setLiffLanguage, lineReady);
    try {
      expect(document.documentElement.lang).toBe("en");
      expect(document.title).toBe("Croquis");
      expect(setLiffLanguage).not.toHaveBeenCalled();

      await i18next.changeLanguage("ja");
      expect(document.documentElement.lang).toBe("ja");
      expect(document.title).toBe("クロッキー");
      expect(setLiffLanguage).not.toHaveBeenCalled();

      finishStart(true);
      await lineReady;
      await Promise.resolve();
      expect(setLiffLanguage).toHaveBeenCalledExactlyOnceWith("ja");
    } finally {
      stop();
    }
  });

  it("does not call LIFF when initialization fails or after the page listener is removed", async () => {
    const setLiffLanguage = vi.fn(() => Promise.resolve());
    const stop = followPage(setLiffLanguage, Promise.resolve(false));
    await Promise.resolve();
    await i18next.changeLanguage("ja");
    expect(setLiffLanguage).not.toHaveBeenCalled();
    stop();
    await i18next.changeLanguage("en");
    expect(setLiffLanguage).not.toHaveBeenCalled();
  });

  it("does not send a delayed LIFF language change after teardown", async () => {
    let finishStart: (ready: boolean) => void = () => {};
    const lineReady = new Promise<boolean>((resolve) => {
      finishStart = resolve;
    });
    const setLiffLanguage = vi.fn(() => Promise.resolve());
    const stop = followPage(setLiffLanguage, lineReady);
    stop();

    finishStart(true);
    await lineReady;
    await Promise.resolve();
    expect(setLiffLanguage).not.toHaveBeenCalled();
  });

  it("follows the app's: <html lang>, the title and LIFF's own text", async () => {
    const setLiffLanguage = vi.fn(() => Promise.resolve());
    followPage(setLiffLanguage);
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("Croquis");
    await i18next.changeLanguage("ja");
    expect(document.documentElement.lang).toBe("ja");
    expect(document.title).toBe("クロッキー");
    expect(setLiffLanguage).toHaveBeenLastCalledWith("ja");
  });

  it("asks for the Japanese face while the app is in Japanese, once, and lets it go in English", async () => {
    followPage(() => Promise.resolve());
    expect(japaneseFontLinks()).toHaveLength(0);
    await i18next.changeLanguage("ja");
    await i18next.changeLanguage("ja");
    expect(japaneseFontLinks()).toHaveLength(1);
    await i18next.changeLanguage("en");
    expect(japaneseFontLinks()).toHaveLength(0);
    await i18next.changeLanguage("ja");
    expect(japaneseFontLinks()).toHaveLength(1);
  });

  it("switches to a language choice, even when this phone kept it already", async () => {
    keepChosenLanguage("ja");
    await followLanguageChoice("ja");
    expect(currentLanguage()).toBe("ja");
    await followLanguageChoice("en");
    expect(currentLanguage()).toBe("en");
  });
});
