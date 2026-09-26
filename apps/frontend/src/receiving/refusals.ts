import type { PersonView } from "../api/views";
import type { GiftStamp } from "../giving/GiftBag";
import type { RefusalKind } from "./receiveFlow";

/** One layout for every gift that can't be received here: a title, one line, the bag, one button. */
export interface EndScreen {
  title: string;
  line: string;
  /** The bag as a prop, or none. */
  bag: { state: "sealed" | "opened"; stamp?: GiftStamp } | null;
  /** Back to LINE; the sticker board; or Try again, with the way back to LINE under it. */
  action: "backToLine" | "board" | "tryAgain";
}

/**
 * A refusal's screen. It names the giver by their LINE name; a refusal that came without the
 * giver says "the giver".
 */
export function refusalScreen(kind: RefusalKind, giver: PersonView | null): EndScreen {
  const name = giver?.name ?? "the giver";
  switch (kind) {
    case "group_chat":
      return {
        title: `Open this in your chat with ${name}`,
        line: `Gifts open only in the private chat they were sent to. If ${name} sent it to you, open it there.`,
        bag: { state: "sealed", stamp: "one-to-one" },
        action: "backToLine",
      };
    case "already_received":
      // Never who received it: anyone holding a forwarded link would see.
      return {
        title: "Already opened",
        line: "Each gift message opens once. If it was you, the sticker’s on your sticker board.",
        bag: { state: "opened", stamp: "opened" },
        action: "board",
      };
    case "own_gift":
      return {
        title: "This gift is on its way",
        line: "Only the friend you sent it to can open it.",
        bag: { state: "sealed" },
        action: "board",
      };
    case "taken_back":
      return {
        title: `${giver ? giver.name : "The giver"} took this one back`,
        line: "It went back to their sticker board before anyone accepted it.",
        bag: { state: "opened", stamp: "taken-back" },
        action: "backToLine",
      };
    case "gift_returned":
    case "gift_expired":
      return {
        title: `This one went back to ${name}`,
        line: "Gifts wait a week. This one wasn’t opened in time, so it’s back on their sticker board.",
        bag: { state: "opened", stamp: "returned" },
        action: "backToLine",
      };
    case "not_deposited":
      return {
        title: "Almost here",
        line: "This gift is still on its way. Try again in a few seconds.",
        bag: { state: "sealed" },
        action: "tryAgain",
      };
    case "gift_not_found":
      return {
        title: "This link doesn’t open a gift",
        line: "Open it again from the gift message in your chat.",
        bag: null,
        action: "backToLine",
      };
    case "needs_server":
      return {
        title: "Gifts can’t be opened yet",
        line: "Opening a gift needs the app’s server, which isn’t running yet.",
        bag: null,
        action: "backToLine",
      };
  }
}

/** A preview that failed: what failed, from the error, and Try again. */
export const previewFailedScreen = (message: string): EndScreen => ({
  title: "Couldn’t open the gift",
  line: message,
  bag: null,
  action: "tryAgain",
});
