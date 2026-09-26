import type { ArtKey } from "../../artists/art";
import { ApiError } from "../apiClient";
import type {
  BoardSticker,
  GiftClaimRequest,
  GiftPreviewResponse,
  Person,
  ReceiveRefusal,
  Sticker,
} from "../contract";
import { boardSticker, gift, imagesOf, people, sticker } from "./fixtures";
import type { Overlay } from "./index";

/** A demo gift link's gift: one that can be received, one that's refused, or one whose preview fails. */
type DemoGift =
  | {
      kind: "receivable";
      sticker: Sticker;
      previewMs?: number;
      /** Previews refused as not deposited before the deposit lands. */
      depositAfter?: number;
      /** Receives that fail before one goes through. */
      failedReceives?: number;
    }
  | { kind: "refused"; refusal: ReceiveRefusal }
  | { kind: "failing" };

const giver = people.mika;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const expiresAt = new Date(Date.now() + WEEK_MS).toISOString();

const demoSticker = (id: string, art: ArtKey, number: number, artist: Person = giver) =>
  sticker({
    id,
    number,
    artist,
    ownerId: artist.id,
    timeUsed: 292,
    images: imagesOf(art),
    sealedAt: "2026-09-23T11:59:00.000Z",
  });

/** The dev server's gift links, /g/{token}; any other token opens no gift. */
const DEMO_GIFTS = new Map<string, DemoGift>([
  ["demo", { kind: "receivable", sticker: demoSticker("demo-sunset", "sunset", 147) }],
  // As if it were opened in a group chat, whatever LIFF Mock says.
  ["demo-group", { kind: "refused", refusal: "group_chat" }],
  ["demo-opened", { kind: "refused", refusal: "already_received" }],
  ["demo-own", { kind: "refused", refusal: "own_gift" }],
  ["demo-taken", { kind: "refused", refusal: "taken_back" }],
  ["demo-returned", { kind: "refused", refusal: "gift_returned" }],
  ["demo-expired", { kind: "refused", refusal: "gift_expired" }],
  [
    "demo-not-deposited",
    { kind: "receivable", sticker: demoSticker("demo-cat", "sleepy-cat", 152), depositAfter: 2 },
  ],
  [
    "demo-slow",
    {
      kind: "receivable",
      sticker: demoSticker("demo-jellyfish", "jellyfish", 158),
      previewMs: 3000,
    },
  ],
  ["demo-fail", { kind: "failing" }],
  [
    "demo-receive-fail",
    {
      kind: "receivable",
      sticker: demoSticker("demo-fox", "fox", 163, people.ken),
      failedReceives: 1,
    },
  ],
]);

// The REST doc's statuses for a refused receive.
const STATUS: Record<ReceiveRefusal, number> = {
  group_chat: 403,
  own_gift: 403,
  already_received: 409,
  taken_back: 409,
  not_deposited: 409,
  gift_expired: 410,
  gift_returned: 410,
};

const GROUP_CHATS = new Set<string>(["group", "room", "square_chat"]);

/** This page load's demo gifts, by token: previews, receive tries, and what each delivered. */
const previews = new Map<string, number>();
const receiveTries = new Map<string, number>();
const received = new Map<
  string,
  { sticker: Sticker; giftId: string; receiver: Person; receivedAt: string }
>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const notFound = (token: string) =>
  new ApiError(404, { error: "gift_not_found", detail: `No demo gift has the token ${token}` });
const dropped = (what: string) =>
  new ApiError(0, { error: "network", detail: `The dev server's mock drops ${what} on purpose` });
const refused = (code: ReceiveRefusal) => new ApiError(STATUS[code], { error: code });

function refusalOf(
  token: string,
  demo: DemoGift & { kind: "receivable" },
  body: GiftClaimRequest,
): ReceiveRefusal | null {
  if (GROUP_CHATS.has(body.liffContextType)) return "group_chat";
  if (received.has(token)) return "already_received";
  if (demo.depositAfter && (previews.get(token) ?? 0) <= demo.depositAfter) return "not_deposited";
  return null;
}

/** The stickers the demo gifts delivered this page load, oldest first, as your board holds them. */
export function receivedDemoStickers(): BoardSticker[] {
  return [...received.values()].map((r) =>
    boardSticker({ sticker: r.sticker, arrivedAt: r.receivedAt }),
  );
}

/** Receiving's fixtures: the demo gift links, one for each state a gift can be in when it's opened. */
export const receivingOverlay: Overlay = (below) => ({
  previewGift: async (body): Promise<GiftPreviewResponse> => {
    const token = body.giftClaimToken;
    const demo = DEMO_GIFTS.get(token);
    if (!demo) throw notFound(token);
    previews.set(token, (previews.get(token) ?? 0) + 1);
    if (demo.kind === "failing") throw dropped("this gift's preview");
    if (demo.kind === "refused") {
      return { giver, expiresAt, receivable: false, refusal: demo.refusal, sticker: null };
    }
    if (demo.previewMs) await wait(demo.previewMs);
    const refusal = refusalOf(token, demo, body);
    return refusal
      ? { giver, expiresAt, receivable: false, refusal, sticker: null }
      : { giver, expiresAt, receivable: true, refusal: null, sticker: demo.sticker };
  },

  receiveGift: async (body) => {
    const token = body.giftClaimToken;
    const demo = DEMO_GIFTS.get(token);
    if (!demo) throw notFound(token);
    if (demo.kind === "failing") throw dropped("this gift's Accept");
    if (demo.kind === "refused") throw refused(demo.refusal);
    const refusal = refusalOf(token, demo, body);
    if (refusal) throw refused(refusal);
    const tries = (receiveTries.get(token) ?? 0) + 1;
    receiveTries.set(token, tries);
    if (tries <= (demo.failedReceives ?? 0)) throw dropped("this gift's first Accept");
    const { owner } = await below.stickerBoard();
    const receivedAt = new Date().toISOString();
    const got = { ...demo.sticker, ownerId: owner.id };
    const delivered = gift({
      stickerId: got.id,
      giverId: giver.id,
      receiverId: owner.id,
      status: "received",
      escrowStatus: "claimed",
      expiresAt,
      receivedAt,
    });
    received.set(token, { sticker: got, giftId: delivered.id, receiver: owner, receivedAt });
    return {
      gift: delivered,
      sticker: got,
      stickerPlacement: { stickerId: got.id, placement: null, seenAt: null, arrivedAt: receivedAt },
    };
  },

  // A received demo sticker's detail: one Transfer Trail row, its gift to you, no gratitude yet.
  stickerDetail: async (stickerId) => {
    const got = [...received.values()].find((r) => r.sticker.id === stickerId);
    if (!got) return below.stickerDetail(stickerId);
    return {
      sticker: got.sticker,
      owner: got.receiver,
      transferTrail: [
        {
          giftId: got.giftId,
          giver,
          receiver: got.receiver,
          receivedAt: got.receivedAt,
          gratitude: null,
        },
      ],
    };
  },
});
