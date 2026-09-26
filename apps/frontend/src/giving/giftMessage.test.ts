import { describe, expect, it } from "vitest";
import { buildGiftMessage, type GiftMessageInput } from "./giftMessage";

const input = (over: Partial<GiftMessageInput> = {}): GiftMessageInput => ({
  liffId: "2011732197-P98cxGpu",
  giftClaimToken: "Qm9iIGdldHMgYSBzdGlja2VyIGZyb20gQWxpY2UhISE",
  fromHandle: "alice",
  no: 147,
  timeUsed: 292,
  ...over,
});

const HERO = "https://sticker.example.app/assets/gift-message-hero-5f2a9c.png";

/** Every link a person can tap on the gift message. */
const tappableLinks = (message: unknown): string[] =>
  JSON.stringify(message)
    .match(/"uri":"[^"]*"/g)
    ?.map((m) => m.slice('"uri":"'.length, -1)) ?? [];

/** Every text the gift message prints, top to bottom. */
const printedTexts = (message: unknown): string[] =>
  JSON.stringify(message)
    .match(/"text":"[^"]*"/g)
    ?.map((m) => m.slice('"text":"'.length, -1)) ?? [];

describe("buildGiftMessage", () => {
  it("opens the gift's LIFF link from the button and the hero", () => {
    const links = tappableLinks(buildGiftMessage(input({ heroUrl: HERO })));
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link).toBe(
        "https://liff.line.me/2011732197-P98cxGpu/g/Qm9iIGdldHMgYSBzdGlja2VyIGZyb20gQWxpY2UhISE",
      );
    }
  });

  it("shows the hero only from an HTTPS URL, which LINE requires", () => {
    const hero = (heroUrl: string) => buildGiftMessage(input({ heroUrl })).contents;
    expect(hero("http://localhost:5173/src/giving/gift-message-hero.png")).not.toHaveProperty(
      "hero",
    );
    expect(hero(HERO)).toMatchObject({ hero: { type: "image", url: HERO } });
  });

  it("names the giver by handle, with the sticker's number and drawing time", () => {
    const message = buildGiftMessage(input({ fromHandle: "@mika", no: 38, timeUsed: 125 }));
    expect(message.altText).toBe("@mika sent you a sticker");
    expect(printedTexts(message)).toEqual([
      "NO.0038 · ONE OF ONE",
      "From @mika",
      "A one-of-one sticker, drawn in 2m 5s. It opens once.",
    ]);
    expect(buildGiftMessage(input({ fromHandle: "mika" }))).toEqual(
      buildGiftMessage(input({ fromHandle: "@mika" })),
    );
  });

  it("refuses what LINE would reject or what would break the link", () => {
    expect(() =>
      buildGiftMessage(input({ heroUrl: `https://cdn.example.app/${"a".repeat(2000)}.png` })),
    ).toThrow(/hero/);
    expect(() => buildGiftMessage(input({ giftClaimToken: "abc/../def" }))).toThrow(
      /gift claim token/,
    );
    expect(() => buildGiftMessage(input({ liffId: "" }))).toThrow(/LIFF ID/);
    expect(() => buildGiftMessage(input({ fromHandle: "@" }))).toThrow(/handle/);
  });
});
