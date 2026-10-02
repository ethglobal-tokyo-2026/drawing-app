import type { Tab } from "./TabBar";

export type View = Tab | "draw";

/** What a link opens. */
export interface Opened {
  view: View;
  /** From a gift message's link: ReceiveGiftDialog opens over the board with it. */
  giftClaimToken?: string;
  /** From a name's link, /@<label>: Explore opens <label>.croquis-app.eth's Sticker Board. */
  boardOf?: string;
}

/**
 * What a link opens. The LINE chat menu's tiles link to /draw and /explore, a gift message's link to
 * /g/{Gift Claim Token}, which opens on the board, and a name's `url` record to /@{label}, which
 * opens their board over Explore; any other path is the board.
 */
export function openedFrom(pathname: string): Opened {
  const [first, token] = pathname.split("/").filter(Boolean);
  if (first === "draw") return { view: "draw" };
  if (first === "explore") return { view: "explore" };
  if (first === "g" && token) return { view: "board", giftClaimToken: token };
  const boardOf = first?.startsWith("@") ? decodedLabel(first.slice(1)) : null;
  if (boardOf) return { view: "explore", boardOf };
  return { view: "board" };
}

/** A path segment's label, or null when it's empty or its escapes are broken. */
function decodedLabel(segment: string): string | null {
  try {
    return decodeURIComponent(segment) || null;
  } catch {
    // decodeURIComponent throws on a broken escape: such a link opens the board, like any other path.
    return null;
  }
}
