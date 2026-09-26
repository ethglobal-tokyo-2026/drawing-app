// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18next } from "./i18n";
import { followLanguageOnPage } from "./pageLanguage";

afterEach(() => i18next.changeLanguage("en"));

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
});
