import type { ApiError } from "../api/apiClient";
import type { GiftPreviewResponse, ReceiveGiftResponse, ReceiveRefusal } from "../api/contract";
import { toMs, toPerson, toSticker, type PersonView, type StickerView } from "../api/views";

/** Why a gift can't be received here: the REST doc's refusals, plus a link to no gift and no server. */
export type RefusalKind = ReceiveRefusal | "gift_not_found" | "needs_server";

/** A receivable preview, mapped: `sticker` is set, since only a receivable preview has one. */
export interface GiftPreviewView {
  giver: PersonView;
  sticker: StickerView;
  expiresAt: number;
}

/** ReceiveGiftDialog's steps, from the Gift Claim Token's preview to the received sticker. */
export type ReceiveScreen =
  | { step: "opening" }
  | { step: "sealed"; preview: GiftPreviewView }
  | { step: "unpackaged"; preview: GiftPreviewView; receiving: boolean; failed?: string }
  | { step: "received"; stickerId: string }
  | { step: "refused"; refusal: RefusalKind; giver: PersonView | null }
  | { step: "failed"; message: string };

export type ReceiveEvent =
  | { type: "previewed"; preview: GiftPreviewResponse }
  | { type: "previewFailed"; error: ApiError }
  /** Try again, after a refusal that may pass or a failed preview. */
  | { type: "retry" }
  /** The pull tab snapped: the sticker is unpackaged. */
  | { type: "unpackaged" }
  | { type: "receive" }
  | { type: "received"; response: ReceiveGiftResponse }
  | { type: "receiveFailed"; error: ApiError };

// A record, so the compiler keeps it to RefusalKind's members, all of them.
const REFUSAL_KINDS: Record<RefusalKind, true> = {
  group_chat: true,
  own_gift: true,
  already_received: true,
  taken_back: true,
  gift_returned: true,
  gift_expired: true,
  not_deposited: true,
  gift_not_found: true,
  needs_server: true,
};

const isRefusal = (code: string): code is RefusalKind => Object.hasOwn(REFUSAL_KINDS, code);

function opened({
  giver,
  expiresAt,
  receivable,
  refusal,
  sticker,
}: GiftPreviewResponse): ReceiveScreen {
  if (receivable && sticker) {
    return {
      step: "sealed",
      preview: { giver: toPerson(giver), sticker: toSticker(sticker), expiresAt: toMs(expiresAt) },
    };
  }
  if (!receivable && refusal) return { step: "refused", refusal, giver: toPerson(giver) };
  return {
    step: "failed",
    message: receivable
      ? "The gift's preview came without its sticker."
      : "The gift's preview refused it without saying why.",
  };
}

/** Each event moves the dialog on from the step it fits; an event that fits no step is dropped. */
export function receiveFlow(screen: ReceiveScreen, event: ReceiveEvent): ReceiveScreen {
  switch (event.type) {
    case "previewed":
      return screen.step === "opening" ? opened(event.preview) : screen;
    case "previewFailed":
      if (screen.step !== "opening") return screen;
      return isRefusal(event.error.code)
        ? { step: "refused", refusal: event.error.code, giver: null }
        : { step: "failed", message: event.error.message };
    case "retry":
      return screen.step === "refused" || screen.step === "failed" ? { step: "opening" } : screen;
    case "unpackaged":
      return screen.step === "sealed"
        ? { step: "unpackaged", preview: screen.preview, receiving: false }
        : screen;
    case "receive":
      return screen.step === "unpackaged" && !screen.receiving
        ? { step: "unpackaged", preview: screen.preview, receiving: true }
        : screen;
    case "received":
      return screen.step === "unpackaged" && screen.receiving
        ? { step: "received", stickerId: event.response.sticker.id }
        : screen;
    case "receiveFailed":
      if (screen.step !== "unpackaged" || !screen.receiving) return screen;
      return isRefusal(event.error.code)
        ? { step: "refused", refusal: event.error.code, giver: screen.preview.giver }
        : {
            step: "unpackaged",
            preview: screen.preview,
            receiving: false,
            failed: event.error.message,
          };
  }
}
