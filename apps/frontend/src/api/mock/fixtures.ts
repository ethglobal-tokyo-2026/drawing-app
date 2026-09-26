/** People, stickers and gifts for the dev server's mock and for tests. All of it is made up. */
import type { BoardSticker, Gift, Person, Sticker } from "../contract";
import catUrl from "./stickers/cat.svg?url";
import koiUrl from "./stickers/koi.svg?url";
import sunsetUrl from "./stickers/sunset.svg?url";

/** A LINE picture stand-in: a colored tile with an initial. */
const picture = (initial: string, background: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${background}"/><text x="48" y="62" font-family="system-ui,sans-serif" font-size="44" font-weight="800" text-anchor="middle" fill="#1C1824">${initial}</text></svg>`,
  )}`;

export const people = {
  alice: {
    id: "person-alice",
    handle: "alice",
    lineDisplayName: "Alice Sato",
    linePictureUrl: picture("A", "#FFD6E6"),
  },
  ken: {
    id: "person-ken",
    handle: "ken",
    lineDisplayName: "Ken Mori",
    linePictureUrl: picture("K", "#BDEBEF"),
  },
  bob: {
    id: "person-bob",
    handle: "bob",
    lineDisplayName: "Bob Tanaka",
    linePictureUrl: picture("B", "#E6DCFF"),
  },
} satisfies Record<string, Person>;

/** The fixture stickers' art. Each image carries its own white die-cut edge and doubles as its mask. */
export const art = { sunset: sunsetUrl, cat: catUrl, koi: koiUrl } as const;

const images = (url: string): Sticker["images"] => ({
  png: url,
  mask: url,
  spec: "",
  rim: "",
  flat: url,
});

let made = 0;

export function sticker(overrides: Partial<Sticker> = {}): Sticker {
  made += 1;
  return {
    id: `sticker-${made}`,
    number: 140 + made,
    artist: people.alice,
    ownerId: people.alice.id,
    timeUsed: 172,
    width: 240,
    height: 240,
    outline: "M26 150C26 90 70 50 120 50S214 90 214 150V200H26Z",
    contentHash: `0x${made.toString(16).padStart(64, "0")}`,
    images: images(art.sunset),
    tokenId: null,
    mintTxHash: null,
    sealedAt: "2026-09-23T11:52:00.000Z",
    ...overrides,
  };
}

/** A sticker's images from one of the fixture stickers' art. */
export const imagesOf = (url: string) => images(url);

export function boardSticker(overrides: Partial<BoardSticker> = {}): BoardSticker {
  const s = overrides.sticker ?? sticker();
  return {
    stickerId: s.id,
    placement: null,
    seenAt: null,
    arrivedAt: s.sealedAt,
    sticker: s,
    held: true,
    givenTo: null,
    openGift: null,
    ...overrides,
  };
}

export function gift(overrides: Partial<Gift> = {}): Gift {
  made += 1;
  return {
    id: `0x${made.toString(16).padStart(64, "a")}`,
    stickerId: `sticker-${made}`,
    giverId: people.alice.id,
    receiverId: null,
    status: "sent",
    escrowStatus: "pending",
    packedAt: "2026-09-23T12:00:00.000Z",
    expiresAt: "2026-09-30T12:00:00.000Z",
    sentAt: "2026-09-23T12:00:30.000Z",
    takenOutAt: null,
    receivedAt: null,
    returnedAt: null,
    ...overrides,
  };
}
