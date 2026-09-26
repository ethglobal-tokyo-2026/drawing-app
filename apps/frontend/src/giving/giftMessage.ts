import type liff from "@line/liff";
import { i18next } from "../i18n/i18n";
import type { Language } from "../i18n/language";
import { formatDuration, formatNo } from "../stickers/format";
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
  /** The sticker's number, printed as NO.0147. */
  no: number;
  /** Seconds the sticker took to draw. */
  timeUsed: number;
  /**
   * The sealed bag, the same image on every gift message, at a content-hashed URL because LINE
   * caches it for good. Gift messages may be forwarded, so the sticker itself is never on one.
   * LINE fetches only HTTPS images, so any other URL goes without.
   */
  heroUrl?: string;
  /** The giver's language: LINE's picker never says who receives the gift. */
  language: Language;
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
  no,
  timeUsed,
  heroUrl,
  language,
}: GiftMessageInput): GiftMessage {
  const tag = giftTag(fromHandle);
  if (tag.name === "@") throw new Error("Gift message: the giver has no handle");
  const hero = heroUrl?.startsWith("https://") ? heroUrl : undefined;
  if (hero && hero.length > MAX_IMAGE_URL) {
    throw new Error(
      `Gift message: the hero image's URL is ${hero.length} characters; LINE allows ${MAX_IMAGE_URL}`,
    );
  }
  const open = {
    type: "uri",
    label: i18next.t(($) => $.giving.giftMessage.open, { lng: language }),
    uri: giftLink(liffId, giftClaimToken),
  } as const;

  return {
    type: "flex",
    // What the chat list and LINE's notification show.
    altText: i18next.t(($) => $.giving.giftMessage.altText, { name: tag.name, lng: language }),
    contents: {
      type: "bubble",
      ...(hero && {
        hero: {
          type: "image",
          url: hero,
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
          // Printed in capitals: LINE draws no fine print of its own.
          {
            type: "text",
            text: `${formatNo(no).toUpperCase()} · ${i18next.t(($) => $.giving.giftMessage.oneOfOne, { lng: language })}`,
            size: "xs",
            color: GRAPHITE,
          },
          {
            type: "text",
            text: `${i18next.t(($) => $.giving.tag[tag.label], { lng: language })} ${tag.name}`,
            weight: "bold",
            size: "lg",
            color: INK,
            wrap: true,
            maxLines: 2,
          },
          {
            type: "text",
            text: i18next.t(($) => $.giving.giftMessage.body, {
              duration: formatDuration(timeUsed, language),
              lng: language,
            }),
            size: "sm",
            color: GRAPHITE,
            wrap: true,
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
