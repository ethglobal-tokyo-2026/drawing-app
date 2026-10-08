import type { Tab } from "./TabBar";

export type View = Tab | "draw";

/** What a link opens. */
export interface Opened {
  view: View;
  /** From a gift message's link: ReceiveGiftDialog opens over the board with it. */
  giftClaimToken?: string;
}

/**
 * What a link opens. The LINE chat menu's tiles link to /draw and /explore, and a gift message's
 * link to /g/{Gift Claim Token}, which opens on the board; any other path is the board.
 */
export function openedFrom(pathname: string): Opened {
  const [first, token] = pathname.split("/").filter(Boolean);
  if (first === "draw") return { view: "draw" };
  if (first === "explore") return { view: "explore" };
  if (first === "g" && token) return { view: "board", giftClaimToken: token };
  return { view: "board" };
}

/** This page's link to the drawing screen, as the chat menu's Draw tile opens it. */
export function drawingScreenLink(): URL {
  const link = new URL(location.href);
  link.pathname = "/draw";
  return link;
}
