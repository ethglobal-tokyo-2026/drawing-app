import { describe, expect, it } from "vitest";
import { i18next } from "./i18n";

describe("i18next", () => {
  it("fails a call that passes none of its message's variables", () => {
    expect(() => i18next.t(($) => $.giving.giftMessage.altText)).toThrow("{{name}}");
    expect(i18next.t(($) => $.giving.giftMessage.altText, { name: "@alice" })).toBe(
      "@alice sent you a sticker",
    );
  });
});
