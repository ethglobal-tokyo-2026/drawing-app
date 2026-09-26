import { describe, expect, it } from "vitest";
import { languageOf, startLanguage } from "./language";

describe("the app's language", () => {
  it("is Japanese for a Japanese tag and English for any other", () => {
    expect(["ja", "ja-JP", "JA"].map(languageOf)).toEqual(["ja", "ja", "ja"]);
    expect(["en-US", "zh-TW", "th", "jv", ""].map(languageOf)).toEqual([
      "en",
      "en",
      "en",
      "en",
      "en",
    ]);
  });

  it("starts in the person's choice, else in LINE's language", () => {
    expect(startLanguage("ja", "en-US")).toBe("ja");
    expect(startLanguage("en", "ja")).toBe("en");
    expect(startLanguage(null, "ja-JP")).toBe("ja");
    expect(startLanguage(null, "en-US")).toBe("en");
    expect(startLanguage(null, "zh-TW")).toBe("en");
  });
});
