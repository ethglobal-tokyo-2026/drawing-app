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

  it("starts in the developer slip's choice, and in English for LINE's Japanese until that's automatic", () => {
    expect(startLanguage("ja", "en-US")).toBe("ja");
    expect(startLanguage("en", "ja")).toBe("en");
    expect(startLanguage(null, "ja-JP")).toBe("en");
    expect(startLanguage(null, "en-US")).toBe("en");
  });
});
