import type { PersonView } from "../api/views";
import type { GiftStamp } from "../giving/GiftBag";
import type { Problem } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import type { RefusalKind } from "./receiveFlow";

/** One layout for every gift that can't be received here: a title, one line, the bag, one button. */
export interface EndScreen {
  title: string;
  line: string;
  /** The English words behind a failure, for a report. */
  detail?: string;
  /** The bag as a prop, or none; `nsfw` is an NSFW sticker's pink bag. */
  bag: { state: "closed" | "opened"; stamp?: GiftStamp; nsfw?: boolean } | null;
  /** Back to LINE; the sticker board; or Try again, with the way back to LINE under it. */
  action: "backToLine" | "board" | "tryAgain";
}

/**
 * A refusal's screen, in the app's language. It names the giver by their LINE name; a refusal that
 * came without the giver says "the giver".
 */
export function refusalScreen(kind: RefusalKind, giver: PersonView | null): EndScreen {
  const t = i18next.t;
  // Without the giver, the `_unknownGiver` text, which has no name to fill in.
  const giverOptions = {
    name: giver?.name ?? "",
    context: giver ? undefined : ("unknownGiver" as const),
  };
  switch (kind) {
    case "group_chat":
      return {
        title: t(($) => $.receiving.refusals.groupChat.title, giverOptions),
        line: t(($) => $.receiving.refusals.groupChat.line, giverOptions),
        bag: { state: "closed", stamp: "one-to-one" },
        action: "backToLine",
      };
    case "already_received":
      return {
        title: t(($) => $.receiving.refusals.alreadyReceived.title),
        line: t(($) => $.receiving.refusals.alreadyReceived.line),
        bag: { state: "opened", stamp: "opened" },
        action: "board",
      };
    case "own_gift":
      return {
        title: t(($) => $.receiving.refusals.ownGift.title),
        line: t(($) => $.receiving.refusals.ownGift.line),
        bag: { state: "closed" },
        action: "board",
      };
    case "taken_back":
      return {
        title: t(($) => $.receiving.refusals.takenBack.title, giverOptions),
        line: t(($) => $.receiving.refusals.takenBack.line),
        bag: { state: "opened", stamp: "taken-back" },
        action: "backToLine",
      };
    case "gift_returned":
    case "gift_expired":
      return {
        title: t(($) => $.receiving.refusals.giftReturned.title, giverOptions),
        line: t(($) => $.receiving.refusals.giftReturned.line),
        bag: { state: "opened", stamp: "returned" },
        action: "backToLine",
      };
    case "not_deposited":
      return {
        title: t(($) => $.receiving.refusals.notDeposited.title),
        line: t(($) => $.receiving.refusals.notDeposited.line),
        bag: { state: "closed" },
        action: "tryAgain",
      };
    case "gift_not_found":
      return {
        title: t(($) => $.receiving.refusals.giftNotFound.title),
        line: t(($) => $.receiving.refusals.giftNotFound.line),
        bag: null,
        action: "backToLine",
      };
    case "nsfw_not_opted_in":
      // Settings, where the opt-in turns on, is on the board's back.
      return {
        title: t(($) => $.receiving.refusals.nsfwNotOptedIn.title),
        line: t(($) => $.receiving.refusals.nsfwNotOptedIn.line, giverOptions),
        bag: { state: "closed", stamp: "adults-only", nsfw: true },
        action: "board",
      };
    case "needs_server":
      return {
        title: t(($) => $.receiving.refusals.needsServer.title),
        line: t(($) => $.receiving.refusals.needsServer.line),
        bag: null,
        action: "backToLine",
      };
  }
}

/** A preview that failed: what failed, from the error, and Try again. */
export const previewFailedScreen = ({ message, detail }: Problem): EndScreen => ({
  title: i18next.t(($) => $.receiving.previewFailed.title),
  line: message,
  detail,
  bag: null,
  action: "tryAgain",
});
