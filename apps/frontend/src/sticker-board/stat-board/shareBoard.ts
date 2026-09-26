import { boardUrl } from "../../identity/profile";
import type { Identity } from "../../identity/useIdentity";
import { shareOnLine } from "../../line/liff";
import { formatHandle } from "../../stickers/format";

/** What a shared board is called, in the share text and under its QR code. */
export const boardTitle = (handle: string) => `${formatHandle(handle)}'s sticker board`;

/** Shares a link to the board: LINE's picker inside LINE, else the share sheet, else a copied link. */
export async function shareBoard(me: Identity, toast: (text: string) => void): Promise<void> {
  const url = boardUrl(me.handle);
  const title = boardTitle(me.handle);
  if (await shareOnLine(`${title}\n${url}`)) return;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      // Closing the share sheet is the person's choice, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("The share sheet failed, so the link is copied instead", error);
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch (error) {
    console.error("Couldn't copy the board's link", error);
    toast("Couldn’t copy the link");
  }
}
