import { describe, expect, it, onTestFinished } from "vitest";
import { i18next } from "./i18n";
import { stickerBoard } from "./strings/stickerBoard";

describe("i18next", () => {
  it("fails a call that passes none of its message's variables", () => {
    expect(() => i18next.t(($) => $.giving.giftMessage.altText)).toThrow("{{name}}");
    expect(i18next.t(($) => $.giving.giftMessage.altText, { name: "@alice" })).toBe(
      "@alice sent you a sticker",
    );
  });

  it("shows a string's English where it has no Japanese, as the developer slip's never does", async () => {
    await i18next.changeLanguage("ja");
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    expect(i18next.t(($) => $.stickerBoard.settings.title)).toBe(stickerBoard.settings.title.ja);
    expect(i18next.t(($) => $.stickerBoard.developer.label)).toBe(stickerBoard.developer.label.en);
  });
});
