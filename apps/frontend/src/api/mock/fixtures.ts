/**
 * People, stickers and gifts for the dev server's mock and for tests, drawn from Explore's demo
 * artists so the dev server shows one cast. All of it is made up.
 */
import type { ArtKey } from "../../artists/art";
import { avatarUrl, stickerArtUrl } from "../../artists/artUrl";
import { artistByHandle } from "../../artists/demoArtists";
import type { BoardSticker, Gift, Person, Sticker, TransferTrailEntry } from "../contract";

/** A demo artist as the API describes a person. */
function demoPerson(handle: string): Person {
  const artist = artistByHandle.get(handle);
  if (!artist) throw new Error(`No demo artist @${handle}`);
  return {
    id: `artist-${handle}`,
    handle,
    lineDisplayName: artist.displayName,
    linePictureUrl: avatarUrl(artist.avatar),
  };
}

export const people = {
  mika: demoPerson("mika"),
  ken: demoPerson("ken"),
  bob: demoPerson("bob"),
};

/** The size stickerArtUrl draws a demo sticker at. */
const ART_PX = 224;

/** A demo sticker's images: its art, with its own white die-cut edge, doubles as its mask. */
export function imagesOf(art: ArtKey): Sticker["images"] {
  const url = stickerArtUrl(art);
  return { png: url, mask: url, spec: "", rim: "", flat: url };
}

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
    outline: `M0 0H${ART_PX}V${ART_PX}H0Z`,
    contentHash: `0x${made.toString(16).padStart(64, "0")}`,
    images: imagesOf("sunset"),
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
