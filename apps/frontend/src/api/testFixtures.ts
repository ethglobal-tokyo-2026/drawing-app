import type {
  BoardSticker,
  Gift,
  Gratitude,
  Person,
  Sticker,
  TransferTrailEntry,
} from "@drawing-app/api/client";

/** People, stickers and gifts for tests, in the API's shapes. All of it is made up. */

const person = (handle: string, lineDisplayName: string): Person => ({
  id: `user-${handle}`,
  handle,
  lineDisplayName,
  linePictureUrl: null,
});

export const people = {
  mika: person("mika", "Mika Hoshino"),
  ken: person("ken", "Ken Mori"),
  bob: person("bob", "Bob Tanaka"),
};

const ART_PX = 224;

/** Every image of a test sticker, at one URL. */
const imagesOf = (url: string): Sticker["images"] => ({
  png: url,
  mask: url,
  spec: url,
  rim: url,
  flat: url,
});
let made = 0;

export function sticker(overrides: Partial<Sticker> = {}): Sticker {
  made += 1;
  return {
    id: `sticker-${made}`,
    number: 140 + made,
    artist: people.mika,
    ownerId: people.mika.id,
    timeUsed: 172,
    width: ART_PX,
    height: ART_PX,
    // Point pairs only, as the seal writes a cut line and the sticker tray reads one.
    outline: `M0 0L${ART_PX} 0L${ART_PX} ${ART_PX}L0 ${ART_PX}Z`,
    contentHash: `0x${made.toString(16).padStart(64, "0")}`,
    images: imagesOf(`https://cdn.test/${made}.png`),
    tokenId: null,
    mintTxHash: null,
    sealedAt: "2026-09-23T11:52:00.000Z",
    ...overrides,
  };
}

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
    giverId: people.mika.id,
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

export function trailEntry(
  overrides: Partial<TransferTrailEntry> & Pick<TransferTrailEntry, "giftId" | "receiver">,
): TransferTrailEntry {
  return {
    giver: people.mika,
    receivedAt: "2026-09-23T12:05:00.000Z",
    gratitude: null,
    ...overrides,
  };
}

export function gratitude(
  overrides: Partial<Gratitude> & Pick<Gratitude, "giftId" | "total">,
): Gratitude {
  return {
    method: "tap",
    hits: 48,
    peakMult: 4,
    peakTier: 2,
    originalArtistGratitudeShare: 0,
    gameConfigVersion: "1",
    recordedAt: "2026-09-23T12:10:00.000Z",
    seenByGiverAt: null,
    ...overrides,
  };
}
