import type liff from "@line/liff";
import { formatClock } from "../stickers/format";
import { giftTag } from "./giftTag";

type LiffMessage = Parameters<typeof liff.shareTargetPicker>[0][number];

/** The gift message as LINE's picker takes it: one Flex bubble. */
export type GiftMessage = Extract<LiffMessage, { type: "flex" }>;

export interface GiftMessageInput {
  /** The LIFF app the gift message's link opens. */
  liffId: string;
  /** The link carries it; nothing else on the gift message identifies the gift. */
  giftClaimToken: string;
  /** The giver's handle, printed as "From @alice". */
  fromHandle: string;
  /** Seconds the sticker took to draw. */
  timeUsed: number;
  /**
   * The frosted-sleeve image: HTTPS, at an immutable content-hashed URL, because LINE caches it
   * for good. Gift messages may be forwarded, so the sticker itself is never on one.
   */
  heroUrl?: string;
}

// LINE draws the gift message and can't read CSS variables, so the world's colors are written out.
const INK = "#1C1824";
const GRAPHITE = "#6E6878";
const AQUA = "#38D3DC";
const LINER = "#F2F1F6";

// LINE's limits for a URI action and an image URL.
const MAX_URI = 1000;
const MAX_IMAGE_URL = 2000;

const URL_SAFE = /^[A-Za-z0-9_-]+$/;

function giftLink(liffId: string, giftClaimToken: string): string {
  if (!URL_SAFE.test(liffId)) throw new Error(`Gift message: the LIFF ID "${liffId}" is not valid`);
  if (!URL_SAFE.test(giftClaimToken)) {
    throw new Error("Gift message: the gift claim token is not URL-safe");
  }
  const link = `https://liff.line.me/${liffId}/g/${giftClaimToken}`;
  if (link.length > MAX_URI) {
    throw new Error(`Gift message: the link is ${link.length} characters; LINE allows ${MAX_URI}`);
  }
  return link;
}

/** The LINE message a gift is sent as. Pure, so the server can build the same gift message later. */
export function buildGiftMessage({
  liffId,
  giftClaimToken,
  fromHandle,
  timeUsed,
  heroUrl,
}: GiftMessageInput): GiftMessage {
  const tag = giftTag(fromHandle);
  if (tag.name === "@") throw new Error("Gift message: the giver has no handle");
  if (
    heroUrl !== undefined &&
    (!heroUrl.startsWith("https://") || heroUrl.length > MAX_IMAGE_URL)
  ) {
    throw new Error(
      "Gift message: LINE needs the sleeve image at an HTTPS URL of 2,000 characters or less",
    );
  }
  const open = {
    type: "uri",
    label: "Open your gift",
    uri: giftLink(liffId, giftClaimToken),
  } as const;

  return {
    type: "flex",
    altText: `${tag.name} sent you a drawing`,
    contents: {
      type: "bubble",
      ...(heroUrl && {
        hero: {
          type: "image",
          url: heroUrl,
          size: "full",
          aspectRatio: "1:1",
          aspectMode: "cover",
          backgroundColor: LINER,
          action: open,
        },
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: `${tag.label} ${tag.name}`,
            weight: "bold",
            size: "lg",
            color: INK,
            wrap: true,
            maxLines: 2,
          },
          {
            type: "text",
            text: `A one-of-one drawing · ${formatClock(timeUsed)}`,
            size: "sm",
            color: GRAPHITE,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "button", style: "secondary", color: AQUA, height: "md", action: open }],
      },
    },
  };
}
