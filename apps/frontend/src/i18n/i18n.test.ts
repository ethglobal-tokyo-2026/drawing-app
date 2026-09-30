import { describe, expect, it, onTestFinished } from "vitest";
import { BREAK_HINT } from "./catalog";
import { i18next } from "./i18n";
import { shop } from "./strings/shop";
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

  it("hands out a Japanese string's break hints as zero-width spaces, so no tag shows as text", async () => {
    await i18next.changeLanguage("ja");
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    const marked = shop.reserve.lead.ja;
    expect(marked).toContain(BREAK_HINT);
    expect(i18next.t(($) => $.shop.reserve.lead)).toBe(
      marked.replaceAll(BREAK_HINT, String.fromCharCode(0x200b)),
    );
  });
});
