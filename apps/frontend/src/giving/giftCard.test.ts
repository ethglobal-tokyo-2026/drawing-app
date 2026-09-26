import { describe, expect, it } from "vitest";
import { buildGiftCard, type GiftCardInput } from "./giftCard";

const input = (over: Partial<GiftCardInput> = {}): GiftCardInput => ({
  liffId: "2011732197-P98cxGpu",
  code: "Qm9iIGdldHMgYSBzdGlja2VyIGZyb20gQWxpY2UhISE",
  fromHandle: "alice",
  timeUsed: 292,
  ...over,
});

/** Every link a person can tap on the card. */
const tappableLinks = (card: unknown): string[] =>
  JSON.stringify(card)
    .match(/"uri":"[^"]*"/g)
    ?.map((m) => m.slice('"uri":"'.length, -1)) ?? [];

/** Every text the card prints. */
const printedTexts = (card: unknown): string[] =>
  JSON.stringify(card)
    .match(/"text":"[^"]*"/g)
    ?.map((m) => m.slice('"text":"'.length, -1)) ?? [];

describe("buildGiftCard", () => {
  it("opens the gift's LIFF link from the button and the hero", () => {
    const card = buildGiftCard(input({ heroUrl: "https://cdn.example.app/c/sleeve-5f2a9c.png" }));
    const links = tappableLinks(card);
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link).toBe(
        "https://liff.line.me/2011732197-P98cxGpu/g/Qm9iIGdldHMgYSBzdGlja2VyIGZyb20gQWxpY2UhISE",
      );
    }
  });

  it("leaves the hero out until a sleeve image is configured", () => {
    expect(buildGiftCard(input()).contents).not.toHaveProperty("hero");
    const withHero = buildGiftCard(input({ heroUrl: "https://cdn.example.app/c/sleeve.png" }));
    expect(JSON.stringify(withHero)).toContain("https://cdn.example.app/c/sleeve.png");
  });

  it("names the giver by handle and shows the drawing time", () => {
    const texts = printedTexts(buildGiftCard(input({ fromHandle: "@mika", timeUsed: 125 })));
    expect(texts).toContain("From @mika");
    expect(texts.some((t) => t.includes("2:05"))).toBe(true);
    expect(buildGiftCard(input({ fromHandle: "mika" }))).toEqual(
      buildGiftCard(input({ fromHandle: "@mika" })),
    );
  });

  it("refuses what LINE would reject or what would break the link", () => {
    expect(() => buildGiftCard(input({ heroUrl: "http://cdn.example.app/sleeve.png" }))).toThrow(
      /HTTPS/,
    );
    expect(() => buildGiftCard(input({ code: "abc/../def" }))).toThrow(/code/);
    expect(() => buildGiftCard(input({ liffId: "" }))).toThrow(/LIFF ID/);
    expect(() => buildGiftCard(input({ fromHandle: "@" }))).toThrow(/handle/);
  });
});
