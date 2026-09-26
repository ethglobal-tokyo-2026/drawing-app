import { describe, expect, it } from "vitest";
import { buildGiftMessage, type GiftMessageInput } from "./giftMessage";

const input = (over: Partial<GiftMessageInput> = {}): GiftMessageInput => ({
  liffId: "2011732197-P98cxGpu",
  giftClaimToken: "Qm9iIGdldHMgYSBzdGlja2VyIGZyb20gQWxpY2UhISE",
  fromHandle: "alice",
  timeUsed: 292,
  ...over,
});

/** Every link a person can tap on the gift message. */
const tappableLinks = (message: unknown): string[] =>
  JSON.stringify(message)
    .match(/"uri":"[^"]*"/g)
    ?.map((m) => m.slice('"uri":"'.length, -1)) ?? [];

/** Every text the gift message prints. */
const printedTexts = (message: unknown): string[] =>
  JSON.stringify(message)
    .match(/"text":"[^"]*"/g)
    ?.map((m) => m.slice('"text":"'.length, -1)) ?? [];

describe("buildGiftMessage", () => {
  it("opens the gift's LIFF link from the button and the hero", () => {
    const message = buildGiftMessage(
      input({ heroUrl: "https://cdn.example.app/c/sleeve-5f2a9c.png" }),
    );
    const links = tappableLinks(message);
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link).toBe(
        "https://liff.line.me/2011732197-P98cxGpu/g/Qm9iIGdldHMgYSBzdGlja2VyIGZyb20gQWxpY2UhISE",
      );
    }
  });

  it("leaves the hero out until a sleeve image is configured", () => {
    expect(buildGiftMessage(input()).contents).not.toHaveProperty("hero");
    const withHero = buildGiftMessage(input({ heroUrl: "https://cdn.example.app/c/sleeve.png" }));
    expect(JSON.stringify(withHero)).toContain("https://cdn.example.app/c/sleeve.png");
  });

  it("names the giver by handle and shows the drawing time", () => {
    const texts = printedTexts(buildGiftMessage(input({ fromHandle: "@mika", timeUsed: 125 })));
    expect(texts).toContain("From @mika");
    expect(texts.some((t) => t.includes("drawn in 2m 5s"))).toBe(true);
    expect(buildGiftMessage(input({ fromHandle: "mika" }))).toEqual(
      buildGiftMessage(input({ fromHandle: "@mika" })),
    );
  });

  it("refuses what LINE would reject or what would break the link", () => {
    expect(() => buildGiftMessage(input({ heroUrl: "http://cdn.example.app/sleeve.png" }))).toThrow(
      /HTTPS/,
    );
    expect(() => buildGiftMessage(input({ giftClaimToken: "abc/../def" }))).toThrow(
      /gift claim token/,
    );
    expect(() => buildGiftMessage(input({ liffId: "" }))).toThrow(/LIFF ID/);
    expect(() => buildGiftMessage(input({ fromHandle: "@" }))).toThrow(/handle/);
  });
});
